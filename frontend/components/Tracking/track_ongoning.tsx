import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';

const CARD_WIDTH = 320;

interface TrackingMode {
  id: string;
  name: string;
  checkIntervalMinutes: number;
  contacts: any[];
}

const Card_ongoing = ({ trackingMode }: { trackingMode: TrackingMode }) => {
  const { remainingTime, stopTrackingMode } = useTracking();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = trackingMode ? trackingMode.checkIntervalMinutes * 60 : 0;
  const progressPercentage = totalDuration > 0 ? (remainingTime / totalDuration) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.adContainer}>
        {/* Ad content goes here */}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>正在進行 {trackingMode?.name ?? '模式'}...</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        <Text style={styles.timeText}>{formatTime(remainingTime)}</Text>
        <TouchableOpacity style={styles.iconBox} onPress={stopTrackingMode}>
          <Ionicons name="stop-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.contactRow}>
        <Text style={styles.contactText}>
          監護人數: {trackingMode?.contacts?.length ?? 0}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    padding: 0,
    overflow: 'hidden',
  },
  adContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#e6eaf3',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f7f7f7',
  },
  statusContainer: {
    flex: 1,
    marginRight: 10,
  },
  statusText: {
    color: '#5a6b7b',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2a3e5c',
    borderRadius: 3,
  },
  timeText: {
    fontSize: 16,
    color: '#5a6b7b',
    marginRight: 12,
    fontWeight: '600',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a3e5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    alignItems: 'center',
    paddingBottom: 12,
    backgroundColor: '#f7f7f7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  contactText: {
    color: '#5a6b7b',
    fontSize: 13,
  },
});

export default Card_ongoing;
