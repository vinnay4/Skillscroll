import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { fetchRemoteProgress } from './src/data/api';
import { capture } from './src/lib/analytics';
import { armComebackNudge, scheduleWeeklySummary } from './src/services/notifications';
import { useProgressStore } from './src/stores/progressStore';
import { useUserStore } from './src/stores/userStore';

// Crash reporting activates when a DSN is provided (REQ-024: >99.5% crash-free)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.2 });
}

/** Rearms locally scheduled notifications with fresh, specific numbers (PRD 5.5). */
function rearmNotifications() {
  if (!useUserStore.getState().notificationPromptShown) return;
  const progress = useProgressStore.getState();
  const weekAgo = Date.now() - 7 * 86400000;
  const weeklyXp = progress.xpTransactions
    .filter((t) => Date.parse(t.createdAt) >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);
  const weeklyLessons = Object.values(progress.completedLessons).filter(
    (l) => Date.parse(l.completedAt) >= weekAgo
  ).length;
  void armComebackNudge(progress.currentStreak);
  void scheduleWeeklySummary({ weeklyXp, weeklyLessons, streak: progress.currentStreak });
}

function App() {
  useEffect(() => {
    capture('app_opened');
    useProgressStore.getState().rolloverIfNeeded();

    // Cross-device sync for signed-in users, on app open (REQ-019)
    void fetchRemoteProgress().then((remote) => {
      if (remote) {
        useProgressStore.getState().mergeRemote({
          totalXp: remote.totalXp,
          currentStreak: remote.currentStreak,
          longestStreak: remote.longestStreak,
          completed: remote.completed,
        });
      }
    });

    // Feed position is preserved; day rollover and the 48h comeback nudge are
    // re-evaluated whenever the app returns to the foreground (PRD 5.1, REQ-018).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useProgressStore.getState().rolloverIfNeeded();
        rearmNotifications();
      }
    });

    rearmNotifications();

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default sentryDsn ? Sentry.wrap(App) : App;
