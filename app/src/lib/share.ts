import { Share } from 'react-native';
import { capture } from './analytics';
import type { Lesson } from '../types';

/** Share lesson card to WhatsApp/Instagram etc. via the native share sheet (PRD 6.2, Phase 2). */
export async function shareLesson(lesson: Lesson): Promise<void> {
  try {
    await Share.share({
      message:
        `${lesson.title}\n\n` +
        `${lesson.structureTakeaway}\n\n` +
        `Learn this in 60 seconds on SkillScroll → https://skillscroll.app/l/${lesson.id}`,
    });
    capture('lesson_shared', { lessonId: lesson.id });
  } catch {
    // user dismissed the share sheet
  }
}
