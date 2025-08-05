import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { callUser } from '@/app/features/videoCall/callManager';

interface CallButtonProps {
  userId: string;
  userName: string;
  size?: 'small' | 'medium' | 'large';
}

export default function CallButton({ userId, userName, size = 'medium' }: CallButtonProps) {
  const buttonSize = size === 'small' ? 36 : size === 'medium' ? 48 : 60;
  const iconSize = size === 'small' ? 18 : size === 'medium' ? 24 : 30;
  
  return (
    <TouchableOpacity 
      style={[
        styles.callButton, 
        { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }
      ]}
      onPress={() => callUser(userId, userName)}
    >
      <Ionicons name="videocam" size={iconSize} color="white" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  callButton: {
    backgroundColor: '#4CAF50', // Green color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});