import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { shareLesson } from '../lib/share';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { categoryColors, categoryLabels, colors, radii, spacing } from '../theme';
import type { Lesson } from '../types';

interface Props {
  lesson: Lesson | null;
  onClose: () => void;
}

const SECTIONS: { key: 'structureHook' | 'structureConcept' | 'structureExample' | 'structureTakeaway'; label: string }[] = [
  { key: 'structureHook', label: 'Hook' },
  { key: 'structureConcept', label: 'Concept' },
  { key: 'structureExample', label: 'Example' },
  { key: 'structureTakeaway', label: 'Takeaway' },
];

/** Read-only lesson view used by search results and the saved-lessons list. */
export default function LessonDetailModal({ lesson, onClose }: Props) {
  const isBookmarked = useBookmarkStore((s) => (lesson ? !!s.bookmarks[lesson.id] : false));
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  if (!lesson) return null;
  const categoryColor = categoryColors[lesson.category];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={[styles.categoryPill, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryText}>{categoryLabels[lesson.category]}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{lesson.title}</Text>
            {SECTIONS.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: categoryColor }]}>{section.label}</Text>
                <Text style={styles.sectionText}>{lesson[section.key]}</Text>
              </View>
            ))}
            {!!lesson.tryThisToday && (
              <View style={styles.tryBox}>
                <Text style={styles.tryLabel}>Try this today</Text>
                <Text style={styles.tryText}>{lesson.tryThisToday}</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={() => toggleBookmark(lesson)}>
              <Text style={styles.actionText}>{isBookmarked ? '🔖 Saved' : '🔖 Save'}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => void shareLesson(lesson)}>
              <Text style={styles.actionText}>↗ Share</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryPill: { borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  categoryText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  close: { color: colors.textSecondary, fontSize: 18, padding: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: spacing.md },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  tryBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tryLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tryText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
