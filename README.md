# SkillScroll

Mobile-first micro-learning app that turns the social-media scroll habit into skill-building. Same vertical swipe mechanics as Reels/TikTok, but every unit of content is a 30–60 second lesson followed by a micro-quiz and a reward trigger.

Built from `SkillScroll PRD v1.0` (MVP build specification). Stack: **React Native (Expo SDK 57) · Supabase · TypeScript**.

## Repository layout

```
app/                      Expo (React Native) mobile app
  src/
    components/           LessonCard, QuizBottomSheet, StreakCounter, DailyGoalBar,
                          XPBadge, ConfettiCelebration, LevelUpModal, NotInterestedSheet…
    screens/              FeedScreen, OnboardingFlow, ProgressScreen, ProfileScreen
    stores/               Zustand stores: user, progress (XP/streak/goal), feed
    data/                 Bundled seed lessons + data layer (Supabase w/ local fallback)
    lib/                  supabase client, levels/XP math, date helpers, analytics facade
    services/             notifications (streak reminder, comeback nudge)
    navigation/           3-tab navigator (Feed · Progress · Profile)
supabase/
  migrations/             001_users … 008_push_tokens (schema + RLS, PRD 14.3)
  seed/                   seed_lessons.sql (generated from app seed data)
  functions/              Edge functions: complete-lesson, submit-quiz, feed,
                          streak-reset, send-reminder (PRD 14.2)
scripts/                  generate-seed.mjs (TS lesson data → SQL seed)
tests/                    Pure-logic tests (XP, levels, streak date math)
```

## Running the app

```bash
cd app
npm install
npm start          # Expo dev server → scan QR with Expo Go, or press i / a
```

The app runs fully offline in **local demo mode** out of the box: 124 bundled lessons (100 English + 24 Hindi) across Finance, Technology, Communication, and Productivity, plus 10 deep-dive series, with all progress persisted on-device (AsyncStorage). No backend needed.

### Connecting Supabase (optional)

1. Create a Supabase project and run the migrations in `supabase/migrations/` in order, then `supabase/seed/seed_lessons.sql`.
2. Deploy edge functions: `supabase functions deploy complete-lesson submit-quiz feed streak-reset send-reminder`.
3. Schedule `streak-reset`, `send-reminder`, and `send-weekly-summary` hourly (Supabase cron), so every timezone is processed at its own midnight / preferred reminder hour / Sunday 7pm. Schedule `update-quality-scores` daily: it recomputes each lesson's `quality_score` from real engagement (70% quiz pass rate + 30% watch completion, PRD 9.3) and auto-flags lessons under a 60% pass rate for editorial review (PRD 12); the `lesson_quality_stats` view gives the content team per-lesson stats.
4. Copy `app/.env.example` to `app/.env` and fill in your project URL + anon key.

## Checks

```bash
npm test                          # pure-logic tests (XP, levels, streak rollover)
npm --prefix app test             # jest: store accounting, feed ranking, quiz state machine
npm run typecheck                 # strict TypeScript over the app
node --experimental-strip-types scripts/validate-content.mjs   # editorial rules + coverage report
npm run seed:generate             # regenerate SQL seed after editing lesson content
```

## What's implemented (MVP scope, PRD §6.1)

- **Feed**: full-screen vertical paging feed with snap, position preservation, pre-fetching of upcoming lessons, and swipe-left "Not interested" (3 reason chips) that trains the feed.
- **Lessons**: mandatory Hook → Concept → Example → Takeaway structure with story-style segmented progress bar; per-category gradient cards with emblem watermarks and animated segment entrances; text-card lessons bundled, video lessons supported via `expo-video` (autoplay, sound off by default, tap toggles sound); "Try this today" actionable prompt on every lesson.
- **Quiz**: bottom sheet slides up on lesson end (spring, 55% height); 4-option MCQ; selected → 150ms → green/red reveal with the correct answer always shown; feed swiping is disabled until answered; "Next Lesson" CTA after 1s.
- **Gamification**: +10 XP per lesson, +5 per correct quiz, 1.5× streak bonus from day 7; levels Beginner → Explorer → Learner → Scholar → Master; streak increments the moment the daily goal is reached; midnight reset with a weekly earned streak freeze; full-screen confetti (180 particles, ≤2.5s, success haptic) on goal completion; level-up modal.
- **Behavioral design** (PRD 8.4 + goal-gradient/curiosity mechanics): near-goal the daily bar pulses and switches to "N to go!"; the HUD XP counter pops on every credit; correct quiz options "pop" on reveal; consecutive correct answers show a 🔥 combo streak; the quiz sheet teases the next lesson's title before you advance; the Progress tab shows a 7-day "don't break the chain" activity strip with goal-met days burning gold.
- **Onboarding**: 3 screens (topic pills → daily goal as scrolls → Google/Apple/skip), no email or password; anonymous sessions persist on device.
- **Notifications**: permission requested only after the first completed lesson; daily streak reminder at the user's preferred hour (configurable in Profile) with the actual streak number; 48h comeback nudge (armed locally, pushed back on every open); Sunday-evening weekly summary with actual XP/lesson/streak numbers; no notification on days the goal is already met.
- **Support**: self-serve Help section with 10 FAQ cards and an email contact link (24h SLA) in the Profile tab.
- **Backend**: full Postgres schema with RLS, idempotent server-side XP/streak/goal accounting in edge functions, rule-based feed ranking (topics → unseen → quality score), Expo push delivery for reminders, push-token registration, and cross-device progress sync on app open for signed-in users.
- **Hindi content** (REQ-015): feed, search, and seed content are language-aware; switch English ↔ हिन्दी from the Profile tab.
- **Issue reporting** (REQ-022): long-press any lesson for 2 seconds to open a report sheet (category chips + free text).

## Phase 2 features included

- **Bookmarking**: save any lesson from the feed action rail; saved list lives in the Progress tab and syncs to Supabase when signed in.
- **Lesson search**: search by title/concept in the Progress tab's Library section; results open a read-only lesson view.
- **Share lesson card**: native share sheet with the lesson takeaway (WhatsApp/Instagram etc.).
- **Topic deep-dives**: 10 ordered series (Money Basics, Protect Your Money, Focus Fundamentals, Work Smarter, Learn How to Learn, Speak with Impact, Be Heard at Work, Career Launchpad, Tech Literacy 101, Digital Self-Defence) with per-series progress; starting one plays its lessons in order through the feed. Replays never re-award XP.
- **Weekly friends leaderboard**: friend codes (shown in Profile when signed in), mutual friendships via `add_friend_by_code`, and a friends-only weekly XP board in the Progress tab (`get_weekly_leaderboard` RPC). Signed-out users see their own weekly XP locally.
- **Feed continuity**: the lesson queue and exact position persist across app restarts (PRD 5.1) and double as the offline lesson cache (REQ-017).

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR: strict typecheck, logic tests, a check that the SQL seed matches the lesson data, and a Metro bundle export.

## Observability

Sentry crash reporting (REQ-024) and PostHog analytics (PRD 14.4) are fully wired and activate automatically when `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_POSTHOG_API_KEY` are set in `app/.env` — no code changes needed. Without keys, analytics events log to the console in dev and crash reporting is a no-op.

## Deferred (per PRD)

Monetization, offline video caching, report screenshots (needs `react-native-view-shot`), remaining content scale-up (25/50 lessons per category in English).
