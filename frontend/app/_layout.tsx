// app/_layout.tsx

// import React from 'react';
// import { Slot } from 'expo-router';

// export default function RootLayout() {
//   return (
//     // no Stack here — just let the router insert whatever group you're in
//     <Slot />
//   );
// }

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import React, { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthProvider';
import '@/global.css';

import { register, MeetingProvider } from '@videosdk.live/react-native-sdk';
import { VIDEO_SDK_API_KEY, DEFAULT_MEETING_ID } from './features/videoCall/videoConfig';
import { v4 as uuidv4 } from 'uuid';
import 'expo-dev-client';


// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();
register();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <MeetingProvider
          config={{
            apiKey: VIDEO_SDK_API_KEY,
            meetingId: DEFAULT_MEETING_ID,
            micEnabled: true,
            webcamEnabled: true,
            participantId: uuidv4(),
            name: `Guest${Date.now()}`,
          }}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
            {/* <Stack.Screen name="(auth)" options={{ headerShown: false }} /> */}
          </Stack>
          <StatusBar style="auto" />
        </MeetingProvider>

      </ThemeProvider>
    </AuthProvider>
  );
}
