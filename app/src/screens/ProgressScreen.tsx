import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DailyGoalBar from '../components/DailyGoalBar';
import { getLevel } from '../lib/levels';
import { useProgressStore } from '../stores/progressStore';
import { goalLessonCount, useUserStore } from '../stores/userStore';
import { colors, radii, spacing } from '../theme';

const REASON_LABELS: Record<string, string> = {
  lesson_complete: 'Lesson completed',
  quiz_correct: 'Correct quiz answer',
  streak_bonus: 'Streak bonus',
  daily_goal: 'Daily goal',
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const totalXp = useProgressStore((s) => s.totalXp);
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const longestStreak = useProgressStore((s) => s.longestStreak);
  const freezeAvailable = useProgressStore((s) => s.freezeAvailable);
  const dailyCompletedCount = useProgressStore((s) => s.dailyCompletedCount);
  const goalMetToday = useProgressStore((s) => s.goalMetToday);
  const xpTransactions = useProgressStore((s) => s.xpTransactions);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const dailyGoalMinutes = useUserStore((s) => s.dailyGoalMinutes);

  const level = getLevel(totalXp);
  const goalLessons = goalLessonCount(dailyGoalMinutes);
  const lessonsCompleted = Object.keys(completedLessons).length;
  const quizCorrectCount = Object.values(completedLessons).filter((p) => p.quizCorrect).length;
  const accuracy = lessonsCompleted > 0 ? Math.round((quizCorrectCount / lessonsCompleted) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg }}
    >
      <Text style={styles.screenTitle}>Progress</Text>

      <View style={styles.streakCard}>
        <Text style={styles.streakFlame}>🔥</Text>
        <Text style={styles.streakNumber}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
        <View style={styles.streakMetaRow}>
          <Text style={styles.streakMeta}>Longest: {longestStreak} days</Text>
          <Text style={styles.streakMeta}>
            Freeze: {freezeAvailable ? '1 available ❄️' : 'used this week'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today&apos;s goal</Text>
        <View style={styles.goalRow}>
          <DailyGoalBar completed={dailyCompletedCount} goal={goalLessons} />
        </View>
        <Text style={styles.cardSubtext}>
          {goalMetToday
            ? 'Goal complete — streak secured for today.'
            : `${Math.max(0, goalLessons - dailyCompletedCount)} lessons to keep your streak.`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalXp}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{lessonsCompleted}</Text>
          <Text style={styles.statLabel}>Lessons</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{accuracy}%</Text>
          <Text style={styles.statLabel}>Quiz accuracy</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Level: {level.name}</Text>
        {level.nextMinXp !== null ? (
          <Text style={styles.cardSubtext}>
            {level.nextMinXp - totalXp} XP to the next level
          </Text>
        ) : (
          <Text style={styles.cardSubtext}>Top level reached. Legend.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent XP</Text>
      {xpTransactions.length === 0 && (
        <Text style={styles.empty}>Complete your first lesson to start earning XP.</Text>
      )}
      {xpTransactions.slice(0, 20).map((t) => (
        <View key={t.id} style={styles.txRow}>
          <Text style={styles.txReason}>{REASON_LABELS[t.reason] ?? t.reason}</Text>
          <Text style={styles.txAmount}>+{t.amount} XP</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screenTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg },
  streakCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  streakFlame: { fontSize: 40 },
  streakNumber: { color: colors.gold, fontSize: 48, fontWeight: '800', lineHeight: 54 },
  streakLabel: { color: colors.textSecondary, fontSize: 14 },
  streakMetaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  streakMeta: { color: colors.textMuted, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  cardSubtext: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm },
  goalRow: { flexDirection: 'row' },
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
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  empty: { color: colors.textMuted, fontSize: 13 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txReason: { color: colors.textSecondary, fontSize: 13 },
  txAmount: { color: colors.success, fontSize: 13, fontWeight: '700' },
});
