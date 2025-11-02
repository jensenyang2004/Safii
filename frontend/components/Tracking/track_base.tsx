// components/Tracking/track_base.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, Easing } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
<<<<<<< HEAD
import * as Theme from '../../constants/Theme';
=======
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642

type TrackModeCardProps = {
  id: string;
  name: string;
  contacts: { id: string; url: string; name: string }[];
  checkIntervalMinutes: number;
};

const avatarImg = require('../../assets/images/person.png');

export default function TrackModeCard({ id, name, contacts, checkIntervalMinutes }: TrackModeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const { startTrackingMode } = useTracking();

  const handlePress = () => {
    setExpanded(!expanded);
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 120], // collapsed height, expanded height
  });

  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  // Default reduction minutes for now, ideally this comes from tracking mode config
  const defaultReductionMinutes = 3;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => startTrackingMode(id, checkIntervalMinutes, defaultReductionMinutes)} activeOpacity={0.8}>
        <Text style={styles.headerText}>開啟{name}模式</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.bottom, { height: expandedHeight }]}>
        <TouchableOpacity style={styles.bottomContent} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.notifyText}>緊急時將通知</Text>
          <View style={styles.avatarsRow}>
            {visibleContacts.map((contact) => (
              <Image key={contact.id} source={avatarImg} style={styles.avatar} />
            ))}
            {moreCount > 0 && (
              <View style={styles.moreCircle}>
                <Text style={styles.moreText}>{`+${moreCount}`}</Text>
              </View>
            )}
            <Text>{'>'}</Text>
          </View>
          {expanded && (
            <View style={styles.expandedContent}>
              {contacts.map((contact) => (
                <Text key={contact.id} style={styles.expandedText}>
                  {contact.name}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
<<<<<<< HEAD
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radii.xl,
    padding: 0,
    margin: 10,
    width: '100%',
    shadowColor: Theme.colors.black,
=======
    backgroundColor: '#F8F1EC',
    borderRadius: 20,
    padding: 0,
    margin: 10,
    width: '100%',
    shadowColor: '#000',
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
<<<<<<< HEAD
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.lg,
    margin: Theme.spacing.sm,
    marginBottom: 0,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
=======
    backgroundColor: '#F18C8E',
    borderRadius: 16,
    margin: 8,
    marginBottom: 0,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F18C8E',
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  closeMode: {
<<<<<<< HEAD
    backgroundColor: Theme.colors.primary,
  },
  startMode: {
    backgroundColor: Theme.colors.secondary,
  },
  headerText: {
    color: Theme.colors.white,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.h3,
    letterSpacing: 2,
  },
  bottom: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radii.lg,
    margin: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
=======
    backgroundColor: '#F18C8E',
  },
  startMode: {
    backgroundColor: '#BFD3C1',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 2,
  },
  bottom: {
    backgroundColor: '#F8F1EC',
    borderRadius: 16,
    margin: 8,
    marginTop: 12,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bottomContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  notifyText: {
<<<<<<< HEAD
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizes.caption,
    marginBottom: Theme.spacing.xs,
=======
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
<<<<<<< HEAD
    borderRadius: Theme.radii.lg,
    marginHorizontal: -6,
    borderWidth: 2,
    borderColor: Theme.colors.white,
    backgroundColor: Theme.colors.gray75,
  },
  moreCircle: {
    backgroundColor: Theme.colors.gray150,
    borderRadius: Theme.radii.md,
=======
    borderRadius: 16,
    marginHorizontal: -6,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  moreCircle: {
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
<<<<<<< HEAD
    marginLeft: Theme.spacing.xs,
  },
  moreText: {
    color: Theme.colors.textPrimary,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.caption,
=======
    marginLeft: 4,
  },
  moreText: {
    color: '#444',
    fontWeight: 'bold',
    fontSize: 14,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
  },
  expandedContent: {
    marginTop: 10,
    alignItems: 'center',
  },
  expandedText: {
<<<<<<< HEAD
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizes.caption,
=======
    color: '#888',
    fontSize: 14,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
  },
});