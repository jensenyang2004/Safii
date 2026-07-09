// frontend/app/(onboarding)/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import PagerView from 'react-native-pager-view';
import OnboardingPage from '../../components/OnboardingPage';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { usePermissions } from '../../hooks/usePermissions';
import { useBiometrics } from '../../hooks/useBiometrics';
import { useAuth } from '@/context/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { user, completeOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const {
    notificationStatus,
    checkPermissions
  } = usePermissions();

  const {
    isBiometricSupported,
    checkBiometrics,
  } = useBiometrics();

  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    if (activeIndex === 2 && notificationStatus === 'idle') {
      Notifications.requestPermissionsAsync().then(() => checkPermissions());
    }
    if (activeIndex === 4 && isBiometricSupported) {
      checkBiometrics();
    }
  }, [activeIndex]);

  const handleOnboardingComplete = () => {
    // Apple Guideline 4.5.4: 通知與定位在開啟階段必須是選填的，不能硬性阻擋使用者進入
    if (user) {
      completeOnboarding();
      router.replace('/(tabs)/home');
    }
  };

  useEffect(() => {
    console.log('OnboardingScreen mounted');
  }, []);

  const pages = [
    {
      backgroundColor: ['#f8c5b2', '#fec298'],
      imageSource: require('../../assets/images/onboarding_01.png'),
      topBarHeight: 80,
    },
    {
      backgroundColor: ['#fec298', '#fcdf89'],
      imageSource: require('../../assets/images/onboarding_02.png'),
      topBarHeight: 80,
    },
    {
      backgroundColor: ['#fcdf89', '#d4dfe8'],
      imageSource: require('../../assets/images/onboarding_03.png'),
      topBarHeight: 60,
    },
    {
      backgroundColor: ['#d4dfe8', '#dbe1dd'],
      imageSource: require('../../assets/images/onboarding_04.png'),
      topBarHeight: 60,
    },
    ...(isBiometricSupported ? [{
      backgroundColor: ['#dbe1dd', '#f8c5b2'],
      imageSource: require('../../assets/images/onboarding_05.png'),
      topBarHeight: 60,
    }] : []),
    {
      backgroundColor: ['#f8c5b2', '#F18C8E'],
      imageSource: require('../../assets/images/onboarding_06.png'),
      topBarHeight: 80,
      buttonText: '開始使用  →',
      onPress: handleOnboardingComplete,
      disabled: !privacyAccepted,
      privacyPolicyUrl: 'https://hickory-link-0c0.notion.site/SAFII-37a31cefb273806c803bf9bab8cca13b?pvs=73',
      privacyAccepted,
      onPrivacyCheck: () => setPrivacyAccepted(v => !v),
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
            <View key={index} style={[styles.page, { width }]}>
              <OnboardingPage
                {...page}
                bottomInset={insets.bottom}
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
          <BlurView intensity={20} tint="dark" style={styles.arrowBlur}>
            <FontAwesome name="arrow-left" size={20} color="white" />
          </BlurView>
        </TouchableOpacity>
      )}
      {activeIndex < pages.length - 1 && (
        <TouchableOpacity
          style={[styles.arrow, styles.rightArrow]}
          onPress={() => pagerRef.current?.setPage(activeIndex + 1)}
        >
          <BlurView intensity={20} tint="dark" style={styles.arrowBlur}>
            <FontAwesome name="arrow-right" size={20} color="white" />
          </BlurView>
        </TouchableOpacity>
      )}

      <BlurView intensity={20} tint="dark" style={[styles.dotsContainer, { bottom: insets.bottom + 16 }]}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index ? styles.activeDot : {}]}
          />
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: 
  {
    flex: 1,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    zIndex: 1,
  },
  arrowBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
});