import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen options={{ headerShown: false }} /> */}
      <Stack.Screen
        name="calling"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="interactive-call"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
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
    </Stack>
  );
}