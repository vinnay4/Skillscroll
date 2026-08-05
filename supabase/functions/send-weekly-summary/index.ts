// POST /send-weekly-summary — scheduled hourly: at Sunday 7pm in each user's
// timezone, pushes a summary with the user's actual XP, lesson count, and
// streak (PRD 5.5 — copy must be specific, never generic).

import { json, serviceClient } from '../_shared/db.ts';

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
    .select('id, timezone, push_token')
    .not('push_token', 'is', null);
  if (error) return json({ error: error.message }, 500);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const messages: { to: string; title: string; body: string }[] = [];

  for (const user of users ?? []) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: user.timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const weekday = parts.find((p) => p.type === 'weekday')?.value;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    if (weekday !== 'Sun' || hour !== 19) continue;

    const [{ data: xpRows }, { count: lessonCount }, { data: streak }] = await Promise.all([
      db.from('xp_transactions').select('amount').eq('user_id', user.id).gte('created_at', weekAgo),
      db
        .from('user_lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_at', weekAgo),
      db.from('streaks').select('current_streak').eq('user_id', user.id).maybeSingle(),
    ]);

    const weeklyXp = (xpRows ?? []).reduce((sum, row) => sum + row.amount, 0);
    const lessons = lessonCount ?? 0;
    if (lessons === 0) continue; // nothing to summarize, don't spam

    const days = streak?.current_streak ?? 0;
    const streakPart = days > 0 ? ` Streak: ${days} days.` : '';
    messages.push({
      to: user.push_token,
      title: 'Your week on SkillScroll',
      body: `${lessons} lessons, ${weeklyXp} XP this week.${streakPart} Keep it rolling.`,
    });
  }

  for (let i = 0; i < messages.length; i += 100) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return json({ sent: messages.length });
});
