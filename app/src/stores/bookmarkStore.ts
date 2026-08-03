import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capture } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import type { Lesson } from '../types';

interface BookmarkState {
  /** Full lesson snapshots keyed by id so the saved list renders offline */
  bookmarks: Record<string, Lesson>;
  isBookmarked: (lessonId: string) => boolean;
  toggleBookmark: (lesson: Lesson) => void;
}

async function syncBookmark(lessonId: string, saved: boolean): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const authId = data.user?.id;
    if (!authId) return;
    const { data: userRow } = await supabase.from('users').select('id').eq('auth_id', authId).single();
    if (!userRow) return;
    if (saved) {
      await supabase.from('bookmarks').upsert(
        { user_id: userRow.id, lesson_id: lessonId },
        { onConflict: 'user_id,lesson_id' }
      );
    } else {
      await supabase.from('bookmarks').delete().eq('user_id', userRow.id).eq('lesson_id', lessonId);
    }
  } catch {
    // offline-first: local store is the source of truth
  }
}

/** Lesson bookmarking — save for later (PRD 6.2, Phase 2). */
export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: {},

      isBookmarked: (lessonId) => !!get().bookmarks[lessonId],

      toggleBookmark: (lesson) => {
        const { bookmarks } = get();
        const next = { ...bookmarks };
        const saved = !next[lesson.id];
        if (saved) {
          next[lesson.id] = lesson;
        } else {
          delete next[lesson.id];
        }
        set({ bookmarks: next });
        capture('lesson_bookmarked', { lessonId: lesson.id, saved });
        void syncBookmark(lesson.id, saved);
      },
    }),
    {
      name: 'skillscroll-bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
