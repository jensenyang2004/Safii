import React, { createContext, useContext, useEffect } from 'react';
import { registerForPushNotificationsAsync, saveTokenToFirestore } from '@/apis/notifications';
import { useAuth } from '@/context/AuthProvider';
import Toast from 'react-native-toast-message';

const NotificationContext = createContext<null | {}>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync()
                .then(token => {
                    if (token) {
                        saveTokenToFirestore(token);
                    }
                })
                .catch(error => {
                    console.error("Failed to register for push notifications:", error);
                });
        }
    }, [user]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
            <Toast />
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
