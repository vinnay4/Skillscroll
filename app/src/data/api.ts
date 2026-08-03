import type { Category, Language, Lesson } from '../types';
import { supabase } from '../lib/supabase';
import { SEED_LESSONS } from './lessons';

interface FeedParams {
  topics: Category[];
  language: Language;
  seenIds: Set<string>;
  hiddenIds: Set<string>;
  limit?: number;
}

/**
 * Rule-based feed ranking per PRD 9.3 (Phase 1, no ML):
 *  1. lessons matching the user's onboarding topics first
 *  2. not yet seen by the user
 *  3. sorted by quality_score descending
 * Seen lessons are appended at the end so the feed never runs dry in demo mode.
 */
function rankLessons(
  all: Lesson[],
  { topics, language, seenIds, hiddenIds, limit = 10 }: FeedParams
): Lesson[] {
  const visible = all.filter((l) => !hiddenIds.has(l.id) && l.language === language);
  const topicSet = new Set(topics);

  const score = (l: Lesson): number => {
    let s = l.qualityScore;
    if (topicSet.size === 0 || topicSet.has(l.category)) s += 1000;
    if (!seenIds.has(l.id)) s += 10000;
    return s;
  };

  return [...visible].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

function mapRow(row: Record<string, any>): Lesson {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    durationSeconds: row.duration_seconds,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    quizQuestion: row.quiz_question,
    quizOptions: row.quiz_options,
    quizCorrectIndex: row.quiz_correct_index,
    structureHook: row.structure_hook,
    structureConcept: row.structure_concept,
    structureExample: row.structure_example,
    structureTakeaway: row.structure_takeaway,
    tryThisToday: row.try_this_today ?? undefined,
    qualityScore: row.quality_score,
    language: row.language,
  };
}

export async function fetchFeed(params: FeedParams): Promise<Lesson[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('language', params.language)
        .order('quality_score', { ascending: false })
        .limit(200);
      if (!error && data && data.length > 0) {
        return rankLessons(data.map(mapRow), params);
      }
    } catch {
      // fall through to bundled seed content
    }
  }
  return rankLessons(SEED_LESSONS, params);
}

/** Lesson search over title and structure text (PRD 6.2, Phase 2). */
export async function searchLessons(query: string, language: Language): Promise<Lesson[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('language', language)
        .or(`title.ilike.%${q}%,structure_concept.ilike.%${q}%,structure_hook.ilike.%${q}%`)
        .order('quality_score', { ascending: false })
        .limit(20);
      if (!error && data) return data.map(mapRow);
    } catch {
      // fall through to bundled seed content
    }
  }
  return SEED_LESSONS.filter(
    (l) =>
      l.language === language &&
      (l.title.toLowerCase().includes(q) ||
        l.structureConcept.toLowerCase().includes(q) ||
        l.structureHook.toLowerCase().includes(q))
  ).slice(0, 20);
}

/** Fire-and-forget server sync of a completed lesson (local store is source of truth offline). */
export async function syncLessonCompletion(entry: {
  lessonId: string;
  quizAnswered: boolean;
  quizCorrect: boolean;
  watchPercentage: number;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.functions.invoke('complete-lesson', {
      body: {
        lesson_id: entry.lessonId,
        quiz_answered: entry.quizAnswered,
        quiz_correct: entry.quizCorrect,
        watch_percentage: entry.watchPercentage,
      },
    });
  } catch {
    // offline-first: local persistence already recorded the completion
  }
}

export interface RemoteProgress {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  completed: {
    lessonId: string;
    completedAt: string;
    quizAnswered: boolean;
    quizCorrect: boolean;
    watchPercentage: number;
  }[];
}

/**
 * Pulls server-side progress for signed-in users so XP/streak/completions sync
 * across devices on app open (REQ-019). Returns null when signed out/offline.
 */
export async function fetchRemoteProgress(): Promise<RemoteProgress | null> {
  if (!supabase) return null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const authId = authData.user?.id;
    if (!authId) return null;

    const { data: user } = await supabase
      .from('users')
      .select('id, total_xp')
      .eq('auth_id', authId)
      .single();
    if (!user) return null;

    const [{ data: streak }, { data: progress }] = await Promise.all([
      supabase.from('streaks').select('current_streak, longest_streak').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('user_lesson_progress')
        .select('lesson_id, completed_at, quiz_answered, quiz_correct, watch_percentage')
        .eq('user_id', user.id),
    ]);

    return {
      totalXp: user.total_xp ?? 0,
      currentStreak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
      completed: (progress ?? []).map((row) => ({
        lessonId: row.lesson_id,
        completedAt: row.completed_at,
        quizAnswered: row.quiz_answered,
        quizCorrect: row.quiz_correct,
        watchPercentage: Number(row.watch_percentage),
      })),
    };
  } catch {
    return null;
  }
}

/** Records a swipe-left "not interested" signal for the recommendation engine. */
export async function syncNotInterested(lessonId: string, reason: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lesson_feedback').insert({ lesson_id: lessonId, reason });
  } catch {
    // non-critical signal
  }
}
