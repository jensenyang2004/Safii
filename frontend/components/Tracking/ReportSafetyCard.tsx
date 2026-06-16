// ReportSafetyCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Linking } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
import { BlurView } from 'expo-blur';
import { uiParameters } from '../../constants/Theme';
import * as LocalAuthentication from 'expo-local-authentication';

const ReportSafetyCard = () => {
  const { reportSafety, reportDeadline } = useTracking();
  const [remainingTime, setRemainingTime] = React.useState(0);

  useEffect(() => {
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

  const isExpiredRef = useRef(false);

  // useEffect(() => {
  //   if (remainingTime === 0) {
  //     isExpiredRef.current = true;
  //     // Dismisses the Face ID/biometric prompt on both iOS (LAContext.invalidate) and Android
  //     LocalAuthentication.cancelAuthenticate();
  //     console.log("倒數結束，已強制關閉生物辨識視窗，進入緊急通報狀態。");
  //   }
  // }, [remainingTime]);

  const handleReportSafety = async () => {
    // if (isExpiredRef.current) return; // already expired, don't open prompt                                                                                                                                                                                                                                    
    // const result = await LocalAuthentication.authenticateAsync({ ... });                                                                                     
                                                                                                                                                             
    // if (isExpiredRef.current) return; // expired WHILE the prompt was open (iOS)                                                                                   
    // if (result.success) {                                                                                                                                    
    //   reportSafety();
    // }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (hasHardware) {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (isEnrolled) {
        if (isExpiredRef.current) return;
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: '請驗證身分以回報安全',
          fallbackLabel: '輸入密碼',
        });

        if (isExpiredRef.current) return;
        if (result.success) {
          reportSafety();
        } else {
          Alert.alert('身分驗證失敗', '請再試一次');
        }
      } else {
        Alert.alert(
          '設定 Face ID 或 指紋',
          '您尚未設定生物辨識。請至您的裝置設定中啟用。',
          [
            {
              text: '取消',
              style: 'cancel',
            },
            {
              text: '前往設定',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
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
    <View style={styles.shadowContainer}>
      <BlurView
        intensity={90}
        tint="light"
        style={styles.blurView}
      >
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background }]}>
          <TouchableOpacity
            onPress={handleReportSafety}
            style={[styles.button, { backgroundColor: uiParameters.buttons.report.background }]}
          >
            <Text style={[styles.buttonText, { color: uiParameters.buttons.report.text }]}>
              請在 {formatTime(remainingTime)} 內回報安全
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ReportSafetyCard;