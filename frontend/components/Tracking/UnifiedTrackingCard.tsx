import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';
import { useFriendSharing } from '@/hooks/useFriendSharing';
import { BlurView } from 'expo-blur';
import { uiParameters } from '../../constants/Theme';
import * as LocalAuthentication from 'expo-local-authentication';
import { TrackingMode } from '@/types/tracking';

const UnifiedTrackingCard = ({ trackingMode }: { trackingMode: TrackingMode }) => {
  const { 
    stopTrackingMode, 
    currentStrike, 
    nextCheckInTime, 
    isReportDue, 
    reportDeadline, 
    reportSafety 
  } = useTracking();
  const { createSharingSession } = useFriendSharing();

  const [remainingTime, setRemainingTime] = useState(0);

  // Animation for the progress bar width
  const progressAnim = useRef(new Animated.Value(0)).current;

  // --- Timer Logic ---
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();

      if (isReportDue && reportDeadline) {
        const timeLeft = Math.max(0, Math.ceil((reportDeadline - now) / 1000));
        setRemainingTime(timeLeft);
      } else if (nextCheckInTime) {
        const timeLeft = Math.max(0, Math.ceil((nextCheckInTime - now) / 1000));
        setRemainingTime(timeLeft);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isReportDue, reportDeadline, nextCheckInTime]);


  // --- Progress Bar Animation ---
  useEffect(() => {
    let percentage = 0;
    
    if (isReportDue) {
      percentage = 100;
    } else {
      const maxSeconds = trackingMode.checkIntervalMinutes * 60; 
      const elapsed = Math.max(0, maxSeconds - remainingTime);
      percentage = (elapsed / maxSeconds) * 100;
    }

    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [remainingTime, isReportDue, trackingMode.checkIntervalMinutes]);


  // --- Handlers ---

  const handleShareImmediate = () => {
    const emergencyContactIds = trackingMode.emergencyContactIds || [];
    if (emergencyContactIds.length > 0) {
      createSharingSession(emergencyContactIds);
    } else {
      Alert.alert("No Contacts", "This tracking mode has no emergency contacts to share with.");
    }
  };

  const handleReportPress = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (hasHardware) {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify to Report Safety',
          fallbackLabel: 'Enter Password',
        });
        if (result.success) {
          reportSafety();
        } else {
          Alert.alert('Authentication failed', 'Please try again');
        }
      } else {
        reportSafety(); 
      }
    } else {
        reportSafety();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render Helpers ---

  const StrikeDots = () => (
    <View style={styles.strikeDotsContainer}>
      {[...Array(trackingMode?.unresponsiveThreshold || 3)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.strikeDot,
            { backgroundColor: i < currentStrike ? uiParameters.countingDot.active : uiParameters.countingDot.background },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.shadowContainer}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background }]}>
          
          {/* LEFT: Info */}
          <View style={styles.leftColumn}>
            <Text style={[styles.title, { color: uiParameters.mainComponent.text }]} numberOfLines={1}>
              {isReportDue ? 'Report Needed!' : `${trackingMode?.name}模式`}
            </Text>
            <StrikeDots />
          </View>

          {/* MIDDLE: Controls */}
          <View style={styles.miniControls}>
             {/* Location Button */}
             <TouchableOpacity 
                onPress={handleShareImmediate}
                style={[styles.miniButton, styles.buttonShadow]}
              >
                <Ionicons name="location-sharp" size={18} color={uiParameters.buttons.locationShare.default.icon} />
              </TouchableOpacity>

              {/* Stop Button */}
              <TouchableOpacity 
                onPress={() => stopTrackingMode()}
                style={[styles.miniButton, { backgroundColor: '#FFEBEE' }, styles.buttonShadow]}
              >
                <Ionicons name="stop" size={18} color="#D32F2F" />
              </TouchableOpacity>
          </View>

          {/* RIGHT: Unified Action Button */}
          <View style={isReportDue ? styles.buttonShadow : null}>
            <TouchableOpacity 
              style={styles.rightButtonContainer} 
              onPress={handleReportPress}
              activeOpacity={0.8}
            >
              {/* Progress Fill Layer */}
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: isReportDue ? '100%' : progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: '#79CA90'
                  }
                ]} 
              />
              
              {/* Content Layer */}
              <View style={styles.buttonContent}>
                 {isReportDue ? (
                   <Text style={styles.reportNowText}>回報安全</Text>
                 ) : (
                   <Text style={styles.buttonTimerText}>
                     {formatTime(remainingTime)}
                   </Text>
                 )}
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    width: '95%',
    height: 80,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 50,
    marginBottom: 20,
  },
  blurView: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  
  // Left Column
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  strikeDotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  strikeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  miniButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c6c7c9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // Right Button
  rightButtonContainer: {
    width: 110,
    height: 36,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  buttonContent: {
    zIndex: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTimerText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  reportNowText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default UnifiedTrackingCard;
