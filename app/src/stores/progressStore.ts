import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capture } from '../lib/analytics';
import { daysBetween, todayKey, weekKey } from '../lib/dates';
import {
  applyStreakBonus,
  getLevel,
  XP_LESSON_COMPLETE,
  XP_QUIZ_CORRECT,
} from '../lib/levels';
import type { Lesson, LessonProgress, XpTransaction } from '../types';
import { syncLessonCompletion } from '../data/api';

export interface CompletionResult {
  xpEarned: number;
  streakIncremented: boolean;
  goalMet: boolean;
  leveledUp: boolean;
  levelName: string;
  quizCorrect: boolean;
}

interface ProgressState {
  totalXp: number;
  xpTransactions: XpTransaction[];
  completedLessons: Record<string, LessonProgress>;

  currentStreak: number;
  longestStreak: number;
  /** Local calendar date (YYYY-MM-DD) the daily goal was last met */
  lastGoalMetDate: string | null;
  /** One streak freeze per week, earned not purchased (PRD 5.3) */
  freezeAvailable: boolean;
  freezeGrantedWeek: string | null;

  /** Rolling daily counter, keyed to the local calendar day */
  dailyDate: string;
  dailyCompletedCount: number;
  goalMetToday: boolean;

  /** Handles midnight rollover, weekly freeze grant, and streak reset (REQ-009). Call on app open/foreground. */
  rolloverIfNeeded: () => void;
  /** Merges server-side progress into the local store on sign-in (REQ-019). Takes maxima so no device loses progress. */
  mergeRemote: (remote: {
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    completed: LessonProgress[];
  }) => void;
  /** Records a completed lesson + quiz answer; awards XP; drives streak & goal (REQ-007, REQ-013). */
  completeLesson: (lesson: Lesson, quizSelectedIndex: number, goalLessons: number) => CompletionResult;
  resetAll: () => void;
}

const initialState = {
  totalXp: 0,
  xpTransactions: [] as XpTransaction[],
  completedLessons: {} as Record<string, LessonProgress>,
  currentStreak: 0,
  longestStreak: 0,
  lastGoalMetDate: null as string | null,
  freezeAvailable: true,
  freezeGrantedWeek: null as string | null,
  dailyDate: todayKey(),
  dailyCompletedCount: 0,
  goalMetToday: false,
};

let txCounter = 0;
function tx(amount: number, reason: XpTransaction['reason']): XpTransaction {
  txCounter += 1;
  return {
    id: `${Date.now()}-${txCounter}`,
    amount,
    reason,
    createdAt: new Date().toISOString(),
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      rolloverIfNeeded: () => {
        const state = get();
        const today = todayKey();
        const thisWeek = weekKey();
        const updates: Partial<ProgressState> = {};

        // Weekly streak-freeze grant
        if (state.freezeGrantedWeek !== thisWeek) {
          updates.freezeAvailable = true;
          updates.freezeGrantedWeek = thisWeek;
        }

        if (state.dailyDate !== today) {
          updates.dailyDate = today;
          updates.dailyCompletedCount = 0;
          updates.goalMetToday = false;

          // Streak survives if goal was met yesterday; a single missed day can
          // be covered by the weekly freeze; otherwise reset to 0 (REQ-009).
          if (state.currentStreak > 0 && state.lastGoalMetDate) {
            const gap = daysBetween(today, state.lastGoalMetDate);
            if (gap > 1) {
              const freezeCoversGap =
                gap === 2 && (updates.freezeAvailable ?? state.freezeAvailable);
              if (freezeCoversGap) {
                updates.freezeAvailable = false;
              } else {
                updates.currentStreak = 0;
              }
            }
          }
        }

        if (Object.keys(updates).length > 0) set(updates);
      },

      mergeRemote: (remote) => {
        const state = get();
        const completedLessons = { ...state.completedLessons };
        for (const entry of remote.completed) {
          if (!completedLessons[entry.lessonId]) {
            completedLessons[entry.lessonId] = entry;
          }
        }
        set({
          totalXp: Math.max(state.totalXp, remote.totalXp),
          currentStreak: Math.max(state.currentStreak, remote.currentStreak),
          longestStreak: Math.max(state.longestStreak, remote.longestStreak),
          completedLessons,
        });
      },

      completeLesson: (lesson, quizSelectedIndex, goalLessons) => {
        get().rolloverIfNeeded();
        const state = get();
        const today = todayKey();
        const quizCorrect = quizSelectedIndex === lesson.quizCorrectIndex;

        // Replays (e.g. revisiting a lesson inside a deep-dive series) never
        // re-award XP or advance the daily goal — mirrors the server-side
        // idempotency in the complete-lesson edge function.
        if (state.completedLessons[lesson.id]) {
          return {
            xpEarned: 0,
            streakIncremented: false,
            goalMet: false,
            leveledUp: false,
            levelName: getLevel(state.totalXp).name,
            quizCorrect,
          };
        }

        const transactions: XpTransaction[] = [];
        let xpEarned = applyStreakBonus(XP_LESSON_COMPLETE, state.currentStreak);
        transactions.push(tx(xpEarned, 'lesson_complete'));
        if (quizCorrect) {
          const quizXp = applyStreakBonus(XP_QUIZ_CORRECT, state.currentStreak);
          xpEarned += quizXp;
          transactions.push(tx(quizXp, 'quiz_correct'));
        }

        const newCount = state.dailyCompletedCount + 1;
        // Streak increments the moment the daily goal is reached, not at midnight (REQ-007)
        const goalJustMet = !state.goalMetToday && newCount >= goalLessons;
        let currentStreak = state.currentStreak;
        let streakIncremented = false;
        if (goalJustMet) {
          currentStreak += 1;
          streakIncremented = true;
        }

        const prevLevel = getLevel(state.totalXp);
        const totalXp = state.totalXp + xpEarned;
        const newLevel = getLevel(totalXp);
        const leveledUp = newLevel.index > prevLevel.index;

        const progressEntry: LessonProgress = {
          lessonId: lesson.id,
          completedAt: new Date().toISOString(),
          quizAnswered: true,
          quizCorrect,
          watchPercentage: 100,
        };

        set({
          totalXp,
          xpTransactions: [...transactions, ...state.xpTransactions].slice(0, 200),
          completedLessons: { ...state.completedLessons, [lesson.id]: progressEntry },
          dailyCompletedCount: newCount,
          goalMetToday: state.goalMetToday || goalJustMet,
          currentStreak,
          longestStreak: Math.max(state.longestStreak, currentStreak),
          lastGoalMetDate: goalJustMet ? today : state.lastGoalMetDate,
        });

        capture('lesson_completed', { lessonId: lesson.id, category: lesson.category });
        capture('quiz_answered', { lessonId: lesson.id, correct: quizCorrect });
        if (streakIncremented) capture('streak_incremented', { streak: currentStreak });
        if (goalJustMet) capture('daily_goal_met', { lessons: newCount });
        if (leveledUp) capture('level_up', { level: newLevel.name });

        void syncLessonCompletion({
          lessonId: lesson.id,
          quizAnswered: true,
          quizCorrect,
          watchPercentage: 100,
        });

        return {
          xpEarned,
          streakIncremented,
          goalMet: goalJustMet,
          leveledUp,
          levelName: newLevel.name,
          quizCorrect,
        };
      },

      resetAll: () => set({ ...initialState, dailyDate: todayKey() }),
    }),
    {
      name: 'skillscroll-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
