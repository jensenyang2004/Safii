import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Button, View } from 'react-native';
import { collection, query, where, onSnapshot, getDoc, doc as docRef, doc } from 'firebase/firestore';
<<<<<<< HEAD
import { db } from '@/apis/firebase';
import { registerForPushNotificationsAsync, saveTokenToFirestore, sendPushNotification } from '@/apis/notifications';
=======
import { db } from '@/libs/firebase';
import { registerForPushNotificationsAsync, saveTokenToFirestore, sendPushNotification } from '@/libs/notifications';
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
import { useAuth } from '@/context/AuthProvider'; // Import AuthProvider context
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { Text } from 'react-native';

const NotificationContext = createContext<null | {}>(null);

interface Notification {
    senderName: string;
    location: any; // Replace `any` with the actual type of `location`
}

interface Location {
    latitude: number;
    longitude: number;
    latitudeDelta?: number; // Optional
    longitudeDelta?: number; // Optional
}

type RootStackParamList = {
    Map: { location: any }; // Define the parameters for the 'Map' screen
};
type NavigationParams = StackNavigationProp<RootStackParamList, 'Map'>;


export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth(); // Access current user from AuthProvider
    const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
    const [unansweredNotifications, setUnansweredNotifications] = useState<Notification[]>([]);

    const navigation = useNavigation<NavigationParams>();

    useEffect(() => {
<<<<<<< HEAD

=======
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
        if (user) {
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    saveTokenToFirestore(token);
                }
            });
        }
    }, [user]);

    useEffect(() => {
        const currentUserId = user?.uid;

        if (!currentUserId) return;

        const locationSharingQuery = query(
            collection(db, 'location_sharing'),
            where('__name__', '==', currentUserId)
        );

        console.log('Listening for notifications...');
        const unsubscribe = onSnapshot(locationSharingQuery, async snapshot => {
            console.log('Snapshot changes detected:', snapshot.docChanges());
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    console.log('New notification data:', data);

                    const snap = await getDoc(doc(db, 'users', data.userId));
                    let senderName = 'Unknown User';
                    if (snap.exists()) {
                        const { username, displayName } = snap.data();
                        senderName = username ?? displayName ?? 'Unknown User';
                    }

                    console.log('Sender name:', senderName);
                    setActiveNotification({ senderName, location: data.location });
                }
            });
        });

        return () => unsubscribe();
    }, [user]);

    const handleViewLocation = (location: Location) => {
        navigation.navigate('Map', { location });
        setActiveNotification(null);
    };

    const handleDismissNotification = () => {
        if (activeNotification) {
            setUnansweredNotifications((prev) => [
                ...prev,
                activeNotification, // Only add if activeNotification is not null
            ]);
            setActiveNotification(null);
            Toast.show({
                type: 'info',
                text1: 'Unanswered Message',
                text2: `${activeNotification.senderName} sent you a location.`,
                position: 'top',
            });
        }
    };

    useEffect(() => {
        if (activeNotification) {
            Alert.alert(
                'Location Info Received',
                `User ${activeNotification.senderName} has sent you their location.`,
                [
                    {
                        text: '查看',
                        onPress: () => handleViewLocation(activeNotification.location),
                    },
                    {
                        text: '關閉',
                        onPress: handleDismissNotification,
                    },
                ]
            );
        }
    }, [activeNotification]);
    return (
        <NotificationContext.Provider value={{}}>
            {children}
            {activeNotification && (
                <Modal isVisible={true}>
                    <View>
                        <Text>{`User ${activeNotification.senderName} has sent you their location.`}</Text>
                        <Button title="查看" onPress={() => handleViewLocation(activeNotification.location)} />
                        <Button title="關閉" onPress={handleDismissNotification} />
                    </View>
                </Modal>
            )}
            <Toast />
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);