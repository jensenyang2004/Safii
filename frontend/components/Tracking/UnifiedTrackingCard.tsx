import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTracking } from '@/context/TrackProvider';
import * as Theme from '../../constants/Theme';
import { uiParameters } from '../../constants/Theme';

type TrackingMode = {
  id: string;
  name: string;
  checkIntervalMinutes: number;
  [key: string]: any;
};

type Props = {
  trackingMode: TrackingMode;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function UnifiedTrackingCard({ trackingMode }: Props) {
  const { isReportDue, reportDeadline, nextCheckInTime, reportSafety, stopTrackingMode } = useTracking();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const target = isReportDue ? reportDeadline : nextCheckInTime;
    if (!target) {
      setCountdown('');
      return;
    }

    const tick = () => setCountdown(formatCountdown(target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isReportDue, reportDeadline, nextCheckInTime]);

  return (
    <View style={styles.shadowContainer}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background }]}>

          <View style={styles.leftSection}>
            <Text style={styles.modeName} numberOfLines={1}>{trackingMode.name}模式</Text>
            {countdown ? (
              <Text style={[styles.countdownLabel, isReportDue && styles.countdownLabelUrgent]}>
                {isReportDue ? `回報截止 ${countdown}` : `下次回報 ${countdown}`}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightSection}>
            {isReportDue ? (
              <TouchableOpacity
                style={[styles.button, styles.reportButton]}
                onPress={reportSafety}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>回報安全</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={() => stopTrackingMode()}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>停止</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: '90%',
    height: 100,
    paddingVertical: 10,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  blurView: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  leftSection: {
    flex: 1,
    gap: 4,
  },
  modeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  countdownLabel: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  countdownLabelUrgent: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  rightSection: {
    flexShrink: 0,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    backgroundColor: '#E74C3C',
  },
  stopButton: {
    backgroundColor: uiParameters.buttons.action.background,
  },
  buttonText: {
    color: Theme.tracking_colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
