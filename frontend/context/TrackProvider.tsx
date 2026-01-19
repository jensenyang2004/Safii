import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AppState, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthProvider';
import { usePermissions } from '../hooks/usePermissions';
import { useTrackingReducer } from '../hooks/useTrackingReducer';
import { 
  TimelineEvent, 
  TrackingMode, 
  NotificationData, 
  TrackingContextType 
} from '@/types/tracking';
import { calculateFullTimeline } from '@/utils/trackingCalculator';
import * as TrackingStorage from '@/services/tracking/storage';
import * as TrackingFirestore from '@/services/tracking/firestore';
import * as TrackingNotifications from '@/services/tracking/notifications';
import * as TrackingLocation from '@/services/tracking/location';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import * as Location from 'expo-location';

// --- Global Notification Handler Setup ---
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    const data = notification.request.content.data as unknown as NotificationData;

    if (data?.type === 'session_end') {
      console.log(`⏰ Session ${data.strike + 1} ended - Report required`);
      if (data.deadline) {
        await TrackingStorage.saveReportDeadline(data.deadline);
      }
      await TrackingStorage.setTrackingActive(true);
    } else if (data?.type === 'missed_report') {
      console.log(`❌ Missed report ${data.strike} - Starting next session`);
      await TrackingStorage.saveCurrentStrike(data.strike);
      await TrackingStorage.clearReportDeadline();
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const TrackingContext = createContext<TrackingContextType | null>(null);

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { backgroundLocationStatus, foregroundLocationStatus } = usePermissions();
  const { state, dispatch } = useTrackingReducer();
  
  const [trackingModes, setTrackingModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [foregroundWatcher, setForegroundWatcher] = useState<Location.LocationSubscription | null>(null);
  
  // Use a ref to track if we are currently reconciling to avoid loops
  const isReconciling = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      await TrackingNotifications.configureNotifications();
    };
    init();
  }, []);

  // --- Real-time Tracking Modes ---
  useEffect(() => {
    let unsubscribe: () => void;

    if (user?.uid) {
      setLoading(true);
      const colRef = query(collection(db, 'TrackingMode'), where('userId', '==', user.uid));
      
      unsubscribe = onSnapshot(colRef, async (querySnapshot) => {
        try {
          const data = await Promise.all(
            querySnapshot.docs.map(async (docSnap) => {
              const trackingData = docSnap.data();
              const contacts = await Promise.all(
                (trackingData.emergencyContactIds || []).map(async (id: string) => {
                  try {
                    const contactDoc = await getDoc(doc(db, 'users', id));
                    return { id: contactDoc.id, ...contactDoc.data() };
                  } catch (e) {
                    console.warn(`Failed to fetch contact ${id}`, e);
                    return { id };
                  }
                })
              );
              return { id: docSnap.id, ...trackingData, contacts };
            })
          );
          setTrackingModes(data);
        } catch (error) {
          console.error('[TrackProvider] Error processing tracking modes:', error);
        } finally {
          setLoading(false);
        }
      });
    } else {
      setTrackingModes([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // --- State Reconciliation (The Brain) ---
  const loadAndReconcileState = useCallback(async () => {
    if (isReconciling.current) return;
    isReconciling.current = true;

    try {
      const isActive = await TrackingStorage.isTrackingActive();
      const timeline = await TrackingStorage.getTimeline();
      
      if (isActive && timeline && timeline.length > 0) {
        const now = Date.now();
        const modeId = await TrackingStorage.getTrackingModeId();
        const storedDeadline = await TrackingStorage.getReportDeadline();
        const startTime = await TrackingStorage.getStartTime() || 0;
        
        // Determine current strike based on time
        let currentStrikeCount = 0;
        for (const event of timeline) {
          if (event.type === 'missed_report' && now > event.time) {
            currentStrikeCount = event.strike;
          }
        }
        await TrackingStorage.saveCurrentStrike(currentStrikeCount);

        // Check if report is due
        let isReportDue = false;
        let reportDeadline = null;
        if (storedDeadline) {
          if (now < storedDeadline) {
            isReportDue = true;
            reportDeadline = storedDeadline;
          } else {
             // Deadline passed
             await TrackingStorage.clearReportDeadline();
          }
        }

        // Check if info sent (dead man switch triggered)
        const finalEvent = timeline[timeline.length - 1];
        const isInfoSent = finalEvent ? now > finalEvent.time : false;

        dispatch({ 
          type: 'RECONCILE_STATE', 
          payload: {
            isTracking: true,
            timeline,
            trackingModeId: modeId,
            currentStrike: currentStrikeCount,
            isReportDue,
            reportDeadline,
            isInfoSent,
            nextCheckInTime: timeline.find(e => e.type === 'session_end' && e.time > now)?.time || null
          }
        });
        
        console.log('✅ State Reconciled. Strike:', currentStrikeCount);
      } else {
        // Not active
        dispatch({ type: 'STOP_SESSION' });
      }
    } catch (error) {
      console.error('❌ Error reconciling state:', error);
      await stopTrackingMode(); // Fail safe
    } finally {
      isReconciling.current = false;
    }
  }, []); // Dependencies should be empty or minimal

  // Initial load
  useEffect(() => {
    if (user) {
      loadAndReconcileState();
    }
  }, [user, loadAndReconcileState]);

  // App State Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadAndReconcileState();
      }
    });
    return () => subscription.remove();
  }, [loadAndReconcileState]);

  // Notification Response Listener
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      // If it's a critical notification, force a reconcile
      if (data?.type === 'missed_report') {
        loadAndReconcileState();
      }
    });
    return () => responseSubscription.remove();
  }, [loadAndReconcileState]);

  // --- Foreground Timer for UI Updates ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const { isTracking, isReportDue, nextCheckInTime, reportDeadline, timeline } = state;

    if (isTracking && !isReportDue && nextCheckInTime) {
      interval = setInterval(() => {
        if (Date.now() >= nextCheckInTime) {
          console.log('⏱️ Check-in time reached.');
          const currentEvent = timeline.find(e => e.type === 'session_end' && e.time === nextCheckInTime);
          if (currentEvent && currentEvent.deadline) {
             TrackingStorage.saveReportDeadline(currentEvent.deadline);
             dispatch({ 
               type: 'SET_REPORT_DUE', 
               payload: { deadline: currentEvent.deadline } 
             });
          } else {
             loadAndReconcileState();
          }
        }
      }, 1000);
    } else if (isTracking && isReportDue && reportDeadline) {
      interval = setInterval(() => {
        if (Date.now() >= reportDeadline) {
          console.log('⏱️ Report deadline missed.');
          loadAndReconcileState();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state, loadAndReconcileState]);

  // --- Actions ---

  const startTrackingMode = async (modeId: any, sessionMinutes: number, reductionMinutes: number) => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    try {
      await TrackingFirestore.setTrackingModeActiveStatus(modeId, true);

      const activeMode = trackingModes.find(mode => mode.id === modeId);
      if (!activeMode) throw new Error('Mode not found');

      const sessionMs = sessionMinutes * 60 * 1000;
      const reductionMs = reductionMinutes * 60 * 1000;
      const reportMs = reductionMinutes * 60 * 1000; // As per original code logic
      const strikeThreshold = activeMode.unresponsiveThreshold;
      const startTime = Date.now();

      console.log('🚀 Starting tracking...');

      const timeline = calculateFullTimeline(startTime, sessionMs, reportMs, reductionMs, strikeThreshold);
      
      const notificationIds = await TrackingNotifications.scheduleSessionNotifications(timeline);
      
      // Start Dead Man's Switch
      const finalEvent = timeline[timeline.length - 1];
      let trackingDocId = '';
      if (finalEvent) {
        trackingDocId = await TrackingFirestore.startDeadManSwitch(
          user.uid,
          finalEvent.time,
          activeMode.contacts.map((c: any) => c.id), // Ensure we get IDs
          activeMode
        );
      }

      // Save all state
      await TrackingStorage.saveTimeline(timeline);
      await TrackingStorage.setTrackingActive(true);
      await TrackingStorage.saveStartTime(startTime);
      await TrackingStorage.saveCurrentStrike(0);
      await TrackingStorage.saveNotificationIds(notificationIds);
      await TrackingStorage.saveTrackingModeId(modeId);
      await TrackingStorage.saveSessionParams(sessionMinutes, reductionMinutes, strikeThreshold);
      await TrackingStorage.saveUserId(user.uid);
      await TrackingStorage.saveEmergencyContactIds(activeMode.contacts.map((c: any) => c.id));
      if (trackingDocId) await TrackingStorage.saveActiveTrackingDocId(trackingDocId);

      // Start Location Tracking
      if (backgroundLocationStatus === 'granted') {
        await TrackingLocation.startBackgroundLocationUpdates();
      } else if (foregroundLocationStatus === 'granted') {
        const watcher = await TrackingLocation.startForegroundLocationWatcher(user.uid);
        setForegroundWatcher(watcher);
      }

      dispatch({ 
        type: 'START_SESSION', 
        payload: { modeId, timeline, startTime } 
      });

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking.');
    }
  };

  const stopTrackingMode = async (options?: { isEmergency: boolean }) => {
    const isEmergency = options?.isEmergency ?? false;
    
    try {
      // 1. Notifications
      const ids = await TrackingStorage.getNotificationIds();
      await TrackingNotifications.cancelAllNotifications(ids);

      // 2. Location & Mode Status (Only if NOT emergency)
      if (!isEmergency) {
        await TrackingLocation.stopBackgroundLocationUpdates();
        if (foregroundWatcher) {
          foregroundWatcher.remove();
          setForegroundWatcher(null);
        }

        const modeId = await TrackingStorage.getTrackingModeId();
        if (modeId) {
          await TrackingFirestore.setTrackingModeActiveStatus(modeId, false);
        }
      }

      // 3. Dead Man's Switch
      const trackingDocId = await TrackingStorage.getActiveTrackingDocId();
      if (trackingDocId) {
        await TrackingFirestore.stopDeadManSwitch(trackingDocId, isEmergency);
      }

      // 4. Clear Storage
      await TrackingStorage.clearAllTrackingData(isEmergency);

      // 5. Update State
      dispatch({ type: 'STOP_SESSION' });
      console.log('🛑 Tracking stopped.');

    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
    }
  };

  const reportSafety = async () => {
    if (!user?.uid) return;
    try {
      console.log('✅ Reporting safety...');
      
      // Cancel old notifications
      const oldIds = await TrackingStorage.getNotificationIds();
      await TrackingNotifications.cancelAllNotifications(oldIds);

      // Get params to recalculate
      const params = await TrackingStorage.getSessionParams();
      const reportMs = 1 * 60 * 1000;
      const sessionMs = params.sessionMinutes * 60 * 1000;
      const reductionMs = params.reductionMinutes * 60 * 1000;
      const newStartTime = Date.now();

      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, reportMs, reductionMs, params.strikeThreshold);
      const newNotificationIds = await TrackingNotifications.scheduleSessionNotifications(newTimeline);

      // Update Dead Man's Switch
      const finalEvent = newTimeline[newTimeline.length - 1];
      if (finalEvent) {
        const trackingDocId = await TrackingStorage.getActiveTrackingDocId();
        if (trackingDocId) {
          await TrackingFirestore.updateDeadManSwitch(trackingDocId, finalEvent.time);
        }
      }

      // Update Storage
      await TrackingStorage.saveTimeline(newTimeline);
      await TrackingStorage.saveStartTime(newStartTime);
      await TrackingStorage.saveCurrentStrike(0);
      await TrackingStorage.saveNotificationIds(newNotificationIds);
      await TrackingStorage.clearReportDeadline();

      dispatch({ type: 'REPORT_SAFETY', payload: { timeline: newTimeline } });
      
      await Notifications.scheduleNotificationAsync({
        content: { title: '✅ Safety Reported', body: 'Session extended.', sound: 'default' },
        trigger: null,
      });

    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      Alert.alert('Error', 'Failed to report safety.');
    }
  };

  const createTrackingMode = async (newMode: Omit<TrackingMode, 'id' | 'userId'>) => {
    if(!user?.uid) return;
    try {
        await TrackingFirestore.createTrackingModeDoc(user.uid, newMode);
    } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to create mode");
    }
  }

  const updateTrackingMode = async (modeId: string, updates: Partial<TrackingMode>) => {
    if(!user?.uid) return;
    try {
        await TrackingFirestore.updateTrackingModeDoc(modeId, updates);
    } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to update mode");
    }
  }

  const deleteTrackingMode = async (modeId: string) => {
    try {
        await TrackingFirestore.deleteTrackingModeDoc(modeId);
    } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to delete mode");
    }
  }

  // --- Sign Out Cleanup ---
  useEffect(() => {
    if (!authLoading && !user) {
      const cleanUp = async () => {
        console.log('🧹 User signed out. Cleaning up...');
        await TrackingLocation.stopBackgroundLocationUpdates();
        if (foregroundWatcher) {
            foregroundWatcher.remove();
            setForegroundWatcher(null);
        }
        await TrackingNotifications.cancelAllSystemNotifications();
        
        const trackingDocId = await TrackingStorage.getActiveTrackingDocId();
        if (trackingDocId) {
             await TrackingFirestore.stopDeadManSwitch(trackingDocId, false, 'sign_out');
        }
        await TrackingStorage.clearAllTrackingData(false);
        dispatch({ type: 'STOP_SESSION' });
        setTrackingModes([]);
      };
      cleanUp();
    }
  }, [user, authLoading]);

  return (
    <TrackingContext.Provider value={{
      trackingModes,
      loading,
      startTrackingMode,
      stopTrackingMode,
      reportSafety,
      createTrackingMode,
      updateTrackingMode,
      deleteTrackingMode,
      isTracking: state.isTracking,
      trackingModeId: state.trackingModeId,
      timeline: state.timeline,
      currentStrike: state.currentStrike,
      isReportDue: state.isReportDue,
      reportDeadline: state.reportDeadline,
      nextCheckInTime: state.nextCheckInTime,
      isInfoSent: state.isInfoSent,
      setIsInfoSent: (val: React.SetStateAction<boolean>) => dispatch({ type: 'SET_INFO_SENT', payload: typeof val === 'function' ? (val as Function)(state.isInfoSent) : val }),
      justReportedSafety: state.justReportedSafety,
      setJustReportedSafety: (val: React.SetStateAction<boolean>) => dispatch({ type: 'SET_JUST_REPORTED', payload: typeof val === 'function' ? (val as Function)(state.justReportedSafety) : val }),
    }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};