import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '../theme';
import type { Lesson } from '../types';

const SCREEN_H = Dimensions.get('window').height;
/** Sheet covers 55% of screen height (PRD 8.3) */
const SHEET_HEIGHT = SCREEN_H * 0.55;

type AnswerPhase = 'idle' | 'selected' | 'revealed';

interface Props {
  lesson: Lesson;
  visible: boolean;
  /** Consecutive correct answers this session — momentum display (no XP effect) */
  combo?: number;
  /** Curiosity teaser shown after answering (variable-reward anticipation) */
  nextLessonTitle?: string;
  onAnswered: (selectedIndex: number) => void;
  onNext: () => void;
}

/**
 * Quiz bottom sheet (PRD 5.4 / 8.3):
 * - spring slide-up (stiffness 180, damping 20)
 * - answer state machine: idle → selected (primary, 150ms) → revealed (green/red)
 * - correct answer always shown (REQ-006); no skip (REQ-005)
 * - "Next Lesson" CTA appears 1s after the answer
 */
export default function QuizBottomSheet({
  lesson,
  visible,
  combo = 0,
  nextLessonTitle,
  onAnswered,
  onNext,
}: Props) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const correctPop = useSharedValue(1);
  const [phase, setPhase] = useState<AnswerPhase>('idle');
  const [selected, setSelected] = useState<number | null>(null);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setSelected(null);
      setShowNext(false);
      translateY.value = withSpring(0, { stiffness: 180, damping: 20 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, lesson.id]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const correctPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: correctPop.value }],
  }));

  const handleAnswer = useCallback(
    (index: number) => {
      if (phase !== 'idle') return;
      setSelected(index);
      setPhase('selected');

      // Correct/incorrect colors reveal within 150ms of the tap (REQ-006)
      setTimeout(() => {
        setPhase('revealed');
        if (index === lesson.quizCorrectIndex) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // The correct option "pops" on reveal — a small dopamine punctuation
        correctPop.value = withSpring(1.06, { stiffness: 400, damping: 12 });
        setTimeout(() => {
          correctPop.value = withSpring(1, { stiffness: 300, damping: 18 });
        }, 160);
        onAnswered(index);
      }, 150);

      setTimeout(() => setShowNext(true), 150 + 1000);
    },
    [phase, lesson.quizCorrectIndex, onAnswered]
  );

  const optionStyle = (index: number) => {
    if (phase === 'idle') return styles.option;
    if (phase === 'selected') {
      return index === selected ? [styles.option, styles.optionSelected] : styles.option;
    }
    // revealed: correct always green, wrong selection red
    if (index === lesson.quizCorrectIndex) return [styles.option, styles.optionCorrect];
    if (index === selected) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  return (
    <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.grabber} />
      <Text style={styles.kicker}>Quick check</Text>
      <Text style={styles.question} numberOfLines={3}>
        {lesson.quizQuestion}
      </Text>
      <View style={styles.options}>
        {lesson.quizOptions.map((option, index) => (
          <Animated.View
            key={index}
            style={phase === 'revealed' && index === lesson.quizCorrectIndex ? correctPopStyle : undefined}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Answer option: ${option}`}
              accessibilityState={{ disabled: phase !== 'idle', selected: selected === index }}
              style={({ pressed }) => [
                ...(Array.isArray(optionStyle(index)) ? (optionStyle(index) as object[]) : [optionStyle(index)]),
                pressed && phase === 'idle' && styles.optionPressed,
              ]}
              onPress={() => handleAnswer(index)}
              disabled={phase !== 'idle'}
            >
              <Text style={styles.optionText} numberOfLines={2}>
                {option}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
      {phase === 'revealed' && (
        <View style={styles.feedbackWrap}>
          <Text style={styles.feedback}>
            {selected === lesson.quizCorrectIndex
              ? 'Correct! +5 XP'
              : 'Not quite — the correct answer is highlighted.'}
          </Text>
          {selected === lesson.quizCorrectIndex && combo >= 2 && (
            <Text style={styles.combo}>🔥 {combo} in a row!</Text>
          )}
        </View>
      )}
      {showNext && (
        <View style={styles.footer}>
          {!!nextLessonTitle && (
            <Text style={styles.upNext} numberOfLines={1}>
              Up next: <Text style={styles.upNextTitle}>{nextLessonTitle}</Text>
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next lesson"
            style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
            onPress={onNext}
          >
            <Text style={styles.nextText}>Next Lesson</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  question: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  options: { gap: 12 },
  option: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  optionCorrect: { borderColor: colors.success, backgroundColor: 'rgba(34,197,94,0.22)' },
  optionWrong: { borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.22)' },
  optionDimmed: { opacity: 0.45 },
  optionPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  feedbackWrap: { marginTop: spacing.md, alignItems: 'center', gap: 4 },
  feedback: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  combo: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  footer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
  upNext: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  upNextTitle: { color: colors.textSecondary, fontWeight: '700' },
  nextButton: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  nextButtonPressed: { transform: [{ scale: 0.98 }] },
  nextText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
