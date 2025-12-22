import { useState, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

export function usePermissions() {
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'idle'>('idle');
  const [backgroundLocationStatus, setBackgroundLocationStatus] = useState<'granted' | 'denied' | 'idle'>('idle');
  const [foregroundLocationStatus, setForegroundLocationStatus] = useState<'granted' | 'denied' | 'idle'>('idle');

  const checkPermissions = async () => {
    setIsLoading(true);
    // Check Notification Permission
    const notifStatus = await Notifications.getPermissionsAsync();
    if (notifStatus.granted) {
      setNotificationStatus('granted');
    } else {
      setNotificationStatus(notifStatus.canAskAgain ? 'idle' : 'denied');
    }

    // Check Background Location Permission (Always Allow)
    const backgroundLocStatus = await Location.getBackgroundPermissionsAsync();
    console.log('backgroundLocStatus', backgroundLocStatus);
    let isBackgroundGranted = false;
    if (Platform.OS === 'ios') {
      isBackgroundGranted = backgroundLocStatus.scope === 'always';
    } else if (Platform.OS === 'android') {
      isBackgroundGranted = backgroundLocStatus.granted;
    }
    setBackgroundLocationStatus(isBackgroundGranted ? 'granted' : (backgroundLocStatus.canAskAgain ? 'idle' : 'denied'));

    // Check Foreground Location Permission (When In Use)
    const foregroundLocStatus = await Location.getForegroundPermissionsAsync();
    setForegroundLocationStatus(
      foregroundLocStatus.granted || backgroundLocStatus.scope === 'whenInUse'
        ? 'granted'
        : (foregroundLocStatus.canAskAgain ? 'idle' : 'denied')
    );

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

  // Redefine allPermissionsGranted to mean notification granted AND at least foreground location granted
  const allPermissionsGranted = notificationStatus === 'granted' && (foregroundLocationStatus === 'granted' || backgroundLocationStatus === 'granted');

  return {
    isLoading,
    notificationStatus,
    backgroundLocationStatus,
    foregroundLocationStatus,
    allPermissionsGranted,
    checkPermissions,
  };
}
