import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/tracking';
import { TimelineEvent } from '@/types/tracking';

export const saveTimeline = async (timeline: TimelineEvent[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline));
};

export const getTimeline = async (): Promise<TimelineEvent[] | null> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.TIMELINE);
  return str ? JSON.parse(str) : null;
};

export const setTrackingActive = async (isActive: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, isActive.toString());
};

export const isTrackingActive = async (): Promise<boolean> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.IS_ACTIVE);
  return str === 'true';
};

export const saveStartTime = async (time: number) => {
  await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, time.toString());
};

export const getStartTime = async (): Promise<number | null> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.START_TIME);
  return str ? parseInt(str, 10) : null;
};

export const saveCurrentStrike = async (strike: number) => {
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, strike.toString());
};

export const getCurrentStrike = async (): Promise<number> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STRIKE);
  return str ? parseInt(str, 10) : 0;
};

export const saveNotificationIds = async (ids: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(ids));
};

export const getNotificationIds = async (): Promise<string[]> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
  return str ? JSON.parse(str) : [];
};

export const saveReportDeadline = async (deadline: number) => {
  await AsyncStorage.setItem(STORAGE_KEYS.REPORT_DEADLINE, deadline.toString());
};

export const getReportDeadline = async (): Promise<number | null> => {
  const str = await AsyncStorage.getItem(STORAGE_KEYS.REPORT_DEADLINE);
  return str ? parseInt(str, 10) : null;
};

export const clearReportDeadline = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.REPORT_DEADLINE);
};

export const saveTrackingModeId = async (id: string) => {
  await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, id);
};

export const getTrackingModeId = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);
};

export const saveSessionParams = async (sessionMinutes: number, reductionMinutes: number, strikeThreshold: number) => {
  await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES, sessionMinutes.toString());
  await AsyncStorage.setItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES, reductionMinutes.toString());
  await AsyncStorage.setItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD, strikeThreshold.toString());
};

export const getSessionParams = async () => {
  const sessionStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_SESSION_MINUTES);
  const reductionStr = await AsyncStorage.getItem(STORAGE_KEYS.INITIAL_REDUCTION_MINUTES);
  const thresholdStr = await AsyncStorage.getItem(STORAGE_KEYS.UNRESPONSIVE_THRESHOLD);

  return {
    sessionMinutes: sessionStr ? parseInt(sessionStr, 10) : 30, // Default 30
    reductionMinutes: reductionStr ? parseInt(reductionStr, 10) : 10, // Default 10
    strikeThreshold: thresholdStr ? parseInt(thresholdStr, 10) : 3, // Default 3
  };
};

export const saveActiveTrackingDocId = async (id: string) => {
  await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID, id);
};

export const getActiveTrackingDocId = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRACKING_DOC_ID);
};

export const saveUserId = async (userId: string) => {
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
};

export const getUserId = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
};

export const saveEmergencyContactIds = async (ids: string[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_IDS, JSON.stringify(ids));
};

export const clearAllTrackingData = async (isEmergency: boolean) => {
  const keys = Object.values(STORAGE_KEYS);
  if (isEmergency) {
    // In emergency, keep the User ID so background tasks might still function/log if needed
    // (though in the original code, this distinction was subtle).
    // Let's stick to the original logic: remove everything EXCEPT current_user_id
    const keysToRemove = keys.filter(k => k !== STORAGE_KEYS.CURRENT_USER_ID);
    await AsyncStorage.multiRemove(keysToRemove);
  } else {
    await AsyncStorage.multiRemove(keys);
  }
};
