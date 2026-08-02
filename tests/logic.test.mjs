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
