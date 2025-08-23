// TrackingContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import { onSnapshot, query, where } from 'firebase/firestore';
import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { registerForPushNotificationsAsync, sendPushNotification } from '@/libs/notifications';
import { doc as docRef} from 'firebase/firestore';

type TrackingMode = {
  id: string;
  name: string;
  userId: string;
  On: boolean;
  autoStart: boolean;
  checkIntervalMinutes: number;
  unresponsiveThreshold: number;
  intervalReductionMinutes: number;
  startTime: {
    dayOfWeek: string[];
    time: string;
  };
  emergencyContactIds: string[];
};

type TrackContextType = {
  trackingModes: TrackingMode[];
  startTrackingMode: (modeId: string) => Promise<void>;
  closeTrackingMode: (modeId: string) => Promise<void>;
  createTrackingMode: (mode: TrackingMode) => Promise<void>;
  deleteTrackingMode: (modeId: string) => Promise<void>;
};
const TrackingContext = createContext<TrackContextType | null>(null);
// const TrackingContext = createContext(null);

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  // const [trackingModes, setTrackingModes] = useState([]);
  const [trackingModes, setTrackingModes] = useState<TrackingMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({}); // optional: track multiple countdowns
  const [location, setLocation] = useState(null);

  const requestLocationPermission = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const currentLocation = await getCurrentPositionAsync();
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      console.log('Location permission not granted');
    }
  };

  const startTrackingMode = async (modeId: string) => {
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: true });
      // Optionally refresh trackingModes
      fetchTrackingModesWithContacts();
    } catch (error) {
      console.error('Error updating tracking mode:', error);
    }
  }
  const closeTrackingMode = async (modeId: string) => {
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: false });
      // Optionally refresh trackingModes
      fetchTrackingModesWithContacts();
    } catch (error) {
      console.error('Error updating tracking mode:', error);
    }
  }

  const createTrackingMode = async (mode: Omit<TrackingMode, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'TrackingMode'), mode); // Use addDoc to create a new document
      setTrackingModes((prevModes) => [...prevModes, { id: docRef.id, ...mode }]); // Update state with the new mode
    } catch (error) {
      console.error('Failed to create tracking mode:', error);
      throw error;
    }
  };

  const deleteTrackingMode = async (modeId: string) => {
    try {
      await deleteDoc(doc(db, 'TrackingMode', modeId)); // Delete from Firebase
      setTrackingModes((prevModes) => prevModes.filter((mode) => mode.id !== modeId)); // Update state
    } catch (error) {
      console.error('Failed to delete tracking mode:', error);
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
            (trackingData.emergencyContactIds || []).map(async (id: string) => {
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

  useEffect(() => {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) return;

    // Query to monitor location_sharing table for the current user's ID
    const locationSharingQuery = query(
      collection(db, 'location_sharing'),
      where('__name__', '==', currentUserId) // Assuming 'receiverId' is the field for the recipient
    );


    const unsubscribe = onSnapshot(locationSharingQuery, async snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          const data = change.doc.data();

          const snap = await getDoc(docRef(db, 'users', data.userId));
          let senderName = 'Unknown User';
          if (snap.exists()) {
            const { username, displayName } = snap.data();
            senderName = username ?? displayName ?? 'Unknown User';
          }



          Alert.alert(
            'Location Info Received',
            `User ${senderName} has sent you their location.`,
            [
              {
                text: 'View Location',
                onPress: () => {
                  // Handle viewing location (e.g., navigate to a map screen)
                  console.log('Location data:', data.location);
                },
              },
              {
                text: 'Dismiss',
                style: 'cancel',
              },
            ]
          );

          registerForPushNotificationsAsync().then(token => {
            if (token) {
              sendPushNotification(token, `User ${data.senderId} has sent you their location.`);
            }
          });

        }
      });
    });

    return () => unsubscribe(); // Clean up listener when component unmounts
  }, []);

  return (
    <TrackingContext.Provider value={{ trackingModes, loading, startTrackingMode, closeTrackingMode, createTrackingMode, deleteTrackingMode, requestLocationPermission }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => useContext(TrackingContext);