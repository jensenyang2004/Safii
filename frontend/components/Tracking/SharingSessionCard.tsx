import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSharingSessions } from '@/hooks/useSharingSessions';
import * as Theme from '@/constants/Theme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { uiParameters } from '@/constants/Theme';


const LocationSharingButton = () => (
  <TouchableOpacity
    style={{ backgroundColor: uiParameters.buttons.locationShare.default.background }}
    className="w-12 h-12 rounded-full items-center justify-center drop-shadow-2xl"
    // onPress={...} // TODO: Add onPress handler to start sharing
  >
    <Ionicons name="location-sharp" size={24} color={uiParameters.buttons.locationShare.default.icon} />
  </TouchableOpacity>
);

const AvatarList = ({ contacts }: { contacts: any[] }) => {
  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  return (
    <View className="flex-row items-center">
      {visibleContacts.map((contact, index) =>
        contact.avatarUrl ? (
          <Image
            key={contact.contactId}
            source={{ uri: contact.avatarUrl }}
            style={{
              width: 32,
              height: 32,
              borderRadius: Theme.radii.xl,
              marginLeft: index > 0 ? -10 : 0,
              borderWidth: 2,
              borderColor: Theme.colors.primary,
              backgroundColor: Theme.colors.gray75,
            }}
          />
        ) : (
          <View
            key={contact.contactId}
            style={{
              width: 32,
              height: 32,
              borderRadius: Theme.radii.xl,
              marginLeft: index > 0 ? -10 : 0,
              borderWidth: 2,
              borderColor: Theme.colors.primary,
              backgroundColor: Theme.colors.gray75,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Theme.colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
              {(contact.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )
      )}
      {moreCount > 0 && (
        <View
          style={{
            backgroundColor: Theme.colors.gray150,
            borderRadius: Theme.radii.xl,
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -10,
            borderWidth: 2,
            borderColor: Theme.colors.primary,
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
  );
};

const FoldedView = ({ isSharing, contacts }: { isSharing: boolean, contacts: any[] }) => (
  <View className="w-full h-full flex-row items-center justify-between py-0 px-8">
    <View className="flex-row items-center gap-2">
      <FontAwesome name="circle" size={12} color={isSharing ? 'green' : 'grey'} />
      <Text style={{ color: uiParameters.mainComponent.text }} className="font-bold">
        {isSharing ? `您的位置正在與 ${contacts.length} 人分享` : '您的位置並未分享給任何人'}
      </Text>
    </View>
    {isSharing ? <AvatarList contacts={contacts} /> : <LocationSharingButton />}
  </View>
);

const ExpandedView = ({ contacts, onStopSharing }: { contacts: any[], onStopSharing: (sessionId: string, contactId: string) => void }) => (
  <View className="w-full h-full p-4">
    <View className="items-center">
      <Ionicons name="chevron-down" size={24} color="grey" />
    </View>
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <View className="flex-row items-center p-2 border-b border-gray-200">
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} className="w-12 h-12 rounded-full mr-4" />
          ) : (
            <View
              className="w-12 h-12 rounded-full mr-4 items-center justify-center"
              style={{ backgroundColor: Theme.colors.gray75 }}
            >
              <Text style={{ color: Theme.colors.textPrimary, fontWeight: 'bold', fontSize: 20 }}>
                {(item.username || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-bold">{item.username || 'Unknown User'}</Text>
            <View className="flex-row items-center gap-2">
              <FontAwesome name="circle" size={10} color="green" />
              <Text className="text-gray-500">Sharing</Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Theme.radii.md }}
            onPress={(e) => {
              e.stopPropagation(); // Prevent container press
              onStopSharing(item.sessionId, item.contactId);
            }}
          >
            <Text style={{ color: Theme.colors.white, fontWeight: 'bold' }}>Stop Sharing</Text>
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={item => item.contactId}
      ListHeaderComponent={() => <Text className="text-lg font-bold p-2">位置正在被分享</Text>}
    />
  </View>
);

export default function SharingSessionCard() {
  const { sessions, isLoading, error } = useSharingSessions();
  const [isExpanded, setIsExpanded] = useState(false);

  const height = useSharedValue(80);
  const borderRadius = useSharedValue(Theme.radii.xl); // Initial folded state

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      borderRadius: borderRadius.value,
    };
  });

  useEffect(() => {
    height.value = withTiming(isExpanded ? 230 : 80, { duration: 300 });
    borderRadius.value = withTiming(isExpanded ? Theme.radii.xl : Theme.radii.xxl, { duration: 300 });
  }, [isExpanded]);

  const handleStopSharing = (sessionId: string, contactId: string) => {
    enableBioMetric(
      'Use Face ID',
      'Authenticate to proceed',
      (res) => {
        if (res === 5) {
          console.log("FaceID verify successfully");
          // TODO: Implement stop sharing logic here
          console.log(`Stop sharing with contact ${contactId} in session ${sessionId}`);
        } else {
          console.log("FaceID verify failed");
        }
      }
    );
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  const allContacts = sessions.flatMap(session =>
    Object.entries(session.contactStatus).map(([contactId, contactData]) => ({
      sessionId: session.emergencyDocId,
      contactId,
      ...contactData
    }))
  );
  const isSharing = allContacts.length > 0;

  return (
    <View style={{
      width: '90%',
      alignSelf: 'center',
      marginVertical: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    }}>
    <Animated.View style={[{
      overflow: 'hidden',
    }, animatedContainerStyle]}>
      <BlurView
        intensity={90}
        tint="light"
        className="w-full h-full"
      >
        <Pressable onPress={() => { if (isSharing) setIsExpanded(!isExpanded); }} style={{ backgroundColor: uiParameters.mainComponent.background }} className="w-full h-full">
          {isExpanded ? (
            <ExpandedView contacts={allContacts} onStopSharing={handleStopSharing} />
          ) : (
            <FoldedView isSharing={isSharing} contacts={allContacts} />
          )}
        </Pressable>
      </BlurView>
    </Animated.View>
    </View>
  );
}
