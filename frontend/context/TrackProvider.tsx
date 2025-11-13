// context/TrackingContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, setDoc, Timestamp, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defineTask } from 'expo-task-manager';
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthProvider';
import { usePermissions } from '../hooks/usePermissions'; // ADDED

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
  UNRESPONSIVE_THRESHOLD: 'unresponsive_threshold', // New key for unresponsive threshold
};

// Types
interface TimelineEvent {
  time: number;
  type: 'session_end' | 'missed_report';
  strike: number;
  description: string;
  deadline?: number;
  strikeThreshold?: number;
}

interface NotificationData {
  type: string;
  strike: number;
  eventTime: number;
  deadline?: number;
  strikeThreshold?: number;
}

type TrackingContextType = {
  trackingModes: any[];
  loading: boolean;
  startTrackingMode: (modeId: any, sessionMinutes: number, reductionMinutes: number) => Promise<void>;
  stopTrackingMode: (options?: { isEmergency: boolean }) => Promise<void>;
  reportSafety: () => Promise<void>;
  createTrackingMode: (newMode: Omit<TrackingMode, 'id' | 'userId' | 'On'>) => Promise<void>;
  deleteTrackingMode: (modeId: string) => Promise<void>;
  isTracking: boolean;
  trackingModeId: string | null;
  timeline: TimelineEvent[];
  currentStrike: number;
  isReportDue: boolean;
  reportDeadline: number | null;
  nextCheckInTime: number | null;
  isInfoSent: boolean;
  setIsInfoSent: React.Dispatch<React.SetStateAction<boolean>>;
  justReportedSafety: boolean;
  setJustReportedSafety: React.Dispatch<React.SetStateAction<boolean>>;
};

const TrackingContext = createContext<TrackingContextType | null>(null);
const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    const data = notification.request.content.data as unknown as NotificationData;

    if (data?.type === 'missed_report' && data.strike === (data.strikeThreshold || 3)) {
      console.log('🚨 FINAL STRIKE NOTIFICATION RECEIVED! Emergency is handled by contact-side listener.');

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

// Forward declaration for stopTrackingMode
let stopTrackingMode: (options?: { isEmergency: boolean }) => Promise<void>;

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

// NEW REUSABLE FUNCTION
const updateLocationInFirestore = async (location: Location.LocationObject, userId: string) => {
  if (!userId) {
    console.error("❌ updateLocationInFirestore: could not find user ID.");
    return;
  }
  try {
    const { latitude, longitude } = location.coords;
    const updateTime = new Date(location.timestamp);

    console.log('📍 Location Update:', { latitude, longitude, timestamp: updateTime.toISOString() });
    
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
};


// UPDATED defineTask
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

    if (data && data.locations && data.locations[0]) {
      await updateLocationInFirestore(data.locations[0], userId);
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
  const { backgroundLocationStatus, foregroundLocationStatus } = usePermissions(); // ADDED
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
  const [isInfoSent, setIsInfoSent] = useState<boolean>(false);
  const [justReportedSafety, setJustReportedSafety] = useState<boolean>(false);
  const [foregroundWatcher, setForegroundWatcher] = useState<Location.LocationSubscription | null>(null); // ADDED

  useEffect(() => {
    initializeSystem();
    loadAndReconcileState();

    // Listen for notification tap events
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      console.log('📱 Notification response received:', response.notification.request.content.title);

      // Only reconcile state if it's the final emergency notification
      if (data?.type === 'missed_report' && data.strike === (data.strikeThreshold || 3)) {
        console.log('🚨 Final emergency notification tapped. Reconciling state.');
        loadAndReconcileState();
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  const initializeSystem = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notifications are required for this safety system');
        return;
      }
      console.log('✅ Notification permissions granted.');

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
        const unresponsiveThresholdStr = await AsyncStorage.getItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD);
        const strikeThreshold = unresponsiveThresholdStr ? parseInt(unresponsiveThresholdStr) : 3; // Default to 3

        // Determine if info has been sent
        if (finalEvent && now > finalEvent.time) {
          setIsInfoSent(true);
          console.log('isInfoSent has been set to true');
        } else {
          setIsInfoSent(false);
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
        setIsInfoSent(false); // Ensure it's false if not active
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
          console.log('Foreground timer: Session ended. Triggering report due state.');
          const currentEvent = timeline.find(event => event.type === 'session_end' && event.time === nextCheckInTime);
          if (currentEvent && currentEvent.deadline) {
            AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, currentEvent.deadline.toString())
              .then(() => {
                setReportDeadline(currentEvent.deadline);
                setIsReportDue(true);
              });
          } else {
            loadAndReconcileState();
          }
        }
      }, 1000);
    } else if (isTracking && isReportDue && reportDeadline) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= reportDeadline) {
          console.log('Foreground timer: Report deadline missed. Reconciling state.');
          loadAndReconcileState();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isReportDue, nextCheckInTime, reportDeadline, timeline]);


  const calculateFullTimeline = ( 
    startTime: number, 
    sessionDurationMs: number, 
    reportDurationMs: number, 
    reductionMs: number,
    strikeThreshold: number 
  ): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];
    let currentTime = startTime;
    let currentSessionDuration = sessionDurationMs;
    
    for (let strike = 0; strike < strikeThreshold; strike++) {
      const sessionEndTime = currentTime + currentSessionDuration;
      const reportDeadlineTime = sessionEndTime + reportDurationMs;
      timeline.push({
        time: sessionEndTime,
        type: 'session_end',
        strike: strike,
        description: `Session ${strike + 1} ends - Report safety required`,
        deadline: reportDeadlineTime,
        strikeThreshold: strikeThreshold,
      });

      timeline.push({
        time: reportDeadlineTime,
        type: 'missed_report',
        strike: strike + 1,
        description: `Missed report ${strike + 1} - ${strike < strikeThreshold - 1 ? 'Start next session' : 'EMERGENCY!'}`,
        strikeThreshold: strikeThreshold
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
        title = `⏰ 請回報安全`;
        body = '請在三分鐘內回報安全狀態';
      } else if (event.type === 'missed_report') {
        if (event.strike < (event.strikeThreshold ?? 3)) {
          title = `⚠️ 錯過安全回報`;
          body = `您未在時限內回報。新的安全追蹤時段已開始，請務必在下次時限內回報。`;
        } else {
          title = '🚨 觸發緊急通知';
          body = `因為尚未回報安全，您的即時位置已經分享給設定的緊急聯絡人`;
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
            strikeThreshold: event.strikeThreshold,
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
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, { On: true });

      const sessionMs = sessionMinutes * 3 * 1000;
      // const sessionMs = sessionMinutes * 60 * 1000;
      const reductionMs = reductionMinutes * 60 * 1000;
      const reportMs = 3 * 60 * 1000;
      const startTime = Date.now();

      const activeMode = trackingModes.find(mode => mode.id === modeId);
      if (!activeMode) {
        Alert.alert('Error', 'Could not find the selected tracking mode.');
        return;
      }

      const emergencyContactIds: string[] = activeMode.contacts.map((c: any) => String(c.id));
      const strikeThreshold = activeMode.unresponsiveThreshold; // Get the value from the DB

      console.log('🚀 Starting tracking with pre-calculated timeline...');
      
      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, reportMs, reductionMs, strikeThreshold);
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
          isActive: true,
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
      await AsyncStorage.setItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD, strikeThreshold.toString());
      
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

      // NEW CONDITIONAL LOGIC
      if (backgroundLocationStatus === 'granted') {
        console.log('✅ Background permission granted. Starting background location task.');
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
      } else if (foregroundLocationStatus === 'granted') {
        console.log('✅ Foreground permission granted. Starting foreground location watcher.');
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 50,
          },
          (location) => {
            updateLocationInFirestore(location, user.uid);
          }
        );
        setForegroundWatcher(watcher);
      } else {
        console.warn('⚠️ No location permissions granted. Location tracking will not start.');
        Alert.alert("Permission Required", "Location access is required for tracking to function.");
      }

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
      const unresponsiveThresholdStr = await AsyncStorage.getItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD); // Retrieve threshold

      const sessionMs = initialSessionMinutesStr ? parseInt(initialSessionMinutesStr) * 60 * 1000 : 30 * 60 * 1000;
      const reductionMs = initialReductionMinutesStr ? parseInt(initialReductionMinutesStr) * 60 * 1000 : 10 * 60 * 1000;
      const reportMs = 3 * 60 * 1000;
      const newStartTime = Date.now();
      const strikeThreshold = unresponsiveThresholdStr ? parseInt(unresponsiveThresholdStr) : 3; // Default to 3 if not found

      console.log('🔄 Recalculating timeline from current time...');
      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, reportMs, reductionMs, strikeThreshold);
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
      console.log('🔍 [TrackProvider] About to set justReportedSafety to true');
      setJustReportedSafety(true);
      console.log('✅ [TrackProvider] Called setJustReportedSafety(true)');
    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to report safety: ' + errMsg);
    }
  };

  stopTrackingMode = async (options?: { isEmergency: boolean }) => {
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
        if (foregroundWatcher) {
          foregroundWatcher.remove();
          setForegroundWatcher(null);
          console.log('✅ Foreground location watcher stopped for safe shutdown.');
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

      const keys = Object.values(STORAGE_KEYS);
      if (isEmergency) {
        const keysToRemove = keys.filter(k => k !== STORAGE_KEYS.CURRENT_USER_ID);
        await AsyncStorage.multiRemove(keysToRemove);
      } else {
        await AsyncStorage.multiRemove(keys);
      }
      
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


  const fetchTrackingModesWithContacts = async (userId: string) => {
    setLoading(true); // Ensure loading state is set
    const colRef = query(collection(db, 'TrackingMode'), where('userId', '==', userId));

    console.log(`[TrackProvider] Setting up onSnapshot for TrackingMode for userId: ${userId}`); // ADDED LOG

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(colRef, async (querySnapshot) => {
      console.log(`[TrackProvider] onSnapshot callback fired. Docs count: ${querySnapshot.docs.length}, Empty: ${querySnapshot.empty}`); // ADDED LOG
      const data = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
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
      console.log(`[TrackProvider] Processed data:`, data); // ADDED LOG
      setTrackingModes(data);
      setLoading(false);
    }, (error) => {
      console.error('[TrackProvider] Error listening to tracking modes:', error); // MODIFIED LOG
      setTrackingModes([]);
      setLoading(false);
    });

    return unsubscribe; // Return the unsubscribe function
  };

  useEffect(() => {
    let unsubscribeFromTrackingModes: (() => void) | undefined;

    if (user?.uid) {
      // Call the async function and store its unsubscribe result
      const setupListener = async () => {
        unsubscribeFromTrackingModes = await fetchTrackingModesWithContacts(user.uid);
      };
      setupListener();
    } else {
      // User has signed out, so we need to perform a full cleanup.
      const signOutCleanup = async () => {
        console.log('Auth state changed: User signed out. Cleaning up all tracking tasks and data.');

        // Unsubscribe from tracking modes listener if it exists
        if (unsubscribeFromTrackingModes) {
          unsubscribeFromTrackingModes();
          unsubscribeFromTrackingModes = undefined; // Clear it
          console.log('🧹 Unsubscribed from tracking modes listener.');
        }

        // 1. Stop the background location task unconditionally
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log('✅ Background location tracking stopped due to sign-out.');
        }
        // Stop foreground watcher
        if (foregroundWatcher) {
          foregroundWatcher.remove();
          setForegroundWatcher(null);
          console.log('✅ Foreground location watcher stopped due to sign-out.');
        }

        // 2. Cancel all scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🧹 Cancelled all scheduled notifications due to sign-out.');

        // 3. Deactivate the 'dead man's switch' in Firestore
        const trackingDocId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID);
        if (trackingDocId) {
          const trackingDocRef = doc(db, 'active_tracking', trackingDocId);
          try {
            await updateDoc(trackingDocRef, {
              isActive: false,
              stoppedAt: serverTimestamp(),
              overallStatus: 'cancelled_by_sign_out'
            });
            console.log("✅ Dead man's switch deactivated in Firestore for sign-out.");
          } catch(e) {
            console.error("Failed to update tracking doc on sign-out", e)
          }
        }

        // 4. Clear all tracking-related data from AsyncStorage
        const keys = Object.values(STORAGE_KEYS);
        await AsyncStorage.multiRemove(keys);
        console.log('🧹 Cleared all tracking data from storage due to sign-out.');

        // 5. Reset the context's state
        setIsTracking(false);
        setTrackingModeId(null);
        setTimeline([]);
        setCurrentStrike(0);
        setIsReportDue(false);
        setReportDeadline(null);
        setNextCheckInTime(null);
        setTrackingModes([]); // Clear tracking modes as well
        console.log('🛑 Tracking context state reset due to sign-out.');
      };

      signOutCleanup();
    }

    // Cleanup function for the useEffect
    return () => {
      if (unsubscribeFromTrackingModes) {
        unsubscribeFromTrackingModes();
        console.log('🧹 Unsubscribed from tracking modes listener on unmount/dependency change.');
      }
    };
  }, [user]);

  const createTrackingMode = async (newMode: Omit<TrackingMode, 'id' | 'userId' | 'On'>) => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    try {
      const trackingModeCollection = collection(db, 'TrackingMode');
      await addDoc(trackingModeCollection, {
        ...newMode,
        userId: user.uid,
        On: false,
      });
      // Refetch tracking modes to update the list
      // No need to call fetchTrackingModesWithContacts here, onSnapshot will handle it
    } catch (error) {
      console.error('Error creating tracking mode:', error);
      Alert.alert('Error', 'Failed to create tracking mode.');
    }
  };

  const deleteTrackingMode = async (modeId: string) => {
    try {
      const modeRef = doc(db, 'TrackingMode', modeId);
      await deleteDoc(modeRef);
      // Refetch tracking modes to update the list
      // No need to call fetchTrackingModesWithContacts here, onSnapshot will handle it
    } catch (error) {
      console.error('Error deleting tracking mode:', error);
      Alert.alert('Error', 'Failed to delete tracking mode.');
    }
  };

  return (
    <TrackingContext.Provider value={{
      trackingModes,
      loading,
      startTrackingMode,
      stopTrackingMode,
      reportSafety,
      createTrackingMode, // Expose the new function
      deleteTrackingMode, // Expose the delete function
      isTracking,
      trackingModeId,
      timeline,
      currentStrike,
      isReportDue,
      reportDeadline,
      nextCheckInTime,
      isInfoSent,
      setIsInfoSent,
      justReportedSafety,
      setJustReportedSafety,
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