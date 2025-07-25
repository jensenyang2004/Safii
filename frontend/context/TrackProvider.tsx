
// TrackingContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defineTask } from 'expo-task-manager';
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const STORAGE_KEYS = {
  END_TIME: 'tracking_countdown_end_time',
  TRACKING_MODE_ID: 'tracking_mode_id',
  NOTIFICATION_ID: 'tracking_notification_id',
};

type TrackingContextType = {
  trackingModes: any[];
  loading: boolean;
  startTrackingMode: (modeId: any, durationInMinutes: number) => Promise<void>;
  stopTrackingMode: () => Promise<void>;
  isTracking: boolean;
  trackingModeId: string | null;
  remainingTime: number;
};

const TrackingContext = createContext<TrackingContextType | null>(null);
const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

const requestBackgroundPermissions = async () => {
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

defineTask(BACKGROUND_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] } | undefined>) => {
    if (error) {
    console.error(error);
    return;
  }

  const hasPermission = await requestBackgroundPermissions();
  if (!hasPermission) {
    console.error("No background permission");
    return;
  }
  if (data) {
    const { locations } = data;
    // Upload location to Firebase
    const { latitude, longitude } = locations[0].coords;
  }
});


export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const [trackingModes, setTrackingModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingModeId, setTrackingModeId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);


  useEffect(() => {
    const checkExistingCountdown = async () => {
        const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
        const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);
        if (endTimeStr && modeId) {
          const endTime = parseInt(endTimeStr);
          const now = Date.now();
          if (now < endTime) {
            const remaining = Math.ceil((endTime - now) / 1000);
            setRemainingTime(remaining);
            setTrackingModeId(modeId);
            setIsTracking(true);
          } else {
            stopTrackingMode();
          }
        }
      };
    checkExistingCountdown();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
            checkExistingCountdown();
        }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
    } else if (isTracking && remainingTime <= 0) {
        stopTrackingMode();
        Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Tracking Finished!',
              body: `Your tracking session has completed.`,
              sound: 'default',
            },
            trigger: null,
          });
    }
    return () => clearInterval(interval);
  }, [isTracking, remainingTime]);


  const startTrackingMode = async (modeId : any, durationInMinutes: number) => {
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: true });

      const durationInSeconds = durationInMinutes * 60;
      const endTime = Date.now() + durationInSeconds * 1000;

      await AsyncStorage.setItem(STORAGE_KEYS.END_TIME, endTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, modeId);

      setRemainingTime(durationInSeconds);
      setTrackingModeId(modeId);
      setIsTracking(true);


      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 30000,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'Tracking',
          notificationBody: 'Tracking your location...',
        },
      });
    } catch (error) {
      console.error('Error starting tracking mode:', error);
    }
  }

  const stopTrackingMode = async () => {
    setIsTracking(false);
    setTrackingModeId(null);
    setRemainingTime(0);
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    await AsyncStorage.removeItem(STORAGE_KEYS.END_TIME);
    await AsyncStorage.removeItem(STORAGE_KEYS.TRACKING_MODE_ID);
    const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);
    if(modeId){
        const modeRef = doc(db, 'TrackingMode', modeId);
        await updateDoc(modeRef, { On: false });
    }
  };


  const fetchTrackingModesWithContacts = async () => {
    try {
      const colRef = collection(db, 'TrackingMode');
      const snapshot = await getDocs(colRef);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const trackingData = docSnap.data();
          const contacts = await Promise.all(
            (trackingData.emergencyContactIds || []).map(async (id : string) => {
              const contactDoc = await getDoc(doc(db, 'users', id));
              return { id: contactDoc.id, ...contactDoc.data() };
            })
          );
          return {
            id: docSnap.id,
            ...trackingData,
            contacts
          };
        })
      );
      setTrackingModes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking modes with contacts:', error);
      setTrackingModes([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingModesWithContacts();
  }, []);



  return (
    <TrackingContext.Provider value={{ trackingModes, loading, startTrackingMode, stopTrackingMode, isTracking, trackingModeId, remainingTime }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
    const context = useContext(TrackingContext);
    if (!context) {
      throw new Error('useTracking must be used within a TrackingProvider');
    }
    return context;
  };
