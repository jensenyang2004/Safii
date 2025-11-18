import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

export interface UnifiedSharingContact {
  userId: string;
  username: string;
  avatarUrl?: string;
  type: 'emergency' | 'normal';
  sessionId: string;
}

export const useAllSharing = () => {
  const { user } = useAuth();
  const [unifiedList, setUnifiedList] = useState<UnifiedSharingContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      setUnifiedList([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    let emergencyContacts: UnifiedSharingContact[] = [];
    let normalContacts: UnifiedSharingContact[] = [];

    const updateUserList = () => {
        const allContacts = [...emergencyContacts, ...normalContacts];
        const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.userId, c])).values());
        setUnifiedList(uniqueContacts);
        setIsLoading(false);
    };

    // Listener for Emergency Sessions I am sharing
    const emergencyQuery = query(collection(db, 'active_tracking'), where('trackedUserId', '==', user.uid), where('isActive', '==', true));
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
                        sessionId: sessionId,
                    };
                }
                return null;
            });
            return (await Promise.all(contactPromises)).filter(Boolean) as UnifiedSharingContact[];
        });
        emergencyContacts = (await Promise.all(promises)).flat();
        updateUserList();
    }, (err) => {
        console.error("Error listening to emergency sharing:", err);
        setError("Failed to load emergency sharing status.");
    });
    unsubscribes.push(unsubEmergency);

    // Listener for Normal Sharing Sessions I am sharing
    const normalQuery = query(collection(db, 'active_sharing_sessions'), where('sharingUserId', '==', user.uid), where('isActive', '==', true));
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
                        sessionId: sessionId,
                    };
                }
                return null;
            });
            return (await Promise.all(contactPromises)).filter(Boolean) as UnifiedSharingContact[];
        });
        normalContacts = (await Promise.all(promises)).flat();
        updateUserList();
    }, (err) => {
        console.error("Error listening to normal sharing:", err);
        setError("Failed to load normal sharing status.");
    });
    unsubscribes.push(unsubNormal);

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };

  }, [user]);

  const stopSharingWithContact = async (contact: UnifiedSharingContact) => {
    if (!user?.uid) return;

    const { sessionId, userId, type } = contact;
    
    if (type === 'emergency') {
        const sessionRef = doc(db, 'active_tracking', sessionId);
        await updateDoc(sessionRef, {
            emergencyContactIds: arrayRemove(userId)
        });

    } else if (type === 'normal') {
        const sessionRef = doc(db, 'active_sharing_sessions', sessionId);
        await updateDoc(sessionRef, {
            sharedWithUserIds: arrayRemove(userId)
        });

        const updatedSession = await getDoc(sessionRef);
        if (updatedSession.exists() && updatedSession.data().sharedWithUserIds.length === 0) {
            await updateDoc(sessionRef, {
                isActive: false
            });
        }
    }
  };

  return { unifiedList, isLoading, error, stopSharingWithContact };
};
