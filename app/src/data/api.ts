import type { Category, Language, Lesson, Series } from '../types';
import { supabase } from '../lib/supabase';
import { SEED_LESSONS } from './lessons';
import { SEED_SERIES } from './series';

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

/** Topic deep-dive series for the user's language (PRD 6.2, Phase 2). */
export async function fetchSeries(language: Language): Promise<Series[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('id, title, description, category, language, series_lessons(lesson_id, position)')
        .eq('language', language)
        .order('title');
      if (!error && data && data.length > 0) {
        return data.map((row: Record<string, any>) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          language: row.language,
          lessonIds: [...row.series_lessons]
            .sort((a, b) => a.position - b.position)
            .map((sl: { lesson_id: string }) => sl.lesson_id),
        }));
      }
    } catch {
      // fall through to bundled series
    }
  }
  return SEED_SERIES.filter((s) => s.language === language);
}

/** Resolves lesson objects for a series, preserving the series order. */
export async function fetchLessonsByIds(ids: string[]): Promise<Lesson[]> {
  let pool: Lesson[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('lessons').select('*').in('id', ids);
      if (!error && data) pool = data.map(mapRow);
    } catch {
      // fall through to bundled seed content
    }
  }
  if (pool.length === 0) pool = SEED_LESSONS.filter((l) => ids.includes(l.id));
  const byId = new Map(pool.map((l) => [l.id, l]));
  return ids.map((id) => byId.get(id)).filter((l): l is Lesson => !!l);
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

export interface LeaderboardRow {
  displayName: string;
  weeklyXp: number;
  isMe: boolean;
}

/**
 * Weekly XP leaderboard, friends only (PRD 6.2, Phase 2).
 * Returns null when signed out or offline; callers fall back to a local
 * single-row board computed from on-device XP transactions.
 */
export async function fetchWeeklyLeaderboard(): Promise<LeaderboardRow[] | null> {
  if (!supabase) return null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;
    const { data, error } = await supabase.rpc('get_weekly_leaderboard');
    if (error || !data) return null;
    return (data as Record<string, any>[]).map((row) => ({
      displayName: row.display_name,
      weeklyXp: Number(row.weekly_xp),
      isMe: row.is_me,
    }));
  } catch {
    return null;
  }
}

/** Redeems a friend code; returns the new friend's name or an error message. */
export async function addFriendByCode(
  code: string
): Promise<{ friendName?: string; error?: string }> {
  if (!supabase) return { error: 'Sign in to add friends' };
  try {
    const { data, error } = await supabase.rpc('add_friend_by_code', { code });
    if (error) return { error: error.message };
    const result = data as { friend_name?: string; error?: string };
    if (result.error) return { error: result.error };
    return { friendName: result.friend_name };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

/** The signed-in user's shareable friend code, or null when anonymous/offline. */
export async function fetchMyFriendCode(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const authId = authData.user?.id;
    if (!authId) return null;
    const { data } = await supabase.from('users').select('friend_code').eq('auth_id', authId).single();
    return data?.friend_code ?? null;
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
