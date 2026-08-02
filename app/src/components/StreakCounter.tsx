import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../theme';

interface Props {
  streak: number;
}

/**
 * Streak counter with the PRD 8.4 increment animation:
 * scale 1 → 1.3 → 1 with a golden glow, 600ms total.
 */
export default function StreakCounter({ streak }: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const prev = useRef(streak);

  useEffect(() => {
    if (streak > prev.current) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 400 })
      );
      glow.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 400 })
      );
    }
    prev.current = streak;
  }, [streak, scale, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.flame}>🔥</Text>
      <View>
        <Text style={styles.number}>{streak}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    shadowColor: colors.gold,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  flame: { fontSize: 14 },
  number: { color: colors.gold, fontWeight: '800', fontSize: 15 },
});
