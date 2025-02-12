import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY
        }}>
      <Tabs.Screen name='home' 
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({color})=><FontAwesome name="home" size={24} color={color} />
      }}/>
      <Tabs.Screen name='map' 
       options={{
        tabBarLabel: 'Map',
        tabBarIcon: ({color})=><FontAwesome5 name="map-marked-alt" size={24} color={color} />
      }}/>
      <Tabs.Screen name='settings' 
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({color})=><MaterialIcons name="settings-applications" size={24} color={color} />
      }}/>
      {/* <Tabs.Screen name='map' 
      options={{
        tabBarLabel: 'MAAP',
        tabBarIcon: ({color})=><MaterialIcons name="settings-applications" size={24} color={color} />
      }}/> */}

    </Tabs>
  )
}