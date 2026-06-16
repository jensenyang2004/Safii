import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Pressable, StyleSheet, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Theme from '@/constants/Theme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { uiParameters } from '@/constants/Theme';
import { useLocationSharing, GroupedSharingContact, FriendShareData } from '@/hooks/useLocationSharing';
import { useFriends } from '@/context/FriendProvider';

interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface SharingSessionCardProps {
  onFlyToLocation: (lat: number, long: number, sessionId: string) => void;
  forceCollapse?: boolean;
}

const AvatarList = ({ contacts }: { contacts: GroupedSharingContact[] }) => {
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

const LocationSharingButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.locationButton, { backgroundColor: uiParameters.buttons.locationShare.default.background }]}
    onPress={onPress}
  >
    <Ionicons name="location-sharp" size={24} color={uiParameters.buttons.locationShare.default.icon} />
  </TouchableOpacity>
);

const FoldedView = ({ isSharing, contacts, onOpenExpanded }: { isSharing: boolean, contacts: GroupedSharingContact[], onOpenExpanded: () => void }) => (
  <View style={styles.foldedViewContainer}>
    <View style={styles.foldedViewLeft}>
      <FontAwesome name="circle" size={12} color={isSharing ? 'green' : 'grey'} />
      <Text style={[styles.foldedViewText, { color: uiParameters.mainComponent.text }]}>
        {isSharing ? `您的位置正在與 ${contacts.length} 人分享` : '您的位置並未分享給任何人'}
      </Text>
    </View>
    {isSharing
      ? <AvatarList contacts={contacts} />
      : <LocationSharingButton onPress={onOpenExpanded} />
    }
  </View>
);

interface ExpandedViewProps {
  friends: Friend[];
  sharingContactIds: Set<string>;
  unifiedList: GroupedSharingContact[];
  onShare: (friendId: string) => void;
  onStop: (contact: GroupedSharingContact) => void;
  onShareAll: () => void;
  onStopAll: () => void;
  onFlyToLocation: (lat: number, long: number, sessionId: string) => void;
  incomingShareMap: Map<string, FriendShareData>;
  onCollapse: () => void;
}

const ExpandedView = ({
  friends,
  sharingContactIds,
  unifiedList,
  onShare,
  onStop,
  onShareAll,
  onStopAll,
  onFlyToLocation,
  incomingShareMap,
  onCollapse }: ExpandedViewProps) => {
  const allSharing = friends.length > 0 && friends.every(f => sharingContactIds.has(f.id));

  return (
    <View style={styles.expandedViewContainer}>
      {/* <View style={styles.chevronContainer}>
        <Ionicons name="chevron-down" size={24} color="grey" />
      </View> */}
      <Pressable style={styles.chevronContainer} onPress={onCollapse}>
        <Ionicons name="chevron-down" size={24} color="grey" />
      </Pressable>
      <View style={styles.expandedHeaderRow}>
        <Text style={styles.expandedHeader}>聯絡人</Text>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
        {friends.map(item => {
          const isCurrentlySharing = sharingContactIds.has(item.id);
          const contact = unifiedList.find(c => c.userId === item.id);
          const incomingFriend = incomingShareMap.get(item.id);
          return (
            <View key={item.id} style={styles.expandedListItem}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.expandedAvatar} />
              ) : (
                <View style={[styles.expandedAvatar, styles.avatarPlaceholder, { backgroundColor: Theme.colors.gray75 }]}>
                  <Text style={[styles.avatarText, { fontSize: 20 }]}>
                    {(item.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.expandedItemCenter}>
                <Text style={styles.expandedUsername}>{item.username || 'Unknown'}</Text>
                {incomingFriend && (
                  <View style={styles.sharingStatus}>
                    <FontAwesome name="circle" size={10} color={Theme.colors.blueTint} />
                    <Text style={styles.sharingStatusText}>正在向您分享位置</Text>
                  </View>
                )}
                <View style={styles.sharingStatus}>
                  <FontAwesome name="circle" size={10} color={isCurrentlySharing ? 'green' : Theme.colors.gray150} />
                  <Text style={styles.sharingStatusText}>
                    {isCurrentlySharing ? '正在分享位置' : '位置分享關閉'}
                  </Text>
                </View>
              </View>
              <View style={styles.buttonColumn}>
                {incomingFriend && (
                  <TouchableOpacity style={styles.flyButton} onPress={() => onFlyToLocation(incomingFriend.lat, incomingFriend.long, incomingFriend.sessionId)}>
                    <Text style={styles.flyButtonText}>前往位置</Text>
                  </TouchableOpacity>
                )}
                {isCurrentlySharing && contact ? (
                  <TouchableOpacity style={styles.stopButton} onPress={() => onStop(contact)}>
                    <Text style={styles.stopButtonText}>停止分享</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.shareButton} onPress={() => onShare(item.id)}>
                    <Text style={styles.shareButtonText}>開始分享</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default function SharingSessionCard({ onFlyToLocation, forceCollapse }: SharingSessionCardProps) {
  const {
    unifiedList,
    sharedByFriends,
    isLoading,
    error,
    startSharingWithContact,
    createSharingSession,
    stopSharingWithContact,
    stopAllSharing } = useLocationSharing();

  const { friends } = useFriends();
  const incomingShareMap = new Map(sharedByFriends.map(f => [f.sharingUserId, f]));
  const [isExpanded, setIsExpanded] = useState(false);

  const height = useSharedValue(80);
  const borderRadius = useSharedValue(Theme.radii.xl);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: height.value,
    borderRadius: borderRadius.value,
  }));

  const isSharing = unifiedList.length > 0;

  // Derive set of currently shared contact IDs for O(1) lookup
  const sharingContactIds = new Set(unifiedList.map(c => c.userId));

  useEffect(() => {
    if (forceCollapse) setIsExpanded(false);
  }, [forceCollapse]);

  useEffect(() => {
    height.value = withTiming(isExpanded ? 380 : 80, { duration: 300 });
    borderRadius.value = withTiming(isExpanded ? Theme.radii.xl : Theme.radii.xxl, { duration: 300 });
  }, [isExpanded, friends.length]);

  const handleShareAll = () => {
    if (friends.length === 0) {
      Alert.alert('No Friends', 'You need to add friends before you can share your location.');
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
        <BlurView intensity={90} tint="light" style={styles.blurView}>

          {isExpanded ? (
            <ExpandedView
              friends={friends}
              sharingContactIds={sharingContactIds}
              unifiedList={unifiedList}
              onShare={startSharingWithContact}
              onStop={stopSharingWithContact}
              onShareAll={handleShareAll}
              onStopAll={stopAllSharing}
              onFlyToLocation={onFlyToLocation}
              incomingShareMap={incomingShareMap}
              onCollapse={() => setIsExpanded(false)}
            />

          ) : (
            <Pressable
              onPress={() => setIsExpanded(true)}
              style={[styles.pressable, { backgroundColor: uiParameters.mainComponent.background }]}
            >
              <FoldedView isSharing={isSharing} contacts={unifiedList} onOpenExpanded={() => setIsExpanded(true)} />
            </Pressable>
          )}

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
    flex: 1,
  },
  pressable: {
    flex: 1,
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
    borderColor: 'white',
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chevronContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  expandedHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareAllButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.md,
  },
  stopAllButton: {
    backgroundColor: Theme.colors.brandPink,
  },
  shareAllButtonText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  expandedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  expandedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  expandedItemCenter: {
    flex: 1,
  },
  expandedUsername: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  sharingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sharingStatusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  stopButton: {
    backgroundColor: Theme.colors.brandPink,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.md,
  },
  stopButtonText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  shareButton: {
    backgroundColor: Theme.colors.communityMain,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.md,
  },
  shareButtonText: {
    color: Theme.colors.textDark,
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  flyButton: {
    backgroundColor: Theme.colors.incomingStatus,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.md,
  },
  flyButtonText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
