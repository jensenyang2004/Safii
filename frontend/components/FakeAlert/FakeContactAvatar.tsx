import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { FakeContact } from '@/types/fakeAlert';
import { DEFAULT_AVATAR_COLORS } from '@/constants/fakeAlert';

interface FakeContactAvatarProps {
  contact: FakeContact | null;
  size?: number;
}

// Shared avatar renderer for the call screen, chat screen, and manage
// screen — one place to change once real avatar illustrations exist.
export default function FakeContactAvatar({ contact, size = 56 }: FakeContactAvatarProps) {
  const displayName = contact?.name || '?';
  const initial = displayName.trim().slice(0, 1) || '?';
  const backgroundColor =
    (contact?.avatarKey && DEFAULT_AVATAR_COLORS[contact.avatarKey]) || '#8e8e93';

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (contact?.avatarUri) {
    return (
      <View style={[styles.circle, circleStyle, styles.overflowHidden]}>
        <Image source={{ uri: contact.avatarUri }} style={styles.image} />
      </View>
    );
  }

  return (
    <View style={[styles.circle, circleStyle, { backgroundColor }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowHidden: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
});
