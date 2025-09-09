import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';

interface TrackingMode {
  id: string;
  name: string;
  checkIntervalMinutes: number;
  contacts: any[];
  unresponsiveThreshold: number;
}

const Card_ongoing = ({ trackingMode }: { trackingMode: TrackingMode }) => {
  const { stopTrackingMode, currentStrike, nextCheckInTime } = useTracking();

  const [remainingTime, setRemainingTime] = React.useState(0);

  React.useEffect(() => {
    if (nextCheckInTime) {
      const updateRemaining = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((nextCheckInTime - now) / 1000));
        setRemainingTime(timeLeft);
      };

      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingTime(0);
    }
  }, [nextCheckInTime]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = trackingMode.checkIntervalMinutes * 60;
  const progressPercentage = totalDuration > 0 ? (remainingTime / totalDuration) * 100 : 0;

  const StrikeDots = () => (
    <View style={styles.strikeContainer}>
      {[...Array(trackingMode?.unresponsiveThreshold || 3)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.strikeDot,
            { backgroundColor: i < currentStrike ? '#FF6347' : '#E0E0E0' },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.statusText}>正在進行 {trackingMode?.name ?? '模式'}...</Text>
        <StrikeDots />
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timeText}>{formatTime(remainingTime)}</Text>
        <Text style={styles.contactText}>
          監護人數: {trackingMode?.contacts?.length ?? 0}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={stopTrackingMode}>
          <Ionicons name="stop" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#F8F1EC',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    padding: 20,
    margin: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    color: '#15223F',
    fontSize: 14,
    fontWeight: 'bold',
  },
  strikeContainer: {
    flexDirection: 'row',
  },
  strikeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#15223F',
  },
  contactText: {
    color: '#15223F',
    fontSize: 14,
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  progressBarContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#15223F',
    borderRadius: 18,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#15223F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Card_ongoing;
