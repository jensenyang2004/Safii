// components/Tracking/track_base.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, Easing } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
import * as Theme from '../../constants/Theme';

type TrackModeCardProps = {
  id: string;
  name: string;
  contacts: { id: string; url: string; name: string }[];
  checkIntervalMinutes: number;
};

const avatarImg = require('../../assets/avatar-photo/avatar-1.png');

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
              <Image key={contact.id} source={contact.url} style={styles.avatar} />
            ))}
            {moreCount > 0 && (
              <View style={styles.moreCircle}>
                <Text style={styles.moreText}>{`+${moreCount}`}</Text>
              </View>
            )}
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
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radii.xl,
    padding: 0,
    margin: 10,
    width: '100%',
    shadowColor: Theme.colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.lg,
    margin: Theme.spacing.sm,
    marginBottom: 0,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  closeMode: {
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
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizes.caption,
    marginBottom: Theme.spacing.xs,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Theme.radii.lg,
    marginHorizontal: -6,
    borderWidth: 2,
    borderColor: Theme.colors.white,
    backgroundColor: Theme.colors.gray75,
  },
  moreCircle: {
    backgroundColor: Theme.colors.gray150,
    borderRadius: Theme.radii.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.xs,
  },
  moreText: {
    color: Theme.colors.textPrimary,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.caption,
  },
  expandedContent: {
    marginTop: 10,
    alignItems: 'center',
  },
  expandedText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizes.caption,
  },
});