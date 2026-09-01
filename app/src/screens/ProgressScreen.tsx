import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DailyGoalBar from '../components/DailyGoalBar';
import LessonDetailModal from '../components/LessonDetailModal';
import WeeklyActivity from '../components/WeeklyActivity';
import { fetchSeries, fetchWeeklyLeaderboard, LeaderboardRow, searchLessons } from '../data/api';
import { capture } from '../lib/analytics';
import { getLevel } from '../lib/levels';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { useFeedStore } from '../stores/feedStore';
import { useProgressStore } from '../stores/progressStore';
import { goalLessonCount, useUserStore } from '../stores/userStore';
import { categoryColors, categoryLabels, colors, radii, spacing } from '../theme';
import type { Lesson, Series } from '../types';

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
  const language = useUserStore((s) => s.language);
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  const navigation = useNavigation();
  const loadSeries = useFeedStore((s) => s.loadSeries);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lesson[]>([]);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    void fetchSeries(language).then(setSeriesList);
  }, [language]);

  useEffect(() => {
    void fetchWeeklyLeaderboard().then(setBoard);
  }, []);

  // Local fallback board when signed out/offline: just your own weekly XP
  const weekAgo = Date.now() - 7 * 86400000;
  const localWeeklyXp = xpTransactions
    .filter((t) => Date.parse(t.createdAt) >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);
  const rows: LeaderboardRow[] =
    board ?? [{ displayName: 'You', weeklyXp: localWeeklyXp, isMe: true }];

  const startSeries = (series: Series) => {
    void loadSeries(series).then(() => {
      navigation.navigate('Feed' as never);
    });
  };

  // Debounced lesson search (PRD 6.2, Phase 2)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchLessons(trimmed, language).then((found) => {
        setResults(found);
        capture('lesson_searched', { query: trimmed, results: found.length });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, language]);

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

      <WeeklyActivity completedLessons={completedLessons} goalLessons={goalLessons} />

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

      <Text style={styles.sectionTitle}>Weekly leaderboard</Text>
      <View style={styles.boardCard}>
        {rows.map((row, index) => (
          <View key={`${row.displayName}-${index}`} style={styles.boardRow}>
            <Text style={styles.boardRank}>{index + 1}</Text>
            <Text style={[styles.boardName, row.isMe && styles.boardMe]} numberOfLines={1}>
              {row.displayName}
              {row.isMe ? ' (you)' : ''}
            </Text>
            <Text style={styles.boardXp}>{row.weeklyXp} XP</Text>
          </View>
        ))}
        {board === null && (
          <Text style={styles.boardHint}>
            Sign in and add friends from the Profile tab to compete.
          </Text>
        )}
        {board !== null && rows.length === 1 && (
          <Text style={styles.boardHint}>Add friends from the Profile tab to compete.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Deep dives</Text>
      {seriesList.map((series) => {
        const done = series.lessonIds.filter((id) => completedLessons[id]).length;
        const total = series.lessonIds.length;
        return (
          <Pressable key={series.id} style={styles.seriesCard} onPress={() => startSeries(series)}>
            <View style={styles.seriesHeader}>
              <View style={[styles.seriesPill, { backgroundColor: categoryColors[series.category] }]}>
                <Text style={styles.seriesPillText}>{categoryLabels[series.category]}</Text>
              </View>
              <Text style={styles.seriesProgress}>
                {done}/{total}
              </Text>
            </View>
            <Text style={styles.seriesTitle}>{series.title}</Text>
            <Text style={styles.seriesDescription} numberOfLines={2}>
              {series.description}
            </Text>
            <View style={styles.seriesTrack}>
              <View style={[styles.seriesFill, { width: `${(done / total) * 100}%` }]} />
            </View>
            <Text style={styles.seriesCta}>{done === 0 ? 'Start series ▸' : done === total ? 'Replay series ▸' : 'Continue ▸'}</Text>
          </Pressable>
        );
      })}

      <Text style={styles.sectionTitle}>Library</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search lessons…"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      {results.map((lesson) => (
        <Pressable key={lesson.id} style={styles.lessonRow} onPress={() => setOpenLesson(lesson)}>
          <View style={[styles.lessonDot, { backgroundColor: categoryColors[lesson.category] }]} />
          <View style={styles.lessonRowBody}>
            <Text style={styles.lessonRowTitle} numberOfLines={1}>
              {lesson.title}
            </Text>
            <Text style={styles.lessonRowMeta}>{categoryLabels[lesson.category]}</Text>
          </View>
          {completedLessons[lesson.id] && <Text style={styles.lessonRowDone}>✓</Text>}
        </Pressable>
      ))}
      {query.trim().length >= 2 && results.length === 0 && (
        <Text style={styles.empty}>No lessons match “{query.trim()}”.</Text>
      )}

      <Text style={styles.sectionTitle}>Saved lessons</Text>
      {Object.keys(bookmarks).length === 0 && (
        <Text style={styles.empty}>Tap 📑 on any lesson to save it for later.</Text>
      )}
      {Object.values(bookmarks).map((lesson) => (
        <Pressable key={lesson.id} style={styles.lessonRow} onPress={() => setOpenLesson(lesson)}>
          <View style={[styles.lessonDot, { backgroundColor: categoryColors[lesson.category] }]} />
          <View style={styles.lessonRowBody}>
            <Text style={styles.lessonRowTitle} numberOfLines={1}>
              {lesson.title}
            </Text>
            <Text style={styles.lessonRowMeta}>{categoryLabels[lesson.category]}</Text>
          </View>
          {completedLessons[lesson.id] && <Text style={styles.lessonRowDone}>✓</Text>}
        </Pressable>
      ))}

      <LessonDetailModal lesson={openLesson} onClose={() => setOpenLesson(null)} />

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
  searchInput: {
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lessonDot: { width: 8, height: 8, borderRadius: 4 },
  lessonRowBody: { flex: 1 },
  lessonRowTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  lessonRowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  lessonRowDone: { color: colors.success, fontSize: 14, fontWeight: '700' },
  seriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  seriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  seriesPill: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  seriesPillText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  seriesProgress: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  seriesTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  seriesDescription: { color: colors.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 },
  seriesTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  seriesFill: { height: '100%', backgroundColor: colors.primary },
  seriesCta: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: spacing.sm },
  boardCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  boardRank: { color: colors.textMuted, fontSize: 13, fontWeight: '800', width: 18 },
  boardName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  boardMe: { color: colors.primary },
  boardXp: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  boardHint: { color: colors.textMuted, fontSize: 12, paddingVertical: 6 },
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
