import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../theme';

interface Props {
  completed: number;
  goal: number;
}

/**
 * Horizontal daily-goal progress bar (PRD 5.3) with goal-gradient mechanics:
 * near the goal the bar pulses and the label switches to "N to go!" —
 * people measurably accelerate as a goal gets close.
 */
export default function DailyGoalBar({ completed, goal }: Props) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  const remaining = Math.max(0, goal - completed);
  const goalMet = remaining === 0 && goal > 0;
  const nearGoal = !goalMet && completed > 0 && remaining <= 2;

  useEffect(() => {
    progress.value = withTiming(Math.min(1, goal > 0 ? completed / goal : 0), {
      duration: 400,
    });
  }, [completed, goal, progress]);

  useEffect(() => {
    if (nearGoal) {
      pulse.value = withRepeat(
        withSequence(withTiming(0.55, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [nearGoal, pulse]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    opacity: pulse.value,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, goalMet && styles.fillDone, fillStyle]}
        />
      </View>
      {goalMet ? (
        <Text style={styles.labelDone}>✓ goal</Text>
      ) : nearGoal ? (
        <Text style={styles.labelNear}>{remaining} to go!</Text>
      ) : (
        <Text style={styles.label}>
          {Math.min(completed, goal)}/{goal}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  fillDone: { backgroundColor: colors.gold },
  label: { color: colors.white, fontSize: 12, fontWeight: '700' },
  labelNear: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  labelDone: { color: colors.gold, fontSize: 12, fontWeight: '800' },
});
