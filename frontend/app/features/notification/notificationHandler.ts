import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { firebase } from '@/app/config/firebase';
import { handleIncomingCall } from '../videoCall/callManager';

/**
 * Register the device for push notifications and store the token in Firestore
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Push notifications are only available on physical devices');
    return;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return;
  }

  // Get token
  let token;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'safii-90f1d', // Replace with your Expo project ID
    });
    token = tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return;
  }

  // Store token in Firestore
  const userId = firebase.auth().currentUser?.uid;
  if (userId && token) {
    try {
      const userRef = firebase.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const deviceTokens = userData?.deviceTokens || [];
        
        // Only add token if it's not already in the array
        if (!deviceTokens.includes(token)) {
          await userRef.update({
            deviceTokens: [...deviceTokens, token],
          });
          console.log('Push token stored in Firestore');
        }
      } else {
        await userRef.set({
          deviceTokens: [token],
        }, { merge: true });
        console.log('Created user document with push token');
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('calls', {
      name: 'Video Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }
};

/**
 * Handle incoming notifications
 */
export const setupNotificationHandler = () => {
  // Handler for when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      
      // Handle video call notifications
      if (data.type === 'INCOMING_CALL') {
        // Custom handling for call notifications
        handleIncomingCall(data);
        
        return {
          shouldShowAlert: false, // We'll show our own UI
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      }
      
      // Default handling for other notifications
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
  
  // Handle notification when app is opened from a notification
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'INCOMING_CALL') {
      handleIncomingCall(data);
    }
  });
  
  return subscription; // Return for cleanup
};