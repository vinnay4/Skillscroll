import { todayKey, yesterdayKey } from '../lib/dates';
import { useProgressStore } from '../stores/progressStore';
import type { Lesson } from '../types';

const lesson = (id: string): Lesson => ({
  id,
  title: `Lesson ${id}`,
  category: 'finance',
  durationSeconds: 45,
  videoUrl: null,
  thumbnailUrl: null,
  quizQuestion: 'Q?',
  quizOptions: ['a', 'b', 'c', 'd'],
  quizCorrectIndex: 2,
  structureHook: 'hook',
  structureConcept: 'concept',
  structureExample: 'example',
  structureTakeaway: 'takeaway',
  qualityScore: 80,
  language: 'en',
});

const GOAL = 3;

beforeEach(() => {
  useProgressStore.getState().resetAll();
});

describe('completeLesson XP accounting (PRD 5.3, REQ-013)', () => {
  it('awards 10 XP for a lesson with a wrong quiz answer', () => {
    const result = useProgressStore.getState().completeLesson(lesson('l1'), 0, GOAL);
    expect(result.xpEarned).toBe(10);
    expect(result.quizCorrect).toBe(false);
    expect(useProgressStore.getState().totalXp).toBe(10);
  });

  it('awards 10 + 5 XP for a correct quiz answer', () => {
    const result = useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    expect(result.xpEarned).toBe(15);
    expect(result.quizCorrect).toBe(true);
    expect(useProgressStore.getState().totalXp).toBe(15);
  });

  it('applies the 1.5x streak bonus from day 7 (10→15, 5→8)', () => {
    useProgressStore.setState({ currentStreak: 7 });
    const result = useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    expect(result.xpEarned).toBe(23);
  });

  it('records the completion with quiz outcome', () => {
    useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    const entry = useProgressStore.getState().completedLessons['l1'];
    expect(entry.quizAnswered).toBe(true);
    expect(entry.quizCorrect).toBe(true);
  });

  it('is idempotent: replaying a lesson awards no XP and no goal progress', () => {
    useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    const before = useProgressStore.getState();
    const replay = useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    expect(replay.xpEarned).toBe(0);
    expect(replay.goalMet).toBe(false);
    expect(useProgressStore.getState().totalXp).toBe(before.totalXp);
    expect(useProgressStore.getState().dailyCompletedCount).toBe(before.dailyCompletedCount);
  });
});

describe('daily goal and streak (REQ-007)', () => {
  it('increments the streak the moment the goal count is reached, not before', () => {
    const store = useProgressStore.getState();
    expect(store.completeLesson(lesson('l1'), 2, GOAL).streakIncremented).toBe(false);
    expect(useProgressStore.getState().completeLesson(lesson('l2'), 2, GOAL).streakIncremented).toBe(false);
    const third = useProgressStore.getState().completeLesson(lesson('l3'), 2, GOAL);
    expect(third.goalMet).toBe(true);
    expect(third.streakIncremented).toBe(true);
    expect(useProgressStore.getState().currentStreak).toBe(1);
    expect(useProgressStore.getState().lastGoalMetDate).toBe(todayKey());
  });

  it('does not increment the streak twice on the same day', () => {
    for (const id of ['l1', 'l2', 'l3']) {
      useProgressStore.getState().completeLesson(lesson(id), 2, GOAL);
    }
    const fourth = useProgressStore.getState().completeLesson(lesson('l4'), 2, GOAL);
    expect(fourth.goalMet).toBe(false);
    expect(fourth.streakIncremented).toBe(false);
    expect(useProgressStore.getState().currentStreak).toBe(1);
  });

  it('tracks the longest streak', () => {
    useProgressStore.setState({ currentStreak: 4, longestStreak: 4 });
    for (const id of ['l1', 'l2', 'l3']) {
      useProgressStore.getState().completeLesson(lesson(id), 2, GOAL);
    }
    expect(useProgressStore.getState().currentStreak).toBe(5);
    expect(useProgressStore.getState().longestStreak).toBe(5);
  });
});

describe('level progression (PRD 5.3)', () => {
  it('reports a level-up when crossing an XP threshold', () => {
    useProgressStore.setState({ totalXp: 95 });
    const result = useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    expect(result.leveledUp).toBe(true);
    expect(result.levelName).toBe('Explorer');
  });

  it('does not report a level-up within the same level', () => {
    useProgressStore.setState({ totalXp: 10 });
    const result = useProgressStore.getState().completeLesson(lesson('l1'), 2, GOAL);
    expect(result.leveledUp).toBe(false);
  });
});

describe('day rollover integration (REQ-009)', () => {
  it('resets daily counters on a new day but keeps a fresh streak alive', () => {
    for (const id of ['l1', 'l2', 'l3']) {
      useProgressStore.getState().completeLesson(lesson(id), 2, GOAL);
    }
    // Simulate the app reopening the next day
    useProgressStore.setState({ dailyDate: yesterdayKey(), lastGoalMetDate: yesterdayKey() });
    useProgressStore.getState().rolloverIfNeeded();

    const state = useProgressStore.getState();
    expect(state.dailyDate).toBe(todayKey());
    expect(state.dailyCompletedCount).toBe(0);
    expect(state.goalMetToday).toBe(false);
    expect(state.currentStreak).toBe(1);
  });

  it('merges remote progress without losing local progress (REQ-019)', () => {
    useProgressStore.getState().completeLesson(lesson('local'), 2, GOAL);
    useProgressStore.getState().mergeRemote({
      totalXp: 500,
      currentStreak: 9,
      longestStreak: 12,
      completed: [
        {
          lessonId: 'remote',
          completedAt: new Date().toISOString(),
          quizAnswered: true,
          quizCorrect: true,
          watchPercentage: 100,
        },
      ],
    });
    const state = useProgressStore.getState();
    expect(state.totalXp).toBe(500);
    expect(state.currentStreak).toBe(9);
    expect(state.completedLessons['local']).toBeDefined();
    expect(state.completedLessons['remote']).toBeDefined();
  });
});
