// TrackingContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, setDoc, Timestamp, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defineTask } from 'expo-task-manager';
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthProvider';

const STORAGE_KEYS = {
  TIMELINE: 'calculated_timeline',
  IS_ACTIVE: 'tracking_active',
  START_TIME: 'tracking_start_time',
  CURRENT_STRIKE: 'current_strike',
  NOTIFICATION_IDS: 'scheduled_notification_ids',
  REPORT_DEADLINE: 'report_deadline_time', // New key for report deadline
  TRACKING_MODE_ID: 'tracking_mode_id', // Keep this for tracking mode details
  INITIAL_SESSION_MINUTES: 'initial_session_minutes',
  INITIAL_REDUCTION_MINUTES: 'initial_reduction_minutes',
  CURRENT_USER_ID: 'current_user_id', // For background task
  EMERGENCY_CONTACT_IDS: 'emergency_contact_ids', // For emergency handler
  ACTIVE_TRACKING_DOC_ID: 'active_tracking_doc_id', // For the random doc ID
};

// Types
interface TimelineEvent {
  time: number;
  type: 'session_end' | 'missed_report';
  strike: number;
  description: string;
  deadline?: number;
}

interface NotificationData {
  type: string;
  strike: number;
  eventTime: number;
  deadline?: number;
}

type TrackingContextType = {
  trackingModes: any[];
  loading: boolean;
  startTrackingMode: (modeId: any, sessionMinutes: number, reductionMinutes: number) => Promise<void>;
  stopTrackingMode: () => Promise<void>;
  reportSafety: () => Promise<void>;
  isTracking: boolean;
  trackingModeId: string | null;
  timeline: TimelineEvent[];
  currentStrike: number;
  isReportDue: boolean;
  reportDeadline: number | null;
  nextCheckInTime: number | null;
  createTrackingMode: (mode: TrackingMode) => Promise<void>;
  deleteTrackingMode: (modeId: string) => Promise<void>;
  locationPermissionStatus: string | null;
  setLocationPermissionStatus: React.Dispatch<React.SetStateAction<string | null>>;
};

const TrackingContext = createContext<TrackingContextType | null>(null);
const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    const data = notification.request.content.data as unknown as NotificationData;

    if (data?.type === 'missed_report' && data.strike === 3) {
      console.log('🚨 FINAL STRIKE NOTIFICATION RECEIVED! Emergency is handled by contact-side listener.');
      // Clean up local state, but leave Firestore doc active.
      await stopTrackingMode({ isEmergency: true });

    } else if (data?.type === 'session_end') {
      console.log(`⏰ Session ${data.strike + 1} ended - Report required`);
      if (data.deadline) {
        await AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, data.deadline.toString());
      }
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true'); // Ensure active state
    } else if (data?.type === 'missed_report') {
      console.log(`❌ Missed report ${data.strike} - Starting next session`);
      await handleMissedReport(data.strike);
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

const handleMissedReport = async (strike: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, strike.toString());
    await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE); // Clear report deadline
    console.log(`📈 Strike count updated to: ${strike}`);
  } catch (error) {
    console.error('Error handling missed report:', error);
  }
};

const requestBackgroundPermissions = async () => {
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    Alert.alert(
      "Permission Required",
      "Background location access is required for emergency tracking",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
};

defineTask(BACKGROUND_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] } | undefined>) => {
    if (error) {
      console.error('❌ Background location task error:', error);
      return;
    }

    const hasPermission = await requestBackgroundPermissions();
    if (!hasPermission) {
      console.error("No background permission");
      return;
    }

    const userId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!userId) {
      console.error("❌ Background task could not find user ID. Stopping.");
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      return;
    }

    if (data && data.locations) {
      const { locations } = data;
      const currentLocation = locations[0];
      if (currentLocation) {
        const { latitude, longitude } = currentLocation.coords;
        const updateTime = new Date(currentLocation.timestamp);

        console.log('📍 Background Location Update:', { latitude, longitude, timestamp: updateTime.toISOString() });
        
        try {
          const userDocRef = doc(db, 'users', userId);
          await setDoc(userDocRef, {}, { merge: true });

          const locationData = {
            lat: latitude,
            long: longitude,
            updateTime: Timestamp.fromDate(updateTime),
          };

          const realTimeRef = doc(db, 'users', userId, 'real_time_location', 'current');
          await setDoc(realTimeRef, locationData, { merge: true });

          const historyRef = collection(db, 'users', userId, 'location_history');
          await addDoc(historyRef, locationData);

          console.log(`✅ Successfully updated location for user ${userId}`);

        } catch (dbError) {
          console.error("❌ Failed to write location to Firebase:", dbError);
        }
      }
    }
  });

type TrackingMode = {
  id: string;
  name: string;
  userId: string;
  On: boolean;
  autoStart: boolean;
  checkIntervalMinutes: number;
  unresponsiveThreshold: number;
  intervalReductionMinutes: number;
  startTime: {
    dayOfWeek: string[];
    time: string;
  };
  emergencyContactIds: string[];
};

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [trackingModes, setTrackingModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [trackingModeId, setTrackingModeId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentStrike, setCurrentStrike] = useState<number>(0);
  const [isReportDue, setIsReportDue] = useState<boolean>(false);
  const [reportDeadline, setReportDeadline] = useState<number | null>(null);
  const [nextCheckInTime, setNextCheckInTime] = useState<number | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    initializeSystem();
    loadAndReconcileState();
  }, []);

  const initializeSystem = async () => {
    if (!user?.uid) return;
    try {
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Permission Required', 'Notifications are required for this safety system');
        return;
      }
      console.log('✅ Notification permissions granted.');

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.locationPermission) {
          setLocationPermissionStatus(userData.locationPermission);
        }
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('tracking', {
          name: 'Safety Tracking',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('✅ Notification channel ${tracking} created.');
      }

    } catch (error) {
      console.error('❌ Failed to initialize system:', error);
    }
  };

  const loadAndReconcileState = async () => {
    try {
      const timelineStr = await AsyncStorage.getItem(STORAGE_KEYS.TIMELINE);
      const isActiveStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_ACTIVE);
      const startTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.START_TIME);
      const reportDeadlineStr = await AsyncStorage.getItem(STORAGE_KEYS.REPORT_DEADLINE);
      const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);

      if (timelineStr && isActiveStr === 'true' && startTimeStr) {
        const timeline: TimelineEvent[] = JSON.parse(timelineStr);
        const now = Date.now();
        
        const finalEvent = timeline[timeline.length - 1];
        if (finalEvent && now > finalEvent.time && finalEvent.type === 'missed_report' && finalEvent.strike === 3) {
          console.log('🚨 Emergency period has passed. Cleaning up local state.');
          await stopTrackingMode({ isEmergency: true });
          return;
        }

        let currentStrikeCount = 0;
        for (const event of timeline) {
          if (event.type === 'missed_report' && now > event.time) {
            currentStrikeCount = event.strike;
          }
        }
        
        console.log(`🔄 Resumed session. Re-calculated strikes: ${currentStrikeCount}`);

        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, currentStrikeCount.toString());

        setTimeline(timeline);
        setIsActive(true);
        setIsTracking(true);
        setCurrentStrike(currentStrikeCount);
        setTrackingModeId(modeId);

        if (reportDeadlineStr) {
          const deadline = parseInt(reportDeadlineStr);
          if (now < deadline) {
            setIsReportDue(true);
            setReportDeadline(deadline);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE);
            setIsReportDue(false);
            setReportDeadline(null);
          }
        } else {
          // If no deadline is in storage, we cannot be in a "report due" state.
          setIsReportDue(false);
          setReportDeadline(null);
        }

        const nextSessionEnd = timeline.find(event => event.type === 'session_end' && event.time > now);
        if (nextSessionEnd) {
          setNextCheckInTime(nextSessionEnd.time);
        } else {
          setNextCheckInTime(null);
        }
        
        console.log('📱 Resumed existing tracking session and reconciled state.');
      } else {
        setIsActive(false);
        setIsTracking(false);
        setTimeline([]);
        setCurrentStrike(0);
        setIsReportDue(false);
        setReportDeadline(null);
        setNextCheckInTime(null);
        setTrackingModeId(null);
      }
    } catch (error) {
      console.error('Error loading and reconciling state:', error);
      await stopTrackingMode();
    }
  };

  useEffect(() => {
    const appStateChangeHandler = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadAndReconcileState();
      }
    };

    const subscription = AppState.addEventListener('change', appStateChangeHandler);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTracking && !isReportDue && nextCheckInTime) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= nextCheckInTime) {
          loadAndReconcileState(); 
        }
      }, 1000);
    } else if (isTracking && isReportDue && reportDeadline) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= reportDeadline) {
          loadAndReconcileState();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isReportDue, nextCheckInTime, reportDeadline]);


  const calculateFullTimeline = ( 
    startTime: number, 
    sessionDurationMs: number, 
    reportDurationMs: number, 
    reductionMs: number 
  ): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];
    let currentTime = startTime;
    let currentSessionDuration = sessionDurationMs;
    
    for (let strike = 0; strike < 3; strike++) {
      const sessionEndTime = currentTime + currentSessionDuration;
      const reportDeadlineTime = sessionEndTime + reportDurationMs;
      timeline.push({
        time: sessionEndTime,
        type: 'session_end',
        strike: strike,
        description: `Session ${strike + 1} ends - Report safety required`,
        deadline: reportDeadlineTime,
      });

      timeline.push({
        time: reportDeadlineTime,
        type: 'missed_report',
        strike: strike + 1,
        description: `Missed report ${strike + 1} - ${strike < 2 ? 'Start next session' : 'EMERGENCY!'}`
      });

      currentTime = reportDeadlineTime;
      currentSessionDuration = Math.max(currentSessionDuration - reductionMs, 1 * 60 * 1000);
    }

    return timeline;
  };

  const scheduleAllNotifications = async (timeline: TimelineEvent[]): Promise<string[]> => {
    const notificationIds: string[] = [];
    
    for (const event of timeline) {
      const now = Date.now();
      if (event.time <= now) {
        continue;
      }

      let title: string, body: string;
      if (event.type === 'session_end') {
        title = `⏰ Session ${event.strike + 1} Complete`;
        body = 'Please report your safety within 3 minutes';
      } else if (event.type === 'missed_report') {
        if (event.strike < 3) {
          title = `❌ Missed Report ${event.strike}`;
          body = `Starting next session (${event.strike}/3 strikes)`;
        } else {
          title = '🆘 EMERGENCY ACTIVATION';
          body = 'Failed to respond 3 times - Emergency contacts being notified';
        }
      } else {
        title = 'Safety Alert';
        body = 'Please check your safety status';
      }

      // Calculate seconds until the event
      const seconds = Math.max(Math.round((event.time - now) / 1000), 1);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: event.type,
            strike: event.strike,
            eventTime: event.time,
            deadline: event.deadline,
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });

      notificationIds.push(notificationId);
      console.log(`📅 Scheduled: ${title} in ${seconds} seconds (for ${new Date(event.time).toLocaleTimeString()})`);
    }

    return notificationIds;
  };

  const startTrackingMode = async (modeId: any, sessionMinutes: number, reductionMinutes: number) => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    // Request foreground permissions first
    // let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync ();
    // console.log("Foreground permission status:", foregroundStatus);
    // if (foregroundStatus === 'denied') {
    // // if (foregroundStatus !== 'granted') {
    //   Alert.alert(
    //     "Permission Required!!!!",
    //     "Location access is required for tracking to work.",
    //     [{ text: "OK" }]
    //   );
    //   return;
    // }

    // // Then request background permissions
    // let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    // setLocationPermissionStatus(backgroundStatus);
    
    // console.log("Background permission status:", backgroundStatus);
    // if (backgroundStatus === 'denied') {
    // // if (backgroundStatus !== 'granted') {
    //   Alert.alert(
    //     "Permission Required",
    //     "Background location access is required for emergency tracking to work properly.",
    //     [{ text: "OK" }]
    //   );
    //   return;
    // }

    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: true });

      const sessionMs = sessionMinutes * 60 * 1000;
      const reductionMs = reductionMinutes * 60 * 1000;
      const reportMs = 3 * 60 * 1000;
      const startTime = Date.now();

      const activeMode = trackingModes.find(mode => mode.id === modeId);
      if (!activeMode) {
        Alert.alert('Error', 'Could not find the selected tracking mode.');
        return;
      }

      const emergencyContactIds: string[] = activeMode.emergencyContactIds || [];

      console.log('🚀 Starting tracking with pre-calculated timeline...');
      
      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, reportMs, reductionMs);
      const notificationIds = await scheduleAllNotifications(calculatedTimeline);
      
      const finalEvent = calculatedTimeline[calculatedTimeline.length - 1];
      if (finalEvent) {
        const emergencyActivationTime = Timestamp.fromMillis(finalEvent.time);
        const trackingDocRef = doc(collection(db, 'active_tracking'));

        const contactStatusMap: Record<string, { status: 'active'; notificationCount: number }> = {};
        emergencyContactIds.forEach((id: string) => {
          contactStatusMap[id] = {
            status: 'active', // Status for each contact
            notificationCount: 0
          };
        });

        await setDoc(trackingDocRef, {
          trackedUserId: user.uid,
          emergencyContactIds: emergencyContactIds,
          emergencyActivationTime: emergencyActivationTime,
          lastUpdateTime: serverTimestamp(),
          isActive: true, // <-- ADD THIS LINE
          nextNotificationTime: emergencyActivationTime,
          overallStatus: 'notifying', // The whole event is active
          contactStatus: contactStatusMap // The detailed map
        });
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID, trackingDocRef.id);
        console.log("✅ Dead man's switch set in Firestore.");
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(calculatedTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, modeId);
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES, sessionMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES, reductionMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.uid);
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS, JSON.stringify(emergencyContactIds));
      
      setTimeline(calculatedTimeline);
      setIsTracking(true);
      setCurrentStrike(0);
      setTrackingModeId(modeId);

      const nextSessionEnd = calculatedTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }
      
      console.log('✅ Tracking started with full timeline pre-calculated');

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 30000,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'Tracking',
          notificationBody: 'Tracking your location...',
        },
      });

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to start tracking: ' + errMsg);
    }
  };

  const reportSafety = async () => {
    if (!user?.uid) return;
    try {
      console.log('✅ USER REPORTED SAFETY!');
      
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log('🧹 Cancelled all future notifications');
      }

      const initialSessionMinutesStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES);
      const initialReductionMinutesStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES);

      const sessionMs = initialSessionMinutesStr ? parseInt(initialSessionMinutesStr) * 60 * 1000 : 30 * 60 * 1000;
      const reductionMs = initialReductionMinutesStr ? parseInt(initialReductionMinutesStr) * 60 * 1000 : 10 * 60 * 1000;
      const reportMs = 3 * 60 * 1000;
      const newStartTime = Date.now();

      console.log('🔄 Recalculating timeline from current time...');
      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, reportMs, reductionMs);
      const newNotificationIds = await scheduleAllNotifications(newTimeline);
      
      const newFinalEvent = newTimeline[newTimeline.length - 1];
      if (newFinalEvent) {
          const trackingDocId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID);
          if (trackingDocId) {
            const newEmergencyActivationTime = Timestamp.fromMillis(newFinalEvent.time);
            const trackingDocRef = doc(db, 'active_tracking', trackingDocId);
            await updateDoc(trackingDocRef, {
                emergencyActivationTime: newEmergencyActivationTime,
                lastUpdateTime: serverTimestamp()
            });
            console.log("✅ Dead man's switch updated in Firestore.");
          }
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(newTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, newStartTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(newNotificationIds));
      await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE);
      
      setTimeline(newTimeline);
      setCurrentStrike(0);
      setIsReportDue(false);
      setReportDeadline(null);
      setIsTracking(true);

      const nextSessionEnd = newTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Safety Reported',
          body: 'Timeline has been recalculated with full session duration.',
          sound: 'default',
        },
        trigger: null,
      });
      
    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to report safety: ' + errMsg);
    }
  };

  const stopTrackingMode = async (options?: { isEmergency: boolean }) => {
    if (!user?.uid) return;

    const isEmergency = options?.isEmergency ?? false;

    try {
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);

      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log('🧹 Cancelled all future notifications');
      }

      // --- CRITICAL: Only stop tracking if it is NOT an emergency ---
      if (!isEmergency) {
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log('✅ Background location tracking stopped for safe shutdown.');
        }
        if (modeId) {
          const modeRef = doc(db, 'TrackingMode', modeId);
          await updateDoc(modeRef, { On: false });
          console.log('✅ TrackingMode set to OFF.');
        }
      } else {
        console.log('🚨 Emergency active: Background location tracking will CONTINUE.');
      }

      const trackingDocId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID);
      if (trackingDocId) {
        if (isEmergency) {
          console.log("Emergency stop: Leaving dead man's switch active in Firestore.");
        } else {
          const trackingDocRef = doc(db, 'active_tracking', trackingDocId);
          await updateDoc(trackingDocRef, {
            isActive: false,
            stoppedAt: serverTimestamp()
          });
          console.log("✅ Dead man's switch deactivated in Firestore for safe stop.");
        }
      }

      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      
      setIsTracking(false);
      setTrackingModeId(null);
      setTimeline([]);
      setCurrentStrike(0);
      setIsReportDue(false);
      setReportDeadline(null);
      setNextCheckInTime(null);
      
      console.log('🛑 Tracking stopped and local state cleared');
      
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
    }
  };

  const createTrackingMode = async (mode: Omit<TrackingMode, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'TrackingMode'), mode); // Use addDoc to create a new document
      setTrackingModes((prevModes) => [...prevModes, { id: docRef.id, ...mode }]); // Update state with the new mode
    } catch (error) {
      console.error('Failed to create tracking mode:', error);
      throw error;
    }
  };

  const deleteTrackingMode = async (modeId: string) => {
    try {
      await deleteDoc(doc(db, 'TrackingMode', modeId)); // Delete from Firebase
      setTrackingModes((prevModes) => prevModes.filter((mode) => mode.id !== modeId)); // Update state
    } catch (error) {
      console.error('Failed to delete tracking mode:', error);
    }
  };

  const fetchTrackingModesWithContacts = async (userId: string) => {
    try {
      const colRef = query(collection(db, 'TrackingMode'), where('userId', '==', userId));
      const snapshot = await getDocs(colRef);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const trackingData = docSnap.data();
          const contacts = await Promise.all(
            (trackingData.emergencyContactIds || []).map(async (id: string) => {
              const contactDoc = await getDoc(doc(db, 'users', id));
              return { id: contactDoc.id, ...contactDoc.data() };
            })
          );
          return {
            id: docSnap.id,
            ...trackingData,
            contacts
          };
        })
      );
      setTrackingModes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking modes with contacts:', error);
      setTrackingModes([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchTrackingModesWithContacts(user.uid);
    }
  }, [user]);

  return (
    <TrackingContext.Provider value={{
      trackingModes,
      loading,
      startTrackingMode,
      stopTrackingMode,
      reportSafety,
      isTracking,
      trackingModeId,
      timeline,
      currentStrike,
      isReportDue,
      reportDeadline,
      nextCheckInTime,
      createTrackingMode,
      deleteTrackingMode,

      locationPermissionStatus,
      setLocationPermissionStatus
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