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
export default function QuizBottomSheet({ lesson, visible, onAnswered, onNext }: Props) {
  const translateY = useSharedValue(SHEET_HEIGHT);
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
          <Pressable
            key={index}
            style={optionStyle(index)}
            onPress={() => handleAnswer(index)}
            disabled={phase !== 'idle'}
          >
            <Text style={styles.optionText} numberOfLines={2}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      {phase === 'revealed' && (
        <Text style={styles.feedback}>
          {selected === lesson.quizCorrectIndex
            ? 'Correct! +5 XP'
            : 'Not quite — the correct answer is highlighted.'}
        </Text>
      )}
      {showNext && (
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextText}>Next Lesson</Text>
        </Pressable>
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
  optionText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  feedback: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  nextButton: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
