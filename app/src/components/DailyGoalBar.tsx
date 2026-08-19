import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../theme';

interface Props {
  completed: number;
  goal: number;
}

/** Horizontal daily-goal progress bar (PRD 5.3). */
export default function DailyGoalBar({ completed, goal }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(1, goal > 0 ? completed / goal : 0), {
      duration: 400,
    });
  }, [completed, goal, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.label}>
        {Math.min(completed, goal)}/{goal}
      </Text>
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
  label: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
