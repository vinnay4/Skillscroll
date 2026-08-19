// POST /complete-lesson — validates lesson completion, awards XP, checks the
// daily goal, and triggers the streak increment (PRD 14.2).
// XP must be credited within 2 seconds of submission (REQ-013); the streak
// increments the moment the goal is reached, not at midnight (REQ-007).

import {
  applyStreakBonus,
  json,
  levelForXp,
  localDate,
  requireUser,
  serviceClient,
  XP_LESSON_COMPLETE,
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

  const body = await req.json();
  const { lesson_id, quiz_answered = true, quiz_correct = false, watch_percentage = 100 } = body;
  if (!lesson_id) return json({ error: 'lesson_id is required' }, 400);

  const { data: lesson } = await db.from('lessons').select('id').eq('id', lesson_id).single();
  if (!lesson) return json({ error: 'Unknown lesson' }, 404);

  // Idempotency: a lesson counts once toward XP and the daily goal
  const { data: existing } = await db
    .from('user_lesson_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson_id)
    .maybeSingle();
  if (existing) return json({ duplicate: true, xp_earned: 0 });

  await db.from('user_lesson_progress').insert({
    user_id: user.id,
    lesson_id,
    quiz_answered,
    quiz_correct,
    watch_percentage,
  });

  // Current streak (created lazily)
  const { data: streakRow } = await db
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const streak = streakRow ?? {
    user_id: user.id,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: null,
    freeze_available: true,
  };

  // XP with streak bonus (1.5x from day 7+, PRD 5.3)
  const transactions: { user_id: string; amount: number; reason: string }[] = [];
  let xpEarned = applyStreakBonus(XP_LESSON_COMPLETE, streak.current_streak);
  transactions.push({ user_id: user.id, amount: xpEarned, reason: 'lesson_complete' });
  if (quiz_correct) {
    const quizXp = applyStreakBonus(XP_QUIZ_CORRECT, streak.current_streak);
    xpEarned += quizXp;
    transactions.push({ user_id: user.id, amount: quizXp, reason: 'quiz_correct' });
  }
  await db.from('xp_transactions').insert(transactions);

  // Daily goal upsert + increment
  const today = localDate(user.timezone);
  const goalLessons = user.daily_goal_minutes; // 1 lesson ≈ 1 minute
  const { data: goalRow } = await db
    .from('daily_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  const completedCount = (goalRow?.completed_lessons_count ?? 0) + 1;
  const goalJustMet = !goalRow?.goal_met_at && completedCount >= goalLessons;

  await db.from('daily_goals').upsert(
    {
      user_id: user.id,
      date: today,
      goal_lessons_count: goalLessons,
      completed_lessons_count: completedCount,
      goal_met_at: goalRow?.goal_met_at ?? (goalJustMet ? new Date().toISOString() : null),
    },
    { onConflict: 'user_id,date' }
  );

  // Streak increment on goal completion (REQ-007)
  let currentStreak = streak.current_streak;
  if (goalJustMet) {
    currentStreak += 1;
    await db.from('streaks').upsert(
      {
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: Math.max(streak.longest_streak, currentStreak),
        last_completed_date: today,
        freeze_available: streak.freeze_available,
      },
      { onConflict: 'user_id' }
    );
  }

  const totalXp = user.total_xp + xpEarned;
  await db
    .from('users')
    .update({ total_xp: totalXp, level: levelForXp(totalXp) })
    .eq('id', user.id);

  return json({
    xp_earned: xpEarned,
    total_xp: totalXp,
    goal_met: goalJustMet,
    current_streak: currentStreak,
    level: levelForXp(totalXp),
  });
});
