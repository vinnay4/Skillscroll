import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { capture } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import { DailyGoalMinutes, useUserStore } from '../stores/userStore';
import { categoryColors, categoryEmoji, categoryLabels, colors, radii, spacing } from '../theme';
import type { Category, Language } from '../types';

const ALL_TOPICS: Category[] = ['finance', 'technology', 'communication', 'productivity'];

const GOAL_OPTIONS: { minutes: DailyGoalMinutes; label: string; emoji: string; scrolls: string }[] = [
  { minutes: 5, label: 'Casual', emoji: '🌱', scrolls: '~5 lessons a day' },
  { minutes: 10, label: 'Regular', emoji: '🔥', scrolls: '~10 lessons a day' },
  { minutes: 15, label: 'Serious', emoji: '⚡', scrolls: '~15 lessons a day' },
];

/**
 * 3-screen onboarding (PRD Stage 4, REQ-010): topics → daily goal → sign-in.
 * No email, no password, skippable sign-in. Notification permission is NOT
 * requested here — it comes after the first completed lesson (REQ-023).
 */
export default function OnboardingFlow() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState<Category[]>([]);
  const [goal, setGoal] = useState<DailyGoalMinutes>(10);
  const [language, setLanguage] = useState<Language>('en');

  const setUserTopics = useUserStore((s) => s.setTopics);
  const setDailyGoal = useUserStore((s) => s.setDailyGoal);
  const setUserLanguage = useUserStore((s) => s.setLanguage);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

  const toggleTopic = (topic: Category) => {
    setTopics((current) =>
      current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic]
    );
  };

  const finish = async (provider: 'google' | 'apple' | 'anonymous') => {
    setUserTopics(topics);
    setDailyGoal(goal);
    setUserLanguage(language);

    let authUserId: string | null = null;
    if (supabase && provider !== 'anonymous') {
      try {
        // OAuth deep-link round trip; on failure the user proceeds anonymously
        // and can link the account later (REQ-011: anonymous sessions persist).
        await supabase.auth.signInWithOAuth({ provider });
        const { data } = await supabase.auth.getUser();
        authUserId = data.user?.id ?? null;
      } catch {
        authUserId = null;
      }
    }
    completeOnboarding('Learner', authUserId);
    capture('onboarding_completed', { topics, goal, language, provider });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {step === 0 && (
        <View style={styles.body}>
          <Text style={styles.brand}>SkillScroll</Text>
          <Text style={styles.tagline}>Learn in 60 seconds. While you scroll.</Text>
          <Text style={styles.heading}>What do you want to learn?</Text>
          <Text style={styles.subheading}>Pick 1–4 topics. You can change these anytime.</Text>
          <View style={styles.pillGrid}>
            {ALL_TOPICS.map((topic) => {
              const selected = topics.includes(topic);
              return (
                <Pressable
                  key={topic}
                  accessibilityRole="button"
                  accessibilityLabel={`Topic: ${categoryLabels[topic]}`}
                  accessibilityState={{ selected }}
                  onPress={() => toggleTopic(topic)}
                  style={({ pressed }) => [
                    styles.topicPill,
                    selected && { backgroundColor: categoryColors[topic], borderColor: categoryColors[topic] },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.topicText, selected && styles.topicTextSelected]}>
                    {categoryEmoji[topic]} {categoryLabels[topic]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.langRow}>
            {(['en', 'hi'] as Language[]).map((lang) => (
              <Pressable
                key={lang}
                onPress={() => setLanguage(lang)}
                style={[styles.langChip, language === lang && styles.langChipActive]}
              >
                <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                  {lang === 'en' ? 'English' : 'हिन्दी'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.cta, topics.length === 0 && styles.ctaDisabled]}
            disabled={topics.length === 0}
            onPress={() => setStep(1)}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 1 && (
        <View style={styles.body}>
          <Text style={styles.heading}>How much scrolling per day?</Text>
          <Text style={styles.subheading}>Your daily goal. Streaks are built on this.</Text>
          <View style={styles.goalList}>
            {GOAL_OPTIONS.map((option) => {
              const selected = goal === option.minutes;
              return (
                <Pressable
                  key={option.minutes}
                  accessibilityRole="button"
                  accessibilityLabel={`Daily goal: ${option.label}, ${option.scrolls}`}
                  accessibilityState={{ selected }}
                  onPress={() => setGoal(option.minutes)}
                  style={({ pressed }) => [
                    styles.goalCard,
                    selected && styles.goalCardActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalEmoji}>{option.emoji}</Text>
                    <View style={styles.goalHeaderText}>
                      <Text style={styles.goalLabel}>{option.label}</Text>
                      <Text style={styles.goalScrolls}>{option.scrolls}</Text>
                    </View>
                    {selected && <Text style={styles.goalCheck}>✓</Text>}
                  </View>
                  <Text style={styles.goalMinutes}>{option.minutes} min</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.cta} onPress={() => setStep(2)}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.body}>
          <Text style={styles.heading}>Save your progress?</Text>
          <Text style={styles.subheading}>
            Sign in to sync your streak and XP across devices. Or just start scrolling.
          </Text>
          <View style={styles.authList}>
            <Pressable style={styles.authButton} onPress={() => void finish('google')}>
              <Text style={styles.authText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.authButton} onPress={() => void finish('apple')}>
              <Text style={styles.authText}>Continue with Apple</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={() => void finish('anonymous')}>
              <Text style={styles.skipText}>Skip — start learning now</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  body: { flex: 1 },
  brand: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  tagline: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xl },
  pressed: { transform: [{ scale: 0.97 }] },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 36 },
  subheading: { color: colors.textSecondary, fontSize: 15, marginTop: spacing.sm, lineHeight: 22 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
  topicPill: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  topicText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  topicTextSelected: { color: colors.white },
  langRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  langChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  langChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  langText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  langTextActive: { color: colors.white },
  cta: {
    marginTop: 'auto',
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  goalList: { gap: spacing.md, marginTop: spacing.xl },
  goalCard: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  goalCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalEmoji: { fontSize: 28 },
  goalHeaderText: { flex: 1 },
  goalCheck: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  goalLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  goalScrolls: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  goalMinutes: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  authList: { gap: spacing.md, marginTop: spacing.xl },
  authButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: spacing.md },
  skipText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
