import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import { hideAsync, preventAutoHideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { FriendProvider } from '../context/FriendProvider';

import { Text, ActivityIndicator, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { TrackingProvider } from '@/context/TrackProvider';
import { NotificationProvider } from '@/context/NotificationProvider';
import '@/global.css';
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
    <AuthProvider>
      <FriendProvider>
        <TrackingProvider>
          <NotificationProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </ThemeProvider>
          </NotificationProvider>
        </TrackingProvider>
      </FriendProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const { 
    notificationStatus, 
    foregroundLocationStatus, 
    isLoading: permissionsLoading 
  } = usePermissions();
  const segments = useSegments();

  useEffect(() => {
    async function checkOnboardingStatus() {
      const status = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
      setOnboardingComplete(status === 'true');
    }
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // Wait until auth, onboarding, and permissions status are loaded
    if (authLoading || onboardingComplete === null || permissionsLoading) {
      return;
    }

    if (!user) {
      // User is not signed in, redirect to sign-in screen.
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else { // User is signed in
      const hasRequiredPermissions = notificationStatus === 'granted' && foregroundLocationStatus === 'granted';
      // If onboarding is not complete OR permissions are missing, go to onboarding.
      if (!onboardingComplete || !hasRequiredPermissions) {
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)');
        }
      } else {
        // User is fully authenticated, onboarded, and has permissions.
        // If they are on a page in the auth or onboarding group, redirect to home.
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)/home');
        }
      }
    }
  }, [user, onboardingComplete, notificationStatus, foregroundLocationStatus, segments, authLoading, permissionsLoading]);

  // Show a loading screen while we check all statuses
  if (authLoading || onboardingComplete === null || permissionsLoading) {
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