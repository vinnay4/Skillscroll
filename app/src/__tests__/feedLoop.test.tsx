import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FeedScreen from '../screens/FeedScreen';
import { useFeedStore } from '../stores/feedStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  useProgressStore.getState().resetAll();
  useFeedStore.setState({
    lessons: [],
    currentIndex: 0,
    feedLanguage: null,
    feedTopicsKey: null,
    activeSeriesId: null,
    seenIds: [],
    hiddenIds: [],
  });
  useUserStore.setState({
    onboarded: true,
    topics: ['finance'],
    language: 'en',
    dailyGoalMinutes: 5,
    overlayDismissed: true,
    notificationPromptShown: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * End-to-end core loop (PRD Stage 6): feed loads → user taps through the
 * 4-part lesson → quiz appears → answering credits XP and daily-goal progress.
 */
describe('scroll-to-learn core loop', () => {
  it('plays a lesson through the quiz and credits XP', async () => {
    await render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <FeedScreen />
      </SafeAreaProvider>
    );

    // Let the feed hydration + load settle
    await flush();
    await advance(50);
    await flush();

    const lesson = useFeedStore.getState().lessons[0];
    expect(lesson).toBeDefined();
    expect(lesson.category).toBe('finance'); // topic-ranked feed

    // Tap through Hook → Concept → Example → Takeaway → lesson end
    const card = screen.getByLabelText(
      `Lesson: ${lesson.title}. Tap to continue, long-press to report an issue.`
    );
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(card);
      await flush();
    }

    // Quiz appears within 300ms of lesson end (REQ-004)
    await advance(150);
    expect(screen.getByText(lesson.quizQuestion)).toBeTruthy();

    // Answer correctly → 150ms reveal → XP credited (REQ-006, REQ-013)
    const correctOption = lesson.quizOptions[lesson.quizCorrectIndex];
    await fireEvent.press(screen.getByLabelText(`Answer option: ${correctOption}`));
    await advance(150);

    const progress = useProgressStore.getState();
    expect(progress.totalXp).toBe(15); // 10 lesson + 5 correct quiz
    expect(progress.dailyCompletedCount).toBe(1);
    expect(progress.completedLessons[lesson.id].quizCorrect).toBe(true);
    expect(useFeedStore.getState().seenIds).toContain(lesson.id);

    // "Next Lesson" CTA appears 1s later (PRD 8.3)
    await advance(1000);
    expect(screen.getByText('Next Lesson')).toBeTruthy();
  });

  it('a wrong answer still completes the lesson but without quiz XP', async () => {
    await render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <FeedScreen />
      </SafeAreaProvider>
    );
    await flush();
    await advance(50);
    await flush();

    const lesson = useFeedStore.getState().lessons[0];
    const card = screen.getByLabelText(
      `Lesson: ${lesson.title}. Tap to continue, long-press to report an issue.`
    );
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(card);
      await flush();
    }
    await advance(150);

    const wrongIndex = (lesson.quizCorrectIndex + 1) % 4;
    await fireEvent.press(
      screen.getByLabelText(`Answer option: ${lesson.quizOptions[wrongIndex]}`)
    );
    await advance(150);

    const progress = useProgressStore.getState();
    expect(progress.totalXp).toBe(10); // lesson XP only
    expect(progress.completedLessons[lesson.id].quizCorrect).toBe(false);
    // Correct answer is still revealed (REQ-006)
    expect(screen.getByText('Not quite — the correct answer is highlighted.')).toBeTruthy();
  });
});
