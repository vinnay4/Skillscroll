import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addFriendByCode, fetchMyFriendCode } from '../data/api';
import { FAQ_ITEMS, SUPPORT_EMAIL } from '../data/faq';
import { capture } from '../lib/analytics';
import { getLevel } from '../lib/levels';
import { useFeedStore } from '../stores/feedStore';
import { useProgressStore } from '../stores/progressStore';
import { DailyGoalMinutes, useUserStore } from '../stores/userStore';
import { categoryColors, categoryLabels, colors, radii, spacing } from '../theme';
import type { Category } from '../types';

const ALL_TOPICS: Category[] = ['finance', 'technology', 'communication', 'productivity'];
const GOAL_OPTIONS: DailyGoalMinutes[] = [5, 10, 15];

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
  const setTopics = useUserStore((s) => s.setTopics);
  const dailyGoalMinutes = useUserStore((s) => s.dailyGoalMinutes);
  const setDailyGoal = useUserStore((s) => s.setDailyGoal);
  const language = useUserStore((s) => s.language);
  const setLanguage = useUserStore((s) => s.setLanguage);
  const resetUser = useUserStore((s) => s.resetAll);

  const totalXp = useProgressStore((s) => s.totalXp);
  const longestStreak = useProgressStore((s) => s.longestStreak);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const resetProgress = useProgressStore((s) => s.resetAll);

  const level = getLevel(totalXp);
  const lessonsCompleted = Object.keys(completedLessons).length;

  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (authUserId) void fetchMyFriendCode().then(setFriendCode);
  }, [authUserId]);

  const handleAddFriend = async () => {
    const code = codeInput.trim();
    if (!code) return;
    const result = await addFriendByCode(code);
    if (result.friendName) {
      setFriendStatus(`You and ${result.friendName} are now friends!`);
      setCodeInput('');
      capture('friend_added');
    } else {
      setFriendStatus(result.error ?? 'Something went wrong');
    }
  };

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
        {ALL_TOPICS.map((topic) => {
          const selected = topics.includes(topic);
          return (
            <Pressable
              key={topic}
              style={[
                styles.topicPill,
                selected
                  ? { backgroundColor: categoryColors[topic] }
                  : styles.topicPillInactive,
              ]}
              onPress={() => {
                // At least one topic must stay selected to keep the feed ranked
                const next = selected ? topics.filter((t) => t !== topic) : [...topics, topic];
                if (next.length > 0) setTopics(next);
              }}
            >
              <Text style={[styles.topicText, !selected && styles.topicTextInactive]}>
                {categoryLabels[topic]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.muted}>Tap to add or remove — your feed updates instantly.</Text>

      <Text style={styles.sectionTitle}>Friends</Text>
      {friendCode ? (
        <View style={styles.friendCard}>
          <Text style={styles.friendLabel}>Your friend code</Text>
          <Text style={styles.friendCode}>{friendCode}</Text>
          <View style={styles.friendInputRow}>
            <TextInput
              style={styles.friendInput}
              placeholder="Enter a friend's code"
              placeholderTextColor={colors.textMuted}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Pressable style={styles.friendAdd} onPress={() => void handleAddFriend()}>
              <Text style={styles.friendAddText}>Add</Text>
            </Pressable>
          </View>
          {friendStatus && <Text style={styles.friendStatus}>{friendStatus}</Text>}
        </View>
      ) : (
        <Text style={styles.muted}>
          Sign in to get a friend code and compete on the weekly leaderboard.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Daily goal</Text>
        <View style={styles.goalSegment}>
          {GOAL_OPTIONS.map((minutes) => (
            <Pressable
              key={minutes}
              style={[styles.goalOption, dailyGoalMinutes === minutes && styles.goalOptionActive]}
              onPress={() => setDailyGoal(minutes)}
            >
              <Text
                style={[
                  styles.goalOptionText,
                  dailyGoalMinutes === minutes && styles.goalOptionTextActive,
                ]}
              >
                {minutes}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        style={styles.settingRow}
        onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      >
        <Text style={styles.settingLabel}>Language (tap to switch)</Text>
        <Text style={styles.settingValue}>{language === 'en' ? 'English' : 'हिन्दी'}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Help &amp; FAQ</Text>
      {FAQ_ITEMS.map((item, index) => (
        <Pressable
          key={index}
          style={styles.faqCard}
          onPress={() => setOpenFaq(openFaq === index ? null : index)}
        >
          <View style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.faqChevron}>{openFaq === index ? '▾' : '▸'}</Text>
          </View>
          {openFaq === index && <Text style={styles.faqAnswer}>{item.answer}</Text>}
        </Pressable>
      ))}
      <Pressable
        style={styles.contactRow}
        onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=SkillScroll%20support`)}
      >
        <Text style={styles.contactText}>Still stuck? Email {SUPPORT_EMAIL} — 24h response</Text>
      </Pressable>

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
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  topicPill: { borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7 },
  topicPillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  topicTextInactive: { color: colors.textMuted },
  goalSegment: { flexDirection: 'row', gap: 6 },
  goalOption: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  goalOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  goalOptionTextActive: { color: colors.white },
  muted: { color: colors.textMuted, fontSize: 13 },
  friendCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  friendLabel: { color: colors.textMuted, fontSize: 12 },
  friendCode: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  friendInputRow: { flexDirection: 'row', gap: spacing.sm },
  friendInput: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  friendAdd: {
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  friendAddText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  friendStatus: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  faqChevron: { color: colors.textMuted, fontSize: 14 },
  faqAnswer: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  contactRow: { paddingVertical: spacing.md, alignItems: 'center' },
  contactText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
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
