import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

interface EmergencyData {
  lat: number;
  long: number;
  updateTime: Timestamp;
  trackedUserId: string;
  trackedUserName: string;
  emergencyDocId: string;
  contactStatus: Record<string, { status: string; notificationCount: number }>;
}

export const useEmergencyListener = () => {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState<Record<string, EmergencyData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const locationListenersRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'active_tracking'),
      where('emergencyContactIds', 'array-contains', user.uid),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setIsLoading(true);
      const now = Timestamp.now();
      const activeEmergencyDocs = querySnapshot.docs.filter(doc => {
        const session = doc.data();
        return now > session.emergencyActivationTime;
      });

      const currentEmergencyIds = new Set(activeEmergencyDocs.map(d => d.id));
      const previousEmergencyIds = new Set(Object.keys(emergencies));

      // Unsubscribe from listeners that are no longer active
      for (const docId of previousEmergencyIds) {
        if (!currentEmergencyIds.has(docId)) {
          locationListenersRef.current[docId]?.();
          delete locationListenersRef.current[docId];
        }
      }

      if (activeEmergencyDocs.length === 0) {
        setEmergencies({});
        setIsLoading(false);
        return;
      }

      const newEmergencies = { ...emergencies };

      for (const docSnap of activeEmergencyDocs) {
        const emergencyDocId = docSnap.id;
        if (previousEmergencyIds.has(emergencyDocId)) continue; // Already listening

        const session = docSnap.data();
        const { trackedUserId, contactStatus } = session;

        let trackedUserName = 'Unknown User';
        try {
          const userDoc = await getDoc(doc(db, 'users', trackedUserId));
          if (userDoc.exists()) {
            trackedUserName = userDoc.data().username || 'Unknown User';
          }
        } catch (e) {
          console.error("Error fetching user name:", e);
        }

        const locationDocRef = doc(db, 'users', trackedUserId, 'real_time_location', 'current');
        const unsubLocation = onSnapshot(locationDocRef, (locationSnap) => {
          if (locationSnap.exists()) {
            const { lat, long, updateTime } = locationSnap.data();
            setEmergencies(prev => ({
              ...prev,
              [emergencyDocId]: {
                ...prev[emergencyDocId],
                lat,
                long,
                updateTime,
                trackedUserId,
                trackedUserName,
                emergencyDocId,
                contactStatus,
              }
            }));
          }
        });

        locationListenersRef.current[emergencyDocId] = unsubLocation;
      }

      // Clean up stale emergencies from state
      const finalEmergencyMap: Record<string, EmergencyData> = {};
      for (const docId of currentEmergencyIds) {
        if (newEmergencies[docId]) {
          finalEmergencyMap[docId] = newEmergencies[docId];
        }
      }
      setEmergencies(finalEmergencyMap);

      setIsLoading(false);
    }, (err) => {
      console.error('Error listening to active tracking sessions:', err);
      setError('Could not listen for tracking sessions.');
      setIsLoading(false);
    });
    console.log(emergencies);

    return () => {
      console.log('Main emergency listener cleaned up.');
      unsubscribe();
      Object.values(locationListenersRef.current).forEach(unsub => unsub());
    };

  }, [user]);

  return { emergencyData: Object.values(emergencies), isLoading, error };
};