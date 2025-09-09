import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTracking } from '@/context/TrackProvider';

const ReportSafetyCard = () => {
  const { reportSafety, reportDeadline } = useTracking();
  const [remainingTime, setRemainingTime] = React.useState(0);

  React.useEffect(() => {
    if (reportDeadline) {
      const updateRemaining = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((reportDeadline - now) / 1000));
        setRemainingTime(timeLeft);
      };

      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingTime(0);
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
        <Text style={styles.subText}>請在 {formatTime(remainingTime)} 內回報安全</Text>
      </View>
      <TouchableOpacity style={styles.reportButton} onPress={reportSafety}>
        <Text style={styles.reportButtonText}>回報安全</Text>
      </TouchableOpacity>
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
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        padding: 20,
        alignItems: 'center',
      },
      header: {
        alignItems: 'center',
        marginBottom: 20,
      },
      headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
      },
      subText: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
      },
      reportButton: {
        backgroundColor: '#4CAF50', // A green color
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
      },
      reportButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
      },
});

export default ReportSafetyCard;