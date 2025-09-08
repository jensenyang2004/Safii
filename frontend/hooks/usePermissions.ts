import { useState, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

export function usePermissions() {
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'idle'>('idle');
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'idle'>('idle');

  const checkPermissions = async () => {
    setIsLoading(true);
    // Check Notification Permission
    const notifStatus = await Notifications.getPermissionsAsync();
    if (notifStatus.granted) {
      setNotificationStatus('granted');
    } else {
      setNotificationStatus(notifStatus.canAskAgain ? 'idle' : 'denied');
    }

    // Check Location Permission
    const locStatus = await Location.getBackgroundPermissionsAsync();
    console.log('locStatus', locStatus);
    let isGranted = false;
    if (Platform.OS === 'ios') {
      isGranted = locStatus.scope === 'always';
    } else if (Platform.OS === 'android') {
      isGranted = locStatus.granted;
    }

    if (isGranted) {
      setLocationStatus('granted');
    } else {
      setLocationStatus(locStatus.canAskAgain ? 'idle' : 'denied');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const allPermissionsGranted = notificationStatus === 'granted' && locationStatus === 'granted';

  return {
    isLoading,
    notificationStatus,
    locationStatus,
    allPermissionsGranted,
    checkPermissions,
  };
}
