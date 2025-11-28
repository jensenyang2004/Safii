import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Theme from '@/constants/Theme';

interface LocationCardProps {
  name: string;
  address: string;
  walkingTime?: string | null;
  onClose: () => void;
  onNavigate: () => void;
  bottomOffset?: number;
  locationType?: 'police' | 'general';
}

export default function LocationCard({
  name,
  address,
  walkingTime,
  onClose,
  onNavigate,
  bottomOffset = 0,
  locationType = 'general'
}: LocationCardProps) {
  return (
    <View style={[styles.card, { bottom: bottomOffset }]}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {locationType === 'police' && (
                <MaterialIcons name="local-police" size={24} color="#007AFF" style={styles.typeIcon} />
              )}
              <Text style={styles.title}>{name}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color="#666" style={styles.icon} />
              <Text style={styles.address}>{address}</Text>
            </View>

            {walkingTime && (
              <View style={styles.infoRow}>
                <MaterialIcons name="directions-walk" size={20} color="#666" style={styles.icon} />
                <Text style={styles.walkingTime}>步行時間：{walkingTime}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.navigationButton,
              { backgroundColor: locationType === 'police' ? '#15223F' : '#F18C8E' }
            ]}
            onPress={onNavigate}
          >
            <MaterialIcons name="directions" size={20} color="white" style={styles.navigationIcon} />
            <Text style={styles.navigationButtonText}>規劃路線</Text>
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    width: '90%',
    alignSelf: 'center',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  blurView: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  innerContainer: {
    
    backgroundColor: '#ECECEC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  walkingTime: {
    fontSize: 14,
    color: '#666',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    color: '#F18C8E',
    borderRadius: 50,
  },
  navigationIcon: {
    marginRight: 8,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});