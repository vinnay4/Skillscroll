// POST /submit-quiz — records a quiz answer and awards bonus XP if correct
// (PRD 14.2). Used when the quiz answer arrives separately from lesson
// completion; complete-lesson already handles the combined path.

import {
  applyStreakBonus,
  json,
  levelForXp,
  requireUser,
  serviceClient,
  XP_QUIZ_CORRECT,
} from '../_shared/db.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const db = serviceClient();

  let user;
  try {
    user = await requireUser(req, db);
  } catch (response) {
    return response as Response;
  }

  const { lesson_id, selected_index } = await req.json();
  if (!lesson_id || typeof selected_index !== 'number') {
    return json({ error: 'lesson_id and selected_index are required' }, 400);
  }

  const { data: lesson } = await db
    .from('lessons')
    .select('id, quiz_correct_index')
    .eq('id', lesson_id)
    .single();
  if (!lesson) return json({ error: 'Unknown lesson' }, 404);

  const correct = selected_index === lesson.quiz_correct_index;

  const { data: progress } = await db
    .from('user_lesson_progress')
    .select('id, quiz_answered')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson_id)
    .maybeSingle();

  // The quiz can only be answered once per lesson (REQ-005: no skip, no retry)
  if (progress?.quiz_answered) return json({ duplicate: true, correct, xp_earned: 0 });

  if (progress) {
    await db
      .from('user_lesson_progress')
      .update({ quiz_answered: true, quiz_correct: correct })
      .eq('id', progress.id);
  } else {
    await db.from('user_lesson_progress').insert({
      user_id: user.id,
      lesson_id,
      quiz_answered: true,
      quiz_correct: correct,
      watch_percentage: 100,
    });
  }

  let xpEarned = 0;
  if (correct) {
    const { data: streak } = await db
      .from('streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle();
    xpEarned = applyStreakBonus(XP_QUIZ_CORRECT, streak?.current_streak ?? 0);
    await db.from('xp_transactions').insert({
      user_id: user.id,
      amount: xpEarned,
      reason: 'quiz_correct',
    });
    const totalXp = user.total_xp + xpEarned;
    await db
      .from('users')
      .update({ total_xp: totalXp, level: levelForXp(totalXp) })
      .eq('id', user.id);
  }

  return json({ correct, correct_index: lesson.quiz_correct_index, xp_earned: xpEarned });
});
