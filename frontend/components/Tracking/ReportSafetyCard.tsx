
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';

const CARD_WIDTH = 320;

const ReportSafetyCard = () => {
  const { reportSafety, reportDeadline } = useTracking();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (reportDeadline) {
      const updateRemaining = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((reportDeadline - now) / 1000));
        setRemaining(timeLeft);
      };

      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [reportDeadline]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color="#34C759" />
        <Text style={styles.title}>Are you Safe?</Text>
        <Text style={styles.subtitle}>
          Your session has ended. Please report your safety within the time limit.
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(remaining)}</Text>
        <Text style={styles.timerLabel}>Time Remaining</Text>
      </View>

      <TouchableOpacity style={styles.reportButton} onPress={reportSafety}>
        <Text style={styles.reportButtonText}>✅ Report Safety</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111',
  },
  timerLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  reportButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  reportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportSafetyCard;
