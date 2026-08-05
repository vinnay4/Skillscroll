// Pure-logic tests for XP, levels, and streak date math.
// Run: npm test (node --experimental-strip-types --test tests/)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyStreakBonus,
  getLevel,
  XP_LESSON_COMPLETE,
  XP_QUIZ_CORRECT,
} from '../app/src/lib/levels.ts';
import { daysBetween, todayKey, weekKey } from '../app/src/lib/dates.ts';
import { resolveRollover } from '../app/src/lib/streak.ts';

test('level thresholds match the PRD ladder', () => {
  assert.equal(getLevel(0).name, 'Beginner');
  assert.equal(getLevel(99).name, 'Beginner');
  assert.equal(getLevel(100).name, 'Explorer');
  assert.equal(getLevel(300).name, 'Learner');
  assert.equal(getLevel(700).name, 'Scholar');
  assert.equal(getLevel(1500).name, 'Master');
  assert.equal(getLevel(99999).name, 'Master');
});

test('next level XP boundary is exposed for progress display', () => {
  assert.equal(getLevel(0).nextMinXp, 100);
  assert.equal(getLevel(350).nextMinXp, 700);
  assert.equal(getLevel(2000).nextMinXp, null);
});

test('base XP values match PRD 5.3', () => {
  assert.equal(XP_LESSON_COMPLETE, 10);
  assert.equal(XP_QUIZ_CORRECT, 5);
});

test('streak bonus applies only from day 7', () => {
  assert.equal(applyStreakBonus(10, 0), 10);
  assert.equal(applyStreakBonus(10, 6), 10);
  assert.equal(applyStreakBonus(10, 7), 15);
  assert.equal(applyStreakBonus(5, 12), 8); // rounded 7.5 → 8
});

test('daysBetween handles month and year boundaries', () => {
  assert.equal(daysBetween('2026-08-02', '2026-08-01'), 1);
  assert.equal(daysBetween('2026-03-01', '2026-02-28'), 1);
  assert.equal(daysBetween('2027-01-01', '2026-12-31'), 1);
  assert.equal(daysBetween('2026-08-02', '2026-07-31'), 2);
});

test('todayKey formats as YYYY-MM-DD', () => {
  assert.match(todayKey(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('weekKey is stable within a week and changes across weeks', () => {
  // Mon 2026-07-27 through Sun 2026-08-02 share an ISO week
  assert.equal(weekKey(new Date(2026, 6, 27)), weekKey(new Date(2026, 7, 2)));
  assert.notEqual(weekKey(new Date(2026, 7, 2)), weekKey(new Date(2026, 7, 3)));
});

const baseState = {
  dailyDate: '2026-08-01',
  currentStreak: 5,
  lastGoalMetDate: '2026-08-01',
  freezeAvailable: true,
  freezeGrantedWeek: '2026-W31',
};

test('rollover: same day is a no-op (except weekly freeze grant)', () => {
  const updates = resolveRollover(baseState, '2026-08-01', '2026-W31');
  assert.deepEqual(updates, {});
});

test('rollover: streak survives when goal was met yesterday', () => {
  const updates = resolveRollover(baseState, '2026-08-02', '2026-W31');
  assert.equal(updates.dailyCompletedCount, 0);
  assert.equal(updates.goalMetToday, false);
  assert.equal(updates.currentStreak, undefined); // untouched
});

test('rollover: one fully-missed day consumes the freeze, streak survives', () => {
  const updates = resolveRollover(baseState, '2026-08-03', '2026-W31');
  assert.equal(updates.freezeAvailable, false);
  assert.equal(updates.currentStreak, undefined);
});

test('rollover: one missed day without a freeze resets the streak', () => {
  const updates = resolveRollover(
    { ...baseState, freezeAvailable: false },
    '2026-08-03',
    '2026-W31'
  );
  assert.equal(updates.currentStreak, 0);
});

test('rollover: two missed days reset the streak even with a freeze', () => {
  const updates = resolveRollover(baseState, '2026-08-04', '2026-W31');
  assert.equal(updates.currentStreak, 0);
  // freeze is preserved for future single-day misses
  assert.equal(updates.freezeAvailable, undefined);
});

test('rollover: new ISO week grants a fresh freeze', () => {
  const updates = resolveRollover(
    { ...baseState, freezeAvailable: false },
    '2026-08-01',
    '2026-W32'
  );
  assert.equal(updates.freezeAvailable, true);
  assert.equal(updates.freezeGrantedWeek, '2026-W32');
});

test('rollover: freshly granted freeze can cover a missed day in the same call', () => {
  const updates = resolveRollover(
    { ...baseState, freezeAvailable: false, freezeGrantedWeek: '2026-W31' },
    '2026-08-03',
    '2026-W32'
  );
  // week rolled over granting a freeze, which is then consumed by the gap
  assert.equal(updates.freezeAvailable, false);
  assert.equal(updates.freezeGrantedWeek, '2026-W32');
  assert.equal(updates.currentStreak, undefined);
});

test('rollover: zero streak never consumes a freeze', () => {
  const updates = resolveRollover(
    { ...baseState, currentStreak: 0, lastGoalMetDate: null },
    '2026-08-05',
    '2026-W31'
  );
  assert.equal(updates.freezeAvailable, undefined);
  assert.equal(updates.currentStreak, undefined);
});
