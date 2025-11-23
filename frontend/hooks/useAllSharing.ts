import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

// Internal representation of a single sharing instance
interface SharingInstance {
  userId: string;
  username: string;
  avatarUrl?: string;
  type: 'emergency' | 'normal';
  sessionId: string;
}

// Data structure for a single session
export interface SessionInfo {
  sessionId: string;
  type: 'emergency' | 'normal';
}

// The public-facing contact object with grouped sessions
export interface GroupedSharingContact {
  userId: string;
  username: string;
  avatarUrl?: string;
  sessions: SessionInfo[];
}

export const useAllSharing = () => {
  const { user } = useAuth();
  const [unifiedList, setUnifiedList] = useState<GroupedSharingContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      setUnifiedList([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    let emergencyContacts: SharingInstance[] = [];
    let normalContacts: SharingInstance[] = [];

    const updateUserList = () => {
        const allInstances = [...emergencyContacts, ...normalContacts];
        
        const groupedContacts = new Map<string, GroupedSharingContact>();

        for (const instance of allInstances) {
            if (groupedContacts.has(instance.userId)) {
                const existing = groupedContacts.get(instance.userId)!;
                // Avoid adding duplicate session info if a listener fires multiple times
                if (!existing.sessions.some(s => s.sessionId === instance.sessionId)) {
                    existing.sessions.push({ sessionId: instance.sessionId, type: instance.type });
                }
            } else {
                groupedContacts.set(instance.userId, {
                    userId: instance.userId,
                    username: instance.username,
                    avatarUrl: instance.avatarUrl,
                    sessions: [{ sessionId: instance.sessionId, type: instance.type }],
                });
            }
        }
        
        setUnifiedList(Array.from(groupedContacts.values()));
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
            return (await Promise.all(contactPromises)).filter(Boolean) as SharingInstance[];
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
            return (await Promise.all(contactPromises)).filter(Boolean) as SharingInstance[];
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

  const stopSharingWithContact = async (contact: GroupedSharingContact) => {
    if (!user?.uid) return;

    const { userId, sessions } = contact;

    const stopPromises = sessions.map(session => {
        if (session.type === 'emergency') {
            const sessionRef = doc(db, 'active_tracking', session.sessionId);
            return updateDoc(sessionRef, {
                emergencyContactIds: arrayRemove(userId)
            });
        } else if (session.type === 'normal') {
            const sessionRef = doc(db, 'active_sharing_sessions', session.sessionId);
            
            // The update and subsequent check needs to be atomic per session
            return updateDoc(sessionRef, {
                sharedWithUserIds: arrayRemove(userId)
            }).then(async () => {
                // After removing the user, check if the session is now empty
                const updatedSession = await getDoc(sessionRef);
                if (updatedSession.exists() && updatedSession.data().sharedWithUserIds.length === 0) {
                    console.log(`Normal sharing session ${session.sessionId} is now empty. Deactivating.`);
                    await updateDoc(sessionRef, { isActive: false });
                }
            });
        }
        return Promise.resolve();
    });

    try {
        await Promise.all(stopPromises);
        console.log(`Successfully stopped sharing with ${contact.username} across ${sessions.length} sessions.`);
    } catch (e) {
        console.error(`Failed to stop sharing with ${contact.username}`, e);
        setError(`Failed to stop sharing with ${contact.username}. Please try again.`);
    }
  };

  return { unifiedList, isLoading, error, stopSharingWithContact };
};
