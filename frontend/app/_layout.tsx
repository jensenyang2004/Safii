// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, router, useSegments } from 'expo-router'; // 確保導入 router 和 useSegments
import { hideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react'; // 導入 useState
import 'react-native-reanimated';
import { FriendProvider } from '../context/FriendProvider';

import { Text, ActivityIndicator, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { TrackingProvider } from '@/context/TrackProvider';
import { NotificationProvider } from '@/context/NotificationProvider';
import '@/global.css';
import * as SecureStore from 'expo-secure-store'; // 導入 SecureStore

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed'; // 與 OnboardingScreen 中使用的鍵相同

// SplashScreen.preventAutoHideAsync(); // 保持這行或根據需要調整



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null); // 新增狀態
  const segments = useSegments(); // Get the current segments
  
  useEffect(() => {
    async function checkOnboardingStatus() {
      const status = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
      setOnboardingComplete(status === 'true');
    }
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (loaded && onboardingComplete !== null) { // 確保字體和 Onboarding 狀態都已加載
      hideAsync();
    }
  }, [loaded, onboardingComplete]); // 依賴新增的 onboardingComplete 狀態

  if (!loaded || onboardingComplete === null) { // 在加載完成前顯示加載指示器
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text>Loading app...</Text>
      </View>
    );
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
  const { user, loading } = useAuth();

  const isAuthenticated = user !== null;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text>Loading user...</Text>
    </View>
  );

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(modals)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
    </Stack>
    
    // <Stack>
    //   {isAuthenticated ? (
    //     <>
    //       {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    //       <Stack.Screen name="(modals)" options={{ headerShown: false }} />
    //       <Stack.Screen
    //         name="(tabs)/settings"
    //         options={
    //           {
    //             presentation: 'modal',
    //             animation: 'slide_from_right',
    //             headerShown: false,
    //           }
    //         }
    //       />
    //       <Stack.Screen
    //         name="interactive-call"
    //         options={{
    //           headerShown: false,
    //           presentation: 'fullScreenModal',
    //           animation: 'fade',
    //           gestureEnabled: true,
    //           gestureDirection: 'vertical',
    //         }}
    //       /> */}
    //     </>
    //   ) : (
    //     <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    //   )}
    // </Stack>
  );
}