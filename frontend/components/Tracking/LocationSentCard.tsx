import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';

interface LocationSentCardProps {
  onDismiss: () => void;
}

const LocationSentCard: React.FC<LocationSentCardProps> = ({ onDismiss }) => {
  return (
    <BlurView intensity={80} tint="dark" style={styles.overlayContainer} pointerEvents="auto">
      <View style={styles.card}>
        {/* Illustration */}
        {/* <Image
          source={require('@/assets/images/alert_illustration')} // replace with your image
          style={styles.image}
        /> */}

        {/* Title */}
        <Text style={styles.title}>已發送自動通報</Text>

        {/* Details */}
        <Text style={styles.detail}>活動地點：台北市大安區和平東路二段</Text>
        <Text style={styles.detail}>活動：平日下午班</Text>
        <Text style={styles.detail}>備註：走路從公司到家裡</Text>

        {/* Cancel button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => { console.log('關閉 button pressed'); onDismiss(); }}>
          <Text style={styles.cancelText}>關閉</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // Ensure it covers other elements
  },
  card: {
    backgroundColor: '#E74C3C', // red background
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 20, // Add horizontal margin to prevent card from touching edges
  },
  image: {
    width: 80,
    height: 80,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#E74C3C',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default LocationSentCard;