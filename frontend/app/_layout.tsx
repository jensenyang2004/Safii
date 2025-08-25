// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import { hideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { FriendProvider } from '../context/FriendProvider';

import { Text, ActivityIndicator, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { TrackingProvider } from '@/context/TrackProvider';
import '@/global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

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
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootLayoutNav />
            <StatusBar style="auto" />
          </ThemeProvider>
        </TrackingProvider>
      </FriendProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user, loading } = useAuth(); // Now this works!

  // useEffect(() => {
  //   console.log('User in RootLayoutNav:', user);
  //   console.log('User is null?', user === null);
  //   console.log('User type:', typeof user);
  //   console.log('Showing auth screens?', user === null);
  // }, [user]);

  const isAuthenticated = user !== null;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text>Loading...</Text>
    </View>
  );

  return (
    <Stack>
      {isAuthenticated ? (
        // <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        // Authenticated routes
        <>
          <Stack.Screen name="(tabs)" options={{
            headerShown: false
          }} />
          <Stack.Screen name="(modals)" options={{ headerShown: false }} />

          <Stack.Screen
            name="interactive-call"   // matches file: app/(modals)/interactive-call.tsx
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'fade',
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
        </>
      ) : (
        // Non-authenticated routes
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}

    </Stack>
  );
}