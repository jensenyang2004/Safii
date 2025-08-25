// app/(tabs)/_layout.tsx

import { View, Text } from 'react-native'
import React, { useEffect } from 'react' // I added useEffect here
import { Stack, Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';
import VideoPlayer from '../features/fakePhoneCallPlayer/components/VideoPlayer';
import { getAuth } from 'firebase/auth'; // Added import for getAuth

// I added these imports for our notification functions
import { registerForPushNotificationsAsync, saveTokenToFirestore } from '../../libs/notifications';

export default function TabLayout() {
  console.log('TabLayout component rendered'); // Added log

  // --- I AM ADDING THIS ENTIRE BLOCK ---
  useEffect(() => {
    console.log('useEffect in TabLayout fired'); // Added log
    // This effect runs when the layout mounts
    const setupPushNotifications = async () => {
      console.log('Calling setupPushNotifications'); // Added log
      console.log('Calling registerForPushNotificationsAsync'); // Added log
      const token = await registerForPushNotificationsAsync();
      console.log('Token received:', token); // Added log
      
      // --- I AM ADDING THIS LOG --- 
      const auth = getAuth();
      console.log('auth.currentUser before saveTokenToFirestore:', auth.currentUser);
      // ----------------------------

      if (token) {
        console.log('Calling saveTokenToFirestore with token:', token); // Added log
        await saveTokenToFirestore(token);
        console.log('saveTokenToFirestore completed'); // Added log
      }
    };

    setupPushNotifications();
  }, []); // The empty array means this effect runs only once
  // -------------------------------------

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarActiveTintColor: Colors.MAINRED,
            tabBarItemStyle: {
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: '4%',
              height: 60,
            },
            tabBarLabelStyle: {
              display: 'none',
            },
            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: '2%',
              borderRadius: 38,
              backgroundColor: Colors.PRIMARY,
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              borderTopWidth: 0,
              width: '95%',
              height: '10%',
              alignSelf: 'center',
              justifyContent: 'center',
              marginHorizontal: '2.5%',
            },
          }}
        >
          <Tabs.Screen
            name="map"
            options={{
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="map-marked-alt" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="home"

            options={{

              tabBarIcon: ({ color }) => (
                <FontAwesome name="home" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="friends"
            options={{
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="user-friends" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="settings-applications" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="test"
            options={{
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="settings-applications" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="map_tracking"
            options={{
              tabBarIcon: ({ color }) => (
                <FontAwesome5 name="map-marked-alt" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen name="(onboarding)" options={{ href: null }} />
        </Tabs>
      </View>
    </>

  );
}