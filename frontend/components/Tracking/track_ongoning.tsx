import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';
import { BlurView } from 'expo-blur';
import { uiParameters } from '../../constants/Theme';

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

  const totalDuration = trackingMode.checkIntervalMinutes * 60;
  const progressPercentage = totalDuration > 0 ? ((totalDuration - remainingTime) / totalDuration) * 100 : 0;

  const StrikeDots = () => (
    <View style={styles.strikeDotsContainer}>
      {[...Array(trackingMode?.unresponsiveThreshold || 4)].map((_, i) => (
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
      <BlurView
        intensity={90}
        tint="light"
        style={styles.blurView}
      >
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background }]}>
          {/* Left Content Block */}
          <View style={styles.leftContent}>
            <Text style={[styles.title, { color: uiParameters.mainComponent.text }]}>
              正在進行{trackingMode?.name ?? '模式'}...
            </Text>
            <View style={styles.progressContainer}>
              {/* Progress Bar */}
              <View style={[styles.progressBar, { backgroundColor: uiParameters.progressBar.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: uiParameters.progressBar.fill,
                    },
                  ]}
                />
              </View>
              {/* Counting Dots */}
              <StrikeDots />
            </View>
          </View>

          {/* Right Action Block */}
          <View style={styles.rightContent}>
            {/* Location Button */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: uiParameters.buttons.locationShare.default.background }]}
            >
              <Ionicons name="location-sharp" size={24} color={uiParameters.buttons.locationShare.default.icon} />
            </TouchableOpacity>

            {/* Pause Button */}
            <TouchableOpacity
              onPress={stopTrackingMode}
              style={[styles.iconButton, { backgroundColor: uiParameters.buttons.action.background }]}
            >
              <Ionicons name="pause" size={24} color={uiParameters.buttons.action.text} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    width: '90%',
    height: 100,
    paddingTop: 10,
    paddingBottom: 10,
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
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  leftContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 96,
    height: 10,
    borderRadius: 9999,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  strikeDotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  strikeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Card_ongoing;

