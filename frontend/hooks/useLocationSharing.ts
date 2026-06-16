// hooks/useLocationSharing.ts

import { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, doc, getDoc, setDoc,
  Timestamp, addDoc, serverTimestamp, updateDoc, arrayRemove, arrayUnion,
} from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';

const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';
const SHARING_SESSION_DOC_ID_KEY = 'active_sharing_session_doc_id';

// --- Types ---

export interface FriendShareData {
  lat: number;
  long: number;
  updateTime: Timestamp;
  sharingUserId: string;
  sharingUserName: string;
  sharingUserAvatarUrl?: string;
  sessionId: string;
}

interface SharingInstance {
  userId: string;
  username: string;
  avatarUrl?: string;
  type: 'emergency' | 'normal';
  sessionId: string;
}

export interface SessionInfo {
  sessionId: string;
  type: 'emergency' | 'normal';
}

export interface GroupedSharingContact {
  userId: string;
  username: string;
  avatarUrl?: string;
  sessions: SessionInfo[];
}

// ---

export const useLocationSharing = () => {
  const { user } = useAuth();

  // Incoming: friends sharing their location with me
  const [sharedByFriends, setSharedByFriends] = useState<Record<string, FriendShareData>>({});
  const incomingListenersRef = useRef<Record<string, () => void>>({});

  // Outgoing: contacts I am sharing my location with
  const [unifiedList, setUnifiedList] = useState<GroupedSharingContact[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // isSharing is derived — no separate state needed
  const isSharing = unifiedList.length > 0;

  // When the current user is actively sharing, write location more frequently while in foreground
  useEffect(() => {
    if (!isSharing || !user?.uid) return;

    let subscription: Location.LocationSubscription | null = null;

    const startForegroundUpdates = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 0.5,
          },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            const realTimeRef = doc(db, 'users', user.uid, 'real_time_location', 'current');
            await setDoc(realTimeRef, {
              lat: latitude,
              long: longitude,
              updateTime: Timestamp.fromDate(new Date(loc.timestamp)),
            }, { merge: true });
          }
        );
      } catch (e) {
        console.error('Failed to start foreground location updates for sharing:', e);
      }
    };

    startForegroundUpdates();

    return () => {
      subscription?.remove();
    };
  }, [isSharing, user]);

  // On mount: verify any stored session key is still valid in Firestore, clean up if stale
  useEffect(() => {
    const checkSharingStatus = async () => {
      const sessionId = await AsyncStorage.getItem(SHARING_SESSION_DOC_ID_KEY);
      if (!sessionId) return;

      try {
        const sessionDoc = await getDoc(doc(db, 'active_sharing_sessions', sessionId));
        if (!sessionDoc.exists() || sessionDoc.data()?.isActive !== true) {
          await AsyncStorage.removeItem(SHARING_SESSION_DOC_ID_KEY);
          console.log('🧹 Stale sharing session key removed from AsyncStorage.');
        }
      } catch (e) {
        console.error('Error verifying sharing session on mount:', e);
      }
    };
    checkSharingStatus();
  }, []);

  // --- Incoming listener: friends sharing with me ---
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
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
      setIsLoading(true);
      const currentSessionIds = new Set<string>();
      querySnapshot.docs.forEach(d => currentSessionIds.add(d.id));

      // Remove listeners for sessions no longer active
      setSharedByFriends(prev => {
        const updated = { ...prev };
        for (const sessionId in updated) {
          if (!currentSessionIds.has(sessionId)) {
            incomingListenersRef.current[sessionId]?.();
            delete incomingListenersRef.current[sessionId];
            delete updated[sessionId];
          }
        }
        return updated;
      });

      for (const docSnap of querySnapshot.docs) {
        const sessionId = docSnap.id;
        const { sharingUserId } = docSnap.data();

        if (!incomingListenersRef.current[sessionId]) {
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
            console.error("Error fetching sharing user's info:", e);
          }

          const locationDocRef = doc(db, 'users', sharingUserId, 'real_time_location', 'current');
          const unsubLocation = onSnapshot(locationDocRef, (locationSnap) => {
            if (locationSnap.exists()) {
              const { lat, long, updateTime } = locationSnap.data();
              setSharedByFriends(prev => ({
                ...prev,
                [sessionId]: { lat, long, updateTime, sharingUserId, sharingUserName, sharingUserAvatarUrl, sessionId },
              }));
            } else {
              setSharedByFriends(prev => {
                const newState = { ...prev };
                delete newState[sessionId];
                return newState;
              });
              incomingListenersRef.current[sessionId]?.();
              delete incomingListenersRef.current[sessionId];
            }
          });
          incomingListenersRef.current[sessionId] = unsubLocation;
        }
      }
      setIsLoading(false);
    }, (err) => {
      console.error('Error listening to incoming friend sharing sessions:', err);
      setError('Could not listen for friend locations.');
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      Object.values(incomingListenersRef.current).forEach(unsub => unsub());
      incomingListenersRef.current = {};
      setSharedByFriends({});
    };
  }, [user]);

  // --- Outgoing listeners: who I am sharing with ---
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      setUnifiedList([]);
      return;
    }

    let emergencyContacts: SharingInstance[] = [];
    let normalContacts: SharingInstance[] = [];
    const unsubscribes: (() => void)[] = [];

    const updateList = () => {
      const allInstances = [...emergencyContacts, ...normalContacts];
      const grouped = new Map<string, GroupedSharingContact>();

      for (const instance of allInstances) {
        if (grouped.has(instance.userId)) {
          const existing = grouped.get(instance.userId)!;
          if (!existing.sessions.some(s => s.sessionId === instance.sessionId)) {
            existing.sessions.push({ sessionId: instance.sessionId, type: instance.type });
          }
        } else {
          grouped.set(instance.userId, {
            userId: instance.userId,
            username: instance.username,
            avatarUrl: instance.avatarUrl,
            sessions: [{ sessionId: instance.sessionId, type: instance.type }],
          });
        }
      }

      setUnifiedList(Array.from(grouped.values()));
      setIsLoading(false);
    };

    // Emergency sessions (active_tracking where I am the tracked user)
    const emergencyQuery = query(
      collection(db, 'active_tracking'),
      where('trackedUserId', '==', user.uid),
      where('isActive', '==', true),
      where('emergencyActivationTime', '<=', new Date())
    );
    const unsubEmergency = onSnapshot(emergencyQuery, async (snapshot) => {
      const promises = snapshot.docs.map(async (docSnap) => {
        const session = docSnap.data();
        const sessionId = docSnap.id;
        const contactIds = session.emergencyContactIds || [];

        const contactPromises = contactIds.map(async (id: string) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              userId: id,
              username: userData.username || 'Emergency Contact',
              avatarUrl: userData.avatarUrl,
              type: 'emergency' as const,
              sessionId,
            };
          }
          return null;
        });
        return (await Promise.all(contactPromises)).filter(Boolean) as SharingInstance[];
      });
      emergencyContacts = (await Promise.all(promises)).flat();
      updateList();
    }, (err) => {
      console.error('Error listening to emergency sharing:', err);
      setError('Failed to load emergency sharing status.');
    });
    unsubscribes.push(unsubEmergency);

    // Normal sessions (active_sharing_sessions where I am the sharer)
    const normalQuery = query(
      collection(db, 'active_sharing_sessions'),
      where('sharingUserId', '==', user.uid),
      where('isActive', '==', true)
    );
    const unsubNormal = onSnapshot(normalQuery, async (snapshot) => {
      const promises = snapshot.docs.map(async (docSnap) => {
        const session = docSnap.data();
        const sessionId = docSnap.id;
        const contactIds = session.sharedWithUserIds || [];

        const contactPromises = contactIds.map(async (id: string) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              userId: id,
              username: userData.username || 'Friend',
              avatarUrl: userData.avatarUrl,
              type: 'normal' as const,
              sessionId,
            };
          }
          return null;
        });
        return (await Promise.all(contactPromises)).filter(Boolean) as SharingInstance[];
      });
      normalContacts = (await Promise.all(promises)).flat();
      updateList();
    }, (err) => {
      console.error('Error listening to normal sharing:', err);
      setError('Failed to load normal sharing status.');
    });
    unsubscribes.push(unsubNormal);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // --- Actions ---

  // Shared helper: ensure background task is running
  const ensureBackgroundTask = async () => {
    if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))) {
      await AsyncStorage.setItem('current_user_id', user!.uid);
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0.5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Location Sharing Active',
          notificationBody: 'Your location is being shared.',
        },
      });
    }
  };

  // Shared helper: request background permission, returns true if granted
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '需要背景位置權限',
        '將位置權限設定為「永遠」以開啟分享功能',
        [
          { text: '取消', style: 'cancel' },
          { text: '前往設定', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  // Shared helper: find or create an active normal sharing session, returns session ID
  const getOrCreateSession = async (): Promise<string | null> => {
    const storedId = await AsyncStorage.getItem(SHARING_SESSION_DOC_ID_KEY);
    if (storedId) {
      const sessionDoc = await getDoc(doc(db, 'active_sharing_sessions', storedId));
      if (sessionDoc.exists() && sessionDoc.data()?.isActive === true) {
        return storedId;
      }
    }
    // No valid session — create one
    const sessionDocRef = await addDoc(collection(db, 'active_sharing_sessions'), {
      sharingUserId: user!.uid,
      sharedWithUserIds: [],
      createdAt: serverTimestamp(),
      isActive: true,
    });
    await AsyncStorage.setItem(SHARING_SESSION_DOC_ID_KEY, sessionDocRef.id);
    return sessionDocRef.id;
  };

  // Start sharing with a single contact
  const startSharingWithContact = async (friendId: string) => {
    if (!user?.uid) return;
    if (!(await requestPermission())) return;

    try {
      const sessionId = await getOrCreateSession();
      if (!sessionId) return;

      await updateDoc(doc(db, 'active_sharing_sessions', sessionId), {
        sharedWithUserIds: arrayUnion(friendId),
      });
      await ensureBackgroundTask();
      console.log(`✅ Started sharing with contact: ${friendId}`);
    } catch (e) {
      console.error('Failed to start sharing with contact:', e);
      Alert.alert('Error', 'Could not start sharing your location.');
    }
  };

  // Share with all provided contact IDs at once
  const createSharingSession = async (sharedWithUserIds: string[]) => {
    if (!user?.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to share your location.');
      return;
    }
    if (!(await requestPermission())) return;

    try {
      const sessionId = await getOrCreateSession();
      if (!sessionId) return;

      await updateDoc(doc(db, 'active_sharing_sessions', sessionId), {
        sharedWithUserIds: arrayUnion(...sharedWithUserIds),
      });
      await ensureBackgroundTask();
      console.log(`✅ Sharing with all contacts on session: ${sessionId}`);
    } catch (e) {
      console.error('Failed to start sharing session:', e);
      Alert.alert('Error', 'Could not start sharing your location.');
    }
  };

  const stopSharingWithContact = async (contact: GroupedSharingContact) => {
    if (!user?.uid) return;

    const { userId, sessions } = contact;
    const stopPromises = sessions.map(session => {
      if (session.type === 'emergency') {
        return updateDoc(doc(db, 'active_tracking', session.sessionId), {
          emergencyContactIds: arrayRemove(userId),
        });
      } else {
        const sessionRef = doc(db, 'active_sharing_sessions', session.sessionId);
        return updateDoc(sessionRef, {
          sharedWithUserIds: arrayRemove(userId),
        }).then(async () => {
          const updatedSession = await getDoc(sessionRef);
          if (updatedSession.exists() && updatedSession.data().sharedWithUserIds.length === 0) {
            console.log(`Session ${session.sessionId} is now empty. Deactivating.`);
            await updateDoc(sessionRef, { isActive: false });
          }
        });
      }
    });

    try {
      await Promise.all(stopPromises);

      // Clean up AsyncStorage key
      await AsyncStorage.removeItem(SHARING_SESSION_DOC_ID_KEY);

      // Stop background task only if emergency tracking is not also active
      const isEmergencyModeActive = await AsyncStorage.getItem('tracking_active');
      if (isEmergencyModeActive !== 'true') {
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log('🛑 Background location task stopped.');
        }
      } else {
        console.log('Leaving background task running — emergency mode still active.');
      }

      console.log(`✅ Stopped sharing with ${contact.username}`);
    } catch (e) {
      console.error(`Failed to stop sharing with ${contact.username}:`, e);
      setError(`Failed to stop sharing with ${contact.username}. Please try again.`);
    }
  };

  // Deactivate the entire normal sharing session at once
  const stopAllSharing = async () => {
    try {
      const sessionId = await AsyncStorage.getItem(SHARING_SESSION_DOC_ID_KEY);
      if (sessionId) {
        await updateDoc(doc(db, 'active_sharing_sessions', sessionId), { isActive: false });
      }

      await AsyncStorage.removeItem(SHARING_SESSION_DOC_ID_KEY);

      const isEmergencyModeActive = await AsyncStorage.getItem('tracking_active');
      if (isEmergencyModeActive !== 'true') {
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log('🛑 Background location task stopped.');
        }
      } else {
        console.log('Leaving background task running — emergency mode still active.');
      }

      console.log('✅ Stopped all sharing.');
    } catch (e) {
      console.error('Failed to stop all sharing:', e);
      setError('Failed to stop sharing. Please try again.');
    }
  };

  return {
    sharedByFriends: Object.values(sharedByFriends),
    unifiedList,
    isSharing,
    isLoading,
    error,
    startSharingWithContact,
    createSharingSession,
    stopSharingWithContact,
    stopAllSharing,
  };
};
