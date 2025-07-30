import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

// Background task name
const BACKGROUND_COUNTDOWN_TASK = 'background-countdown-task';

// Storage keys
const STORAGE_KEYS = {
  END_TIME: 'test_countdown_end_time',
  IS_ACTIVE: 'test_countdown_active',
  START_TIME: 'test_countdown_start_time'
};

// Define the background task
TaskManager.defineTask(BACKGROUND_COUNTDOWN_TASK, async () => {
  console.log('🔄 Background task executed at:', new Date().toLocaleTimeString());
  
  try {
    const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
    const isActiveStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_ACTIVE);
    
    if (endTimeStr && isActiveStr === 'true') {
      const endTime = parseInt(endTimeStr);
      const now = Date.now();
      
      console.log('⏰ Checking countdown - End time:', new Date(endTime).toLocaleTimeString());
      console.log('⏰ Current time:', new Date(now).toLocaleTimeString());
      console.log('⏰ Remaining seconds:', Math.ceil((endTime - now) / 1000));
      
      if (now >= endTime) {
        // Countdown finished!
        console.log('🚨 COUNTDOWN FINISHED! Timer expired in background!');
        console.log('🎯 This proves background execution works!');
        
        // Clean up
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.END_TIME,
          STORAGE_KEYS.IS_ACTIVE,
          STORAGE_KEYS.START_TIME
        ]);
        
        // Send notification to user
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Background Test Complete!',
            body: 'Countdown finished while app was in background. Check console logs!',
            sound: 'default',
          },
          trigger: null, // Send immediately
        });
        
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('❌ Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const BackgroundCountdownTest = () => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] = useState(false);

  useEffect(() => {
    initializeBackgroundTask();
    checkExistingCountdown();
    
    // Update UI every second when active
    const interval = setInterval(() => {
      if (isActive) {
        updateRemainingTime();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive]);

  const initializeBackgroundTask = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissions needed', 'Please enable notifications to test background execution');
        return;
      }

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_COUNTDOWN_TASK, {
        minimumInterval: 15, // Check every 15 seconds (minimum allowed)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      setBackgroundTaskRegistered(true);
      console.log('✅ Background task registered successfully');
      
    } catch (error) {
      console.error('❌ Failed to register background task:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Setup Error', 'Failed to setup background task: ' + errMsg);
    }
  };

  const checkExistingCountdown = async () => {
    try {
      const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
      const isActiveStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_ACTIVE);
      
      if (endTimeStr && isActiveStr === 'true') {
        const endTime = parseInt(endTimeStr);
        const now = Date.now();
        
        if (now < endTime) {
          const remaining = Math.ceil((endTime - now) / 1000);
          setRemainingTime(remaining);
          setIsActive(true);
          console.log('📱 Resumed existing countdown:', remaining, 'seconds remaining');
        } else {
          // Countdown already finished
          await clearCountdown();
          console.log('⏰ Countdown was already finished');
        }
      }
    } catch (error) {
      console.error('❌ Error checking existing countdown:', error);
    }
  };

  const updateRemainingTime = async () => {
    try {
      const endTimeStr = await AsyncStorage.getItem(STORAGE_KEYS.END_TIME);
      if (!endTimeStr) return;
      
      const endTime = parseInt(endTimeStr);
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      
      if (remaining <= 0) {
        console.log('⏰ Countdown finished in foreground!');
        await clearCountdown();
      } else {
        setRemainingTime(remaining);
      }
    } catch (error) {
      console.error('❌ Error updating time:', error);
    }
  };

  const startCountdown = async (seconds: number) => {
    try {
      const endTime = Date.now() + (seconds * 1000);
      const startTime = Date.now();
      
      await AsyncStorage.setItem(STORAGE_KEYS.END_TIME, endTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      
      setRemainingTime(seconds);
      setIsActive(true);
      
      console.log('🚀 Started countdown for', seconds, 'seconds');
      console.log('📱 Now close the app to test background execution!');
      console.log('⏰ Countdown will finish at:', new Date(endTime).toLocaleTimeString());
      
      // Show instruction notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Background Test Started',
          body: `${seconds}s countdown started. Close the app now to test background execution!`,
          sound: 'default',
        },
        trigger: null,
      });
      
    } catch (error) {
      console.error('❌ Error starting countdown:', error);
      const errMsg = (error instanceof Error) ? error.message : String(error);
      Alert.alert('Error', 'Failed to start countdown: ' + errMsg);
    }
  };

  const clearCountdown = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.END_TIME,
        STORAGE_KEYS.IS_ACTIVE,
        STORAGE_KEYS.START_TIME
      ]);
      
      setRemainingTime(0);
      setIsActive(false);
      
      console.log('🧹 Countdown cleared');
    } catch (error) {
      console.error('❌ Error clearing countdown:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Background Countdown Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.status}>
          Background Task: {backgroundTaskRegistered ? '✅ Registered' : '❌ Not Registered'}
        </Text>
        <Text style={styles.status}>
          Countdown: {isActive ? '🟢 Active' : '🔴 Inactive'}
        </Text>
      </View>

      {isActive ? (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdown}>{formatTime(remainingTime)}</Text>
          <Text style={styles.instruction}>
            📱 Close the app now to test background execution!
          </Text>
          <TouchableOpacity style={styles.stopButton} onPress={clearCountdown}>
            <Text style={styles.buttonText}>Stop Test</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => startCountdown(30)}
          >
            <Text style={styles.buttonText}>Test 30 Seconds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => startCountdown(60)}
          >
            <Text style={styles.buttonText}>Test 1 Minute</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => startCountdown(120)}
          >
            <Text style={styles.buttonText}>Test 2 Minutes</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📋 Test Instructions:</Text>
        <Text style={styles.instruction}>1. Tap a countdown button</Text>
        <Text style={styles.instruction}>2. Close the app completely</Text>
        <Text style={styles.instruction}>3. Wait for the countdown to finish</Text>
        <Text style={styles.instruction}>4. Check console logs when you return</Text>
        <Text style={styles.instruction}>5. You should see completion logs!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  countdownContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
  },
  countdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  buttonsContainer: {
    gap: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default BackgroundCountdownTest;