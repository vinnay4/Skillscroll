import PostHog from 'posthog-react-native';

/**
 * Analytics event contract (PRD 14.4), routed to PostHog when
 * EXPO_PUBLIC_POSTHOG_API_KEY is set and logged locally in dev otherwise.
 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'lesson_completed'
  | 'quiz_answered'
  | 'streak_incremented'
  | 'daily_goal_met'
  | 'level_up'
  | 'lesson_not_interested'
  | 'notification_permission_result'
  | 'lesson_bookmarked'
  | 'lesson_shared'
  | 'lesson_reported'
  | 'lesson_searched'
  | 'series_started'
  | 'friend_added';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

export const posthog: PostHog | null = apiKey
  ? new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    })
  : null;

export function capture(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  posthog?.capture(event, props as Record<string, string | number | boolean> | undefined);
  if (__DEV__) {
    console.log(`[analytics] ${event}`, props ?? {});
  }
}
