// app/(tabs)/_layout.tsx
import React from "react";
import { View } from "react-native";
import { Stack, Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Theme from "../../constants/Theme";

export default function TabLayout() {

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Theme.colors.brandPink,
          tabBarShowLabel: false,

          // Tab bar container
          tabBarStyle: {
            position: "absolute",
            // bottom: 12, // visually lift a bit; safe area handled inside items/padding
            borderRadius: 38,
            backgroundColor: Theme.colors.brandOffWhite,
            borderTopColor: "transparent",
            // width: "94%",
            height: "10%",
            // right: "3%",
            // bottom: "3%",
            left: "3%", // adds distance from the left edge
            // margin: "3%",
            // height: 100,
            // alignSelf: "center",

            // elevation: 0,           // <— Android shadow
            // shadowOpacity: 0,       // <— iOS shadow
          },

          // Each tab item: fill vertical space and center content
          tabBarItemStyle: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center", // Add this for good measure
          },
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  // padding: 8,               // gives rounded background some breathing room
                  marginTop: 40,
                  borderRadius: 38,
                  height: 60,
                  width: 80,
                  backgroundColor: focused ? "rgba(0,0,0,0.06)" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome5 name="map-marked-alt" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  // padding: 8,               // gives rounded background some breathing room
                  marginTop: 40,
                  borderRadius: 38,
                  height: 60,
                  width: 80,
                  backgroundColor: focused ? "rgba(0,0,0,0.06)" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="home" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="friends"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  // padding: 8,               // gives rounded background some breathing room
                  marginTop: 40,
                  borderRadius: 38,
                  height: 60,
                  width: 80,
                  backgroundColor: focused ? "rgba(0,0,0,0.06)" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome5 name="user-friends" size={24} color={color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="gemini-call"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  // padding: 8,               // gives rounded background some breathing room
                  marginTop: 40,
                  borderRadius: 38,
                  height: 60,
                  width: 80,
                  backgroundColor: focused ? "rgba(0,0,0,0.06)" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="call" size={24} color={color} />
              </View>
            ),
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