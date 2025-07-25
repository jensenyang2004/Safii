import React, { useState, useEffect } from 'react';
import { View, Text, Button, AppState, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEYS = {
  END_TIME: 'countdown_end_time',
  DURATION: 'countdown_duration',
  NOTIFICATION_ID: 'countdown_notification_id'
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CountdownComponent = () => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Request notification permissions
    registerForPushNotificationsAsync();

    // Check for existing countdown on app start
    checkExistingCountdown();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    let interval;
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        updateRemainingTime();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, remainingTime]);

  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive countdown completion alerts.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('countdown', {
          name: 'Countdown Timer',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const checkExistingCountdown = async () => {
    try {
      const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
      if (endTimeStr) {
        const endTime = parseInt(endTimeStr);
        const now = Date.now();
        if (now < endTime) {
          // Countdown still active
          const remaining = Math.ceil((endTime - now) / 1000);
          setRemainingTime(remaining);
          setIsActive(true);
        } else {
          // Countdown already finished - clear it
          await clearCountdown();
        }
      }
    } catch (error) {
      console.error('Error checking existing countdown:', error);
    }
  };

  const updateRemainingTime = async () => {
    try {
      const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
      if (!endTimeStr) {
        setIsActive(false);
        return;
      }

      const endTime = parseInt(endTimeStr);
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        // Countdown finished while app was open
        setRemainingTime(0);
        setIsActive(false);
        await clearCountdown();
        
        // Show in-app alert as well
        Alert.alert(
          "🎉 Countdown Finished!",
          "Your countdown has completed!"
        );
      } else {
        setRemainingTime(remaining);
      }
    } catch (error) {
      console.error('Error updating remaining time:', error);
    }
  };

  const startCountdown = async (durationInSeconds) => {
    try {
      const endTime = Date.now() + (durationInSeconds * 1000);
      const trigger = new Date(endTime);
      // Store countdown data
      await AsyncStorage.setItem(STORAGE_KEYS.END_TIME, endTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.DURATION, durationInSeconds.toString());

      // Schedule notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Countdown Finished!',
          body: `Your ${formatDuration(durationInSeconds)} countdown has completed.`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#FF231F7C',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: durationInSeconds, // Triggers in 5 seconds
            channelId: 'countdown',
        },
      });

      // Store notification ID
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_ID, notificationId);

      // Update state
      setRemainingTime(durationInSeconds);
      setIsActive(true);
      
      Alert.alert(
        "✅ Countdown Started!",
        `${formatDuration(durationInSeconds)} countdown started. You'll receive a notification when it completes.`
      );
      
    } catch (error) {
      console.error('Error starting countdown:', error);
      Alert.alert('Error', 'Failed to start countdown. Please try again.');
    }
  };

  const clearCountdown = async () => {
    try {
      // Cancel scheduled notification
      const notificationId = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_ID);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
      
      // Clear storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.END_TIME, 
        STORAGE_KEYS.DURATION, 
        STORAGE_KEYS.NOTIFICATION_ID
      ]);
      
      // Update state
      setRemainingTime(0);
      setIsActive(false);
      
    } catch (error) {
      console.error('Error clearing countdown:', error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // App became active, update remaining time
      updateRemainingTime();
    }
  };

  const testNotification = async () => {
    try {
      // Test notification immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is how your countdown completion notification will look!',
          sound: 'default',
        },
        trigger: {
          seconds: 1,
          channelId: 'countdown',
        },
      });
      
      Alert.alert('Test Sent!', 'Check your notifications in 1 second.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const getStatusText = () => {
    if (!isActive) return "No Active Countdown";
    
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m remaining`;
    } else {
      return `${remainingTime}s remaining`;
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' }}>
      <View style={{ 
        backgroundColor: 'white', 
        borderRadius: 20, 
        padding: 30, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center'
      }}>
        <Text style={{ 
          fontSize: 48, 
          fontWeight: 'bold', 
          marginBottom: 10, 
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          color: isActive ? '#007AFF' : '#666'
        }}>
          {isActive ? formatTime(remainingTime) : "00:00"}
        </Text>
        
        <Text style={{ 
          fontSize: 18, 
          marginBottom: 30, 
          textAlign: 'center', 
          color: isActive ? '#007AFF' : '#666',
          fontWeight: '500'
        }}>
          {getStatusText()}
        </Text>
        
        <View style={{ gap: 12, width: '100%' }}>
          <Button 
            title="🧪 Test Notification" 
            onPress={testNotification}
            color="#FF9500"
          />
          
          <Button 
            title="⚡ Start 10 Second Test" 
            onPress={() => startCountdown(10)}
            disabled={isActive}
          />
          <Button 
            title="⏱️ Start 1 Minute" 
            onPress={() => startCountdown(60)}
            disabled={isActive}
          />
          <Button 
            title="🕐 Start 5 Minutes" 
            onPress={() => startCountdown(300)}
            disabled={isActive}
          />
          <Button 
            title="⏰ Start 30 Minutes" 
            onPress={() => startCountdown(1800)}
            disabled={isActive}
          />
          {isActive && (
            <Button 
              title="❌ Cancel Countdown" 
              onPress={clearCountdown}
              color="#FF3B30"
            />
          )}
        </View>
        
        <Text style={{ 
          fontSize: 13, 
          color: '#666', 
          textAlign: 'center', 
          marginTop: 25, 
          lineHeight: 18,
          fontStyle: 'italic'
        }}>
          {isActive 
            ? "You'll receive a notification when the countdown completes, even if the app is closed"
            : "Start a countdown to receive notifications when it completes"
          }
        </Text>
      </View>
    </View>
  );
};

export default CountdownComponent;