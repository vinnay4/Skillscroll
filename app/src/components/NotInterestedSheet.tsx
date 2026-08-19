import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import type { NotInterestedReason } from '../types';

const REASONS: { key: NotInterestedReason; label: string }[] = [
  { key: 'already_know', label: 'Already know this' },
  { key: 'wrong_topic', label: 'Wrong topic' },
  { key: 'too_basic', label: 'Too basic' },
];

interface Props {
  visible: boolean;
  onSelect: (reason: NotInterestedReason) => void;
  onDismiss: () => void;
}

/** Swipe-left "Not interested" sheet with 3 reason chips (PRD 8.1). */
export default function NotInterestedSheet({ visible, onSelect, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Not interested?</Text>
          <Text style={styles.subtitle}>This helps us tune your feed.</Text>
          <View style={styles.chips}>
            {REASONS.map((reason) => (
              <Pressable key={reason.key} style={styles.chip} onPress={() => onSelect(reason.key)}>
                <Text style={styles.chipText}>{reason.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
