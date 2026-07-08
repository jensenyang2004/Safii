import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

export const authenticateWithBiometrics = async (reason: string): Promise<boolean> => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      Alert.alert(
        '需要裝置安全設定',
        '請先在 iPhone 設定中開啟面容 ID 或密碼，才能執行此操作。',
        [{ text: '確定' }]
      );
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: '取消',
      disableDeviceFallback: true,
    });
    if (result.success) return true;

    // Face ID failed or unavailable — fall back to passcode
    const fallback = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: '取消',
      disableDeviceFallback: false,
    });
    return fallback.success;
  } catch (e) {
    return false;
  }
};
