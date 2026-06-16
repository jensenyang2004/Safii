import { Stack } from 'expo-router';

export default function ScheduledTrackingModalLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ presentation: 'modal' }} />
            <Stack.Screen name="new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="set-home" options={{ presentation: 'modal' }} />
            <Stack.Screen name="current" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
