
import { useState, useEffect } from 'react';
import { AppState, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEYS = {
  END_TIME: 'tracking_countdown_end_time',
  DURATION: 'tracking_countdown_duration',
  TRACKING_MODE_ID: 'tracking_mode_id',
  NOTIFICATION_ID: 'tracking_countdown_notification_id',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useTrackingTimer = () => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [trackingModeId, setTrackingModeId] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    checkExistingCountdown();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        updateRemainingTime();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, remainingTime]);

  const registerForPushNotificationsAsync = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive tracking alerts.');
      return;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tracking', {
        name: 'Tracking Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  const checkExistingCountdown = async () => {
    const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
    const modeId = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_MODE_ID);
    if (endTimeStr && modeId) {
      const endTime = parseInt(endTimeStr);
      const now = Date.now();
      if (now < endTime) {
        const remaining = Math.ceil((endTime - now) / 1000);
        setRemainingTime(remaining);
        setTrackingModeId(modeId);
        setIsActive(true);
      } else {
        await clearCountdown();
      }
    }
  };

  const updateRemainingTime = async () => {
    const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
    if (!endTimeStr) {
      setIsActive(false);
      setTrackingModeId(null);
      return;
    }
    const endTime = parseInt(endTimeStr);
    const now = Date.now();
    const remaining = Math.ceil((endTime - now) / 1000);
    if (remaining <= 0) {
      setRemainingTime(0);
      setIsActive(false);
      setTrackingModeId(null);
      await clearCountdown();
      Alert.alert("Tracking Finished", "Your tracking session has completed!");
    } else {
      setRemainingTime(remaining);
    }
  };

  const startCountdown = async (durationInSeconds: number, modeId: string) => {
    const endTime = Date.now() + durationInSeconds * 1000;
    await AsyncStorage.setItem(STORAGE_KEYS.END_TIME, endTime.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.DURATION, durationInSeconds.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_MODE_ID, modeId);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Check-in Time!',
        body: `Time to check in for your tracking session.`,
        sound: 'default',
      },
      trigger: {
        seconds: durationInSeconds,
        channelId: 'tracking',
      },
    });
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_ID, notificationId);

    setRemainingTime(durationInSeconds);
    setTrackingModeId(modeId);
    setIsActive(true);
  };

  const clearCountdown = async () => {
    const notificationId = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_ID);
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setRemainingTime(0);
    setIsActive(false);
    setTrackingModeId(null);
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      updateRemainingTime();
    }
  };

  return { remainingTime, isActive, trackingModeId, startCountdown, clearCountdown };
};
