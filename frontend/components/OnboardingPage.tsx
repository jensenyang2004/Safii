import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface OnboardingPageProps {
  title: string;
  description: string;
  onPress?: () => void;
  buttonText?: string;
  backgroundColor: string[];
  disabled?: boolean; // New disabled prop
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({
  title,
  description,
  onPress,
  buttonText,
  backgroundColor,
  disabled,
}) => {
  return (
    <LinearGradient colors={backgroundColor} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {buttonText && ( // Render button if text is present, not tied to onPress
        <TouchableOpacity
          style={[styles.button, disabled && styles.disabledButton]}
          onPress={onPress}
          disabled={disabled}
        >
          <Text style={[styles.buttonText, disabled && styles.disabledButtonText]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
  disabledButtonText: {
    color: '#696969',
  },
});

export default OnboardingPage;