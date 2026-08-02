import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface Props {
  amount: number;
  /** Unique key per credit so consecutive identical amounts re-animate */
  triggerKey: number;
  onDone?: () => void;
}

/**
 * Floating "+N XP" text that drifts upward and fades out over 800ms
 * (PRD 8.4 dopamine trigger).
 */
export default function XPBadge({ amount, triggerKey, onDone }: Props) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = 0;
    opacity.value = 1;
    translateY.value = withTiming(-56, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[styles.text, style]}>+{amount} XP</Animated.Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
});
