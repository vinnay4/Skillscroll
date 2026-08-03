import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { fetchRemoteProgress } from './src/data/api';
import { capture } from './src/lib/analytics';
import { armComebackNudge } from './src/services/notifications';
import { useProgressStore } from './src/stores/progressStore';
import { useUserStore } from './src/stores/userStore';

export default function App() {
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
        if (useUserStore.getState().notificationPromptShown) {
          void armComebackNudge(useProgressStore.getState().currentStreak);
        }
      }
    });

    if (useUserStore.getState().notificationPromptShown) {
      void armComebackNudge(useProgressStore.getState().currentStreak);
    }

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
