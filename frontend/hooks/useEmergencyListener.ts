import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

interface EmergencyData {
  lat: number;
  long: number;
  updateTime: Timestamp;
  trackedUserId: string;
  trackedUserName: string;
}

// This hook now listens for active tracking sessions where this user is a contact
// and actively checks if the deadline has passed.
export const useEmergencyListener = () => {
  const { user } = useAuth();
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'active_tracking'),
      where('emergencyContactIds', 'array-contains', user.uid)
    );

    let locationUnsubscribe: (() => void) | null = null;
    let emergencyCheckInterval: any | null = null;

    const clearEmergencyState = () => {
      if (locationUnsubscribe) locationUnsubscribe();
      if (emergencyCheckInterval) clearInterval(emergencyCheckInterval);
      setEmergencyData(null);
      locationUnsubscribe = null;
      emergencyCheckInterval = null;
    };

    const mainUnsubscribe = onSnapshot(q, (querySnapshot) => {
      setIsLoading(false);
      clearEmergencyState(); // Clear previous state on any change

      if (querySnapshot.empty) {
        console.log('Not a contact for any active tracking sessions.');
        return;
      }

      // For simplicity, we handle the first emergency found.
      // A more complex implementation could handle multiple simultaneous emergencies.
      const session = querySnapshot.docs[0].data();
      const { trackedUserId, emergencyActivationTime } = session;

      console.log(`Watching session for user: ${trackedUserId}`);

      const checkEmergencyStatus = async () => {
        const now = Timestamp.now();
        if (now > emergencyActivationTime) {
          console.log(`🚨 DEADLINE PASSED for user ${trackedUserId}. Fetching location.`);
          if (emergencyCheckInterval) clearInterval(emergencyCheckInterval);

          // Fetch user name
          let trackedUserName = 'Unknown User';
          try {
            const userDoc = await getDoc(doc(db, 'users', trackedUserId));
            if (userDoc.exists()) {
              trackedUserName = userDoc.data().username || 'Unknown User';
            }
          } catch (e) {
            console.error("Error fetching tracked user's name:", e);
          }

          // Listen to the real-time location of the tracked user
          const locationDocRef = doc(db, 'users', trackedUserId, 'real_time_location', 'current');
          locationUnsubscribe = onSnapshot(locationDocRef, (locationSnap) => {
            if (locationSnap.exists()) {
              const { lat, long, updateTime } = locationSnap.data();
              setEmergencyData({
                lat,
                long,
                updateTime,
                trackedUserId,
                trackedUserName,
              });
            }
          });
        } else {
          const secondsLeft = emergencyActivationTime.seconds - now.seconds;
          console.log(`Deadline not passed. ${secondsLeft} seconds remaining.`);
        }
      };

      // Start checking immediately and then every 30 seconds.
      checkEmergencyStatus();
      emergencyCheckInterval = setInterval(checkEmergencyStatus, 30000);

    }, (err) => {
      console.error('Error listening to active tracking sessions:', err);
      setError('Could not listen for tracking sessions.');
      setIsLoading(false);
    });

    // Cleanup function for the main query listener
    return () => {
      console.log('Main emergency listener cleaned up.');
      clearEmergencyState();
      mainUnsubscribe();
    };
  }, [user]);

  return { emergencyData, isLoading, error };
};