// POST /update-quality-scores — scheduled daily: recomputes each lesson's
// quality_score from real engagement (70% quiz pass rate + 30% watch
// completion, PRD 9.3) and auto-flags lessons below a 60% pass rate for
// editorial review (PRD 12). Feed ranking picks the new scores up
// automatically since it sorts by quality_score.

import { json, serviceClient } from '../_shared/db.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '__none__')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = serviceClient();
  const { data, error } = await db.rpc('refresh_lesson_quality_scores', { min_attempts: 20 });
  if (error) return json({ error: error.message }, 500);

  const row = Array.isArray(data) ? data[0] : data;
  return json({
    updated: row?.updated_count ?? 0,
    flagged_for_review: row?.flagged_count ?? 0,
  });
});
