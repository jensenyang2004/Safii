import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

interface ContactInfo {
  status: string;
  notificationCount: number;
  avatarUrl?: string;
  username?: string;
}

interface TrackingSessionData {
  emergencyDocId: string;
  contactStatus: Record<string, ContactInfo>;
}

export const useSharingSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Record<string, TrackingSessionData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'active_tracking'),
      where('trackedUserId', '==', user.uid),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setIsLoading(true);
      const now = Timestamp.now();
      const oneDayAgo = Timestamp.fromMillis(now.toMillis() - (24 * 60 * 60 * 1000));

      const currentSnapshotSessionIds = new Set<string>();
      const activeSessions = querySnapshot.docs.filter(doc => {
        const session = doc.data();
        const isActiveAndRecent = session.emergencyActivationTime && 
                                 session.emergencyActivationTime < now && 
                                 session.emergencyActivationTime > oneDayAgo;
        if (isActiveAndRecent) {
          currentSnapshotSessionIds.add(doc.id);
        }
        return isActiveAndRecent;
      });

      setSessions(prevSessions => {
        const updatedSessions = { ...prevSessions };
        for (const docId in updatedSessions) {
          if (!currentSnapshotSessionIds.has(docId)) {
            delete updatedSessions[docId];
          }
        }
        return updatedSessions;
      });

      const newSessions: Record<string, TrackingSessionData> = {};
      for (const docSnap of activeSessions) {
        const session = docSnap.data();
        const augmentedContactStatus: Record<string, ContactInfo> = {};

        for (const contactId in session.contactStatus) {
          const userDocRef = doc(db, 'users', contactId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            augmentedContactStatus[contactId] = {
              ...session.contactStatus[contactId],
              avatarUrl: userData.avatarUrl,
              username: userData.username,
            };
          } else {
            augmentedContactStatus[contactId] = {
              ...session.contactStatus[contactId],
            };
          }
        }

        newSessions[docSnap.id] = {
          emergencyDocId: docSnap.id,
          contactStatus: augmentedContactStatus,
        };
      }

      setSessions(prevSessions => ({ ...prevSessions, ...newSessions }));
      setIsLoading(false);
    }, (err) => {
      console.error('Error listening to my tracking sessions:', err);
      setError('Could not listen for my tracking sessions.');
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      setSessions({});
    };

  }, [user]);

  return { sessions: Object.values(sessions), isLoading, error };
};