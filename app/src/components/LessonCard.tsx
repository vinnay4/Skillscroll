import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryColors, categoryLabels, colors, radii, spacing } from '../theme';
import type { Lesson } from '../types';

const { height: SCREEN_H } = Dimensions.get('window');

/** 4-part structure segments with PRD 5.2 proportions (hook 0–5s, concept 5–35s, example 35–50s, takeaway 50–60s) */
const SEGMENT_RATIOS = [5 / 60, 30 / 60, 15 / 60, 10 / 60];
const SEGMENT_LABELS = ['Hook', 'Concept', 'Example', 'Takeaway'];

interface Props {
  lesson: Lesson;
  isActive: boolean;
  quizVisible: boolean;
  completed: boolean;
  soundOn: boolean;
  bookmarked: boolean;
  onToggleSound: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
  onReport: () => void;
  onLessonEnd: () => void;
  onSwipeLeft: () => void;
}

function SegmentBar({
  progress,
  filled,
  active,
}: {
  progress: SharedValue<number>;
  filled: boolean;
  active: boolean;
}) {
  const fillStyle = useAnimatedStyle(() => ({
    width: active ? `${progress.value * 100}%` : filled ? '100%' : '0%',
  }));
  return (
    <View style={styles.segmentTrack}>
      <Animated.View style={[styles.segmentFill, fillStyle]} />
    </View>
  );
}

/**
 * Full-screen lesson card (PRD 8.2): background media, bottom gradient overlay,
 * title, category pill, story-style progress bar, sound toggle, +XP badge.
 * Text lessons step through the 4-part structure; tap advances (guided overlay:
 * "Tap to quiz"). Video lessons play via expo-video; tap toggles sound (REQ-021).
 */
export default function LessonCard({
  lesson,
  isActive,
  quizVisible,
  completed,
  soundOn,
  bookmarked,
  onToggleSound,
  onToggleBookmark,
  onShare,
  onReport,
  onLessonEnd,
  onSwipeLeft,
}: Props) {
  const isVideo = !!lesson.videoUrl;
  const [segment, setSegment] = useState(0);
  const segmentProgress = useSharedValue(0);
  const endedRef = useRef(false);

  const finishLesson = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onLessonEnd();
  }, [onLessonEnd]);

  // Reset when the card leaves the viewport so re-entry restarts cleanly
  useEffect(() => {
    if (!isActive) {
      endedRef.current = false;
      setSegment(0);
      cancelAnimation(segmentProgress);
      segmentProgress.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const advanceSegment = useCallback(() => {
    setSegment((current) => {
      if (current >= SEGMENT_RATIOS.length - 1) {
        finishLesson();
        return current;
      }
      return current + 1;
    });
  }, [finishLesson]);

  // Timer-driven progression for text lessons
  useEffect(() => {
    if (isVideo || !isActive || quizVisible || endedRef.current) return;
    const durationMs = lesson.durationSeconds * 1000 * SEGMENT_RATIOS[segment];
    segmentProgress.value = 0;
    segmentProgress.value = withTiming(1, { duration: durationMs }, (finished) => {
      if (finished) runOnJS(advanceSegment)();
    });
    return () => cancelAnimation(segmentProgress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, isActive, quizVisible, isVideo, lesson.id]);

  // ── Video playback (REQ-021: autoplay, sound off by default) ──
  const player = useVideoPlayer(lesson.videoUrl ?? null, (p) => {
    p.loop = false;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (!isVideo) return;
    player.muted = quizVisible ? true : !soundOn;
    if (isActive) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isVideo, isActive, soundOn, quizVisible, player]);

  const timeUpdate = useEvent(player, 'timeUpdate');
  useEvent(player, 'playToEnd', undefined);

  useEffect(() => {
    if (!isVideo || !isActive || endedRef.current) return;
    const duration = player.duration || lesson.durationSeconds;
    const current = timeUpdate?.currentTime ?? 0;
    if (duration > 0) {
      segmentProgress.value = Math.min(1, current / duration);
      // Quiz appears within 300ms of the video end timestamp (REQ-004)
      if (current >= duration - 0.3) {
        finishLesson();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUpdate, isVideo, isActive]);

  const handleTap = useCallback(() => {
    if (quizVisible) return;
    if (isVideo) {
      onToggleSound();
    } else {
      cancelAnimation(segmentProgress);
      advanceSegment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizVisible, isVideo, onToggleSound, advanceSegment]);

  // Swipe left opens the "Not interested" sheet (PRD 8.1)
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      runOnJS(onSwipeLeft)();
    });

  const insets = useSafeAreaInsets();
  const categoryColor = categoryColors[lesson.category];
  const structureParts = [
    lesson.structureHook,
    lesson.structureConcept,
    lesson.structureExample,
    lesson.structureTakeaway,
  ];

  return (
    <GestureDetector gesture={flingLeft}>
      <View style={styles.card}>
        {isVideo ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        ) : (
          <View style={[styles.textBackdrop, { backgroundColor: colors.background }]}>
            <View style={[styles.categoryTint, { backgroundColor: categoryColor }]} />
          </View>
        )}

        {/* Dim media to 30% while the quiz sheet is up (PRD 8.3) */}
        {quizVisible && <View style={styles.quizDim} pointerEvents="none" />}

        {/* Long-press opens the issue-report sheet (REQ-022) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleTap}
          onLongPress={onReport}
          delayLongPress={2000}
        >
          {!isVideo && !quizVisible && (
            <View style={styles.textContent} pointerEvents="none">
              <Text style={[styles.segmentLabel, { color: categoryColor }]}>
                {SEGMENT_LABELS[segment]}
              </Text>
              <Text style={segment === 0 ? styles.hookText : styles.bodyText}>
                {structureParts[segment]}
              </Text>
              {segment === 3 && !!lesson.tryThisToday && (
                <View style={styles.tryBox}>
                  <Text style={styles.tryLabel}>Try this today</Text>
                  <Text style={styles.tryText}>{lesson.tryThisToday}</Text>
                </View>
              )}
            </View>
          )}
        </Pressable>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {/* Story-style progress bar at the very top (PRD 8.2) */}
        <View style={[styles.progressRow, { top: Math.max(insets.top - 6, 8) }]} pointerEvents="none">
          {isVideo ? (
            <SegmentBar progress={segmentProgress} filled={false} active />
          ) : (
            SEGMENT_RATIOS.map((ratio, i) => (
              <View key={i} style={{ flex: ratio }}>
                <SegmentBar progress={segmentProgress} filled={i < segment} active={i === segment} />
              </View>
            ))
          )}
        </View>

        <View style={[styles.topRow, { top: insets.top + 48 }]} pointerEvents="none">
          <View style={[styles.categoryPill, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryText}>{categoryLabels[lesson.category]}</Text>
          </View>
          {completed && (
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>+10 XP</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow} pointerEvents="box-none">
          <Text style={styles.title} numberOfLines={2}>
            {lesson.title}
          </Text>
          <View style={styles.actionRail}>
            <Pressable style={styles.actionButton} onPress={onToggleBookmark} hitSlop={8}>
              <Text style={styles.actionIcon}>{bookmarked ? '🔖' : '📑'}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onShare} hitSlop={8}>
              <Text style={styles.actionIcon}>↗</Text>
            </Pressable>
            {isVideo && (
              <Pressable style={styles.actionButton} onPress={onToggleSound} hitSlop={8}>
                <Text style={styles.actionIcon}>{soundOn ? '🔊' : '🔇'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { height: SCREEN_H, width: '100%', backgroundColor: colors.background },
  textBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  categoryTint: {
    position: 'absolute',
    top: -180,
    right: -140,
    width: 380,
    height: 380,
    borderRadius: 380,
    opacity: 0.16,
  },
  quizDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  hookText: { color: colors.white, fontSize: 28, fontWeight: '800', lineHeight: 38 },
  bodyText: { color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 33 },
  tryBox: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: spacing.md,
  },
  tryLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tryText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  progressRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 4,
    zIndex: 3,
  },
  segmentTrack: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  segmentFill: { height: '100%', backgroundColor: colors.white },
  topRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3,
  },
  categoryPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  xpPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  xpPillText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  bottomRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginRight: spacing.md,
  },
  actionRail: { gap: 10, alignItems: 'center' },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 18, color: colors.white },
});
