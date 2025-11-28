import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Step } from '@/types';
import { BlurView } from 'expo-blur';

interface Props {
  currentStep: Step | null;
  remainingDistance: number;
  eta: number;
}

// Helper to strip HTML tags
const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, '');
};

// Helper to format distance
const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

// Helper to format time
const formatEta = (seconds: number) => {
  if (seconds < 60) {
    return '< 1 min';
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
};

const NavigationInstructionsCard = ({ currentStep, remainingDistance, eta }: Props) => {
  if (!currentStep) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={styles.innerContainer}>
          <View style={styles.topRow}>
            <Text style={styles.instructionText}>{stripHtml(currentStep.html_instructions)}</Text>
            <Text style={styles.distanceText}>{formatDistance(currentStep.distance.value)}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.etaText}>{`${formatEta(eta)} left`}</Text>
            <Text style={styles.remainingDistanceText}>{`${formatDistance(remainingDistance)} total`}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blurView: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  innerContainer: {
    padding: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  instructionText: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  distanceText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  etaText: {
    fontSize: 16,
    color: '#333',
  },
  remainingDistanceText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
});

export default NavigationInstructionsCard;
