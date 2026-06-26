// app/(tabs)/_layout.tsx
import React from "react";
import { View, Platform, PlatformIOSStatic } from "react-native";

const isIpad = Platform.OS === "ios" && (Platform as PlatformIOSStatic).isPad;
import { Stack, Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Theme from "../../constants/Theme";

const tabIconStyle = (focused: boolean) => ({
  borderRadius: 38,
  height: 55,
  width: 100,
  marginTop: isIpad ? 0 : 20,
  backgroundColor: focused ? "rgba(0,0,0,0.06)" : "transparent",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Theme.colors.brandPink,
          tabBarShowLabel: false,

          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            borderRadius: 38,
            backgroundColor: Theme.colors.brandOffWhite,
            borderTopColor: "transparent",
            height: isIpad ? 80 + bottom : 80,
            paddingBottom: isIpad ? bottom : 0,
            left: 0,
            right: 0,
            elevation: 0,
            shadowOpacity: 0,
            zIndex: 100,
          },

          tabBarItemStyle: {
            flex: 1,
            alignItems: "center",
            justifyContent: isIpad ? "center" : "flex-end",
          },
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={tabIconStyle(focused)}>
                <FontAwesome5 name="map-marked-alt" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={tabIconStyle(focused)}>
                <FontAwesome name="home" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="friends"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={tabIconStyle(focused)}>
                <FontAwesome5 name="user-friends" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="gemini-call"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="firebase-test"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="contact"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}