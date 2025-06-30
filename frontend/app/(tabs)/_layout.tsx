import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
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
          display: 'none', // Hide the label
          },
          tabBarShowLabel: false, // Hide the label
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
          name="home"
          options={{
        tabBarLabel: '',
        tabBarIcon: ({ color }) => (
          <FontAwesome name="home" size={24} color={color} />
        ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
        tabBarLabel: '',
        tabBarIcon: ({ color }) => (
          <MaterialIcons name="settings-applications" size={24} color={color} />
        ),
          }}
        />
        <Tabs.Screen
          name="test"
          options={{
        tabBarLabel: '',
        tabBarIcon: ({ color }) => (
          <MaterialIcons name="settings-applications" size={24} color={color} />
        ),
          }}
        />
        <Tabs.Screen
          name="map_tracking"
          options={{
        tabBarLabel: '',
        tabBarIcon: ({ color }) => (
          <FontAwesome5 name="map-marked-alt" size={24} color={color} />
        ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
        tabBarLabel: '',
        tabBarIcon: ({ color }) => (
          <FontAwesome5 name="map-marked-alt" size={24} color={color} />
        ),
          }}
        />
      </Tabs>
    </View>
  )
}