import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../libs/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { Alert, Pressable, View } from 'react-native';

// Define types
interface FriendRequest {
    id: string;
    from: string;
    to?: string;
    fromName?: string;
    fromAvatar?: string;
    toName?: string;
    toAvatar?: string;
    status: 'pending' | 'accepted' | 'rejected';
    timestamp: any;
}

interface Friend {
    id: string;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

interface UserDoc {
    id: string;
    username?: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    // Add other fields you store in user documents
}

// Create context
const FriendContext = createContext<{
    friends: Friend[];
    incomingRequests: FriendRequest[];
    outgoingRequests: FriendRequest[];
    sendFriendRequest: (userId: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    cancelFriendRequest: (requestId: string) => Promise<void>; // Add this
    searchUsers: (query: string) => Promise<any[]>;
    loading: boolean;
    refreshData: () => void;

}>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    sendFriendRequest: async () => { },
    acceptFriendRequest: async () => { },
    rejectFriendRequest: async () => { },
    removeFriend: async () => { },
    cancelFriendRequest: async () => { }, // Add this
    searchUsers: async () => [],
    loading: false,
    refreshData: () => { },
});

// Provider component
export const FriendProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch friends and requests when user changes
    useEffect(() => {
        if (user?.uid) {
            fetchFriends();
            fetchRequests();
        } else {
            setFriends([]);
            setIncomingRequests([]);
            setOutgoingRequests([]);
        }
    }, [user]);

    // Fetch user's friends
    const fetchFriends = async () => {
        if (!user?.uid) return;

        setLoading(true);
        try {
            const friendsRef = collection(db, 'users', user.uid, 'friends');
            const querySnapshot = await getDocs(friendsRef);

            const friendsList: Friend[] = [];

            // For each friend document - rename 'doc' to 'friendDoc' to avoid name conflict
            for (const friendDoc of querySnapshot.docs) {
                // Get the friend's user data
                const friendId = friendDoc.id; // The ID of the friend's user document
                const userDocRef = doc(db, 'users', friendId); // Now 'doc' refers to the imported function
                const userData = await getDoc(userDocRef);

                if (userData.exists()) {
                    friendsList.push({
                        id: friendDoc.id,
                        userId: friendId,
                        username: userData.data().username || '',
                        displayName: userData.data().displayName || '',
                        avatarUrl: userData.data().avatarUrl || '',
                    });
                }
            }

            setFriends(friendsList);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch friend requests
    const fetchRequests = async () => {
        if (!user?.uid) return;

        setLoading(true);
        try {
            // console.log('Fetching requests for user:', user.uid);

            // Use a consistent collection name
            const requestCollection = 'friendRequests';

            // Fetch incoming requests
            const incomingRef = collection(db, requestCollection);
            const incomingQuery = query(incomingRef, where('to', '==', user.uid), where('status', '==', 'pending'));
            const incomingSnapshot = await getDocs(incomingQuery);

            // console.log('Incoming requests count:', incomingSnapshot.docs.length);

            // Fetch outgoing requests
            const outgoingRef = collection(db, requestCollection);
            const outgoingQuery = query(outgoingRef, where('from', '==', user.uid), where('status', '==', 'pending'));
            const outgoingSnapshot = await getDocs(outgoingQuery);

            // console.log('Outgoing requests count:', outgoingSnapshot.docs.length);

            const incoming: FriendRequest[] = [];
            const outgoing: FriendRequest[] = [];

            // Process incoming requests with sender info
            for (const requestDoc of incomingSnapshot.docs) {
                const data = requestDoc.data();

                // Get sender's user info
                const senderDoc = await getDoc(doc(db, 'users', data.from));
                const senderData = senderDoc.exists() ? senderDoc.data() : {};

                incoming.push({
                    id: requestDoc.id,
                    from: data.from,
                    fromName: senderData.username || senderData.displayName || 'Unknown User',
                    fromAvatar: senderData.avatarUrl || null,
                    status: data.status,
                    timestamp: data.timestamp,
                });
            }

            // Process outgoing requests with recipient info
            for (const requestDoc of outgoingSnapshot.docs) {
                const data = requestDoc.data();

                // Get recipient's user info
                const recipientDoc = await getDoc(doc(db, 'users', data.to));
                const recipientData = recipientDoc.exists() ? recipientDoc.data() : {};

                outgoing.push({
                    id: requestDoc.id,
                    from: data.from,
                    to: data.to,
                    toName: recipientData.username || recipientData.displayName || 'Unknown User',
                    toAvatar: recipientData.avatarUrl || null,
                    status: data.status,
                    timestamp: data.timestamp,
                });
            }
            setIncomingRequests(incoming);
            setOutgoingRequests(outgoing);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
        } finally {
            setLoading(false);
        }
    };

    // Send a friend request
    const sendFriendRequest = async (recipientId: string) => {


        if (!user?.uid) {
            Alert.alert('Error', 'You must be logged in to add friends');
            return;
        }

        if (user.uid === recipientId) {
            Alert.alert('Error', 'You cannot add yourself as a friend');
            return;
        }

        try {
            setLoading(true);

            // Check if request already exists
            const existingRequestQuery = query(
                collection(db, 'friendRequests'),
                where('from', '==', user.uid),
                where('to', '==', recipientId),
                where('status', '==', 'pending')
            );

            const requestSnapshot = await getDocs(existingRequestQuery);

            if (!requestSnapshot.empty) {
                Alert.alert('Friend Request', 'You have already sent a request to this user');
                return;
            }

            // Check if they're already friends
            const friendDoc = await getDoc(doc(db, 'users', user.uid, 'friends', recipientId));

            if (friendDoc.exists()) {
                Alert.alert('Friend Request', 'You are already friends with this user');
                return;
            }

            // Create a friend request
            await addDoc(collection(db, 'friendRequests'), {
                from: user.uid,
                to: recipientId,
                status: 'pending',
                timestamp: serverTimestamp(),
            });

            Alert.alert('Friend Request', 'Friend request sent successfully');
            await fetchRequests();
        } catch (error) {
            console.error('Error sending friend request:', error);
            Alert.alert('Error', 'Failed to send friend request');
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        return Promise.all([
            fetchFriends(),
            fetchRequests()
        ]);
    };

    // Accept a friend request
    const acceptFriendRequest = async (requestId: string) => {
        try {
            setLoading(true);

            // Get the request
            const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));

            if (!requestDoc.exists()) {
                Alert.alert('Error', 'Friend request not found');
                return;
            }

            const requestData = requestDoc.data();

            // Update the request status
            await updateDoc(doc(db, 'friendRequests', requestId), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });

            // Add each user to the other's friends collection
            const timestamp = serverTimestamp();

            // Add sender to current user's friends
            await setDoc(doc(db, 'users', user.uid, 'friends', requestData.from), {
                timestamp
            });

            // Add current user to sender's friends
            await setDoc(doc(db, 'users', requestData.from, 'friends', user.uid), {
                timestamp
            });

            Alert.alert('Friend Request', 'Friend request accepted');
            fetchFriends();
            fetchRequests();
        } catch (error) {
            console.error('Error accepting friend request:', error);
            Alert.alert('Error', 'Failed to accept friend request');
        } finally {
            setLoading(false);
        }
    };

    // Reject a friend request
    const rejectFriendRequest = async (requestId: string) => {
        try {
            setLoading(true);

            // Update the request status
            await updateDoc(doc(db, 'friendRequests', requestId), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });

            Alert.alert('Friend Request', 'Friend request rejected');
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            Alert.alert('Error', 'Failed to reject friend request');
        } finally {
            setLoading(false);
        }
    };

    // Remove a friend
    const removeFriend = async (friendId: string) => {
        try {
            setLoading(true);

            // Remove from both users' friends collections
            await deleteDoc(doc(db, 'users', user?.uid, 'friends', friendId));
            await deleteDoc(doc(db, 'users', friendId, 'friends', user?.uid));

            Alert.alert('Friends', 'Friend removed successfully');
            fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
            Alert.alert('Error', 'Failed to remove friend');
        } finally {
            setLoading(false);
        }
    };

    const cancelFriendRequest = async (requestId: string) => {
        if (!user?.uid) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'friendRequests', requestId));

            // Update state by removing the cancelled request
            // await fetchRequests();

            setOutgoingRequests(prev => prev.filter(req => req.id !== requestId));

            Alert.alert('Success', 'Friend request cancelled');
        } catch (error) {
            console.error('Error cancelling request:', error);
            Alert.alert('Error', 'Failed to cancel friend request');
        } finally {
            setLoading(false);
        }
    };
    // Search for users
    // Search for users by username
    const searchUsers = async (searchQuery: string): Promise<UserDoc[]> => {
        try {
            if (!searchQuery || searchQuery.length < 2) { // Reduced from 3 to 2 characters minimum
                return [];
            }

            if (!user) {
                console.warn('User is not logged in, cannot search users');
                return [];
            }

            const lowercaseQuery = searchQuery.toLowerCase();

            // Option 1: Client-side filtering (simpler but less efficient)
            const usersRef = collection(db, 'users');
            const allUsersQuery = query(usersRef, limit(100)); // Get a reasonable number of users

            const querySnapshot = await getDocs(allUsersQuery);
            console.log('📊 Total users fetched from database:', querySnapshot.docs.length);

            return querySnapshot.docs
                .map(doc => {
                    return {
                        id: doc.id,
                        ...doc.data()
                    } as UserDoc; // Type assertion here
                })
                .filter(foundUser =>
                    // Now TypeScript knows that username might exist on foundUser
                    foundUser.username?.toLowerCase().includes(lowercaseQuery) &&
                    foundUser.id !== user.uid
                )
                .slice(0, 10); // Only return top 10 matches
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    };

    const value = {
        friends,
        incomingRequests,
        outgoingRequests,
        sendFriendRequest,
        acceptFriendRequest,
        refreshData,
        rejectFriendRequest,
        removeFriend,
        cancelFriendRequest,
        searchUsers,
        loading,
    };

    return (
        <FriendContext.Provider value={value}>
            {children}
        </FriendContext.Provider>
    );
};

// Custom hook to use the friend context
export const useFriends = () => useContext(FriendContext);