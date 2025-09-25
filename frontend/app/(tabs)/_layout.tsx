// app/(tabs)/_layout.tsx

import { View, Text } from 'react-native'
import React from 'react'
import { Stack, Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import * as Theme from '../../constants/Theme';

export default function TabLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
        <Tabs
          tabBarBackground={() => (
            <BlurView
              intensity={25}
              tint="light"
              style={{
                flex: 1,
                borderRadius: 38,
                overflow: 'hidden',
              }}
            />
          )}
          screenOptions={{
            headerShown: false,

            tabBarActiveTintColor: Theme.colors.brandPink,
            tabBarItemStyle: {
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              flex: 1,
              paddingTop: '6%', // This will push the icon down
            },
            tabBarLabelStyle: {
              display: 'none',
            },
            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: '2%',
              borderRadius: 38,
              backgroundColor: 'rgba(255, 246, 246, 1.00)', // #F18C8E with transparency
              width: '95%',
              height: '10%', // Back to your original percentage
              alignSelf: 'center',
              justifyContent: 'center',
              marginHorizontal: '2.5%',
              // Remove outer shadow
              elevation: 5,
              shadowColor: '#rgba(200, 200, 200, 0.9)',
              shadowOpacity: 0.3,
              shadowRadius: 10,

              // Add white inner top shadow/highlight
              // borderTopWidth: 5,
              // borderLeftWidth: 4,
              // borderRightWidth: 2,
              // borderBottomWidth: 2,
              // borderLeftColor: 'rgba(255, 255, 255, 0.9)',
              // borderTopColor: 'rgba(255, 255, 255, 0.85)',
              // borderBottomColor: 'rgba(255, 255, 255, 0.5)',
              // borderRightColor: 'rgba(255, 255, 255, 0.5)',
            },
          }}
        >
          <Tabs.Screen
            name="map"
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={{ 
                  height: 60, 
                  width: 80, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  borderRadius: 30, 
                  backgroundColor: focused ? 'rgba(0,0,0,0.08)' : 'transparent' 
                }}>
                  <FontAwesome5 name="map-marked-alt" size={24} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="home"
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={{ 
                  height: 60, 
                  width: 80, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  borderRadius: 30, 
                  backgroundColor: focused ? 'rgba(0,0,0,0.08)' : 'transparent' 
                }}>
                  <FontAwesome name="home" size={24} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="friends"
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={{ 
                  height: 60, 
                  width: 80, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  borderRadius: 30, 
                  backgroundColor: focused ? 'rgba(0,0,0,0.08)' : 'transparent' 
                }}>
                  <FontAwesome5 name="user-friends" size={24} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="gemini-call"
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={{ 
                  height: 60, 
                  width: 80, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  borderRadius: 30, 
                  backgroundColor: focused ? 'rgba(0,0,0,0.08)' : 'transparent' 
                }}>
                  <MaterialIcons name="call" size={24} color={color} />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="contact"
            options={{
              // Hide this route entirely from the tab bar and deep links
              href: null,
            }}
          />
        </Tabs>
      </View>
    </>

  );
}