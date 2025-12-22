import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Theme from '@/constants/Theme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { uiParameters } from '@/constants/Theme';
import { useAllSharing, UnifiedSharingContact } from '@/hooks/useAllSharing';
import { useFriendSharing } from '@/hooks/useFriendSharing'; // For starting a session
import { useFriends } from '@/context/FriendProvider'; // For getting friends to start a session

const LocationSharingButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.locationButton, { backgroundColor: uiParameters.buttons.locationShare.default.background }]}
    onPress={onPress}
  >
    <Ionicons name="location-sharp" size={24} color={uiParameters.buttons.locationShare.default.icon} />
  </TouchableOpacity>
);

const AvatarList = ({ contacts }: { contacts: UnifiedSharingContact[] }) => {
  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  return (
    <View style={styles.avatarListContainer}>
      {visibleContacts.map((contact, index) =>
        contact.avatarUrl ? (
          <Image
            key={contact.userId}
            source={{ uri: contact.avatarUrl }}
            style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0 }]}
          />
        ) : (
          <View
            key={contact.userId}
            style={[styles.avatar, styles.avatarPlaceholder, { marginLeft: index > 0 ? -10 : 0 }]}
          >
            <Text style={styles.avatarText}>
              {(contact.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )
      )}
      {moreCount > 0 && (
        <View style={[styles.avatar, styles.moreCount, { marginLeft: -10 }]}>
          <Text style={styles.moreCountText}>{`+${moreCount}`}</Text>
        </View>
      )}
    </View>
  );
};

const FoldedView = ({ isSharing, contacts, onStartShare }: { isSharing: boolean, contacts: UnifiedSharingContact[], onStartShare: () => void }) => (
  <View style={styles.foldedViewContainer}>
    <View style={styles.foldedViewLeft}>
      <FontAwesome name="circle" size={12} color={isSharing ? 'green' : 'grey'} />
      <Text style={[styles.foldedViewText, { color: uiParameters.mainComponent.text }]}>
        {isSharing ? `您的位置正在與 ${contacts.length} 人分享` : '您的位置並未分享給任何人'}
      </Text>
    </View>
    {isSharing ? <AvatarList contacts={contacts} /> : <LocationSharingButton onPress={onStartShare} />}
  </View>
);

const ExpandedView = ({ contacts, onStopSharing }: { contacts: UnifiedSharingContact[], onStopSharing: (contact: UnifiedSharingContact) => void }) => (
  <View style={styles.expandedViewContainer}>
    <View style={styles.chevronContainer}>
      <Ionicons name="chevron-down" size={24} color="grey" />
    </View>
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <View style={styles.expandedListItem}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.expandedAvatar} />
          ) : (
            <View
              style={[styles.expandedAvatar, styles.avatarPlaceholder, { backgroundColor: Theme.colors.gray75 }]}
            >
              <Text style={[styles.avatarText, { fontSize: 20 }]}>
                {(item.username || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.expandedItemCenter}>
            <Text style={styles.expandedUsername}>{item.username || 'Unknown User'}</Text>
            <View style={styles.sharingStatus}>
              <FontAwesome name="circle" size={10} color={item.type === 'emergency' ? Theme.colors.danger : 'green'} />
              {/* <Text style={styles.sharingStatusText}>
                {item.type === 'emergency' ? 'Sharing (Emergency)' : 'Sharing'}
              </Text> */}
            </View>
          </View>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent container press
              onStopSharing(item);
            }}
          >
            <Text style={styles.stopButtonText}>Stop Sharing</Text>
          </TouchableOpacity>
        </View>
      )}
      keyExtractor={item => item.userId}
      ListHeaderComponent={() => <Text style={styles.expandedHeader}>位置正在被分享</Text>}
    />
  </View>
);

export default function SharingSessionCard() {
  const { unifiedList, isLoading, error, stopSharingWithContact } = useAllSharing();
  const { createSharingSession } = useFriendSharing();
  const { friends } = useFriends();
  const [isExpanded, setIsExpanded] = useState(false);

  const height = useSharedValue(80);
  const borderRadius = useSharedValue(Theme.radii.xl);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      borderRadius: borderRadius.value,
    };
  });

  const isSharing = unifiedList.length > 0;

  useEffect(() => {
    // Do not allow expanding if not sharing
    if (!isSharing) {
      setIsExpanded(false);
    }
  }, [isSharing]);

  useEffect(() => {
    height.value = withTiming(isExpanded ? 230 : 80, { duration: 300 });
    borderRadius.value = withTiming(isExpanded ? Theme.radii.xl : Theme.radii.xxl, { duration: 300 });
  }, [isExpanded]);

  const handleStartSharing = () => {
    if (friends.length === 0) {
      Alert.alert("No Friends", "You need to add friends before you can share your location.");
      return;
    }
    const friendIds = friends.map(f => f.id);
    createSharingSession(friendIds);
  };

  if (isLoading) {
    return <Text>Loading sharing status...</Text>;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  return (
    <View style={styles.shadowContainer}>
      <Animated.View style={[styles.animatedContainer, animatedContainerStyle]}>
        <BlurView
          intensity={90}
          tint="light"
          style={styles.blurView}
        >
          <Pressable onPress={() => { if (isSharing) setIsExpanded(!isExpanded); }} style={[styles.pressable, { backgroundColor: uiParameters.mainComponent.background }]}>
            {isExpanded ? (
              <ExpandedView contacts={unifiedList} onStopSharing={stopSharingWithContact} />
            ) : (
              <FoldedView isSharing={isSharing} contacts={unifiedList} onStartShare={handleStartSharing} />
            )}
          </Pressable>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: '90%',
    alignSelf: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  animatedContainer: {
    overflow: 'hidden',
  },
  blurView: {
    width: '100%',
    height: '100%',
  },
  pressable: {
    width: '100%',
    height: '100%',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  avatarListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Theme.radii.xl,
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
  foldedViewContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingHorizontal: 32,
  },
  foldedViewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foldedViewText: {
    fontWeight: 'bold',
  },
  expandedViewContainer: {
    width: '100%',
    height: '100%',
    padding: 16,
  },
  chevronContainer: {
    alignItems: 'center',
  },
  expandedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  expandedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  expandedItemCenter: {
    flex: 1,
  },
  expandedUsername: {
    fontWeight: 'bold',
  },
  sharingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharingStatusText: {
    color: '#6b7280',
  },
  stopButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radii.md,
  },
  stopButtonText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  expandedHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 8,
  },
});