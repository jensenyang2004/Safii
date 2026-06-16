// context/TrackingContext.tsx
import React, { createContext, useState, useEffect, useContext, use, useRef } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, addDoc, setDoc, Timestamp, serverTimestamp, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { ScheduledTracking } from '@/types/scheduledTracking';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defineTask } from 'expo-task-manager';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthProvider';
import { usePermissions } from '../hooks/usePermissions'; // ADDED

export const STORAGE_KEYS = {
  TIMELINE: 'calculated_timeline',
  IS_ACTIVE: 'tracking_active',
  START_TIME: 'tracking_start_time',
  CURRENT_STRIKE: 'current_strike',
  NOTIFICATION_IDS: 'scheduled_notification_ids',
  REPORT_DEADLINE: 'report_deadline_time', // New key for report deadline
  TRACKING_MODE_ID: 'tracking_mode_id', // Keep this for tracking mode details
  INITIAL_SESSION_MINUTES: 'initial_session_minutes',
  CURRENT_USER_ID: 'current_user_id', // For background task
  EMERGENCY_CONTACT_IDS: 'emergency_contact_ids', // For emergency handler
  ACTIVE_TRACKING_DOC_ID: 'active_tracking_doc_id',   // scheduled sessions (active_tracking collection)
  MANUAL_TRACKING_DOC_ID: 'manual_tracking_doc_id',   // manual sessions (manual_tracking collection)
  SESSION_TYPE: 'session_type',                        // 'manual' | 'schedule'
  UNRESPONSIVE_THRESHOLD: 'unresponsive_threshold',
  // SHARING_SESSION_DOC_ID: 'active_sharing_session_doc_id', // 👈 新增這行，與 useFriendSharing 統一
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
  startTrackingMode: (modeId: any, sessionMinutes: number) => Promise<void>;
  stopTrackingMode: (options?: { isEmergency: boolean }) => Promise<void>;
  reportSafety: () => Promise<void>;
  createTrackingMode: (newMode: Omit<TrackingMode, 'id' | 'userId'>) => Promise<void>;
  updateTrackingMode: (modeId: string, updates: Partial<TrackingMode>) => Promise<void>;
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
  hydrateFromScheduledSession: (activeTrackingDocId: string, schedule: ScheduledTracking) => Promise<void>;
  sessionType: 'manual' | 'schedule' | null;
};

const TrackingContext = createContext<TrackingContextType | null>(null);
const BACKGROUND_LOCATION_TASK = 'background-location-task-tracking';

// Returns the Firestore doc ref for the current active session (manual or scheduled)
async function getActiveDocRef() {
  const sessionType = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TYPE);
  const colName = sessionType === 'manual' ? 'manual_tracking' : 'active_tracking';
  const docIdKey = sessionType === 'manual' ? STORAGE_KEYS.MANUAL_TRACKING_DOC_ID : STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID;
  const docId = await AsyncStorage.getItem(docIdKey);
  return docId ? { ref: doc(db, colName, docId), colName } : null;
}

// --- Global Notification Handler Setup ---
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    const data = notification.request.content.data as unknown as NotificationData;

    if (data?.type === 'missed_report' && data.strike === (data.strikeThreshold || 3)) {
      console.log('🚨 FINAL STRIKE NOTIFICATION RECEIVED!');
      try {
        const active = await getActiveDocRef();
        if (active) {
          await updateDoc(active.ref, {
            overallStatus: 'notifying',
            lastUpdateTime: serverTimestamp()
          });
          console.log(`🔥 成功將 ${active.colName} 狀態改為 notifying`);
        }
      } catch (error) {
        console.error('更新緊急狀態失敗:', error);
      }
    } else if (data?.type === 'session_end') {
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
      "需要位置權限",
      "緊急報平安功能需要背景定位權限，請在設定中開啟「永遠允許」。",
      [{ text: "確定" }]
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

// --- Module-level Storage Helpers ---
const TrackingStorage = {
  saveReportDeadline: (deadline: number) =>
    AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, deadline.toString()),
  setTrackingActive: (active: boolean) =>
    AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, active.toString()),
  saveCurrentStrike: (strike: number) =>
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, strike.toString()),
  clearReportDeadline: () =>
    AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE),
  getNotificationIds: async (): Promise<string[]> => {
    const str = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
    return str ? JSON.parse(str) : [];
  },
};

// --- Module-level Notification Helpers ---
const TrackingNotifications = {
  configureNotifications: async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tracking', {
        name: 'Safety Tracking',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  },
  cancelAllNotifications: async (ids: string[]) => {
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  },
};

// --- Module-level Location Helpers ---
const TrackingLocation = {
  startBackgroundLocationUpdates: async () => {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Safii 安全追蹤',
        notificationBody: '正在追蹤您的位置',
      },
    });
  },
  startForegroundLocationWatcher: (
    userId: string
  ): Promise<Location.LocationSubscription> => {
    return Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
      (loc) => updateLocationInFirestore(loc, userId)
    );
  },
  stopBackgroundLocationUpdates: async () => {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    }
  },
};

type TrackingMode = {
  id: string;
  name: string;
  userId: string;
  On?: boolean;
  autoStart?: boolean;
  checkIntervalMinutes: number;
  unresponsiveThreshold?: number;
  startTime: {
    dayOfWeek: string[];
    time: string;
  };
  emergencyContactIds: string[];
  activityLocation?: string;
  activity?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  contacts?: any[];
};

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { backgroundLocationStatus, foregroundLocationStatus } = usePermissions(); // ADDED
  const [trackingModes, setTrackingModes] = useState<TrackingMode[]>([]);
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
  const [sessionType, setSessionType] = useState<'manual' | 'schedule' | null>(null);
  const [foregroundWatcher, setForegroundWatcher] = useState<Location.LocationSubscription | null>(null); // ADDED
  const isReconciling = useRef(false);

  useEffect(() => {
    const init = async () => {
      await TrackingNotifications.configureNotifications();
    };
    init();
  }, []);

  const initializeSystem = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '通知權限未開啟',
          '沒有通知權限，您將無法收到即時的報平安提醒。您仍可使用 Safii 的其他功能，但建議前往設定中開啟通知以獲得完整保護。',
        );
        console.log('⚠️ Notification permissions not granted — app continues with reduced functionality.');
      } else {
        console.log('✅ Notification permissions granted.');
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
        const unresponsiveThresholdStr = await AsyncStorage.getItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD);
        const strikeThreshold = unresponsiveThresholdStr ? parseInt(unresponsiveThresholdStr) : 3; // Default to 3

        // Determine if info has been sent
        if (finalEvent && now > finalEvent.time) {
          setIsInfoSent(true);
          console.log('🚨 Session has ended. isInfoSent set to true.');
          // console.log('isInfoSent has been set to true');
        } else {
          setIsInfoSent(false);
          console.log('⏳ Session is still active. isInfoSent set to false.');
        }


        let currentStrikeCount = 0;
        for (const event of timeline) {
          if (event.type === 'missed_report' && now > event.time) {
            currentStrikeCount = event.strike;
          }
        }

        console.log(`🔄 Resumed session. Re-calculated strikes: ${currentStrikeCount}`);

        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, currentStrikeCount.toString());

        const storedSessionType = (await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TYPE)) as 'manual' | 'schedule' | null;
        setSessionType(storedSessionType);

        if (currentStrikeCount >= strikeThreshold) {
          console.log('🚨 [前景計時器] 偵測到 FINAL STRIKE！準備更新 Firebase');
          try {
            const active = await getActiveDocRef();
            if (active) {
              await updateDoc(active.ref, { overallStatus: 'notifying', lastUpdateTime: serverTimestamp() });
              console.log('🔥 [前景計時器] 成功將雲端狀態改為 notifying！');
            }
          } catch (error) {
            console.error('更新緊急狀態失敗:', error);
          }
        }

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
             // Deadline passed
             await TrackingStorage.clearReportDeadline();
          }
        }

        const nextCI = timeline.find(e => e.type === 'session_end' && e.time > now)?.time || null;
        setNextCheckInTime(nextCI);

        console.log('✅ State Reconciled. Strike:', currentStrikeCount);
      } else {
        // Not active — reset to clean state
        setIsTracking(false);
        setTrackingModeId(null);
        setTimeline([]);
        setCurrentStrike(0);
        setIsReportDue(false);
        setReportDeadline(null);
        setNextCheckInTime(null);
      }
    } catch (error) {
      console.error('❌ Error reconciling state:', error);
      await stopTrackingMode(); // Fail safe
    } finally {
      isReconciling.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      loadAndReconcileState();
    }
  }, [user, loadAndReconcileState]);

  // 請理 AsyncStorage
  useEffect(() => {
    if (!loading && isTracking && trackingModeId) {
      const exists = trackingModes.find(mode => mode.id === trackingModeId);
      if (!exists) {
        console.warn('Selected tracking mode not found. Stopping tracking to prevent inconsistencies.');
        stopTrackingMode();
      }
    }
  }, [trackingModes, isTracking, trackingModeId, loading]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const appStateChangeHandler = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current !== 'active' &&
        nextAppState === 'active'
      ) {
        loadAndReconcileState();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', appStateChangeHandler);

    return () => {
      subscription.remove();
    };
  }, []);

  // --- Foreground Timer for UI Updates ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && !isReportDue && nextCheckInTime) {
      interval = setInterval(() => {
        if (Date.now() >= nextCheckInTime) {
          console.log('⏱️ Check-in time reached.');
          const currentEvent = timeline.find(e => e.type === 'session_end' && e.time === nextCheckInTime);
          if (currentEvent && currentEvent.deadline) {
            AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, currentEvent.deadline.toString())
              .then(() => {
                setReportDeadline(currentEvent.deadline ?? null);
                setIsReportDue(true);
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
  }, [isTracking, isReportDue, nextCheckInTime, reportDeadline, timeline]);


  const REPORT_WINDOW_MS = 10 * 60 * 1000;

  const calculateFullTimeline = (
    startTime: number,
    sessionDurationMs: number,
    strikeThreshold: number
  ): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];
    let currentTime = startTime;

    for (let strike = 0; strike < strikeThreshold; strike++) {
      const sessionEndTime = currentTime + sessionDurationMs;
      const reportDeadlineTime = sessionEndTime + REPORT_WINDOW_MS;
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
        body = '請在十分鐘內回報安全狀態';
      } else if (event.type === 'missed_report') {
        if (event.strike < (event.strikeThreshold ?? 3)) {
          title = `⚠️ 錯過安全回報`;
          body = `您未在時限內回報。新的安全報平安時段已開始，請務必在下次時限內回報。`;
        } else {
          title = '🚨 觸發緊急通知';
          body = `因為尚未回報安全，您的即時位置已經分享給設定的緊急聯絡人`;
        }
      } else {
        title = '⚠️ 安全提醒';
        body = '請確認您目前的安全狀態。';
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

  const startTrackingMode = async (modeId: any, sessionMinutes: number) => {
    if (!user?.uid) {
      Alert.alert('錯誤', '使用者尚未登入。');
      return;
    }
    try {
      const sessionMs = sessionMinutes * 60 * 1000;
      const startTime = Date.now();

      const activeMode = trackingModes.find(mode => mode.id === modeId);
      if (!activeMode) {
        Alert.alert('錯誤', '找不到所選的報平安。');
        return;
      }

      const emergencyContactIds: string[] = (activeMode as any).emergencyContactIds ?? [];
      const strikeThreshold = activeMode.unresponsiveThreshold ?? 3;

      console.log('🚀 Starting tracking with pre-calculated timeline...');

      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, strikeThreshold);
      const notificationIds = await scheduleAllNotifications(calculatedTimeline);

      const finalEvent = calculatedTimeline[calculatedTimeline.length - 1];
      if (finalEvent) {
        const emergencyActivationTime = Timestamp.fromMillis(finalEvent.time);
        const trackingDocRef = doc(collection(db, 'manual_tracking'));

        const contactStatusMap: Record<string, { status: 'active'; notificationCount: number }> = {};
        emergencyContactIds.forEach((id: string) => {
          contactStatusMap[id] = { status: 'active', notificationCount: 0 };
        });

        await setDoc(trackingDocRef, {
          trackedUserId: user.uid,
          triggeredBy: 'manual',
          scheduleId: modeId,
          emergencyContactIds: emergencyContactIds,
          emergencyActivationTime: emergencyActivationTime,
          lastUpdateTime: serverTimestamp(),
          isActive: true,
          nextNotificationTime: emergencyActivationTime,
          overallStatus: 'tracking',
          contactStatus: contactStatusMap,
          activity: (activeMode as any).activity || '',
          activityLocation: (activeMode as any).destination?.address || '',
          notes: (activeMode as any).notes || '',
        });
        await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_TRACKING_DOC_ID, trackingDocRef.id);
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TYPE, 'manual');
        console.log("✅ Dead man's switch set in manual_tracking.");
      }

      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(calculatedTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, modeId);
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES, sessionMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.uid);
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS, JSON.stringify(emergencyContactIds));
      await AsyncStorage.setItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD, strikeThreshold.toString());

      setTimeline(calculatedTimeline);
      setIsTracking(true);
      setCurrentStrike(0);
      setTrackingModeId(modeId);
      setSessionType('manual');

      const nextSessionEnd = calculatedTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }

      console.log('✅ Tracking started with full timeline pre-calculated');

      // Two-step iOS permission request, then start location based on what was granted
      let resolvedForeground = foregroundLocationStatus;
      let resolvedBackground = backgroundLocationStatus;

      if (resolvedForeground !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        resolvedForeground = status === 'granted' ? 'granted' : 'denied';
      }

      if (resolvedForeground === 'granted' && resolvedBackground !== 'granted') {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        resolvedBackground = status === 'granted' ? 'granted' : 'denied';
      }

      if (resolvedBackground === 'granted') {
        await TrackingLocation.startBackgroundLocationUpdates();
      } else if (resolvedForeground === 'granted') {
        const watcher = await TrackingLocation.startForegroundLocationWatcher(user.uid);
        setForegroundWatcher(watcher);
        Alert.alert(
          '位置分享提醒',
          '目前為「使用 App 期間」定位。當 App 在背景時，緊急聯絡人可能看到您數小時前的位置。\n\n建議前往設定開啟「永遠允許」以獲得最即時的保護。',
          [{ text: '了解' }]
        );
      } else {
        Alert.alert(
          '位置未開啟',
          '您的緊急聯絡人將無法看到您的位置。報平安提醒功能仍會正常運作。\n\n您可以隨時在設定中開啟定位。',
          [{ text: '了解' }]
        );
      }

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('錯誤', '無法啟動報平安：' + errMsg);
    }
  };

  const reportSafety = async () => {
    if (!user?.uid) return;
    try {
      console.log('✅ Reporting safety...');
      
      // Cancel old notifications
      const oldIds = await TrackingStorage.getNotificationIds();
      await TrackingNotifications.cancelAllNotifications(oldIds);

      const initialSessionMinutesStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES);
      const unresponsiveThresholdStr = await AsyncStorage.getItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD);

      const sessionMs = initialSessionMinutesStr ? parseInt(initialSessionMinutesStr) * 60 * 1000 : 30 * 60 * 1000;
      const newStartTime = Date.now();
      const strikeThreshold = unresponsiveThresholdStr ? parseInt(unresponsiveThresholdStr) : 3;

      console.log('🔄 Recalculating timeline from current time...');
      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, strikeThreshold);
      const newNotificationIds = await scheduleAllNotifications(newTimeline);

      const newFinalEvent = newTimeline[newTimeline.length - 1];
      if (newFinalEvent) {
        const active = await getActiveDocRef();
        if (active) {
          const newEmergencyActivationTime = Timestamp.fromMillis(newFinalEvent.time);
          await updateDoc(active.ref, {
            emergencyActivationTime: newEmergencyActivationTime,
            overallStatus: 'tracking',
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
      setIsInfoSent(false);

      const nextSessionEnd = newTimeline.find(event => event.type === 'session_end' && event.time > Date.now());
      if (nextSessionEnd) {
        setNextCheckInTime(nextSessionEnd.time);
      } else {
        setNextCheckInTime(null);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ 已回報安全',
          body: '已重新計算完整報平安時程。',
          sound: 'default',
        },
        trigger: null,
      });

    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('錯誤', '回報安全失敗：' + errMsg);
    }
  };

  const hydrateFromScheduledSession = async (activeTrackingDocId: string, schedule: ScheduledTracking) => {
    if (!user?.uid) return;
    if (isTracking) return; // Any active session (manual or scheduled) blocks hydration

    try {
      const sessionMs = schedule.checkIntervalMinutes * 60 * 1000;
      const startTime = Date.now();
      const strikeThreshold = schedule.unresponsiveThreshold ?? 3;
      const emergencyContactIds = schedule.emergencyContactIds ?? [];

      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, strikeThreshold);
      const notificationIds = await scheduleAllNotifications(calculatedTimeline);

      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(calculatedTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
      await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, schedule.id);
      await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES, schedule.checkIntervalMinutes.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS, JSON.stringify(emergencyContactIds));
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID, activeTrackingDocId);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TYPE, 'schedule');
      await AsyncStorage.setItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD, strikeThreshold.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.uid);

      setTimeline(calculatedTimeline);
      setIsTracking(true);
      setCurrentStrike(0);
      setTrackingModeId(schedule.id);
      setSessionType('schedule');
      setIsReportDue(false);
      setReportDeadline(null);
      setIsInfoSent(false);

      const nextSessionEnd = calculatedTimeline.find(e => e.type === 'session_end' && e.time > Date.now());
      setNextCheckInTime(nextSessionEnd?.time ?? null);

      console.log('✅ Hydrated scheduled session:', schedule.id);
    } catch (error) {
      console.error('❌ Error hydrating scheduled session:', error);
    }
  };

  stopTrackingMode = async (options?: { isEmergency: boolean }) => {
    if (!user?.uid) return;

    const isEmergency = options?.isEmergency ?? false;

    if (isEmergency) {
      console.log('🚨 Emergency active: Background location tracking will CONTINUE. Local state kept alive.');
      return;
    }

    try {
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);

      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id).catch(() => { });
        }
        console.log('🧹 Cancelled all future notifications');
      }

      try {
        const active = await getActiveDocRef();
        if (active) {
          await updateDoc(active.ref, {
            isActive: false,
            overallStatus: 'safe_stopped',
            stoppedAt: serverTimestamp()
          });
          console.log(`✅ 雲端 ${active.colName} 關閉成功`);
        }
      } catch (e) {
        console.log('⚠️ 雲端追蹤文件更新失敗，忽略錯誤');
      }

    } catch (error) {
      console.error('❌ Firebase 或背景服務停止時發生錯誤，但仍會強制清除本地狀態:', error);
    } finally {

      const normalSessionId = await AsyncStorage.getItem('active_sharing_session_doc_id');
      if (!normalSessionId) {
        if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => { });
        }
        if (foregroundWatcher) {
          foregroundWatcher.remove();
          setForegroundWatcher(null);
        }
      }

      // 拿出所有的 KEY
      const keys = Object.values(STORAGE_KEYS);
      // 把 User ID 留著，其他全部殺掉 (避免影響登入狀態)
      const keysToRemove = keys.filter(k => k !== STORAGE_KEYS.CURRENT_USER_ID);

      await AsyncStorage.multiRemove(keysToRemove);

      // 狀態歸零
      setIsTracking(false);
      setTrackingModeId(null);
      setSessionType(null);
      setTimeline([]);
      setCurrentStrike(0);
      setIsReportDue(false);
      setReportDeadline(null);
      setNextCheckInTime(null);

      console.log('🛑 ✅ 本地狀態已強制重置');
    }
  };

  const fetchTrackingModesWithContacts = async (userId: string) => {
    setLoading(true);
    const colRef = query(collection(db, 'scheduled_tracking'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(colRef, (querySnapshot) => {
      const data = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as TrackingMode[];
      setTrackingModes(data);
      setLoading(false);
    }, (error) => {
      console.error('[TrackProvider] Error listening to scheduled_tracking:', error);
      setTrackingModes([]);
      setLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      const cleanUp = async () => {
        console.log('🧹 User signed out. Cleaning up...');
        await TrackingLocation.stopBackgroundLocationUpdates();
        if (foregroundWatcher) {
            foregroundWatcher.remove();
            setForegroundWatcher(null);
        }

        // 2. Cancel all scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🧹 Cancelled all scheduled notifications due to sign-out.');

        // 3. Deactivate the 'dead man's switch' in Firestore
        try {
          const active = await getActiveDocRef();
          if (active) {
            await updateDoc(active.ref, {
              isActive: false,
              stoppedAt: serverTimestamp(),
              overallStatus: 'cancelled_by_sign_out'
            });
            console.log("✅ Dead man's switch deactivated in Firestore for sign-out.");
          }
        } catch (e) {
          console.error("Failed to update tracking doc on sign-out", e);
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
      cleanUp();
    }
  }, [user, authLoading]);

  const createTrackingMode = async (newMode: Omit<TrackingMode, 'id' | 'userId'>) => {
    if (!user?.uid) {
      Alert.alert('錯誤', '使用者尚未登入。');
      return;
    }
    try {
      const trackingModeCollection = collection(db, 'TrackingMode');
      // Persist the mode, defaulting `On` to false if not provided.
      const { On, ...rest } = newMode as any;
      await addDoc(trackingModeCollection, {
        ...rest,
        On: On ?? false,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Refetch tracking modes to update the list
      // No need to call fetchTrackingModesWithContacts here, onSnapshot will handle it
    } catch (error) {
      console.error('Error creating tracking mode:', error);
      Alert.alert('錯誤', '建立報平安失敗，請稍後再試。');
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
      Alert.alert('錯誤', '刪除報平安失敗，請稍後再試。');
    }
  };

  const updateTrackingMode = async (modeId: string, updates: Partial<TrackingMode>) => {
    if (!user?.uid) {
      Alert.alert('錯誤', '使用者尚未登入。');
      return;
    }
    try {
      const allowedFields = [
        'name',
        'checkIntervalMinutes',
        'unresponsiveThreshold',
        'startTime',
        'emergencyContactIds',
        'On',
        'autoStart',
        'activityLocation',
        'activity',
        'notes',
      ];

      const payload: Record<string, any> = {};
      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          payload[key] = (updates as any)[key];
        }
      });
      payload.updatedAt = serverTimestamp();

      const modeRef = doc(db, 'TrackingMode', modeId);
      await updateDoc(modeRef, payload);
      console.log(`✅ Updated TrackingMode ${modeId} with`, payload);
    } catch (error) {
      console.error('Error updating tracking mode:', error);
      Alert.alert('錯誤', '更新報平安失敗，請稍後再試。');
    }
  };

  return (
    <TrackingContext.Provider value={{
      trackingModes,
      loading,
      startTrackingMode,
      stopTrackingMode,
      reportSafety,
      createTrackingMode,
      updateTrackingMode,
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
      hydrateFromScheduledSession,
      sessionType,
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