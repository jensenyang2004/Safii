import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarMarkerProps {
  userName: string;
  avatarUrl?: string;
  outlineColor?: string;
}

export default function AvatarMarker({ userName, avatarUrl, outlineColor = 'red' }: AvatarMarkerProps) {
  return (
    <View style={[styles.container, { borderColor: outlineColor }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{userName ? userName.charAt(0) : '?'}</Text>
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
    borderRadius: 22, // Slightly larger to give a nice padding feel
    padding: 3,
    borderWidth: 3, // Enabled the border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20, // Make it a perfect circle
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'lightgray',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'black',
    fontSize: 18,
  },
});
