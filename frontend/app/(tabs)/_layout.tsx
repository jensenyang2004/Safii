// app/(tabs)/_layout.tsx — 陽春測試版
import React from "react";
import { Stack, Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Theme from "../../constants/Theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Theme.colors.brandPink,
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            // borderRadius: 38,
            backgroundColor: Theme.colors.brandOffWhite,
            borderTopColor: "transparent",
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            left: 0,
            right: 0,
            elevation: 0,
            shadowOpacity: 0,
            zIndex: 100,
          },
          tabBarItemStyle: {
            flex: 1,
          },
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            title: "地圖",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="map-marked-alt" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="home"
          options={{
            title: "首頁",
            tabBarIcon: ({ color }) => (
              <FontAwesome name="home" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="friends"
          options={{
            title: "好友",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="user-friends" size={24} color={color} />
            ),
          }}
        />

      </Tabs>
    </>
  );
}