import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageSourcePropType, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Theme from '../constants/Theme';

const { width, height } = Dimensions.get('window');

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
}) => {
  const hasText = !!(title || description);

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.topBanner, { height: topBarHeight }]}>
        {topBarContent}
      </View>
      
      <LinearGradient colors={backgroundColor as [string, string, ...string[]]} style={[styles.container, { paddingTop }]}>
        {imageSource && (
          <View style={styles.imageWrapper}>
            <Image
              source={imageSource}
              style={[styles.image, { height: height - topBarHeight }]}
              resizeMode="cover"
            />
          </View>
        )}

        {(hasText || buttonText) && (
          <View style={[styles.contentContainer, { bottom: bottomInset + 65 }]}>
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
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  topBanner: {
    height: TOP_BAR_HEIGHT,
    width: width,
    backgroundColor: '#fcf2ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    width: width,
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
    width: width,
  },
  contentContainer: {
    width: width,
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
});

export default OnboardingPage;