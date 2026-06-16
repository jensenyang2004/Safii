// frontend/context/ScheduledTrackingContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { db } from '@/libs/firebase';
import { useAuth } from './AuthProvider';
import { useTracking } from './TrackProvider';
import {
    ScheduledTracking,
    ActiveScheduledSession,
    DefaultHome,
} from '@/types/scheduledTracking';

type ScheduledTrackingContextType = {
    schedules: ScheduledTracking[];
    activeSession: ActiveScheduledSession | null;
    defaultHome: DefaultHome | null;
    loading: boolean;
    createSchedule: (data: Omit<ScheduledTracking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSchedule: (id: string, data: Partial<Omit<ScheduledTracking, 'id' | 'userId'>>) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    markArrivedHome: () => Promise<void>;
    stopActiveSession: () => Promise<void>;
    updateDefaultHome: (home: DefaultHome) => Promise<void>;
};

const ScheduledTrackingContext = createContext<ScheduledTrackingContextType | null>(null);

export const ScheduledTrackingProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { isTracking, trackingModeId, hydrateFromScheduledSession, stopTrackingMode } = useTracking();
    const [schedules, setSchedules] = useState<ScheduledTracking[]>([]);
    const [activeSession, setActiveSession] = useState<ActiveScheduledSession | null>(null);
    const [defaultHome, setDefaultHome] = useState<DefaultHome | null>(null);
    const [loading, setLoading] = useState(true);
    const prevSessionRef = useRef<{ id: string; scheduleId: string } | null>(null);

    // When a backend-triggered session becomes active, hand off check-in logic to TrackProvider
    useEffect(() => {
        if (!activeSession?.scheduleId) return;
        if (isTracking && trackingModeId === activeSession.scheduleId) return;
        const schedule = schedules.find(s => s.id === activeSession.scheduleId);
        if (!schedule) return;
        hydrateFromScheduledSession(activeSession.id, schedule);
    }, [activeSession?.id, schedules]);

    // When the server ends the session (endTime reached or safe_arrived), stop client tracking
    useEffect(() => {
        if (activeSession) {
            prevSessionRef.current = { id: activeSession.id, scheduleId: activeSession.scheduleId };
        } else if (prevSessionRef.current) {
            if (isTracking && trackingModeId === prevSessionRef.current.scheduleId) {
                console.log('[ScheduledTracking] Session ended server-side — stopping client tracking');
                stopTrackingMode();
            }
            prevSessionRef.current = null;
        }
    }, [activeSession?.id]);

    // Register Android notification channel for schedule-triggered self-notifications
    useEffect(() => {
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('scheduled_tracking', {
                name: '自動排程報平安',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
                vibrationPattern: [0, 250, 250, 250],
            });
        }
    }, []);

    useEffect(() => {
        if (!user?.uid) {
            setSchedules([]);
            setActiveSession(null);
            setDefaultHome(null);
            setLoading(false);
            return;
        }

        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            const data = snap.data();
            setDefaultHome(data?.defaultHome ?? null);
        });

        const schedulesQuery = query(
            collection(db, 'scheduled_tracking'),
            where('userId', '==', user.uid)
        );

        const unsubSchedules = onSnapshot(schedulesQuery, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledTracking));
            setSchedules(data);
            setLoading(false);
        }, () => {
            setLoading(false);
        });

        const sessionQuery = query(
            collection(db, 'active_tracking'),
            where('trackedUserId', '==', user.uid),
            where('isActive', '==', true),
            where('triggeredBy', '==', 'schedule')
        );

        const unsubSession = onSnapshot(sessionQuery, (snap) => {
            if (snap.empty) {
                setActiveSession(null);
            } else {
                const d = snap.docs[0];
                setActiveSession({ id: d.id, ...d.data() } as ActiveScheduledSession);
            }
        });

        return () => {
            unsubUser();
            unsubSchedules();
            unsubSession();
        };
    }, [user?.uid]);

    const createSchedule = async (
        data: Omit<ScheduledTracking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    ) => {
        if (!user?.uid) return;
        await addDoc(collection(db, 'scheduled_tracking'), {
            ...data,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    };

    const updateSchedule = async (
        id: string,
        data: Partial<Omit<ScheduledTracking, 'id' | 'userId'>>
    ) => {
        await updateDoc(doc(db, 'scheduled_tracking', id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    };

    const deleteSchedule = async (id: string) => {
        await deleteDoc(doc(db, 'scheduled_tracking', id));
    };

    const markArrivedHome = async () => {
        if (!activeSession) return;
        await updateDoc(doc(db, 'active_tracking', activeSession.id), {
            hasArrivedHome: true,
            arrivedAt: serverTimestamp(),
        });
    };

    const stopActiveSession = async () => {
        if (!activeSession) return;
        await updateDoc(doc(db, 'active_tracking', activeSession.id), {
            isActive: false,
            overallStatus: 'safe_stopped',
            endedAt: serverTimestamp(),
        });
    };

    const updateDefaultHome = async (home: DefaultHome) => {
        if (!user?.uid) {
            console.warn('updateDefaultHome: no user uid');
            return;
        }
        console.log('updateDefaultHome writing to users/', user.uid, home);
        await setDoc(doc(db, 'users', user.uid), { defaultHome: home }, { merge: true });
        console.log('updateDefaultHome write complete');
    };

    return (
        <ScheduledTrackingContext.Provider value={{
            schedules,
            activeSession,
            defaultHome,
            loading,
            createSchedule,
            updateSchedule,
            deleteSchedule,
            markArrivedHome,
            stopActiveSession,
            updateDefaultHome,
        }}>
            {children}
        </ScheduledTrackingContext.Provider>
    );
};

export const useScheduledTracking = () => {
    const context = useContext(ScheduledTrackingContext);
    if (!context) throw new Error('useScheduledTracking must be used within ScheduledTrackingProvider');
    return context;
};
