import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';
import { BACKGROUND_LOCATION_TASK } from '@/constants/tracking';
import { updateLocationInFirestore } from './firestore';
import { getUserId } from './storage';

// Define the background task
defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] } | undefined>) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  // We need to get the user ID from storage because we can't access React Context here
  const userId = await getUserId();
  if (!userId) {
    console.error("❌ Background task could not find user ID. Stopping.");
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    return;
  }

  if (data && data.locations && data.locations[0]) {
    await updateLocationInFirestore(data.locations[0], userId);
  }
});

function defineTask(name: string, taskExecutor: TaskManager.TaskManagerTaskExecutor) {
    TaskManager.defineTask(name, taskExecutor);
}

export const requestBackgroundPermissions = async (): Promise<boolean> => {
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    Alert.alert(
      "Permission Required",
      "Background location access is required for emergency tracking",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
};

export const startBackgroundLocationUpdates = async () => {
    const hasPermission = await requestBackgroundPermissions();
    if (!hasPermission) return;

    // Check if task is already running and stop it to prevent duplicates
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
        console.log('⚠️ Duplicate background location task found. Stopping existing task before starting a new one.');
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 30000,
        pausesUpdatesAutomatically: false,
        foregroundService: {
            notificationTitle: 'Tracking',
            notificationBody: 'Tracking your location...',
        },
    });
    console.log('✅ Background location tracking started.');
};

export const stopBackgroundLocationUpdates = async () => {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Background location tracking stopped.');
    }
};

export const startForegroundLocationWatcher = async (userId: string): Promise<Location.LocationSubscription | null> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
         console.warn('⚠️ No foreground location permissions granted.');
         return null;
    }

    console.log('✅ Foreground permission granted. Starting foreground location watcher.');
    return await Location.watchPositionAsync(
        {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 50,
        },
        (location) => {
            updateLocationInFirestore(location, userId);
        }
    );
};
