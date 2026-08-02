// POST /streak-reset — scheduled job (Supabase cron, e.g. hourly) that resets
// streaks for users whose local day ended without meeting the daily goal
// (REQ-009). A single missed day can be absorbed by the weekly streak freeze
// (PRD 5.3). Run hourly so each timezone is processed just after its midnight.

import { json, localDate, serviceClient } from '../_shared/db.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Cron invocations authenticate with the service role key
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '__none__')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = serviceClient();
  const { data: streaks, error } = await db
    .from('streaks')
    .select('id, user_id, current_streak, freeze_available, last_completed_date, users!inner(timezone)')
    .gt('current_streak', 0);
  if (error) return json({ error: error.message }, 500);

  let resets = 0;
  let freezes = 0;

  for (const row of streaks ?? []) {
    const timezone = (row.users as { timezone: string }).timezone ?? 'Asia/Kolkata';
    const today = localDate(timezone);
    if (!row.last_completed_date) continue;

    const gapDays = Math.round(
      (Date.parse(today) - Date.parse(row.last_completed_date)) / 86400000
    );

    // gap 0 = goal met today, gap 1 = met yesterday (still alive today)
    if (gapDays <= 1) continue;

    if (gapDays === 2 && row.freeze_available) {
      freezes += 1;
      await db.from('streaks').update({ freeze_available: false }).eq('id', row.id);
    } else {
      resets += 1;
      await db.from('streaks').update({ current_streak: 0 }).eq('id', row.id);
    }
  }

  return json({ processed: (streaks ?? []).length, resets, freezes });
});
