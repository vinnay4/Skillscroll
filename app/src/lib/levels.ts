import type { LevelInfo } from '../types';

/** Level system per PRD 5.3: Beginner → Explorer → Learner → Scholar → Master */
const LEVELS: { name: string; minXp: number }[] = [
  { name: 'Beginner', minXp: 0 },
  { name: 'Explorer', minXp: 100 },
  { name: 'Learner', minXp: 300 },
  { name: 'Scholar', minXp: 700 },
  { name: 'Master', minXp: 1500 },
];

export const XP_LESSON_COMPLETE = 10;
export const XP_QUIZ_CORRECT = 5;
/** 1.5x XP multiplier from streak day 7+ (PRD 5.3) */
export const STREAK_BONUS_MULTIPLIER = 1.5;
export const STREAK_BONUS_MIN_DAY = 7;

export function getLevel(totalXp: number): LevelInfo {
  let index = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].minXp) {
      index = i;
      break;
    }
  }
  const next = LEVELS[index + 1];
  return {
    index,
    name: LEVELS[index].name,
    minXp: LEVELS[index].minXp,
    nextMinXp: next ? next.minXp : null,
  };
}

export function applyStreakBonus(baseXp: number, currentStreak: number): number {
  if (currentStreak >= STREAK_BONUS_MIN_DAY) {
    return Math.round(baseXp * STREAK_BONUS_MULTIPLIER);
  }
  return baseXp;
}
