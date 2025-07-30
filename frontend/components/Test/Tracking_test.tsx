import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

// Types
interface TimelineEvent {
  time: number;
  type: 'session_end' | 'missed_report';
  strike: number;
  description: string;
}

interface NotificationData {
  type: string;
  strike: number;
  eventTime: number;
}

// Background task for final emergency
const EMERGENCY_TASK = 'emergency-location-send';

// Storage keys
const STORAGE_KEYS = {
  TIMELINE: 'calculated_timeline',
  IS_ACTIVE: 'tracking_active',
  START_TIME: 'tracking_start_time',
  CURRENT_STRIKE: 'current_strike',
  NOTIFICATION_IDS: 'scheduled_notification_ids'
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Notification received:', notification.request.content.title);
    
    // Handle different notification types
    const data = notification.request.content.data as NotificationData;
    if (data?.type === 'session_end') {
      console.log(`⏰ Session ${data.strike + 1} ended - Report required`);
    } else if (data?.type === 'missed_report') {
      console.log(`❌ Missed report ${data.strike} - Starting next session`);
      await handleMissedReport(data.strike);
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

// Define emergency background task
TaskManager.defineTask(EMERGENCY_TASK, async () => {
  console.log('🆘 EMERGENCY BACKGROUND TASK EXECUTED!');
  console.log('📍 This is where you would send location to server');
  console.log('📞 This is where you would notify emergency contacts');
  console.log('🚨 USER FAILED TO RESPOND 3 TIMES - EMERGENCY ACTIVATED');
  
  // Send notification to prove it worked
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🆘 EMERGENCY ACTIVATED',
      body: 'Failed to respond 3 times. Emergency contacts would be notified.',
      sound: 'default',
    },
    trigger: null,
  });
  
  // Clean up
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.TIMELINE,
    STORAGE_KEYS.IS_ACTIVE,
    STORAGE_KEYS.START_TIME,
    STORAGE_KEYS.CURRENT_STRIKE,
    STORAGE_KEYS.NOTIFICATION_IDS
  ]);
  
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

const handleMissedReport = async (strike: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, strike.toString());
    console.log(`📈 Strike count updated to: ${strike}`);
  } catch (error) {
    console.error('Error handling missed report:', error);
  }
};

const PreCalculatedTimeline: React.FC = () => {
  const [sessionMinutes, setSessionMinutes] = useState<string>('30');
  const [reductionMinutes, setReductionMinutes] = useState<string>('10');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentStrike, setCurrentStrike] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    initializeSystem();
    loadAndReconcileState();
  }, []);

  const initializeSystem = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notifications are required for this safety system');
        return;
      }

      // Register emergency background task
      const isRegistered = await TaskManager.isTaskRegisteredAsync(EMERGENCY_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(EMERGENCY_TASK, {
          minimumInterval: 1,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('✅ Emergency background task registered');
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

      if (timelineStr && isActiveStr === 'true' && startTimeStr) {
        const timeline: TimelineEvent[] = JSON.parse(timelineStr);
        const now = Date.now();
        
        const finalEvent = timeline[timeline.length - 1];
        if (finalEvent && now > finalEvent.time && finalEvent.type === 'missed_report' && finalEvent.strike === 3) {
          console.log('🚨 Emergency period has passed. Cleaning up.');
          await stopTracking();
          return;
        }

        let currentStrikeCount = 0;
        for (const event of timeline) {
          if (event.type === 'missed_report' && now > event.time) {
            currentStrikeCount = event.strike;
          }
        }
        
        console.log(`🔄 Resumed session. Re-calculated strikes: ${currentStrikeCount}`);

        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, currentStrikeCount.toString());

        setTimeline(timeline);
        setIsActive(true);
        setStartTime(parseInt(startTimeStr));
        setCurrentStrike(currentStrikeCount);
        
        console.log('📱 Resumed existing tracking session and reconciled state.');
      } else {
        // If there's no active session, ensure state is clean.
        setIsActive(false);
        setTimeline([]);
        setCurrentStrike(0);
        setStartTime(null);
      }
    } catch (error) {
      console.error('Error loading and reconciling state:', error);
      await stopTracking(); // Reset state on error
    }
  };

  const calculateFullTimeline = (
    startTime: number, 
    sessionDurationMs: number, 
    reportDurationMs: number, 
    reductionMs: number
  ): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];
    let currentTime = startTime;
    let currentSessionDuration = sessionDurationMs;
    
    console.log('📊 Calculating full timeline:');
    console.log(`   Start time: ${new Date(startTime).toLocaleTimeString()}`);
    console.log(`   Session duration: ${sessionDurationMs / 1000 / 60} minutes`);
    console.log(`   Report duration: ${reportDurationMs / 1000 / 60} minutes`);
    console.log(`   Reduction per strike: ${reductionMs / 1000 / 60} minutes`);

    for (let strike = 0; strike < 3; strike++) {
      // Session end time
      const sessionEndTime = currentTime + currentSessionDuration;
      timeline.push({
        time: sessionEndTime,
        type: 'session_end',
        strike: strike,
        description: `Session ${strike + 1} ends - Report safety required`
      });

      // Report deadline time (3 minutes after session end)
      const reportDeadlineTime = sessionEndTime + reportDurationMs;
      timeline.push({
        time: reportDeadlineTime,
        type: 'missed_report',
        strike: strike + 1,
        description: `Missed report ${strike + 1} - ${strike < 2 ? 'Start next session' : 'EMERGENCY!'}`
      });

      // Next session starts immediately after report deadline
      currentTime = reportDeadlineTime;
      // Reduce session duration for next session
      currentSessionDuration = Math.max(currentSessionDuration - reductionMs, 10 * 60 * 1000); // Minimum 10 minutes
      
      console.log(`   Strike ${strike + 1}: Session ends at ${new Date(sessionEndTime).toLocaleTimeString()}, Report deadline at ${new Date(reportDeadlineTime).toLocaleTimeString()}`);
    }

    return timeline;
  };

  const scheduleAllNotifications = async (timeline: TimelineEvent[]): Promise<string[]> => {
    const notificationIds: string[] = [];
    
    for (const event of timeline) {
      const delay = Math.max(1, Math.floor((event.time - Date.now()) / 1000)); // At least 1 second delay
      
      let title: string, body: string;
      if (event.type === 'session_end') {
        title = `⏰ Session ${event.strike + 1} Complete`;
        body = 'Please report your safety within 3 minutes';
      } else if (event.type === 'missed_report') {
        if (event.strike < 3) {
          title = `❌ Missed Report ${event.strike}`;
          body = `Starting next session (${event.strike}/3 strikes)`;
        } else {
          title = '🆘 EMERGENCY ACTIVATION';
          body = 'Failed to respond 3 times - Emergency contacts being notified';
        }
      } else {
        title = 'Safety Alert';
        body = 'Please check your safety status';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: event.type,
            strike: event.strike,
            eventTime: event.time
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delay,
          channelId: 'tracking',
        },
        identifier: `timeline_${event.type}_${event.strike}_${event.time}`
      });

      notificationIds.push(notificationId);
      console.log(`📅 Scheduled: ${title} for ${new Date(event.time).toLocaleTimeString()}`);
    }

    // Schedule emergency background task for the final event
    const finalEvent = timeline[timeline.length - 1];
    if (finalEvent && finalEvent.type === 'missed_report' && finalEvent.strike === 3) {
      const emergencyDelay = Math.max(1, Math.floor((finalEvent.time - Date.now()) / 1000));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔄 Emergency Task Scheduled',
          body: 'Background emergency task will execute now',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: emergencyDelay + 5, // 5 seconds after final notification
          channelId: 'tracking',
        },
        identifier: `emergency_task_${finalEvent.time}`
      });
      console.log('🆘 Emergency background task scheduled');
    }

    return notificationIds;
  };

  const startTracking = async () => {
    try {
      const sessionMs = parseInt(sessionMinutes) * 60 * 1000;
      const reductionMs = parseInt(reductionMinutes) * 60 * 1000;
      const reportMs = 3 * 60 * 1000; // Fixed 3 minutes
      const startTime = Date.now();

      if (sessionMs < 10 * 60 * 1000) {
        Alert.alert('Invalid Input', 'Session must be at least 10 minutes');
        return;
      }

      console.log('🚀 Starting tracking with pre-calculated timeline...');
      
      // Calculate entire timeline assuming user never responds
      const calculatedTimeline = calculateFullTimeline(startTime, sessionMs, reportMs, reductionMs);
      
      // Schedule all notifications
      const notificationIds = await scheduleAllNotifications(calculatedTimeline);
      
      // Save state
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(calculatedTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, startTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
      
      setTimeline(calculatedTimeline);
      setIsActive(true);
      setStartTime(startTime);
      setCurrentStrike(0);
      
      console.log('✅ Tracking started with full timeline pre-calculated');
      console.log('📱 Close the app to test background execution');

    } catch (error) {
      console.error('❌ Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking: ' + error.message);
    }
  };

  const reportSafety = async () => {
    try {
      console.log('✅ USER REPORTED SAFETY!');
      
      // Cancel all future notifications
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log('🧹 Cancelled all future notifications');
      }

      // Recalculate timeline from now
      const sessionMs = parseInt(sessionMinutes) * 60 * 1000;
      const reductionMs = parseInt(reductionMinutes) * 60 * 1000;
      const reportMs = 3 * 60 * 1000;
      const newStartTime = Date.now();

      console.log('🔄 Recalculating timeline from current time...');
      const newTimeline = calculateFullTimeline(newStartTime, sessionMs, reportMs, reductionMs);
      
      // Schedule new notifications
      const newNotificationIds = await scheduleAllNotifications(newTimeline);
      
      // Update state
      await AsyncStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(newTimeline));
      await AsyncStorage.setItem(STORAGE_KEYS.START_TIME, newStartTime.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRIKE, '0');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(newNotificationIds));
      
      setTimeline(newTimeline);
      setStartTime(newStartTime);
      setCurrentStrike(0);
      
      // Send notification to prove it worked
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Safety Reported',
          body: 'Timeline has been recalculated with full session duration.',
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
    } catch (error) {
      console.error('❌ Error reporting safety:', error);
      Alert.alert('Error', 'Failed to report safety: ' + error.message);
    }
  };

  const stopTracking = async () => {
    try {
      // Cancel all notifications
      const notificationIdsStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (notificationIdsStr) {
        const notificationIds = JSON.parse(notificationIdsStr);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
      }

      // Clear storage
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      
      setIsActive(false);
      setTimeline([]);
      setCurrentStrike(0);
      setStartTime(null);
      
      console.log('🛑 Tracking stopped and timeline cleared');
      
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
    }
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTimelineStatus = (event: TimelineEvent): string => {
    const now = Date.now();
    if (now > event.time) return '✅ Completed';
    if (now > event.time - 60000) return '⏰ Due Soon';
    return '⏳ Scheduled';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Pre-calculated Timeline Safety System</Text>
      
      {!isActive && (
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Session Duration (minutes):</Text>
            <TextInput
              style={styles.input}
              value={sessionMinutes}
              onChangeText={setSessionMinutes}
              keyboardType="numeric"
              placeholder="30"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.label}>Reduction per Strike (minutes):</Text>
            <TextInput
              style={styles.input}
              value={reductionMinutes}
              onChangeText={setReductionMinutes}
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
          
          <Text style={styles.fixedInfo}>Report Time: 3 minutes (fixed)</Text>
          <Text style={styles.fixedInfo}>Strikes until Emergency: 3 (fixed)</Text>
          
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.buttonText}>🚀 Start Tracking</Text>
          </TouchableOpacity>
        </View>
      )}

      {isActive && (
        <View style={styles.activeContainer}>
          <Text style={styles.activeTitle}>📊 Active Timeline</Text>
          <Text style={styles.activeInfo}>Started: {formatTime(startTime)}</Text>
          <Text style={styles.activeInfo}>Current Strikes: {currentStrike}/3</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.safetyButton} onPress={reportSafety}>
              <Text style={styles.buttonText}>✅ Report Safety</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
              <Text style={styles.buttonText}>🛑 Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {timeline.length > 0 && (
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>📅 Scheduled Timeline</Text>
          {timeline.map((event, index) => (
            <View key={index} style={[
              styles.timelineItem,
              event.type === 'missed_report' && event.strike === 3 ? styles.emergencyItem : null
            ]}>
              <Text style={styles.timelineTime}>{formatTime(event.time)}</Text>
              <Text style={styles.timelineDescription}>{event.description}</Text>
              <Text style={styles.timelineStatus}>{getTimelineStatus(event)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📋 How This Works:</Text>
        <Text style={styles.instruction}>• Calculates entire timeline when tracking starts</Text>
        <Text style={styles.instruction}>• Schedules ALL notifications assuming no user response</Text>
        <Text style={styles.instruction}>• If user reports safety, cancels old notifications and recalculates</Text>
        <Text style={styles.instruction}>• Only requires background execution for final emergency</Text>
        <Text style={styles.instruction}>• Close app completely to test timeline execution!</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  inputRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  fixedInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  activeContainer: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
    textAlign: 'center',
  },
  activeInfo: {
    fontSize: 16,
    color: '#1976D2',
    marginBottom: 5,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  safetyButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  timelineItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  emergencyItem: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF3B30',
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timelineStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
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

export default PreCalculatedTimeline;