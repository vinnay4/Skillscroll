import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

/**
 * Single translucent guided overlay for the first session (PRD Stage 5):
 * "Swipe up to learn. Swipe left to skip. Tap to quiz."
 * Dismisses after the user's first swipe; never shown again.
 */
export default function FirstSwipeOverlay() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.hintBlock}>
        <Text style={styles.arrow}>↑</Text>
        <Text style={styles.hint}>Swipe up to learn</Text>
      </View>
      <View style={styles.hintBlock}>
        <Text style={styles.arrow}>←</Text>
        <Text style={styles.hint}>Swipe left to skip</Text>
      </View>
      <View style={styles.hintBlock}>
        <Text style={styles.arrow}>👆</Text>
        <Text style={styles.hint}>Tap to quiz</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    zIndex: 10,
  },
  hintBlock: { alignItems: 'center', gap: spacing.xs },
  arrow: { fontSize: 34, color: colors.white },
  hint: { fontSize: 18, color: colors.white, fontWeight: '700' },
});
