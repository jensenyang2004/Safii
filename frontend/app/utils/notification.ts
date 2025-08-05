// app/utils/notification.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { firebase } from '@/app/config/firebase';

import { handleIncomingCall } from '@/app/features/videoCall/callManager';

// In your existing notification handler, add video call handling:
export const handleNotification = async (notification) => {
  const data = notification.request?.content?.data || notification.data;

  // Handle video call notifications
  if (data?.type === 'INCOMING_CALL') {
    handleIncomingCall(data);
    return {
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  }

  // Default handling for other notification types
  return {
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  };
};

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  // Only continue if on a physical device
  if (!Device.isDevice) {
    console.log('Push notifications are only available on physical devices');
    return;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // Get push token
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '29161d9f-2ce5-4549-8e0c-585579fdaa80', // Remove extra quotes
    })).data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return;
  }

  // Save token to user record in Firestore
  const auth = firebase.auth();
  if (auth.currentUser && token) {
    try {
      await firebase.firestore()
        .collection('users')
        .doc(auth.currentUser.uid)
        .update({
          deviceTokens: firebase.firestore.FieldValue.arrayUnion(token)
        });
      console.log('Token saved to Firestore');
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  }

  // Set up Android notification channel for calls
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Video Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  return token;
}

// Handle notifications
export function setupNotificationListeners() {
  // Handle notifications when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Received notification in foreground:', notification);
    handleNotification(notification);
  });

  // Handle notification taps
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data?.type === 'INCOMING_CALL') {
      handleIncomingCall(data);
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

// Show incoming call UI
export function showIncomingCall(callData: any) {
  // For foreground calls, navigate to the incoming call screen
  router.push({
    pathname: '/(modals)/incoming-call',
    params: {
      meetingId: callData.meetingId,
      callerId: callData.callerId,
      callerName: callData.callerName
    }
  });
}

// Add this at the end of the file
export default function NotARoute() {
  return null;
}