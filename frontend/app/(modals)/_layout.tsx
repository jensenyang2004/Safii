import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen options={{ headerShown: false }} /> */}
      <Stack.Screen
        name="tracking-mode/new"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="tracking-mode/select-contacts"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="scheduled-tracking"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="fake-alert/call"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="fake-alert/message"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}