import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Category, Language } from '../types';

export type DailyGoalMinutes = 5 | 10 | 15;

/** 1 lesson ≈ 1 minute (PRD: sessions deliver 5–7 lessons in under 8 minutes) */
export function goalLessonCount(minutes: DailyGoalMinutes): number {
  return minutes;
}

interface UserState {
  onboarded: boolean;
  topics: Category[];
  dailyGoalMinutes: DailyGoalMinutes;
  language: Language;
  displayName: string;
  authUserId: string | null;
  /** Session-persistent sound preference (REQ-021: off by default) */
  soundOn: boolean;
  /** Guided first-session overlay dismissed after first swipe (PRD Stage 5) */
  overlayDismissed: boolean;
  /** Notification permission is requested only after the first completed lesson (REQ-023) */
  notificationPromptShown: boolean;

  setTopics: (topics: Category[]) => void;
  setDailyGoal: (minutes: DailyGoalMinutes) => void;
  setLanguage: (language: Language) => void;
  completeOnboarding: (displayName: string, authUserId: string | null) => void;
  toggleSound: () => void;
  dismissOverlay: () => void;
  markNotificationPromptShown: () => void;
  resetAll: () => void;
}

const initialState = {
  onboarded: false,
  topics: [] as Category[],
  dailyGoalMinutes: 10 as DailyGoalMinutes,
  language: 'en' as Language,
  displayName: 'Learner',
  authUserId: null as string | null,
  soundOn: false,
  overlayDismissed: false,
  notificationPromptShown: false,
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,
      setTopics: (topics) => set({ topics }),
      setDailyGoal: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setLanguage: (language) => set({ language }),
      completeOnboarding: (displayName, authUserId) =>
        set({ onboarded: true, displayName, authUserId }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      dismissOverlay: () => set({ overlayDismissed: true }),
      markNotificationPromptShown: () => set({ notificationPromptShown: true }),
      resetAll: () => set({ ...initialState }),
    }),
    {
      name: 'skillscroll-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
