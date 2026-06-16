import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

export interface EmergencyData {
  lat: number;
  long: number;
  updateTime: Timestamp;
  trackedUserId: string;
  trackedUserName: string;
  trackedUserAvatarUrl?: string;
  emergencyDocId: string;
  collectionName: 'active_tracking' | 'manual_tracking';
  contactStatus: Record<string, { status: string; notificationCount: number }>;
  activity?: string;
  activityLocation?: string;
  notes?: string;
}

export const useEmergencyListener = () => {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState<Record<string, EmergencyData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const locationListenersRef = useRef<Record<string, () => void>>({});

  const processSnapshot = async (
    querySnapshot: any,
    collectionName: 'active_tracking' | 'manual_tracking',
    activeIds: Set<string>
  ) => {
    const now = Timestamp.now();
    const oneDayAgo = Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

    const activeDocs = querySnapshot.docs.filter((d: any) => {
      const session = d.data();
      const recent = session.emergencyActivationTime &&
        session.emergencyActivationTime < now &&
        session.emergencyActivationTime > oneDayAgo;
      if (recent) activeIds.add(d.id);
      return recent;
    });

    for (const docSnap of activeDocs) {
      const emergencyDocId = docSnap.id;
      const session = docSnap.data();
      const { trackedUserId, contactStatus, activity, activityLocation, notes } = session;

      if (!locationListenersRef.current[emergencyDocId]) {
        let trackedUserName = 'Unknown User';
        let trackedUserAvatarUrl: string | undefined;
        try {
          const userDoc = await getDoc(doc(db, 'users', trackedUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            trackedUserName = userData.username || 'Unknown User';
            trackedUserAvatarUrl = userData.avatarUrl;
          }
        } catch (e) {
          console.error('Error fetching user name/avatar:', e);
        }

        setEmergencies(prev => ({
          ...prev,
          [emergencyDocId]: {
            lat: 0, long: 0, updateTime: Timestamp.now(),
            trackedUserId, trackedUserName, trackedUserAvatarUrl,
            emergencyDocId, collectionName,
            contactStatus, activity, activityLocation, notes,
          },
        }));

        const locationDocRef = doc(db, 'users', trackedUserId, 'real_time_location', 'current');
        const unsubLocation = onSnapshot(locationDocRef, (locationSnap) => {
          if (locationSnap.exists()) {
            const { lat, long, updateTime } = locationSnap.data();
            setEmergencies(prev => ({
              ...prev,
              [emergencyDocId]: { ...prev[emergencyDocId], lat, long, updateTime },
            }));
          } else {
            setEmergencies(prev => { const s = { ...prev }; delete s[emergencyDocId]; return s; });
            locationListenersRef.current[emergencyDocId]?.();
            delete locationListenersRef.current[emergencyDocId];
          }
        });
        locationListenersRef.current[emergencyDocId] = unsubLocation;
      }
    }
  };

  useEffect(() => {
    if (!user?.uid) { setIsLoading(false); return; }

    const makeQuery = (col: string) => query(
      collection(db, col),
      where('emergencyContactIds', 'array-contains', user.uid),
      where('isActive', '==', true)
    );

    // Track active IDs across both collections so we can prune stale ones
    let activeIdsFromScheduled = new Set<string>();
    let activeIdsFromManual = new Set<string>();

    const pruneStale = () => {
      const allActive = new Set([...activeIdsFromScheduled, ...activeIdsFromManual]);
      setEmergencies(prev => {
        const next = { ...prev };
        for (const id in next) {
          if (!allActive.has(id)) {
            locationListenersRef.current[id]?.();
            delete locationListenersRef.current[id];
            delete next[id];
          }
        }
        return next;
      });
    };

    const unsubScheduled = onSnapshot(makeQuery('active_tracking'), async (snap) => {
      setIsLoading(true);
      activeIdsFromScheduled = new Set<string>();
      await processSnapshot(snap, 'active_tracking', activeIdsFromScheduled);
      pruneStale();
      setIsLoading(false);
    }, (err) => { console.error('active_tracking listener error:', err); setError('Could not listen for sessions.'); setIsLoading(false); });

    const unsubManual = onSnapshot(makeQuery('manual_tracking'), async (snap) => {
      setIsLoading(true);
      activeIdsFromManual = new Set<string>();
      await processSnapshot(snap, 'manual_tracking', activeIdsFromManual);
      pruneStale();
      setIsLoading(false);
    }, (err) => { console.error('manual_tracking listener error:', err); setError('Could not listen for sessions.'); setIsLoading(false); });

    return () => {
      unsubScheduled();
      unsubManual();
      Object.values(locationListenersRef.current).forEach(u => u());
      locationListenersRef.current = {};
      setEmergencies({});
    };
  }, [user]);

  return { emergencyData: Object.values(emergencies), isLoading, error };
};