import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: '',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: '',
          headerTitle: '',
        }}
      />
    </Stack>
  );
}
