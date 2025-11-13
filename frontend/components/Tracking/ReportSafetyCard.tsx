import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
import { BlurView } from 'expo-blur';
import { uiParameters } from '../../constants/Theme';
import * as LocalAuthentication from 'expo-local-authentication';

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

  const handleReportSafety = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (hasHardware) {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: '請使用 Face ID 回報安全',
          fallbackLabel: 'Enter Password',
        });
        if (result.success) {
          reportSafety();
        } else {
          Alert.alert('Authentication failed', '請再試一次');
        }
      } else {
        Alert.alert('No biometrics enrolled', '請先在您的裝置上設定 Face ID');
      }
    } else {
        // Fallback for devices without biometrics
        reportSafety();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ // Shadow container from track_ongoning.tsx
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
        <View style={{ backgroundColor: uiParameters.mainComponent.background }} className="w-full h-full flex-col items-center justify-center px-8 space-y-3">
            <TouchableOpacity
              onPress={reportSafety}
              style={{ backgroundColor: uiParameters.buttons.report.background }}
              className="py-4 px-20 rounded-full shadow-sm"
            >
                <Text style={{ color: uiParameters.buttons.report.text }} className="font-bold text-base">
                    請在 {formatTime(remainingTime)} 內回報安全
                </Text>
            </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

export default ReportSafetyCard;