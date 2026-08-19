import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Text } from 'react-native';
import FeedScreen from '../screens/FeedScreen';
import OnboardingFlow from '../screens/OnboardingFlow';
import ProfileScreen from '../screens/ProfileScreen';
import ProgressScreen from '../screens/ProgressScreen';
import { useUserStore } from '../stores/userStore';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

/**
 * 3 tabs only — Feed, Progress, Profile (PRD 8.5). Feed is the default
 * landing screen. Horizontal transitions keep vertical scroll feed-exclusive.
 */
export default function RootNavigator() {
  const onboarded = useUserStore((s) => s.onboarded);

  return (
    <NavigationContainer theme={theme}>
      {onboarded ? (
        <Tab.Navigator
          initialRouteName="Feed"
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'rgba(11,11,18,0.94)',
              borderTopColor: colors.border,
              position: 'absolute',
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            animation: 'shift',
          }}
        >
          <Tab.Screen
            name="Feed"
            component={FeedScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon emoji="🎬" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Progress"
            component={ProgressScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      ) : (
        <OnboardingFlow />
      )}
    </NavigationContainer>
  );
}
