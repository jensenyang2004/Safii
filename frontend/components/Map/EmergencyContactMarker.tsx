import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Theme from '@/constants/Theme';
interface EmergencyContactMarkerProps {
  trackedUserName: string;
  avatarUrl?: string; // Assuming avatarUrl might be available
}

export default function EmergencyContactMarker({ trackedUserName, avatarUrl }: EmergencyContactMarkerProps) {
  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{trackedUserName.charAt(0)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "white",
    borderRadius: 20,
    padding: 2,
    borderColor: 'red',
    // borderWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'lightgray',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'black',
  },
  name: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 2,
  },
});