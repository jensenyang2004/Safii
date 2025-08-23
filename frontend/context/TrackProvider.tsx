
// TrackingContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
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
};

// Types
interface TimelineEvent {
  time: number;
  type: 'session_end' | 'missed_report';
  strike: number;
  description: string;
}

interface NotificationData {
  type: string;
  strike: number;
  eventTime: number;
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
};

const TrackingContext = createContext<TrackingContextType | null>(null);
const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    const data = notification.request.content.data as unknown as NotificationData;

    if (data?.type === 'missed_report' && data.strike === 3) {
      console.log('🚨 FINAL STRIKE RECEIVED! EXECUTING EMERGENCY ACTION!');
      
      try {
        const distressedUserId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        const contactIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS);

        if (distressedUserId && contactIdsStr) {
          const emergencyContactIds = JSON.parse(contactIdsStr);

          for (const contactId of emergencyContactIds) {
            const emergencyDocRef = doc(db, 'emergency_location', contactId);
            await setDoc(emergencyDocRef, {
              senderId: distressedUserId,
              createdAt: serverTimestamp(),
            });
            console.log(`🔔 Sent emergency alert to contact: ${contactId}`);
          }
        } else {
          console.error('Could not retrieve user or contact info from storage for emergency.');
        }
      } catch (e) {
        console.error('❌ Failed to execute emergency action:', e);
      }

      // Clean up storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TIMELINE,
        STORAGE_KEYS.IS_ACTIVE,
        STORAGE_KEYS.START_TIME,
        STORAGE_KEYS.CURRENT_STRIKE,
        STORAGE_KEYS.NOTIFICATION_IDS,
        STORAGE_KEYS.REPORT_DEADLINE,
        STORAGE_KEYS.TRACKING_MODE_ID,
        STORAGE_KEYS.CURRENT_USER_ID,
        STORAGE_KEYS.EMERGENCY_CONTACT_IDS,
      ]);

    } else if (data?.type === 'session_end') {
      console.log(`⏰ Session ${data.strike + 1} ended - Report required`);
      await AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, data.eventTime.toString()); // Store the deadline
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
          // Ensure user document exists before writing to subcollection
          const userDocRef = doc(db, 'users', userId);
          await setDoc(userDocRef, {}, { merge: true });

          const locationData = {
            lat: latitude,
            long: longitude,
            updateTime: Timestamp.fromDate(updateTime),
          };

          // Update real-time location
          const realTimeRef = doc(db, 'users', userId, 'real_time_location', 'current');
          await setDoc(realTimeRef, locationData, { merge: true });

          // Add to location history
          const historyRef = collection(db, 'users', userId, 'location_history');
          await addDoc(historyRef, locationData);

          console.log(`✅ Successfully updated location for user ${userId}`);

        } catch (dbError) {
          console.error("❌ Failed to write location to Firebase:", dbError);
        }
      }
    }
  });


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

  useEffect(() => {
    initializeSystem();
    loadAndReconcileState();
  }, []);

  const initializeSystem = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notifications are required for this safety system');
        return;
      }
      console.log('✅ Notification permissions granted.');

      // Create notification channel for Android
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
      const currentStrikeStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STRIKE);
      const reportDeadlineStr = await AsyncStorage.getItem(STORAGE_KEYS.REPORT_DEADLINE);
      const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);

      if (timelineStr && isActiveStr === 'true' && startTimeStr) {
        const timeline: TimelineEvent[] = JSON.parse(timelineStr);
        const now = Date.now();
        
        const finalEvent = timeline[timeline.length - 1];
        if (finalEvent && now > finalEvent.time && finalEvent.type === 'missed_report' && finalEvent.strike === 3) {
          console.log('🚨 Emergency period has passed. Cleaning up.');
          await stopTrackingMode();
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
        setCurrentStrike(currentStrikeCount);
        setTrackingModeId(modeId);

        if (reportDeadlineStr) {
          const deadline = parseInt(reportDeadlineStr);
          if (now < deadline) {
            setIsReportDue(true);
            setReportDeadline(deadline);
          } else {
            // If deadline passed, it means a missed report, so clear it
            await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE);
            setIsReportDue(false);
            setReportDeadline(null);
          }
        }

        // Determine next check-in time
        const nextSessionEnd = timeline.find(event => event.type === 'session_end' && event.time > now);
        if (nextSessionEnd) {
          setNextCheckInTime(nextSessionEnd.time);
        } else {
          setNextCheckInTime(null);
        }
        
        console.log('📱 Resumed existing tracking session and reconciled state.');
      } else {
        // If there's no active session, ensure state is clean.
        setIsActive(false);
        setTimeline([]);
        setCurrentStrike(0);
        setIsReportDue(false);
        setReportDeadline(null);
        setNextCheckInTime(null);
        setTrackingModeId(null);
      }
    } catch (error) {
      console.error('Error loading and reconciling state:', error);
      await stopTrackingMode(); // Reset state on error
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
    let interval: number;
    if (isTracking && !isReportDue && nextCheckInTime) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= nextCheckInTime) {
          // This means a session_end notification should have fired, and isReportDue should be true
          // Re-reconcile state to pick up changes if notification handler didn't update UI yet
          loadAndReconcileState(); 
        }
      }, 1000);
    } else if (isTracking && isReportDue && reportDeadline) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= reportDeadline) {
          // This means a missed_report notification should have fired
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
    
    console.log('📊 Calculating full timeline:');
    console.log(`   Start time: ${new Date(startTime).toLocaleTimeString()}`);
    console.log(`   Session duration: ${sessionDurationMs / 1000 / 60} minutes`);
    console.log(`   Report duration: ${reportDurationMs / 1000 / 60} minutes`);
    console.log(`   Reduction per strike: ${reductionMs / 1000 / 60} minutes`);

    for (let strike = 0; strike < 3; strike++) {
      // Session end time
      const sessionEndTime = currentTime + currentSessionDuration;
      timeline.push({
        time: sessionEndTime,
        type: 'session_end',
        strike: strike,
        description: `Session ${strike + 1} ends - Report safety required`
      });

      // Report deadline time (3 minutes after session end)
      const reportDeadlineTime = sessionEndTime + reportDurationMs;
      timeline.push({
        time: reportDeadlineTime,
        type: 'missed_report',
        strike: strike + 1,
        description: `Missed report ${strike + 1} - ${strike < 2 ? 'Start next session' : 'EMERGENCY!'}`
      });

      // Next session starts immediately after report deadline
      currentTime = reportDeadlineTime;
      // Reduce session duration for next session
      currentSessionDuration = Math.max(currentSessionDuration - reductionMs, 10 * 60 * 1000); // Minimum 10 minutes
      
      console.log(`   Strike ${strike + 1}: Session ends at ${new Date(sessionEndTime).toLocaleTimeString()}, Report deadline at ${new Date(reportDeadlineTime).toLocaleTimeString()}`);
    }

    return timeline;
  };

  const scheduleAllNotifications = async (timeline: TimelineEvent[]): Promise<string[]> => {
    const notificationIds: string[] = [];
    
    for (const event of timeline) {
      const now = Date.now();
      if (event.time <= now) {
        // Skip events that are in the past or current time
        continue;
      }

      const delay = Math.max(1, Math.floor((event.time - now) / 1000)); // At least 1 second delay
      
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

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: event.type,
            strike: event.strike,
            eventTime: event.time
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delay,
          channelId: 'tracking',        
        },
      });

      notificationIds.push(notificationId);
      console.log(`📅 Scheduled: ${title} for ${new Date(event.time).toLocaleTimeString()}`);
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

      const sessionMs = sessionMinutes * 60 * 1000;
      const reductionMs = reductionMinutes * 60 * 1000;
      const reportMs = 3 * 60 * 1000; // Fixed 3 minutes
      const startTime = Date.now();

      if (sessionMs < 10 * 60 * 1000) {
        Alert.alert('Invalid Input', 'Session must be at least 10 minutes');
        return;
      }

      const activeMode = trackingModes.find(mode => mode.id === modeId);
      if (!activeMode) {
        Alert.alert('Error', 'Could not find the selected tracking mode.');
        return;
      }

      const emergencyContactIds = activeMode.contacts.map((c: any) => c.id);

      console.log('🚀 Starting tracking with pre-calculated timeline...');
      
      // Calculate entire timeline assuming user never responds
      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, reportMs, reductionMs);
      
      // Schedule all notifications
      const notificationIds = await scheduleAllNotifications(calculatedTimeline);
      
      // Save state
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(calculatedTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, modeId);
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES, sessionMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES, reductionMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.uid); // Save user ID for background task
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS, JSON.stringify(emergencyContactIds)); // Save contact IDs for emergency
      
      setTimeline(calculatedTimeline);
      setIsTracking(true);
      setCurrentStrike(0);
      setTrackingModeId(modeId);

      // Set next check-in time
      const nextSessionEnd = calculatedTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }
      
      console.log('✅ Tracking started with full timeline pre-calculated');
      console.log('📱 Close the app to test background execution');

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 30000,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'Tracking',
          notificationBody: 'Tracking your location...', // This will be updated by the notification handler
        },
      });

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to start tracking: ' + errMsg);
    }
  };

  const reportSafety = async () => {
    try {
      console.log('✅ USER REPORTED SAFETY!');
      
      // Cancel all future notifications
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log('🧹 Cancelled all future notifications');
      }

      // Recalculate timeline from now
      const initialSessionMinutesStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES);
      const initialReductionMinutesStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES);

      const sessionMs = initialSessionMinutesStr ? parseInt(initialSessionMinutesStr) * 60 * 1000 : 30 * 60 * 1000; // Fallback to 30 mins
      const reductionMs = initialReductionMinutesStr ? parseInt(initialReductionMinutesStr) * 60 * 1000 : 10 * 60 * 1000; // Fallback to 10 mins
      const reportMs = 3 * 60 * 1000;
      const newStartTime = Date.now();

      console.log('🔄 Recalculating timeline from current time...');
      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, reportMs, reductionMs);
      
      // Schedule new notifications
      const newNotificationIds = await scheduleAllNotifications(newTimeline);
      
      // Update state
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(newTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, newStartTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(newNotificationIds));
      await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE); // Clear report deadline
      
      setTimeline(newTimeline);
      setCurrentStrike(0);
      setIsReportDue(false);
      setReportDeadline(null);

      // Set next check-in time
      const nextSessionEnd = newTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }
      
      // Send notification to prove it worked
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Safety Reported',
          body: 'Timeline has been recalculated with full session duration.',
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to report safety: ' + errMsg);
    }
  };

  const stopTrackingMode = async () => {
    try {
      // Get all necessary data from storage before clearing it
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);

      // 1. Cancel all scheduled notifications
      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
      }

      // 2. Stop background location updates
      if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      // 3. Update the mode status in Firestore
      if(modeId){
          const modeRef = doc(db, 'TrackingMode', modeId);
          await updateDoc(modeRef, { On: false });
      }

      // 4. Clear all tracking-related data from storage
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      
      // 5. Reset the component state
      setIsTracking(false);
      setTrackingModeId(null);
      setTimeline([]);
      setCurrentStrike(0);
      setIsReportDue(false);
      setReportDeadline(null);
      setNextCheckInTime(null);
      
      console.log('🛑 Tracking stopped and timeline cleared');
      
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
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
            (trackingData.emergencyContactIds || []).map(async (id : string) => {
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
      console.log(user)
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
