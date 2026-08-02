import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLevel } from '../lib/levels';
import { useFeedStore } from '../stores/feedStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';
import { categoryColors, categoryLabels, colors, radii, spacing } from '../theme';

const LEVEL_EMOJI: Record<string, string> = {
  Beginner: '🌱',
  Explorer: '🧭',
  Learner: '📘',
  Scholar: '🎓',
  Master: '👑',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const displayName = useUserStore((s) => s.displayName);
  const authUserId = useUserStore((s) => s.authUserId);
  const topics = useUserStore((s) => s.topics);
  const dailyGoalMinutes = useUserStore((s) => s.dailyGoalMinutes);
  const language = useUserStore((s) => s.language);
  const resetUser = useUserStore((s) => s.resetAll);

  const totalXp = useProgressStore((s) => s.totalXp);
  const longestStreak = useProgressStore((s) => s.longestStreak);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const resetProgress = useProgressStore((s) => s.resetAll);

  const level = getLevel(totalXp);
  const lessonsCompleted = Object.keys(completedLessons).length;

  const handleReset = () => {
    Alert.alert('Reset everything?', 'Your streak, XP and progress will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProgress();
          useFeedStore.setState({ seenIds: [], hiddenIds: [], lessons: [], currentIndex: 0 });
          resetUser();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg }}
    >
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.headerCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>{LEVEL_EMOJI[level.name] ?? '⭐'}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.levelName}>
          {level.name} · {totalXp} XP
        </Text>
        <Text style={styles.accountType}>
          {authUserId ? 'Signed in' : 'Anonymous session — progress saved on this device'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{lessonsCompleted}</Text>
          <Text style={styles.statLabel}>Lessons completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Longest streak</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your topics</Text>
      <View style={styles.topicRow}>
        {topics.length === 0 && <Text style={styles.muted}>All topics</Text>}
        {topics.map((topic) => (
          <View key={topic} style={[styles.topicPill, { backgroundColor: categoryColors[topic] }]}>
            <Text style={styles.topicText}>{categoryLabels[topic]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Daily goal</Text>
        <Text style={styles.settingValue}>{dailyGoalMinutes} min</Text>
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Language</Text>
        <Text style={styles.settingValue}>{language === 'en' ? 'English' : 'हिन्दी'}</Text>
      </View>

      <Pressable style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetText}>Reset all progress</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screenTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg },
  headerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  badgeEmoji: { fontSize: 40 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  levelName: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  accountType: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topicPill: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7 },
  topicText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingLabel: { color: colors.textSecondary, fontSize: 14 },
  settingValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  resetButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.error,
  },
  resetText: { color: colors.error, fontSize: 14, fontWeight: '700' },
});
