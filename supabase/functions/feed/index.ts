// GET /feed — returns the next 10 lessons for the user: filtered by
// onboarding topics, excluding already-seen lessons, sorted by quality_score
// (rule-based Phase 1 recommendation, PRD 9.3 / 14.2).

import { json, requireUser, serviceClient } from '../_shared/db.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const db = serviceClient();

  let user;
  try {
    user = await requireUser(req, db);
  } catch (response) {
    return response as Response;
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 50);
  const language = url.searchParams.get('language') ?? 'en';
  const topics: string[] = user.onboarding_topics ?? [];

  const { data: seen } = await db
    .from('user_lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id);
  const seenIds = (seen ?? []).map((row) => row.lesson_id);

  let query = db
    .from('lessons')
    .select('*')
    .eq('language', language)
    .order('quality_score', { ascending: false })
    .limit(limit);
  if (topics.length > 0) query = query.in('category', topics);
  if (seenIds.length > 0) query = query.not('id', 'in', `(${seenIds.map((id) => `"${id}"`).join(',')})`);

  const { data: lessons, error } = await query;
  if (error) return json({ error: error.message }, 500);

  // Topic pool exhausted → widen to all categories so the feed never runs dry
  if ((lessons ?? []).length < limit) {
    let fallback = db
      .from('lessons')
      .select('*')
      .eq('language', language)
      .order('quality_score', { ascending: false })
      .limit(limit - (lessons ?? []).length);
    const excludeIds = [...seenIds, ...(lessons ?? []).map((l) => l.id)];
    if (excludeIds.length > 0) {
      fallback = fallback.not('id', 'in', `(${excludeIds.map((id) => `"${id}"`).join(',')})`);
    }
    const { data: extra } = await fallback;
    return json({ lessons: [...(lessons ?? []), ...(extra ?? [])] });
  }

  return json({ lessons });
});
