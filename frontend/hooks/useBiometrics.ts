import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Linking } from 'react-native';

export const useBiometrics = () => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    setIsBiometricSupported(hasHardware);
    if (hasHardware) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);
    }
  };

  const promptEnrollment = () => {
    Alert.alert(
      '設定 Face ID',
      '您尚未設定 Face ID。請至您的裝置設定中啟用，以使用此功能。',
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
  };

  const authenticate = async (): Promise<boolean> => {
    if (!isBiometricSupported) {
      Alert.alert('錯誤', '您的裝置不支援生物辨識');
      return false;
    }

    if (!isEnrolled) {
      promptEnrollment();
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      Alert.alert('驗證失敗', '生物辨識驗證未成功');
      return false;
    }
  };

  useEffect(() => {
    checkBiometrics();
  }, []);

  return { isBiometricSupported, isEnrolled, checkBiometrics, promptEnrollment, authenticate };
};
