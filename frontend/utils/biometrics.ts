import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

export const authenticateWithBiometrics = async (reason: string): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // No biometrics available — fall back to confirmation alert
    return new Promise(resolve => {
      Alert.alert('身份確認', reason, [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '確認', onPress: () => resolve(true) },
      ]);
    });
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: '取消',
    fallbackLabel: '使用密碼',
  });

  return result.success;
};
