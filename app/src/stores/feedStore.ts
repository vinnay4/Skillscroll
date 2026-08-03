import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capture } from '../lib/analytics';
import { fetchFeed, syncNotInterested } from '../data/api';
import type { Category, Language, Lesson, NotInterestedReason } from '../types';

interface FeedState {
  lessons: Lesson[];
  loading: boolean;
  /** Feed position preserved across app backgrounding (PRD 5.1) */
  currentIndex: number;
  seenIds: string[];
  hiddenIds: string[];

  loadFeed: (topics: Category[], language: Language) => Promise<void>;
  /** Appends the next page when the user nears the end of the loaded queue (pre-fetch, REQ-002). */
  extendFeed: (topics: Category[], language: Language) => Promise<void>;
  setCurrentIndex: (index: number) => void;
  markSeen: (lessonId: string) => void;
  markNotInterested: (lessonId: string, reason: NotInterestedReason) => void;
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      lessons: [],
      loading: false,
      currentIndex: 0,
      seenIds: [],
      hiddenIds: [],

      loadFeed: async (topics, language) => {
        set({ loading: true });
        const { seenIds, hiddenIds } = get();
        const lessons = await fetchFeed({
          topics,
          language,
          seenIds: new Set(seenIds),
          hiddenIds: new Set(hiddenIds),
          limit: 10,
        });
        set({ lessons, loading: false, currentIndex: 0 });
      },

      extendFeed: async (topics, language) => {
        const { lessons, seenIds, hiddenIds } = get();
        const loadedIds = new Set(lessons.map((l) => l.id));
        const next = await fetchFeed({
          topics,
          language,
          seenIds: new Set([...seenIds, ...loadedIds]),
          hiddenIds: new Set(hiddenIds),
          limit: 10,
        });
        const fresh = next.filter((l) => !loadedIds.has(l.id));
        if (fresh.length > 0) set({ lessons: [...lessons, ...fresh] });
      },

      setCurrentIndex: (currentIndex) => set({ currentIndex }),

      markSeen: (lessonId) => {
        const { seenIds } = get();
        if (!seenIds.includes(lessonId)) set({ seenIds: [...seenIds, lessonId] });
      },

      markNotInterested: (lessonId, reason) => {
        const { hiddenIds, lessons, currentIndex } = get();
        const filtered = lessons.filter((l) => l.id !== lessonId);
        set({
          hiddenIds: [...hiddenIds, lessonId],
          lessons: filtered,
          currentIndex: Math.min(currentIndex, Math.max(0, filtered.length - 1)),
        });
        capture('lesson_not_interested', { lessonId, reason });
        void syncNotInterested(lessonId, reason);
      },
    }),
    {
      name: 'skillscroll-feed',
      storage: createJSONStorage(() => AsyncStorage),
      // Lesson objects are refetched on launch; only the behavioral signals persist.
      partialize: (state) => ({
        seenIds: state.seenIds,
        hiddenIds: state.hiddenIds,
      }),
    }
  )
);
