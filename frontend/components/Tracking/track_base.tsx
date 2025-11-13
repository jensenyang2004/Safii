// components/Tracking/track_base.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
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
    <View style={{ // Shadow container
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
        elevation: 5, // for Android
    }}>
      <BlurView
        intensity={90}
        tint="light"
        className="w-full h-full rounded-full overflow-hidden"
      >
        <View style={{ backgroundColor: uiParameters.mainComponent.background }} className={`w-full h-full flex-row items-center py-3 px-8 ${hasContacts ? 'justify-between' : 'justify-center'}`}>
          <TouchableOpacity
            onPress={() => startTrackingMode(id, checkIntervalMinutes, defaultReductionMinutes)}
            activeOpacity={0.8}
            style={[{
              backgroundColor: uiParameters.buttons.action.background,
              padding: 10,
              borderRadius: 50,
              paddingHorizontal: 30,
              shadowOpacity: 0.2,
              shadowRadius: 3
            }, !hasContacts && { width: '100%' }]}
            className={`flex-row items-center gap-2 ${!hasContacts ? 'justify-center' : ''}`}
          >
              <Text style={{ color: Theme.tracking_colors.white }} className="font-bold text-xl">
                開啟{name}模式
              </Text>
          </TouchableOpacity>

          {/* Avatars Row */}
          {hasContacts && (
            <View className="flex-row items-center">
              {visibleContacts.map((contact, index) =>
                contact.url ? (
                  <Image
                    key={contact.id}
                    source={contact.url}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: Theme.radii.full,
                      marginLeft: index > 0 ? -10 : 0,
                      borderWidth: 2,
                      borderColor: Theme.colors.primary,
                      backgroundColor: Theme.colors.gray75,
                      zIndex: index,
                    }}
                  />
                ) : (
                  <View
                    key={contact.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: Theme.radii.full,
                      marginLeft: index > 0 ? -10 : 0,
                      borderWidth: 2,
                      borderColor: Theme.colors.primary,
                      backgroundColor: Theme.colors.gray75,
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: index,
                    }}
                  >
                    <Text style={{ color: Theme.colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                      {(contact.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              )}
              {moreCount > 0 && (
                <View
                  style={{
                    backgroundColor: Theme.colors.gray150,
                    borderRadius: Theme.radii.full,
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: visibleContacts.length > 0 ? -10 : 0, // Apply negative margin if there are visible contacts
                    borderWidth: 2,
                    borderColor: Theme.colors.primary,
                    zIndex: visibleContacts.length,
                  }}
                >
                  <Text
                    style={{
                      color: Theme.colors.textPrimary,
                      fontWeight: Theme.typography.fontWeights.bold,
                      fontSize: Theme.typography.fontSizes.caption,
                    }}
                  >{`+${moreCount}`}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </BlurView>
    </View>
  );
}
