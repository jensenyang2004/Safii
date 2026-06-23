import { Stack } from 'expo-router';

export default function ScheduledTrackingModalLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="current" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
