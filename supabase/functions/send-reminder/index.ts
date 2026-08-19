// POST /send-reminder — scheduled at 9pm per timezone: pushes a streak
// reminder to users who have not yet met today's daily goal (REQ-008).
// Copy includes the user's actual streak number (PRD 5.5); users who already
// completed their goal are never notified (PRD 12: max 1 notification/day).

import { json, localDate, serviceClient } from '../_shared/db.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '__none__')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = serviceClient();
  const { data: users, error } = await db
    .from('users')
    .select('id, timezone, push_token, reminder_hour')
    .not('push_token', 'is', null);
  if (error) return json({ error: error.message }, 500);

  const messages: { to: string; title: string; body: string }[] = [];

  for (const user of users ?? []) {
    // Only fire in the user's reminder hour (job runs hourly)
    const hourInTz = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: user.timezone,
        hour: 'numeric',
        hour12: false,
      }).format(new Date())
    );
    if (hourInTz !== (user.reminder_hour ?? 21)) continue;

    const today = localDate(user.timezone);
    const { data: goal } = await db
      .from('daily_goals')
      .select('goal_met_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (goal?.goal_met_at) continue;

    const { data: streak } = await db
      .from('streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle();
    const days = streak?.current_streak ?? 0;

    messages.push({
      to: user.push_token,
      title: 'SkillScroll',
      body:
        days > 0
          ? `Your ${days}-day streak is on the line. 3 minutes is all it takes.`
          : 'Learn one thing before the day ends. 60 seconds is all it takes.',
    });
  }

  // Expo push API accepts batches of up to 100 messages
  for (let i = 0; i < messages.length; i += 100) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return json({ sent: messages.length });
});
