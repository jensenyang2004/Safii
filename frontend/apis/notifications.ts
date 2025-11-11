import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Device from 'expo-device';
import Constants from 'expo-constants'; // Added import for Constants

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // Added this line
    shouldShowList: true,   // Added this line
  }),
});

export const sendPushNotification = async (expoPushToken: string, message: string) => {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'siren.wav', // Use a custom sound file
      title: '收到位置資訊',
      body: message,
      priority: 'high', // For Android
      channelId: 'location-alerts', // Custom channel for Android
    }),
  });

  return response.json();
};

// New error handler function
function handleRegistrationError(errorMessage: string) {
  // alert(errorMessage);
  console.error(errorMessage); // Log to console for debugging
  // throw new Error(errorMessage); // Re-throw to stop execution if needed
}

export const registerForPushNotificationsAsync = async () => {
  let token;
  
  console.log('Device.isDevice:', Device.isDevice);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    // Create the channel for location alerts with custom sound
    await Notifications.setNotificationChannelAsync('location-alerts', {
      name: '位置警報',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'siren.wav', // Associate the sound with the channel
      lightColor: '#FF231F7C',
    });
    await Notifications.setNotificationChannelAsync('safii_alert_channel', {
      name: 'SAFII Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'safii_alert.wav',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Existing permission status:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    console.log('Final permission status:', finalStatus);
    if (finalStatus !== 'granted') {
      handleRegistrationError('未授予獲取推播通知的推播權杖的權限！');
      return;
    }

    // Get projectId from Constants
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('在 app.json 或 eas.json 中找不到專案 ID');
      return;
    }
    
    try {
      console.log('Attempting to get Expo push token with projectId:', projectId);
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      console.log('Push Notification Token:', token);
    } catch (e: any) {
      handleRegistrationError(`Error getting Expo push token: ${e.message || e}`);
      return;
    }

    return token;
  } else {
    handleRegistrationError('必須使用實體裝置才能推播通知');
  }
};

export async function saveTokenToFirestore(token: string) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user && token) {
    const db = getFirestore();
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { pushToken: token }, { merge: true });
      console.log('Successfully saved push token to Firestore.');
    } catch (error) {
      console.error('Error saving push token to Firestore: ', error);
    }
  } else {
    console.log('saveTokenToFirestore: User or token is missing. User:', user, 'Token:', token);
  }
}


export const scheduleEmergencyNotification = async (contactName: string, delayInSeconds: number) => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "緊急警報",
      body: `你的朋友，${contactName}，可能遇到了麻煩。請關心他們。`,
      sound: 'siren.wav', // Assuming you have a siren.wav file in your assets
      vibration: [0, 500, 500, 500, 500, 500], // A more insistent vibration pattern
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      seconds: delayInSeconds,
    },
  });
  return notificationId;
};

export const cancelNotification = async (notificationId: string) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const sendEmergencyNotification = async (expoPushToken: string, message: string) => {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'siren.wav', // Use a custom sound file
      title: '緊急警報！',
      body: message,
      priority: 'high', // For Android
      channelId: 'emergency-alerts', // Custom channel for Android
    }),
  });

  return response.json();
};

// You should also create the channel on the device
export const createEmergencyNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency-alerts', {
      name: '緊急警報',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'siren.wav', // Associate the sound with the channel
      lightColor: '#FF231F7C',
    });
  }
};

/**
 * Schedules a local alert notification with the 'safii_alert.wav' sound.
 */
export async function sendAlertNotification(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      alert('You need to enable notifications in settings for alerts to work.');
      return;
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('safii_alert_channel', {
      name: 'SAFII Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'safii_alert.wav',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚨 SAFII Alert",
      body: "Potential danger detected nearby. Stay alert.",
      sound: 'safii_alert.wav', // For iOS
      channelId: 'safii_alert_channel', // For Android
    },
    trigger: null, // Triggers immediately
  });

  console.log("Local SAFII alert notification scheduled.");
}
