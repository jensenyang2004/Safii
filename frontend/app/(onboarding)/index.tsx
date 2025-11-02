import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Linking } from 'react-native';
import PagerView from 'react-native-pager-view';
import OnboardingPage from '../../components/OnboardingPage';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { FontAwesome } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { usePermissions } from '../../hooks/usePermissions';

const { width } = Dimensions.get('window');
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { 
    notificationStatus, 
    backgroundLocationStatus, 
    foregroundLocationStatus, 
    allPermissionsGranted, 
    checkPermissions 
  } = usePermissions();


  const handlePermissionRequest = async (request: () => Promise<any>) => {
    await request();
    checkPermissions();
    // Automatically advance to the next page
    pagerRef.current?.setPage(activeIndex + 1);
  };

  const requestNotificationPermission = () => handlePermissionRequest(Notifications.requestPermissionsAsync);

  const requestLocationPermission = () => handlePermissionRequest(async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }
  });

  const openAppSettings = () => {
    Linking.openSettings();
  };

  const handleOnboardingComplete = async () => {
    if (allPermissionsGranted) {
      try {
        await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Failed to save onboarding status', error);
        // Handle error appropriately
      }
    } else {
      // Optionally, show an alert to the user that permissions are required.
      alert('Please grant all required permissions to continue.');
    }
  };

  const pages = [
    {
      title: '歡迎來到 Safii',
      description: '您的個人安全守護者，讓您與親友保持聯繫，確保安全。',
      backgroundColor: ['#6200EE', '#BB86FC'],
    },
    {
      title: '即時追蹤與通知',
      description: '在緊急情況下，Safii 會自動通知您的緊急聯絡人，並分享您的即時位置。',
      backgroundColor: ['#03DAC6', '#018786'],
    },
    {
      title: '開啟通知權限',
      description: notificationStatus === 'granted'
        ? '通知權限已開啟！'
        : (notificationStatus === 'denied'
          ? '通知權限是必要的，以便我們在您需要幫助時發送安全警報。請在設定中啟用權限。'
          : '為了發送安全警報與提醒，請允許 Safii 發送通知。'),
      backgroundColor: ['#CF6679', '#B00020'],
      buttonText: notificationStatus === 'granted' ? '✓ 已經開啟' : (notificationStatus === 'denied' ? '開啟設定' : '允許通知'),
      onPress: notificationStatus === 'denied' ? openAppSettings : requestNotificationPermission,
      disabled: notificationStatus === 'granted',
    },
    {
      title: '開啟位置權限',
      description: backgroundLocationStatus === 'granted'
        ? '位置權限已開啟！'
        : (backgroundLocationStatus === 'denied'
          ? '「永遠允許」位置權限是 Safii 的核心功能，確保即使 App 在背景運作也能保護您的安全。'
          : '為了在您需要時分享您的位置，請務必選擇「永遠允許」位置權限。'),
      backgroundColor: ['#1E40AF', '#3B82F6'],
      buttonText: backgroundLocationStatus === 'granted' ? '✓ 已經開啟' : (backgroundLocationStatus === 'denied' ? '開啟設定' : '允許位置權限'),
      onPress: backgroundLocationStatus === 'denied' ? openAppSettings : requestLocationPermission,
      disabled: backgroundLocationStatus === 'granted',
    },
    {
      title: '準備就緒！',
      description: '現在您已了解 Safii 的基本功能，讓我們開始使用吧！',
      backgroundColor: ['#3700B3', '#6200EE'],
      buttonText: '開始使用',
      onPress: handleOnboardingComplete,
      disabled: !allPermissionsGranted,
    },
  ];



  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        ref={pagerRef}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
        scrollEnabled={true}
      >
        {pages.map((page, index) => (
            <View key={index} style={styles.page}>
              <OnboardingPage
                {...page}
              />
            </View>
          )
        )}
      </PagerView>

      {activeIndex > 0 && (
        <TouchableOpacity
          style={[styles.arrow, styles.leftArrow]}
          onPress={() => pagerRef.current?.setPage(activeIndex - 1)}
        >
          <FontAwesome name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
      )}
      {activeIndex < pages.length - 1 && (
        <TouchableOpacity
          style={[styles.arrow, styles.rightArrow]}
          onPress={() => pagerRef.current?.setPage(activeIndex + 1)}
        >
          <FontAwesome name="arrow-right" size={24} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.dotsContainer}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index ? styles.activeDot : {}]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 40,
    width: '100%',
    zIndex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    zIndex: 1,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
});