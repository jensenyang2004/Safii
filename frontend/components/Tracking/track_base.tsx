// components/Tracking/track_base.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
import * as Theme from '../../constants/Theme';

type TrackModeCardProps = {
  id: string;
  name: string;
  contacts: { id: string; url: any; name: string }[];
  checkIntervalMinutes: number;
};

export default function TrackModeCard({ id, name, contacts, checkIntervalMinutes }: TrackModeCardProps) {
  const { startTrackingMode } = useTracking();

  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  // Default reduction minutes for now, ideally this comes from tracking mode config
  const defaultReductionMinutes = 3;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => startTrackingMode(id, checkIntervalMinutes, defaultReductionMinutes)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>開啟{name}模式</Text>
        {/* <View style={styles.avatarsRow}>
          {visibleContacts.map((contact, index) => (
            <Image key={contact.id} source={contact.url} style={[styles.avatar, { zIndex: index }]} />
          ))}
          {moreCount > 0 && (
            <View style={[styles.moreCircle, { zIndex: visibleContacts.length }]}>
              <Text style={styles.moreText}>{`+${moreCount}`}</Text>
            </View>
          )}
        </View> */}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 10,
    padding: 10,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radii.xl,
    marginVertical: Theme.spacing.sm,
  },
  button: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.full,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    height: 64,
    width: '100%',
    gap: 5,
  },
  buttonText: {
    color: Theme.colors.white,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.h3,
    letterSpacing: 2,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: Theme.spacing.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Theme.radii.full,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.gray75,
  },
  moreCircle: {
    backgroundColor: Theme.colors.gray150,
    borderRadius: Theme.radii.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  moreText: {
    color: Theme.colors.textPrimary,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.caption,
  },
});