import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { capture } from '../lib/analytics';

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
  return granted;
}

/**
 * Daily 9pm streak reminder with the user's actual streak number in the copy
 * (REQ-008). Cancelled for today once the goal is met, so users never get
 * nudged on a day they already completed (PRD 12: max 1 notification/day).
 */
export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
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
      hour: 21,
      minute: 0,
    },
  });
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
