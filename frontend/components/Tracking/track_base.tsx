// components/Tracking/track_base.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTracking } from '@/context/TrackProvider';
import { BlurView } from 'expo-blur';
import * as Theme from '../../constants/Theme'; // Keep Theme for colors and radii
import { uiParameters } from '../../constants/Theme';

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
  const hasContacts = contacts && contacts.length > 0;

  // Default reduction minutes for now, ideally this comes from tracking mode config
  const defaultReductionMinutes = 3;

  return (
    <View style={styles.shadowContainer}>
      <BlurView
        intensity={90}
        tint="light"
        style={styles.blurView}
      >
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background, justifyContent: hasContacts ? 'space-between' : 'center' }]}>
          <TouchableOpacity
            onPress={() => startTrackingMode(id, checkIntervalMinutes, defaultReductionMinutes)}
            activeOpacity={0.8}
            style={[
              styles.button,
              { backgroundColor: uiParameters.buttons.action.background },
              !hasContacts && { width: '100%' }
            ]}
          >
              <Text style={[styles.buttonText, { color: Theme.tracking_colors.white }]}>
                開啟{name}模式
              </Text>
          </TouchableOpacity>

          {/* Avatars Row */}
          {hasContacts && (
            <View style={styles.avatarContainer}>
              {visibleContacts.map((contact, index) =>
                contact.url ? (
                  <Image
                    key={contact.id}
                    source={contact.url}
                    style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0, zIndex: index }]}
                  />
                ) : (
                  <View
                    key={contact.id}
                    style={[styles.avatar, styles.avatarPlaceholder, { marginLeft: index > 0 ? -10 : 0, zIndex: index }]}
                  >
                    <Text style={styles.avatarText}>
                      {(contact.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              )}
              {moreCount > 0 && (
                <View
                  style={[styles.avatar, styles.moreCount, { marginLeft: visibleContacts.length > 0 ? -10 : 0, zIndex: visibleContacts.length }]}
                >
                  <Text style={styles.moreCountText}>{`+${moreCount}`}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: '90%',
    height: 100,
    paddingTop: 10,
    paddingBottom: 10,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  blurView: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  innerContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  button: {
    padding: 10,
    borderRadius: 50,
    paddingHorizontal: 30,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Theme.radii.full,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.gray75,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  moreCount: {
    backgroundColor: Theme.colors.gray150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCountText: {
    color: Theme.colors.textPrimary,
    fontWeight: Theme.typography.fontWeights.bold,
    fontSize: Theme.typography.fontSizes.caption,
  },
});
