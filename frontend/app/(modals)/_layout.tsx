// app/(modals)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        // leave the header visible
        headerShown: false,

        // globally style background / title / back button color
        headerStyle:      { backgroundColor: '#FFF' },
        headerTitleStyle: { color: '#1E1E1E', fontSize: 18, fontWeight: '600' },
        headerTintColor:  'white',    // color of the back arrow

        // If you want a fully custom React component:
        // header: ({ back, navigation, options, route }) => (
        //   <MyFancyHeader back={back} title={options.title} />
        // ),

        presentation:     'fullScreenModal',
        animation:        'fade',
        gestureEnabled:   true,
        gestureDirection: 'vertical',
      }}
    >
      <Stack.Screen
        name="interactive-call"
        options={{
          title: 'Phone Call',   // whatever title you like
        }}
      />
    </Stack>
  );
}