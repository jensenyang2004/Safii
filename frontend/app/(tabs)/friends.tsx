import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { useFriends } from '../../context/FriendProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { getAuth } from 'firebase/auth';

interface SearchResult {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  // Add other properties that your search results might have
}

interface LocationData {
  lat: number;
  long: number;
  updateTime: string; // Adjust type as needed
}

export default function FriendsScreen() {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    searchUsers,
    loading,
    refreshData
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, search

  const [isRefreshing, setIsRefreshing] = useState(false);


  useEffect(() => {
    // Don't search if query is too short
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce the search to prevent too many requests
    const debounceTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const searchResults = await searchUsers(searchQuery);
        setSearchResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300); // Wait 300ms after typing stops

    // Clean up timeout if component unmounts or query changes
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  useEffect(() => {
    // Refresh search results when outgoingRequests changes
    if (searchResults.length > 0) {
      setSearchResults(prev => [...prev]);
    }
  }, [outgoingRequests]);

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {(item.displayName || item.username || 'U')[0]}
          </Text>
        </View>
      )}

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName || item.username}</Text>
      </View>

      <Pressable
        style={styles.removeButton}
        onPress={() => removeFriend(item.userId)}
      >
        <FontAwesome5 name="user-minus" size={16} color="#EF4444" />
      </Pressable>

      {/* <Pressable
        style={styles.sendLocationButton}
        onPress={() => {
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;

          if (!currentUserId) {
            Alert.alert('錯誤', '你需要登入才能發送位置資訊');
            return;
          }
          sendLocationInfo(item.userId, currentUserId);
        }}
      >
        <Text style={styles.actionButtonText}>發送位置</Text>
      </Pressable> */}
    </View>
  );

  const renderRequest = ({ item }) => (
    <View style={styles.friendItem}>
      {item.fromAvatar ? (
        <Image source={{ uri: item.fromAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.fromName[0]}</Text>
        </View>
      )}

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.fromName}</Text>
      </View>

      <View style={styles.requestButtons}>
        <Pressable
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => acceptFriendRequest(item.id)}
        >
          <Text style={styles.actionButtonText}>接受</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Text style={styles.actionButtonText}>拒絕</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderOutgoingRequest = ({ item }) => (
    <View style={styles.friendItem}>
      {item.toAvatar ? (
        <Image source={{ uri: item.toAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {(item.toName && item.toName[0]) || 'U'}
          </Text>
        </View>
      )}

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.toName || '未知用戶'}</Text>
        <Text style={styles.requestStatus}>待處理</Text>
      </View>

      <Pressable
        style={styles.cancelButton}
        onPress={() => cancelFriendRequest(item.id)}
      >
        <Text style={styles.actionButtonText}>取消</Text>
      </Pressable>
    </View>
  );

  const renderSearchResult = ({ item }) => {
    const existingRequest = outgoingRequests.find(req => req.to === item.id);

    return (
      <View style={styles.friendItem}>
        {/* Avatar code */}

        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName || item.username}</Text>
        </View>

        {existingRequest ? (
          <Pressable
            style={styles.cancelButton} // Use this red style instead of alreadySentButton
            onPress={() => showCancelRequestDialog(existingRequest.id)}
          >
            <Text style={styles.actionButtonText}>取消</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => handleSendRequest(item.id)}
          >
            <FontAwesome5 name="user-plus" size={16} color="#1E40AF" />
          </Pressable>
        )}
      </View>
    );
  };

  const showCancelRequestDialog = (requestId) => {
    Alert.alert(
      "交友邀請",
      "取消交友邀請?",
      [
        {
          text: "取消",
          style: "cancel"
        },
        {
          text: "確認",
          onPress: () => cancelFriendRequest(requestId)
        }
      ]
    );
  };

  const handleSendRequest = async (userId) => {
    await sendFriendRequest(userId);

    // Force search results to update based on new outgoingRequests
    setSearchResults(prevResults => {
      // Create a new array with the same items to trigger re-render
      return [...prevResults];
    });
  };

  const refreshFriendData = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('權限被拒絕', '需要位置權限才能發送位置資訊');
      return false;
    }
    return true;
  };

  const sendLocationInfo = async (friendId: string, userId: string) => {
    try {
      // Reference to the user's real-time location in Firestore
      const realTimeLocationRef = doc(db, `users/${userId}/real_time_location/current`);
      const realTimeLocationSnapshot = await getDoc(realTimeLocationRef);

      if (!realTimeLocationSnapshot.exists) {
        Alert.alert('錯誤', '找不到即時位置數據');
        return;
      }

      const locationData = realTimeLocationSnapshot.data() as LocationData;

      if (!locationData || !locationData.lat || !locationData.long || !locationData.updateTime) {
        Alert.alert('錯誤', '無效的位置數據');
        console.log('Invalid location data:', locationData);
        return;
      }
      // Reference to the friend's location sharing document
      const locationSharingRef = doc(db, `location_sharing/${friendId}`);
      const locationSharingData = {
        userId: userId,
        location: {
          latitude: locationData.lat,
          longitude: locationData.long,
          latitudeDelta: 0.01, // Adjust as needed
          longitudeDelta: 0.01, // Adjust as needed
        },
        updateTime: locationData.updateTime,
      };

      await setDoc(locationSharingRef, locationSharingData);

      Alert.alert('成功', '成功發起位置分享');
    } catch (error) {
      console.error('Error initiating location sharing:', error);
      Alert.alert('錯誤', '發起位置分享失敗');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              朋友 ({friends.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              交友請求 ({incomingRequests.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              新增朋友
            </Text>
          </Pressable>
        </View>

        {activeTab === 'search' && (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="搜索用戶..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>

        )}

        {loading ? (
          <ActivityIndicator size="large" color="#1E40AF" style={styles.loader} />
        ) : (
          <>
            {activeTab === 'friends' && (
              <FlatList
                data={friends}
                renderItem={renderFriend}
                keyExtractor={item => item.userId}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>你還沒有任何朋友</Text>
                }
              />
            )}

            {activeTab === 'requests' && (
              <View>
                {/* Add this header with refresh button */}
                <View style={styles.header}>
                  <Text style={styles.sectionTitle}>交友請求</Text>
                  <Pressable onPress={refreshFriendData} style={styles.refreshButton}>
                    <FontAwesome5 name="sync" size={16} color="#1E40AF" />
                  </Pressable>
                </View>

                <Text style={styles.sectionTitle}>你收到的請求</Text>
                <FlatList
                  data={incomingRequests}
                  renderItem={renderRequest}
                  keyExtractor={item => item.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>沒有待處理的交友請求</Text>
                  }
                />

                <Text style={styles.sectionTitle}>你送出的請求</Text>
                <FlatList
                  data={outgoingRequests}
                  renderItem={renderOutgoingRequest}
                  keyExtractor={item => item.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>你還沒有送出任何交友請求</Text>
                  }
                />
              </View>
            )}

            {activeTab === 'search' && (
              <>
                {searching ? (
                  <ActivityIndicator size="small" color="#1E40AF" style={styles.loader} />
                ) : (
                  // <></>
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>
                        {searchQuery.length > 0
                          ? "找不到符合你搜索的用戶"
                          : "搜索用戶以新增為朋友"}
                      </Text>
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({

  alreadySentButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  alreadySentText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1E40AF',
  },
  tabText: {
    fontWeight: '500',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendLocationButton: {
    backgroundColor: '#1E40AF',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
  },
  requestButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  removeButton: {
    padding: 10,
  },
  addButton: {
    padding: 10,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    color: '#1F2937',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  requestStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});