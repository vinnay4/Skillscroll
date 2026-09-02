import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { todayKey } from '../lib/dates';
import { colors, radii, spacing } from '../theme';
import type { LessonProgress } from '../types';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_BAR = 44;

interface Props {
  completedLessons: Record<string, LessonProgress>;
  goalLessons: number;
}

/**
 * "Don't break the chain" strip: the last 7 days of lesson activity.
 * Goal-met days burn gold — a visible chain people won't want to break.
 */
export default function WeeklyActivity({ completedLessons, goalLessons }: Props) {
  const counts = new Map<string, number>();
  for (const entry of Object.values(completedLessons)) {
    const key = todayKey(new Date(entry.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: { key: string; initial: string; count: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = todayKey(date);
    days.push({
      key,
      initial: DAY_INITIALS[date.getDay()],
      count: counts.get(key) ?? 0,
      isToday: i === 0,
    });
  }

  const max = Math.max(goalLessons, ...days.map((d) => d.count), 1);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {days.map((day) => {
          const goalMet = day.count >= goalLessons && day.count > 0;
          const height = day.count === 0 ? 4 : Math.max(8, (day.count / max) * MAX_BAR);
          return (
            <View key={day.key} style={styles.col}>
              <Text style={styles.count}>{day.count > 0 ? day.count : ''}</Text>
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    day.count > 0 && !goalMet && styles.barActive,
                    goalMet && styles.barGoal,
                  ]}
                />
              </View>
              <Text style={[styles.day, day.isToday && styles.dayToday]}>
                {goalMet ? '🔥' : day.initial}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row' },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  count: { color: colors.textMuted, fontSize: 10, fontWeight: '700', height: 14 },
  barArea: { height: MAX_BAR, justifyContent: 'flex-end' },
  bar: {
    width: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  barActive: { backgroundColor: colors.primary },
  barGoal: { backgroundColor: colors.gold },
  day: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  dayToday: { color: colors.text },
});
