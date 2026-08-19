import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 180;
const PARTICLE_COLORS = [colors.primary, colors.accent, colors.white];
/** Full celebration ≤ 2.5s before returning to the feed (REQ-014) */
const DURATION_MS = 2200;

interface ParticleSpec {
  x: number;
  delay: number;
  fall: number;
  drift: number;
  size: number;
  color: string;
  rotate: number;
}

function Particle({ spec, progress }: { spec: ParticleSpec; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.85 ? 1 : (1 - p) / 0.15,
      transform: [
        { translateX: spec.x + spec.drift * p },
        { translateY: -40 + spec.fall * p },
        { rotate: `${spec.rotate * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size * 1.6,
          borderRadius: 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

interface Props {
  visible: boolean;
  onFinish: () => void;
}

/**
 * Full-screen daily-goal celebration: 180-particle confetti burst in 3 colors
 * with a success haptic (PRD 8.4), auto-dismissing within 2.5s (REQ-014).
 */
export default function ConfettiCelebration({ visible, onFinish }: Props) {
  const progress = useSharedValue(0);

  const particles = useMemo<ParticleSpec[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: Math.random() * SCREEN_W,
        delay: Math.random() * 250,
        fall: SCREEN_H * (0.7 + Math.random() * 0.5),
        drift: (Math.random() - 0.5) * 160,
        size: 6 + Math.random() * 6,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        rotate: (Math.random() - 0.5) * 720,
      })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    progress.value = 0;
    progress.value = withDelay(
      50,
      withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.quad) })
    );
    const timer = setTimeout(onFinish, DURATION_MS + 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((spec, i) => (
        <Particle key={i} spec={spec} progress={progress} />
      ))}
      <View style={styles.messageWrap}>
        <Text style={styles.title}>Daily goal complete!</Text>
        <Text style={styles.subtitle}>Streak extended 🔥</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 10,
  },
  subtitle: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 10,
  },
});
