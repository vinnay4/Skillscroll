import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

/** HUD XP counter that pops on every credit (PRD 8.4 dopamine trigger). */
export default function XPTotal({ value }: { value: number }) {
  const scale = useSharedValue(1);
  const prev = useRef(value);

  useEffect(() => {
    if (value > prev.current) {
      scale.value = withSequence(
        withTiming(1.22, { duration: 140 }),
        withTiming(1, { duration: 260 })
      );
    }
    prev.current = value;
  }, [value, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.Text style={[styles.text, style]}>{value} XP</Animated.Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
