// Extension included so Node's type-stripping test runner can resolve this
// module directly; Metro and TypeScript (moduleResolution: bundler) allow it.
import { daysBetween } from './dates.ts';

export interface RolloverInput {
  dailyDate: string;
  currentStreak: number;
  lastGoalMetDate: string | null;
  freezeAvailable: boolean;
  freezeGrantedWeek: string | null;
}

export interface RolloverUpdates {
  dailyDate?: string;
  dailyCompletedCount?: number;
  goalMetToday?: boolean;
  currentStreak?: number;
  freezeAvailable?: boolean;
  freezeGrantedWeek?: string;
}

/**
 * Pure day-rollover decision (REQ-009 + weekly freeze grant, PRD 5.3):
 * - grants the weekly streak freeze when a new ISO week starts
 * - on a new calendar day, resets the daily counters
 * - keeps the streak if the goal was met yesterday; a single fully-missed day
 *   is absorbed by an available freeze; anything longer resets to 0
 */
export function resolveRollover(
  state: RolloverInput,
  today: string,
  thisWeek: string
): RolloverUpdates {
  const updates: RolloverUpdates = {};

  if (state.freezeGrantedWeek !== thisWeek) {
    updates.freezeAvailable = true;
    updates.freezeGrantedWeek = thisWeek;
  }

  if (state.dailyDate !== today) {
    updates.dailyDate = today;
    updates.dailyCompletedCount = 0;
    updates.goalMetToday = false;

    if (state.currentStreak > 0 && state.lastGoalMetDate) {
      const gap = daysBetween(today, state.lastGoalMetDate);
      if (gap > 1) {
        const freezeUsable = gap === 2 && (updates.freezeAvailable ?? state.freezeAvailable);
        if (freezeUsable) {
          updates.freezeAvailable = false;
        } else {
          updates.currentStreak = 0;
        }
      }
    }
  }

  return updates;
}
