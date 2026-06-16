import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import { hideAsync, preventAutoHideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { FriendProvider } from '../context/FriendProvider';

import { Text, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { TrackingProvider } from '@/context/TrackProvider';
import { NotificationProvider } from '../context/NotificationProvider';
import { ScheduledTrackingProvider } from '@/context/ScheduledTrackingContext';
import * as SecureStore from 'expo-secure-store';
import { usePermissions } from '../hooks/usePermissions';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

// Prevent the splash screen from auto-hiding before asset loading is complete.
preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <FriendProvider>
          <TrackingProvider>
            <ScheduledTrackingProvider>
            <NotificationProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </ThemeProvider>
            </NotificationProvider>
            </ScheduledTrackingProvider>
          </TrackingProvider>
        </FriendProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { user, loading: authLoading, onboardingComplete } = useAuth();
  const { isLoading: permissionsLoading } = usePermissions();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (authLoading || permissionsLoading) {
      return;
    }

    console.log(`🔄 current user: ${user}`);
    if (!user) {
      console.log('😇 User not signed in, redirecting to sign-in screen.');
      if (!inAuthGroup) {
        console.log('🚪 Redirecting to sign-in screen...');
        router.replace('/(auth)/sign-in');
      }
    } else {
      // Only gate on onboarding completion — permissions are optional per Apple Guideline 4.5.4
      if (!onboardingComplete) {
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)');
        }
      } else {
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)/home');
        }
      }
    }
  }, [
    user,
    onboardingComplete,
    segments,
    authLoading,
    permissionsLoading,
  ]);

  // Show a loading screen while we check all statuses
  if (authLoading || permissionsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text>Loading session...</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(modals)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
    </Stack>
  );
}