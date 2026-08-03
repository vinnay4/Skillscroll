/**
 * Analytics event contract (PRD 14.4). This is a thin facade so PostHog can be
 * dropped in later without touching call sites: replace `capture` internals
 * with `posthog.capture(event, props)` once a POSTHOG_API_KEY is provisioned.
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
  | 'lesson_searched';

export function capture(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[analytics] ${event}`, props ?? {});
  }
}
