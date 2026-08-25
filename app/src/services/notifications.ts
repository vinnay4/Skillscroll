import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { capture } from '../lib/analytics';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STREAK_REMINDER_ID = 'streak-reminder';
const COMEBACK_NUDGE_ID = 'comeback-nudge';
const WEEKLY_SUMMARY_ID = 'weekly-summary';

/** Requested only after the user's first completed lesson, never during onboarding (REQ-023). */
export async function requestPermissionAfterFirstLesson(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SkillScroll',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#6366F1',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  const granted = status === 'granted';
  capture('notification_permission_result', { granted });
  if (granted) void registerPushToken();
  return granted;
}

/**
 * Sunday-evening weekly summary with actual numbers, never generic copy
 * (PRD 5.5). Content is baked at scheduling time, so this is rearmed with
 * fresh stats on every app open; server push replaces it for signed-in users.
 */
export async function scheduleWeeklySummary(stats: {
  weeklyXp: number;
  weeklyLessons: number;
  streak: number;
}): Promise<void> {
  if (!Device.isDevice) return;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID).catch(() => {});
  if (stats.weeklyLessons === 0) return; // nothing to summarize, don't spam
  const streakPart = stats.streak > 0 ? ` Streak: ${stats.streak} days.` : '';
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_SUMMARY_ID,
    content: {
      title: 'Your week on SkillScroll',
      body: `${stats.weeklyLessons} lessons, ${stats.weeklyXp} XP this week.${streakPart} Keep it rolling.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 19,
      minute: 0,
    },
  });
}

/**
 * Stores the device's Expo push token on the user's profile so the
 * server-side send-reminder / comeback-nudge functions can reach it.
 * No-op for anonymous or offline users (local scheduling still covers them).
 */
export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice || !supabase) return;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const authId = authData.user?.id;
    if (!authId) return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token) return;
    await supabase.from('users').update({ push_token: token }).eq('auth_id', authId);
  } catch {
    // Expo Go doesn't support remote push; local notifications still work
  }
}

/**
 * Daily streak reminder at the user's preferred hour (PRD 5.5), with the
 * actual streak number in the copy (REQ-008). Cancelled for today once the
 * goal is met, so users never get nudged on a day they already completed
 * (PRD 12: max 1 notification/day).
 */
export async function scheduleStreakReminder(
  currentStreak: number,
  hour: number = 21
): Promise<void> {
  if (!Device.isDevice) return;
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {});
  const body =
    currentStreak > 0
      ? `Your ${currentStreak}-day streak is on the line. 3 minutes is all it takes.`
      : 'Learn one thing before the day ends. 60 seconds is all it takes.';
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: { title: 'SkillScroll', body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

/** Persists the preferred reminder hour server-side so push scheduling matches (signed-in users). */
export async function syncReminderHour(hour: number): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const authId = data.user?.id;
    if (!authId) return;
    await supabase.from('users').update({ reminder_hour: hour }).eq('auth_id', authId);
  } catch {
    // local scheduling still applies
  }
}

export async function cancelStreakReminderForToday(): Promise<void> {
  // Local scheduling can't skip a single day, so cancel and let the next app
  // open (tomorrow) reschedule. Server-side scheduling replaces this at scale.
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {});
}

/**
 * Single comeback nudge, armed 48h out on every app open and continuously
 * pushed back while the user stays active — it only ever fires after true
 * 48-hour inactivity, exactly once (REQ-018).
 */
export async function armComebackNudge(currentStreak: number): Promise<void> {
  if (!Device.isDevice) return;
  await Notifications.cancelScheduledNotificationAsync(COMEBACK_NUDGE_ID).catch(() => {});
  const body =
    currentStreak > 0
      ? `Your ${currentStreak}-day streak is waiting. 3 minutes is all it takes.`
      : 'One 60-second lesson gets you back on track.';
  await Notifications.scheduleNotificationAsync({
    identifier: COMEBACK_NUDGE_ID,
    content: { title: 'Come back to SkillScroll', body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60,
      repeats: false,
    },
  });
}
