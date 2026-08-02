import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { capture } from './src/lib/analytics';
import { armComebackNudge } from './src/services/notifications';
import { useProgressStore } from './src/stores/progressStore';
import { useUserStore } from './src/stores/userStore';

export default function App() {
  useEffect(() => {
    capture('app_opened');
    useProgressStore.getState().rolloverIfNeeded();

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
