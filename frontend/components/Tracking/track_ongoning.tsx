import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    <View className="flex-row space-x-1 gap-1">
      {[...Array(trackingMode?.unresponsiveThreshold || 4)].map((_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 10,
            backgroundColor: i < currentStrike ? uiParameters.countingDot.active : uiParameters.countingDot.background,
          }}
        />
      ))}
    </View>
  );

  return (
    <View style={{ // Shadow container
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
        elevation: 5, // for Android
    }}>
      <BlurView
        intensity={90}
        tint="light"
        className="w-full h-full rounded-full overflow-hidden"
      >
        <View style={{ backgroundColor: uiParameters.mainComponent.background }} className="w-full h-full flex-row items-center justify-between py-3 px-8">
          {/* Left Content Block */}
          <View className="flex-col items-start space-y-10 gap-2">
            <Text style={{ color: uiParameters.mainComponent.text }} className="font-bold text-xl">
              正在進行{trackingMode?.name ?? '模式'}...
            </Text>
            <View className="flex-row items-center space-x-2 gap-2">
              {/* Progress Bar */}
              <View style={{ backgroundColor: uiParameters.progressBar.background }} className="w-24 h-2.5 rounded-full">
                <View
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: uiParameters.progressBar.fill,
                  }}
                  className="h-full rounded-full"
                />
              </View>
              {/* Counting Dots */}
              <StrikeDots />
            </View>
          </View>

          {/* Right Action Block */}
          <View className="flex-row items-center space-x-2 gap-4 py-6">
            {/* Location Button */}
            <TouchableOpacity
              style={{ backgroundColor: uiParameters.buttons.locationShare.default.background }}
              className="w-12 h-12 rounded-full items-center justify-center drop-shadow-2xl"
            >
              <Ionicons name="location-sharp" size={24} color={uiParameters.buttons.locationShare.default.icon} />
            </TouchableOpacity>

            {/* Pause Button */}
            <TouchableOpacity
              onPress={stopTrackingMode}
              style={{ backgroundColor: uiParameters.buttons.action.background }}
              className="w-12 h-12 rounded-full items-center justify-center drop-shadow-2xl"
            >
              <Ionicons name="pause" size={24} color={uiParameters.buttons.action.text} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

export default Card_ongoing;

