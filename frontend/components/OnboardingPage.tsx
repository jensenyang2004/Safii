import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image, ImageSourcePropType, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import * as Theme from '../constants/Theme';

const TOP_BAR_HEIGHT = 20;

interface OnboardingPageProps {
  title?: string;
  description?: string;
  onPress?: () => void;
  buttonText?: string;
  backgroundColor: string[];
  disabled?: boolean;
  imageSource?: ImageSourcePropType;
  paddingTop?: number;
  topBarHeight?: number;
  topBarContent?: React.ReactNode;
  bottomInset?: number;
  privacyPolicyUrl?: string;
  privacyAccepted?: boolean;
  onPrivacyCheck?: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  title,
  description,
  onPress,
  buttonText,
  backgroundColor,
  disabled,
  imageSource,
  paddingTop = 0,
  topBarHeight = TOP_BAR_HEIGHT,
  topBarContent,
  bottomInset = 0,
  privacyPolicyUrl,
  privacyAccepted,
  onPrivacyCheck,
}) => {
  const hasText = !!(title || description);

  const { width, height } = useWindowDimensions();

  const naturalImageSize = imageSource ? Image.resolveAssetSource(imageSource) : null;
  const imageRenderHeight = naturalImageSize
    ? width * (naturalImageSize.height / naturalImageSize.width)
    : height;

  return (
    <View style={[styles.outerContainer, { width, height }]}>
      <LinearGradient colors={backgroundColor as [string, string, ...string[]]} style={[styles.container, { paddingTop, width }]}>
        {imageSource && (
          <View style={[styles.imageWrapper, { overflow: 'hidden' }]}>
            <Image
              source={imageSource}
              style={[styles.image, { width, height: imageRenderHeight }]}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={[styles.topBanner, { height: topBarHeight, width }]} pointerEvents="box-none">
          {topBarContent}
        </View>

        {(hasText || buttonText) && (
          <View style={[styles.contentContainer, { bottom: bottomInset + 65, width }]}>
            {title && <Text style={styles.title}>{title}</Text>}
            {description && <Text style={styles.description}>{description}</Text>}
            
            {buttonText && (
              <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <BlurView intensity={28} tint="dark" style={styles.buttonBlur}>
                  <Text style={[styles.buttonText, disabled && styles.disabledButtonText]}>
                    {buttonText}
                  </Text>
                </BlurView>
              </Pressable>
            )}
            {privacyPolicyUrl && (
              <View style={styles.privacyRow}>
                <TouchableOpacity onPress={onPrivacyCheck} activeOpacity={0.7} style={styles.checkboxHitbox}>
                  <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                    {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(privacyPolicyUrl)} activeOpacity={0.7}>
                  <Text style={styles.privacyText}>已閱讀我們的隱私政策</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonBlur: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 30,
    overflow: 'hidden',
  },
  image: {
  },
  contentContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  disabledButtonText: {
    color: 'rgba(255,255,255,0.4)',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  checkboxHitbox: {
    padding: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  checkmark: {
    fontSize: 13,
    color: '#F18C8E',
    fontWeight: '700',
    lineHeight: 15,
  },
  privacyText: {
    fontSize: 14,
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
});

export default OnboardingPage;