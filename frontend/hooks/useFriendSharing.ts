import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const BACKGROUND_SHARING_TASK = 'background-friend-sharing-task'; // This name is now for reference, but the task is defined elsewhere.
const SHARING_SESSION_DOC_ID_KEY = 'active_sharing_session_doc_id';

interface FriendShareData {
  lat: number;
  long: number;
  updateTime: Timestamp;
  sharingUserId: string;
  sharingUserName: string;
  sharingUserAvatarUrl?: string;
  sessionId: string;
}

export const useFriendSharing = () => {
  const { user } = useAuth();
  const [sharedByFriends, setSharedByFriends] = useState<Record<string, FriendShareData>>({});
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const locationListenersRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    // On load, check if we are already in a sharing session
    const checkSharingStatus = async () => {
      const sessionId = await AsyncStorage.getItem(SHARING_SESSION_DOC_ID_KEY);
      if (sessionId && (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_SHARING_TASK))) {
        setIsSharing(true);
      } else {
        setIsSharing(false);
      }
    };
    checkSharingStatus();
  }, []);

  // Function to start sharing user's location
  const createSharingSession = async (sharedWithUserIds: string[]) => {
    if (!user?.uid) {
      Alert.alert("Authentication Error", "You must be logged in to share your location.");
      return;
    }
    if (isSharing) {
      Alert.alert("Already Sharing", "You are already sharing your location.");
      return;
    }

    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        "Permission Required",
        "Background location access is required to share your location with friends."
      );
      return;
    }

    try {
      // 1. Create the session document in Firestore
      const sessionDocRef = await addDoc(collection(db, 'active_sharing_sessions'), {
        sharingUserId: user.uid,
        sharedWithUserIds,
        createdAt: serverTimestamp(),
        isActive: true,
      });

      // 2. Store session info for stopping later
      await AsyncStorage.setItem(SHARING_SESSION_DOC_ID_KEY, sessionDocRef.id);
      
      // 3. Ensure the SINGLE background task is running
      const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking'; // The main task name from TrackProvider
      if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))) {
        console.log('Normal sharing starting the main background task...');
        await AsyncStorage.setItem('current_user_id', user.uid); // Use the same key as TrackProvider
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Location Sharing Active",
            notificationBody: "Your location is being shared.",
          },
        });
      }

      setIsSharing(true);
      console.log(`✅ Started sharing session: ${sessionDocRef.id}`);

    } catch (e) {
      console.error("Failed to start sharing session:", e);
      Alert.alert("Error", "Could not start sharing your location.");
    }
  };

  // Function to stop sharing user's location
  const stopSharingSession = async () => {
    if (!isSharing) return;

    try {
      const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

      // 1. Deactivate the session in Firestore
      const sessionId = await AsyncStorage.getItem(SHARING_SESSION_DOC_ID_KEY);
      if (sessionId) {
        const sessionDocRef = doc(db, 'active_sharing_sessions', sessionId);
        await updateDoc(sessionDocRef, { isActive: false });
      }

      // 2. Clean up its own storage
      await AsyncStorage.removeItem(SHARING_SESSION_DOC_ID_KEY);
      
      // 3. Check if another location-dependent feature is active before stopping the task
      const isEmergencyModeActive = await AsyncStorage.getItem('tracking_active');
      if (isEmergencyModeActive !== 'true') {
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          console.log('Normal sharing is stopping the main background task as no other features are active.');
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      } else {
        console.log('Normal sharing stopped, but leaving background task running for emergency mode.');
      }

      setIsSharing(false);
      console.log(`🛑 Stopped sharing session: ${sessionId}`);

    } catch (e) {
      console.error("Failed to stop sharing session:", e);
      Alert.alert("Error", "Could not stop sharing your location.");
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    const q = query(
      collection(db, 'active_sharing_sessions'),
      where('sharedWithUserIds', 'array-contains', user.uid),
      where('isActive', '==', true),
      where('createdAt', '>=', oneDayAgo)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setLoading(true);
      const currentSessionIds = new Set<string>();
      querySnapshot.docs.forEach(d => currentSessionIds.add(d.id));

      // Clean up listeners for sessions that are no longer active
      setSharedByFriends(prev => {
        const updated = { ...prev };
        for (const sessionId in updated) {
          if (!currentSessionIds.has(sessionId)) {
            locationListenersRef.current[sessionId]?.();
            delete locationListenersRef.current[sessionId];
            delete updated[sessionId];
          }
        }
        return updated;
      });

      // Process current active sessions
      for (const docSnap of querySnapshot.docs) {
        const sessionId = docSnap.id;
        const session = docSnap.data();
        const { sharingUserId } = session;

        if (!locationListenersRef.current[sessionId]) {
          let sharingUserName = 'A Friend';
          let sharingUserAvatarUrl: string | undefined;
          try {
            const userDoc = await getDoc(doc(db, 'users', sharingUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              sharingUserName = userData.username || 'A Friend';
              sharingUserAvatarUrl = userData.avatarUrl;
            }
          } catch (e) {
            console.error("Error fetching sharing user's name/avatar:", e);
          }

          const locationDocRef = doc(db, 'users', sharingUserId, 'real_time_location', 'current');
          const unsubLocation = onSnapshot(locationDocRef, (locationSnap) => {
            if (locationSnap.exists()) {
              const { lat, long, updateTime } = locationSnap.data();
              setSharedByFriends(prev => ({
                ...prev,
                [sessionId]: {
                  lat,
                  long,
                  updateTime,
                  sharingUserId,
                  sharingUserName,
                  sharingUserAvatarUrl,
                  sessionId,
                }
              }));
            } else {
              // If location doc disappears, remove this session from state
              setSharedByFriends(prev => {
                const newState = { ...prev };
                delete newState[sessionId];
                return newState;
              });
              locationListenersRef.current[sessionId]?.();
              delete locationListenersRef.current[sessionId];
            }
          });
          locationListenersRef.current[sessionId] = unsubLocation;
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to friend sharing sessions:', err);
      setError('Could not listen for friend locations.');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      Object.values(locationListenersRef.current).forEach(unsub => unsub());
      locationListenersRef.current = {};
      setSharedByFriends({});
    };
  }, [user]);

  return { 
    sharedByFriends: Object.values(sharedByFriends), 
    isSharing,
    createSharingSession, 
    stopSharingSession,
    loading, 
    error 
  };
};
