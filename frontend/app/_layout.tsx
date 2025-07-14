import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import { hideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthProvider';
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
        <TrackingProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        </ThemeProvider>
        </TrackingProvider>
        </AuthProvider>
  );
}
