export type Category = 'finance' | 'technology' | 'communication' | 'productivity';

export type Language = 'en' | 'hi';

export interface Lesson {
  id: string;
  title: string;
  category: Category;
  durationSeconds: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  quizQuestion: string;
  quizOptions: string[];
  quizCorrectIndex: number;
  /** 4-part mandatory structure (PRD 5.2) */
  structureHook: string;
  structureConcept: string;
  structureExample: string;
  structureTakeaway: string;
  /** "Try this today" actionable prompt (PRD Stage 7) */
  tryThisToday?: string;
  qualityScore: number;
  language: Language;
}

export interface LessonProgress {
  lessonId: string;
  completedAt: string;
  quizAnswered: boolean;
  quizCorrect: boolean;
  watchPercentage: number;
}

export interface XpTransaction {
  id: string;
  amount: number;
  reason: 'lesson_complete' | 'quiz_correct' | 'streak_bonus' | 'daily_goal';
  createdAt: string;
}

export type NotInterestedReason = 'already_know' | 'wrong_topic' | 'too_basic';

/** Topic deep-dive: an ordered series of 5–10 lessons on one sub-topic (PRD 6.2, Phase 2) */
export interface Series {
  id: string;
  title: string;
  description: string;
  category: Category;
  language: Language;
  lessonIds: string[];
}

export interface LevelInfo {
  index: number;
  name: string;
  minXp: number;
  nextMinXp: number | null;
}
