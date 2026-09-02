import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfettiCelebration from '../components/ConfettiCelebration';
import DailyGoalBar from '../components/DailyGoalBar';
import FeedbackSheet from '../components/FeedbackSheet';
import FirstSwipeOverlay from '../components/FirstSwipeOverlay';
import LessonCard from '../components/LessonCard';
import LevelUpModal from '../components/LevelUpModal';
import NotInterestedSheet from '../components/NotInterestedSheet';
import QuizBottomSheet from '../components/QuizBottomSheet';
import StreakCounter from '../components/StreakCounter';
import XPBadge from '../components/XPBadge';
import XPTotal from '../components/XPTotal';
import {
  cancelStreakReminderForToday,
  requestPermissionAfterFirstLesson,
  scheduleStreakReminder,
} from '../services/notifications';
import { shareLesson } from '../lib/share';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { useFeedStore } from '../stores/feedStore';
import { CompletionResult, useProgressStore } from '../stores/progressStore';
import { goalLessonCount, useUserStore } from '../stores/userStore';
import { colors, spacing } from '../theme';
import type { Lesson, NotInterestedReason } from '../types';

const SCREEN_H = Dimensions.get('window').height;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Lesson>>(null);

  const topics = useUserStore((s) => s.topics);
  const language = useUserStore((s) => s.language);
  const dailyGoalMinutes = useUserStore((s) => s.dailyGoalMinutes);
  const soundOn = useUserStore((s) => s.soundOn);
  const toggleSound = useUserStore((s) => s.toggleSound);
  const overlayDismissed = useUserStore((s) => s.overlayDismissed);
  const dismissOverlay = useUserStore((s) => s.dismissOverlay);
  const notificationPromptShown = useUserStore((s) => s.notificationPromptShown);
  const markNotificationPromptShown = useUserStore((s) => s.markNotificationPromptShown);

  const lessons = useFeedStore((s) => s.lessons);
  const loading = useFeedStore((s) => s.loading);
  const currentIndex = useFeedStore((s) => s.currentIndex);
  const feedVersion = useFeedStore((s) => s.feedVersion);
  const loadFeed = useFeedStore((s) => s.loadFeed);
  const extendFeed = useFeedStore((s) => s.extendFeed);
  const markSeen = useFeedStore((s) => s.markSeen);
  const markNotInterested = useFeedStore((s) => s.markNotInterested);

  const totalXp = useProgressStore((s) => s.totalXp);
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const dailyCompletedCount = useProgressStore((s) => s.dailyCompletedCount);
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const completedLessons = useProgressStore((s) => s.completedLessons);

  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  const [quizVisible, setQuizVisible] = useState(false);
  /** Consecutive correct answers this session — momentum display only */
  const [combo, setCombo] = useState(0);
  const [notInterestedVisible, setNotInterestedVisible] = useState(false);
  const [reportingLesson, setReportingLesson] = useState<Lesson | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [levelUpName, setLevelUpName] = useState<string | null>(null);
  const [xpFloat, setXpFloat] = useState<{ amount: number; key: number } | null>(null);

  const goalLessons = goalLessonCount(dailyGoalMinutes);
  const activeLesson: Lesson | undefined = lessons[currentIndex];

  // Wait for the persisted queue to rehydrate from AsyncStorage before deciding
  // whether to reuse it (exact position restore, PRD 5.1) or load fresh.
  const [hydrated, setHydrated] = useState(useFeedStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useFeedStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  const topicsKey = [...topics].sort().join(',');
  useEffect(() => {
    if (!hydrated) return;
    const state = useFeedStore.getState();
    const stale =
      state.lessons.length === 0 ||
      state.feedLanguage !== language ||
      // Topic edits reload the feed, but not when a deep-dive is in progress
      (state.activeSeriesId === null && state.feedTopicsKey !== topicsKey);
    if (stale) {
      void loadFeed(topics, language);
    } else if (state.currentIndex > 0 && state.currentIndex < state.lessons.length) {
      const index = state.currentIndex;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, language, topicsKey]);

  // Snap back to the top whenever the queue is replaced (new feed or series)
  const prevVersionRef = useRef(feedVersion);
  useEffect(() => {
    if (feedVersion !== prevVersionRef.current) {
      prevVersionRef.current = feedVersion;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [feedVersion]);

  // Pre-fetch the next page before the user reaches the end (REQ-002)
  useEffect(() => {
    if (lessons.length > 0 && currentIndex >= lessons.length - 4) {
      void extendFeed(topics, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, lessons.length]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems.find((v) => v.isViewable);
      if (visible && typeof visible.index === 'number') {
        useFeedStore.getState().setCurrentIndex(visible.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // Quiz appears within 300ms of lesson end (REQ-004)
  const handleLessonEnd = useCallback(() => {
    setTimeout(() => setQuizVisible(true), 100);
  }, []);

  const handleQuizAnswered = useCallback(
    (selectedIndex: number) => {
      if (!activeLesson) return;
      const result: CompletionResult = completeLesson(activeLesson, selectedIndex, goalLessons);
      markSeen(activeLesson.id);
      setXpFloat({ amount: result.xpEarned, key: Date.now() });
      setCombo((c) => (result.quizCorrect ? c + 1 : 0));

      if (result.goalMet) {
        setCelebrating(true);
        void cancelStreakReminderForToday();
      }
      if (result.leveledUp) setLevelUpName(result.levelName);

      // Notification permission is requested after the first completed lesson,
      // never during onboarding (REQ-023)
      if (!notificationPromptShown) {
        markNotificationPromptShown();
        void requestPermissionAfterFirstLesson().then((granted) => {
          if (granted && !result.goalMet) {
            void scheduleStreakReminder(
              useProgressStore.getState().currentStreak,
              useUserStore.getState().reminderHour
            );
          }
        });
      }
    },
    [activeLesson, completeLesson, goalLessons, markSeen, notificationPromptShown, markNotificationPromptShown]
  );

  const handleNextLesson = useCallback(() => {
    setQuizVisible(false);
    const next = currentIndex + 1;
    if (next < lessons.length) {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  }, [currentIndex, lessons.length]);

  const handleNotInterested = useCallback(
    (reason: NotInterestedReason) => {
      if (activeLesson) markNotInterested(activeLesson.id, reason);
      setNotInterestedVisible(false);
    },
    [activeLesson, markNotInterested]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Lesson; index: number }) => (
      <LessonCard
        lesson={item}
        isActive={index === currentIndex}
        quizVisible={quizVisible && index === currentIndex}
        completed={!!completedLessons[item.id]}
        soundOn={soundOn}
        bookmarked={!!bookmarks[item.id]}
        onToggleSound={toggleSound}
        onToggleBookmark={() => toggleBookmark(item)}
        onShare={() => void shareLesson(item)}
        onReport={() => setReportingLesson(item)}
        onLessonEnd={handleLessonEnd}
        onSwipeLeft={() => setNotInterestedVisible(true)}
      />
    ),
    [currentIndex, quizVisible, completedLessons, soundOn, bookmarks, toggleSound, toggleBookmark, handleLessonEnd]
  );

  const keyExtractor = useCallback((item: Lesson) => item.id, []);
  const getItemLayout = useCallback(
    (_: ArrayLike<Lesson> | null | undefined, index: number) => ({
      length: SCREEN_H,
      offset: SCREEN_H * index,
      index,
    }),
    []
  );

  const hud = useMemo(
    () => (
      <View style={[styles.hud, { top: insets.top + 8 }]} pointerEvents="none">
        <StreakCounter streak={currentStreak} />
        <View style={styles.goalWrap}>
          <DailyGoalBar completed={dailyCompletedCount} goal={goalLessons} />
        </View>
        <View style={styles.xpWrap}>
          <XPTotal value={totalXp} />
          {xpFloat && (
            <View style={styles.xpFloat}>
              <XPBadge amount={xpFloat.amount} triggerKey={xpFloat.key} onDone={() => setXpFloat(null)} />
            </View>
          )}
        </View>
      </View>
    ),
    [insets.top, currentStreak, dailyCompletedCount, goalLessons, totalXp, xpFloat]
  );

  if (loading && lessons.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={lessons}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        // Swiping to the next lesson is blocked until the quiz is answered (REQ-005)
        scrollEnabled={!quizVisible}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Guided overlay dismisses on the user's first swipe (PRD Stage 5)
        onScrollBeginDrag={dismissOverlay}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
      />

      {hud}

      {activeLesson && (
        <QuizBottomSheet
          lesson={activeLesson}
          visible={quizVisible}
          combo={combo}
          nextLessonTitle={lessons[currentIndex + 1]?.title}
          onAnswered={handleQuizAnswered}
          onNext={handleNextLesson}
        />
      )}

      {!overlayDismissed && lessons.length > 0 && <FirstSwipeOverlay />}

      <NotInterestedSheet
        visible={notInterestedVisible}
        onSelect={handleNotInterested}
        onDismiss={() => setNotInterestedVisible(false)}
      />

      <FeedbackSheet lesson={reportingLesson} onClose={() => setReportingLesson(null)} />

      <ConfettiCelebration visible={celebrating} onFinish={() => setCelebrating(false)} />

      <LevelUpModal
        visible={levelUpName !== null}
        levelName={levelUpName ?? ''}
        onClose={() => setLevelUpName(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hud: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 5,
  },
  goalWrap: { flex: 1 },
  xpWrap: { alignItems: 'flex-end' },
  xpFloat: { position: 'absolute', top: 0, right: 0 },
});
