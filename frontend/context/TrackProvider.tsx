// TrackingContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';


const TrackingContext = createContext(null);

export const TrackingProvider = ({ children }) => {
  const [trackingModes, setTrackingModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({}); // optional: track multiple countdowns
  const BACKGROUND_LOCATION_TASK = 'background-location-task';


  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Location task error:', error);
      return;
    }

    const hasPermission = await requestBackgroundPermissions();
    if (!hasPermission) {
      console.error("No background permission");
      return;
    }

    if (data) {
      const { locations } = data;
      const currentTime = Date.now();

      try {
        const endTimeString = await AsyncStorage.getItem('countdownEndTime');
        const countdownEndTime = endTimeString ? parseInt(endTimeString) : 0;

        console.log('Countdown ends at:', countdownEndTime);
        console.log('Current time:', currentTime);

        if (currentTime >= countdownEndTime) {
          console.log('Countdown ended. Stopping location tracking.');
          await Location.stopLocationUpdatesAsync('location-task');
        } else {
          // Log location or upload to Firebase here
          console.log('Location:', locations[0]);
        }
      } catch (err) {
        console.error('Failed to check countdown time:', err);
      }
    }
  });

  const startTrackingMode = async (modeId) => {
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: true });
      // Optionally refresh trackingModes
      // fetchTrackingModesWithContacts();

      const startCountdown = async (durationInSeconds: number) => {
        const now = Date.now();
        const endTime = now + durationInSeconds * 1000;

        await AsyncStorage.setItem('countdownEndTime', endTime.toString());

        await Location.startLocationUpdatesAsync('location-task', {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // e.g., every 10 seconds
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
          foregroundService: {
            notificationTitle: 'Tracking',
            notificationBody: 'Tracking your location...',
          },
        });
      };

      const stopTracking = async () => {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        await AsyncStorage.removeItem('countdownEndTime');
      };
      startCountdown(1000000);
      stopTracking();
    } catch (error) {
      console.error('Error updating tracking mode:', error);
    }
  }

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

      console.log("in the context!")

      console.log(data)
      console.log(data[0].contacts)
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
    <TrackingContext.Provider value={{ trackingModes, loading, startTrackingMode }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => useContext(TrackingContext);