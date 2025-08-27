import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';
import OnboardingPage from '../../components/OnboardingPage'; // Adjust path
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store'; // Using SecureStore for sensitive flag
import { AntDesign } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleOnboardingComplete = async () => {
    await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
    router.replace('/(auth)/sign-in'); // Navigate to your sign-in or main app route
  };

  const pages = [
    {
      title: '歡迎來到 Safii',
      description: '您的個人安全守護者，讓您與親友保持聯繫，確保安全。',
      backgroundColor: ['#6200EE', '#BB86FC'], // 紫色漸變
    },
    {
      title: '即時追蹤與通知',
      description: '在緊急情況下，Safii 會自動通知您的緊急聯絡人，並分享您的即時位置。',
      backgroundColor: ['#03DAC6', '#018786'], // 青色漸變
    },
    {
      title: '開啟位置權限',
      description: '為了您的安全，請務必開啟「永遠允許」位置權限，即使應用程式在背景也能追蹤。',
      backgroundColor: ['#CF6679', '#B00020'], // 紅色漸變
    },
    {
      title: '開啟位置權限',
      description: '以隨時掌握與親友維持安全聯繫',
      backgroundColor: ['#1E40AF', '#3B82F6'], // 藍色漸變
    },
    {
      title: '準備就緒！',
      description: '現在您已了解 Safii 的基本功能，讓我們開始使用吧！',
      backgroundColor: ['#3700B3', '#6200EE'], // 深紫色漸變
      buttonText: '開始使用',
      onPress: handleOnboardingComplete,
    },
  ];

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        ref={pagerRef}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
      >
        {pages.map((page, index) => (
          <View key={index} style={styles.page}>
            <OnboardingPage {...page} />
          </View>
        ))}
      </PagerView>

      {activeIndex > 0 && (
        <TouchableOpacity
          style={[styles.arrow, styles.leftArrow]}
          onPress={() => pagerRef.current?.setPage(activeIndex - 1)}
        >
          <AntDesign name="arrowleft" size={24} color="white" />
        </TouchableOpacity>
      )}

      {activeIndex < pages.length - 1 && (
        <TouchableOpacity
          style={[styles.arrow, styles.rightArrow]}
          onPress={() => pagerRef.current?.setPage(activeIndex + 1)}
        >
          <AntDesign name="arrowright" size={24} color="white" />
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
