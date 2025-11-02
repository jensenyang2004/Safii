import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/apis/firebase';
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
      const oneDayAgo = Timestamp.fromMillis(now.toMillis() - (24 * 60 * 60 * 1000));

      // Get IDs of active emergencies from the current snapshot
      const currentSnapshotEmergencyIds = new Set<string>();
      const activeEmergencyDocs = querySnapshot.docs.filter(doc => {
        const session = doc.data();
        const isActiveAndRecent = session.emergencyActivationTime && 
                                 session.emergencyActivationTime < now && 
                                 session.emergencyActivationTime > oneDayAgo;
        if (isActiveAndRecent) {
          currentSnapshotEmergencyIds.add(doc.id);
        }
        return isActiveAndRecent;
      });

      // Clean up listeners and state for emergencies that are no longer active
      setEmergencies(prevEmergencies => {
        const updatedEmergencies = { ...prevEmergencies };
        for (const docId in updatedEmergencies) {
          if (!currentSnapshotEmergencyIds.has(docId)) {
            locationListenersRef.current[docId]?.(); // Unsubscribe location listener
            delete locationListenersRef.current[docId]; // Remove from ref
            delete updatedEmergencies[docId]; // Remove from state
          }
        }
        return updatedEmergencies;
      });


      // Process current active emergencies
      for (const docSnap of activeEmergencyDocs) {
        const emergencyDocId = docSnap.id;
        const session = docSnap.data();
        const { trackedUserId, contactStatus } = session;

        // If we are not already listening for this emergency's location, set up a new listener
        if (!locationListenersRef.current[emergencyDocId]) {
          let trackedUserName = 'Unknown User';
          try {
            const userDoc = await getDoc(doc(db, 'users', trackedUserId));
            if (userDoc.exists()) {
              trackedUserName = userDoc.data().username || 'Unknown User';
            }
          } catch (e) {
            console.error("Error fetching user name:", e);
          }

          // Initialize the emergency data in the state with static info
          setEmergencies(prev => ({
              ...prev,
              [emergencyDocId]: {
                  lat: 0, // Placeholder, will be updated by location listener
                  long: 0, // Placeholder
                  updateTime: Timestamp.now(), // Placeholder
                  trackedUserId,
                  trackedUserName,
                  emergencyDocId,
                  contactStatus,
              }
          }));

          const locationDocRef = doc(db, 'users', trackedUserId, 'real_time_location', 'current');
          const unsubLocation = onSnapshot(locationDocRef, (locationSnap) => {
            if (locationSnap.exists()) {
              const { lat, long, updateTime } = locationSnap.data();
              setEmergencies(prev => ({
                ...prev,
                [emergencyDocId]: {
                  ...prev[emergencyDocId], // Spread existing data (including static fields)
                  lat,
                  long,
                  updateTime,
                }
              }));
            } else {
                // If location doc disappears, remove this emergency from state
                setEmergencies(prev => {
                    const newState = { ...prev };
                    delete newState[emergencyDocId];
                    return newState;
                });
                locationListenersRef.current[emergencyDocId]?.(); // Unsubscribe
                delete locationListenersRef.current[emergencyDocId]; // Clean up ref
            }
          });
          locationListenersRef.current[emergencyDocId] = unsubLocation;
        }
      }

      setIsLoading(false);
    }, (err) => {
      console.error('Error listening to active tracking sessions:', err);
      setError('Could not listen for tracking sessions.');
      setIsLoading(false);
    });
    console.log(emergencies); // This console.log will show the state from the closure, not necessarily the latest.

    return () => {
      console.log('Main emergency listener cleaned up.');
      unsubscribe();
      Object.values(locationListenersRef.current).forEach(unsub => unsub());
      locationListenersRef.current = {}; // Clear the ref
      setEmergencies({}); // Clear state on unmount
    };

  }, [user]);

  return { emergencyData: Object.values(emergencies), isLoading, error };
};