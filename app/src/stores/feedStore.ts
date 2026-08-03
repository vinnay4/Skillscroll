import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capture } from '../lib/analytics';
import { fetchFeed, fetchLessonsByIds, syncNotInterested } from '../data/api';
import type { Category, Language, Lesson, NotInterestedReason, Series } from '../types';

interface FeedState {
  lessons: Lesson[];
  loading: boolean;
  /** Exact feed position, persisted so relaunch restores the same lesson (PRD 5.1) */
  currentIndex: number;
  /** Language the current queue was loaded for (reload trigger on switch) */
  feedLanguage: Language | null;
  /** Bumped whenever the queue is replaced so the list can snap back to the top */
  feedVersion: number;
  /** Non-null while scrolling through a topic deep-dive (PRD 6.2, Phase 2) */
  activeSeriesId: string | null;
  seenIds: string[];
  hiddenIds: string[];

  loadFeed: (topics: Category[], language: Language) => Promise<void>;
  /** Replaces the queue with a deep-dive's lessons in series order. */
  loadSeries: (series: Series) => Promise<void>;
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
      feedLanguage: null,
      feedVersion: 0,
      activeSeriesId: null,
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
        set({
          lessons,
          loading: false,
          currentIndex: 0,
          feedLanguage: language,
          feedVersion: get().feedVersion + 1,
          activeSeriesId: null,
        });
      },

      loadSeries: async (series) => {
        set({ loading: true });
        const lessons = await fetchLessonsByIds(series.lessonIds);
        set({
          lessons,
          loading: false,
          currentIndex: 0,
          feedVersion: get().feedVersion + 1,
          activeSeriesId: series.id,
        });
        capture('series_started', { seriesId: series.id, lessons: lessons.length });
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
      // Persisting the queue and index doubles as the offline lesson cache
      // (REQ-017) and restores the exact feed position on relaunch (PRD 5.1).
      partialize: (state) => ({
        lessons: state.lessons,
        currentIndex: state.currentIndex,
        feedLanguage: state.feedLanguage,
        activeSeriesId: state.activeSeriesId,
        seenIds: state.seenIds,
        hiddenIds: state.hiddenIds,
      }),
    }
  )
);
