import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Linking, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

interface PoliceStationCardProps {
  name: string;
  walkingTime: string | null;
  address: string;
  onClose: () => void;
  onNavigate: () => void;
  bottomOffset?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const PoliceStationCard: React.FC<PoliceStationCardProps> = ({
  name,
  walkingTime,
  address,
  onClose,
  onNavigate,
  bottomOffset = 20
}) => {
  const containerStyle = {
    ...styles.container,
    bottom: bottomOffset,
  };
  return (
    <View style={containerStyle}>
      <BlurView intensity={80} tint="light" style={styles.card}>
        <View style={styles.header}>
          <MaterialIcons name="local-police" size={24} color="#1976D2" />
          <Text style={styles.title}>{name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {walkingTime && (
          <View style={styles.walkingTimeContainer}>
            <MaterialIcons name="directions-walk" size={20} color="#666" />
            <Text style={styles.walkingTime}>安全路線預估時間: {walkingTime}</Text>
          </View>
        )}

        <Text style={styles.address}>{address}</Text>

        <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
          <MaterialIcons name="directions" size={20} color="#FFF" />
          <Text style={styles.navigateText}>前往地點</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      zIndex: 1000,
      elevation: 6, 
    },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  walkingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walkingTime: {
    fontSize: 15,
    color: '#666',
    marginLeft: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  navigateButton: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  navigateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default PoliceStationCard;