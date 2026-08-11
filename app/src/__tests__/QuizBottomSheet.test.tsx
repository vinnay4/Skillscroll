import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import QuizBottomSheet from '../components/QuizBottomSheet';
import type { Lesson } from '../types';

const lesson: Lesson = {
  id: 'quiz-test',
  title: 'Quiz test lesson',
  category: 'technology',
  durationSeconds: 45,
  videoUrl: null,
  thumbnailUrl: null,
  quizQuestion: 'What is 2 + 2?',
  quizOptions: ['Three', 'Four', 'Five', 'Six'],
  quizCorrectIndex: 1,
  structureHook: 'hook',
  structureConcept: 'concept',
  structureExample: 'example',
  structureTakeaway: 'takeaway',
  qualityScore: 80,
  language: 'en',
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('quiz answer state machine (PRD 8.3, REQ-004/005/006)', () => {
  it('renders the question and all 4 options', async () => {
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={jest.fn()} onNext={jest.fn()} />
    );
    expect(screen.getByText('What is 2 + 2?')).toBeTruthy();
    for (const option of lesson.quizOptions) {
      expect(screen.getByText(option)).toBeTruthy();
    }
  });

  it('reveals the outcome ~150ms after tapping and reports the answer', async () => {
    const onAnswered = jest.fn();
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={onAnswered} onNext={jest.fn()} />
    );

    await fireEvent.press(screen.getByText('Four'));
    expect(onAnswered).not.toHaveBeenCalled(); // selected state first

    await advance(150);
    expect(onAnswered).toHaveBeenCalledWith(1);
    expect(screen.getByText('Correct! +5 XP')).toBeTruthy();
  });

  it('always shows the correct answer, even after a wrong tap (REQ-006)', async () => {
    const onAnswered = jest.fn();
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={onAnswered} onNext={jest.fn()} />
    );

    await fireEvent.press(screen.getByText('Six'));
    await advance(150);

    expect(onAnswered).toHaveBeenCalledWith(3);
    expect(
      screen.getByText('Not quite — the correct answer is highlighted.')
    ).toBeTruthy();
  });

  it('locks the options after the first answer (no retry, REQ-005)', async () => {
    const onAnswered = jest.fn();
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={onAnswered} onNext={jest.fn()} />
    );

    await fireEvent.press(screen.getByText('Six'));
    await advance(150);
    await fireEvent.press(screen.getByText('Four')); // second attempt must be ignored

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  it('shows the Next Lesson CTA 1s after the answer and forwards the tap', async () => {
    const onNext = jest.fn();
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={jest.fn()} onNext={onNext} />
    );

    await fireEvent.press(screen.getByText('Four'));
    await advance(150);
    expect(screen.queryByText('Next Lesson')).toBeNull();

    await advance(1000);
    await fireEvent.press(screen.getByText('Next Lesson'));
    expect(onNext).toHaveBeenCalled();
  });

  it('resets to a fresh state for the next lesson', async () => {
    await render(
      <QuizBottomSheet lesson={lesson} visible onAnswered={jest.fn()} onNext={jest.fn()} />
    );
    await fireEvent.press(screen.getByText('Four'));
    await advance(1150);

    const nextLesson = { ...lesson, id: 'quiz-test-2', quizQuestion: 'Next question?' };
    await screen.rerender(
      <QuizBottomSheet lesson={nextLesson} visible onAnswered={jest.fn()} onNext={jest.fn()} />
    );
    expect(screen.getByText('Next question?')).toBeTruthy();
    expect(screen.queryByText('Next Lesson')).toBeNull();
    expect(screen.queryByText('Correct! +5 XP')).toBeNull();
  });
});
