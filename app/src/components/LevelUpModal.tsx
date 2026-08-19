import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  levelName: string;
  onClose: () => void;
}

const LEVEL_EMOJI: Record<string, string> = {
  Beginner: '🌱',
  Explorer: '🧭',
  Learner: '📘',
  Scholar: '🎓',
  Master: '👑',
};

/** Rare full-screen level-up moment (PRD 8.4). */
export default function LevelUpModal({ visible, levelName, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>{LEVEL_EMOJI[levelName] ?? '⭐'}</Text>
          <Text style={styles.heading}>Level up!</Text>
          <Text style={styles.level}>{levelName}</Text>
          <Text style={styles.subtitle}>Keep scrolling. Keep learning.</Text>
          <Pressable style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    padding: spacing.xl,
  },
  badge: { fontSize: 64 },
  heading: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  level: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.sm },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
