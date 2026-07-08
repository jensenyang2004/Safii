// app/(tabs)/home.tsx

import { ActivityIndicator, View, Text, Pressable, Alert, StyleSheet, FlatList, TouchableOpacity, ScrollView, Image, TextInput, Animated, Modal } from 'react-native';

import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/libs/firebase';
import { FontAwesome5 } from '@expo/vector-icons';
import '@/global.css';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfilePhotoUploader from '@/components/ProfilePhotoUploader';
import * as Theme from '../../constants/Theme';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';
import { useTracking } from '@/context/TrackProvider';
import { ScheduledTracking } from '@/types/scheduledTracking';

import { useLocationSharing } from '@/hooks/useLocationSharing';
import { useFriends } from '@/context/FriendProvider';
import { authenticateWithBiometrics } from '@/utils/biometrics';

import { BlurView } from 'expo-blur';


function TrackingToggle({ isActive, onToggle }: { isActive: boolean; onToggle: () => Promise<void> }) {
  const [display, setDisplay] = useState(isActive);
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    setDisplay(isActive);
    Animated.timing(anim, { toValue: isActive ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [isActive]);

  const handlePress = async () => {
    const next = !display;
    try {
      await onToggle();
      setDisplay(next);
      Animated.timing(anim, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    } catch {
      // auth cancelled or action failed — toggle stays in place
    }
  };

  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 50] });
  const thumbColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#9CA3AF', Theme.tracking_colors.successGreen] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <View style={toggleStyles.track}>
        <Animated.View style={[toggleStyles.thumb, { backgroundColor: thumbColor, transform: [{ translateX: thumbX }] }]}>
          <Text style={toggleStyles.thumbLabel}>{display ? '進行中' : '關閉'}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 120, height: 32, borderRadius: 16,
    backgroundColor: '#E5E7EB',
    position: 'relative', justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 68, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  thumbLabel: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

function ContactAvatarStack({ contactIds, friends }: {
  contactIds: string[];
  friends: { id: string; username: string; avatarUrl?: string }[];
}) {
  const contacts = contactIds
    .map(id => friends.find(f => f.id === id))
    .filter(Boolean) as { id: string; username: string; avatarUrl?: string }[];

  const visible = contacts.slice(0, 3);
  const moreCount = contacts.length - visible.length;

  if (contacts.length === 0) {
    return <Text style={homeStyles.settingsValue}>—</Text>;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((contact, index) =>
        contact.avatarUrl ? (
          <Image
            key={contact.id}
            source={{ uri: contact.avatarUrl }}
            style={[homeStyles.contactAvatar, { marginLeft: index > 0 ? -9 : 0, zIndex: visible.length - index + 1 }]}
          />
        ) : (
          <View
            key={contact.id}
            style={[homeStyles.contactAvatar, homeStyles.contactAvatarPlaceholder, { marginLeft: index > 0 ? -9 : 0, zIndex: visible.length - index + 1 }]}
          >
            <Text style={homeStyles.contactAvatarText}>
              {(contact.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )
      )}
      {moreCount > 0 && (
        <View style={[homeStyles.contactAvatar, homeStyles.contactAvatarMore, { marginLeft: -8, zIndex: 1, backgroundColor: 'white' }]}>
          <Text style={homeStyles.contactAvatarMoreText}>{`+${moreCount}`}</Text>
        </View>
      )}
    </View>
  );
}

const DAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

function scheduleRangeLabel(daysOfWeek: number[], startTime: string, endTime: string): string {
  const spansDay = endTime < startTime;
  const daysPart = daysOfWeek.length === 1
    ? `週${DAY_SHORT[daysOfWeek[0]]}`
    : daysOfWeek.map(d => DAY_SHORT[d]).join('、');

  if (!spansDay) return `${daysPart} ${startTime} ~ ${endTime}`;

  const endDayPart = daysOfWeek.length === 1
    ? `週${DAY_SHORT[(daysOfWeek[0] + 1) % 7]}`
    : '次日';

  return `${daysPart} ${startTime} ~ ${endDayPart} ${endTime}`;
}

export default function HomeScreen() {
  const { user, fetchUserInfo, signOut, deleteAccount } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'tracking' | 'sharing'>('tracking');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const saveDisplayName = async () => {
    const trimmed = newDisplayName.trim();
    if (!trimmed) { Alert.alert('請輸入顯示名稱'); return; }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: trimmed });
      await updateDoc(doc(db, 'users', user!.uid), { displayName: trimmed });
      await fetchUserInfo(auth.currentUser);
      setEditingName(false);
    } catch {
      Alert.alert('儲存失敗', '請稍後再試。');
    } finally {
      setSavingName(false);
    }
  };

  const { schedules, activeSession, loading: scheduleLoading, deleteSchedule } = useScheduledTracking();
  const { isTracking, trackingModeId, startTrackingMode, stopTrackingMode } = useTracking();
  const { unifiedList, sharedByFriends, startSharingWithContact, stopSharingWithContact } = useLocationSharing();
  const { friends } = useFriends();

  const sharingContactIds = new Set(unifiedList.map(c => c.userId));
  const incomingShareMap = new Map(sharedByFriends.map(f => [f.sharingUserId, f]));

  const confirmDelete = (item: ScheduledTracking) => {
    Alert.alert('刪除確認', `確定要刪除「${item.name || '未命名模式'}」嗎？此動作無法復原。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除', style: 'destructive',
        onPress: () => deleteSchedule(item.id).catch(() => Alert.alert('刪除失敗', '請稍後再試')),
      },
    ]);
  };

  const renderItem = ({ item }: { item: ScheduledTracking }) => {
    const hasSchedule = (item.daysOfWeek?.length ?? 0) > 0;
    const isManual = item.isManualOnly ?? !hasSchedule;
    const dayLabel = hasSchedule
      ? scheduleRangeLabel(item.daysOfWeek, item.startTime, item.endTime)
      : null;
    const isActive =
      (isTracking && trackingModeId === item.id) ||
      (activeSession?.scheduleId === item.id);

    return (
      <View style={homeStyles.settingsCard}>
        <BlurView intensity={90} tint="light" style={homeStyles.settingsBlurView}>
          <View style={homeStyles.settingsInnerContainer}>
            <View style={homeStyles.settingsCardHeader}>
              <Text style={homeStyles.settingsCardTitle} numberOfLines={1}>{item.name || '(未命名)'}</Text>
              {isManual ? (
                <TrackingToggle
                  isActive={isActive}
                  onToggle={async () => {
                    if (isActive) {
                      const ok = await authenticateWithBiometrics('請驗證身份以停止報平安');
                      if (!ok) throw new Error('auth cancelled');
                      await stopTrackingMode();
                    } else {
                      await startTrackingMode(item.id, item.checkIntervalMinutes);
                    }
                  }}
                />
              ) : (
                isActive && (
                  <View style={homeStyles.activePill}>
                    <Text style={homeStyles.activePillText}>進行中</Text>
                  </View>
                )
              )}
            </View>

            <View style={homeStyles.settingsRow}>
              <Text style={homeStyles.settingsLabel}>
                {dayLabel ?? `每 ${item.checkIntervalMinutes ?? 15} 分鐘回報`}
              </Text>
              <ContactAvatarStack contactIds={item.emergencyContactIds ?? []} friends={friends} />
            </View>

            <View style={homeStyles.settingsBtns}>
              <TouchableOpacity
                style={[homeStyles.settingsSmallBtn, { backgroundColor: isActive ? Theme.colors.gray300 : Theme.tracking_colors.coralRed }]}
                onPress={() => {
                  if (isActive) {
                    Alert.alert('無法編輯', '報平安模式進行中，請結束後再編輯。');
                    return;
                  }
                  router.push({ pathname: '/tracking-mode/edit', params: { modeId: item.id } });
                }}
              >
                <Text style={homeStyles.settingsEditBtnText}>編輯模式</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.settingsDeleteBtn, isActive && { opacity: 0.4 }]}
                onPress={() => {
                  if (isActive) {
                    Alert.alert('無法刪除', '報平安模式進行中，請結束後再刪除。');
                    return;
                  }
                  confirmDelete(item);
                }}
              >
                <Text style={homeStyles.settingsDeleteBtnText}>刪除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  return (
    <SafeAreaView style={homeStyles.container}>

      <View style={homeStyles.headerContainer}>
        <ProfilePhotoUploader />
        <Modal visible={showAccountModal} animationType="fade" transparent onRequestClose={() => setShowAccountModal(false)}>
          <TouchableOpacity style={homeStyles.accountModalBackdrop} activeOpacity={1} onPress={() => setShowAccountModal(false)}>
            <View style={homeStyles.accountModalContent}>
              <TouchableOpacity style={homeStyles.accountModalButton} onPress={() => { setShowAccountModal(false); signOut(); }}>
                <FontAwesome5 name="sign-out-alt" size={18} color="#374151" />
                <Text style={homeStyles.accountModalText}>登出</Text>
              </TouchableOpacity>
              <TouchableOpacity style={homeStyles.accountModalButton} onPress={() => {
                setShowAccountModal(false);
                setTimeout(() => {
                  Alert.alert('刪除帳號', '此動作無法復原。您的帳號與所有資料將被永久刪除。', [
                    { text: '取消', style: 'cancel' },
                    { text: '確認刪除', style: 'destructive', onPress: deleteAccount },
                  ]);
                }, 300);
              }}>
                <FontAwesome5 name="trash" size={18} color="#EF4444" />
                <Text style={[homeStyles.accountModalText, { color: '#EF4444' }]}>刪除帳號</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {editingName ? (
          <View style={homeStyles.nameEditRow}>
            <TextInput
            allowFontScaling={false}
              style={homeStyles.nameEditInput}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              autoFocus
              placeholderTextColor="#A9A9A9"
              placeholder="顯示名稱"
            />
            {savingName ? (
              <ActivityIndicator color={Theme.colors.brandPink} style={{ marginLeft: 8 }} />
            ) : (
              <>
                <TouchableOpacity onPress={saveDisplayName} style={homeStyles.nameEditConfirm}>
                  <FontAwesome5 name="check" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} style={homeStyles.nameEditCancel}>
                  <FontAwesome5 name="times" size={14} color="#888" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowAccountModal(true)}>
              <FontAwesome5 name="user-circle" size={22} color="#A9A9A9" />
            </TouchableOpacity>
            <TouchableOpacity style={homeStyles.nameRow} onPress={() => { setNewDisplayName(user?.displayName || user?.username || ''); setEditingName(true); }} activeOpacity={0.7}>
              <Text style={homeStyles.username}>
                {user?.displayName || user?.username || user?.nickname || user?.email || 'Unknown User'}
              </Text>
              <FontAwesome5 name="pen" size={12} color="#A9A9A9" style={{ marginLeft: 6, marginTop: 2 }} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={homeStyles.handle}>@{user?.username}</Text>
      </View>

      <View style={homeStyles.tabBar}>

        <Pressable
          style={[homeStyles.tabButton, activeTab === 'sharing' && homeStyles.tabButtonActive]}
          onPress={() => setActiveTab('sharing')}
        >
          <Text style={[homeStyles.tabButtonText, activeTab === 'sharing' &&
            homeStyles.tabButtonTextActive]}>
            好友分享
          </Text>
        </Pressable>

        <Pressable
          style={[homeStyles.tabButton, activeTab === 'tracking' && homeStyles.tabButtonActive]}
          onPress={() => setActiveTab('tracking')}
        >
          <Text style={[homeStyles.tabButtonText, activeTab === 'tracking' &&
            homeStyles.tabButtonTextActive]}>
            報平安模式
          </Text>
        </Pressable>
      </View>
      {activeTab === 'tracking' ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 80, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Active session banner */}
          {activeSession && (
            <TouchableOpacity
              style={homeStyles.activeBanner}
              onPress={() => router.push('/(modals)/scheduled-tracking/current')}
            >
              <View style={homeStyles.activeDot} />
              <Text style={homeStyles.activeBannerText}>排程報平安模式進行中 — 點此查看</Text>
              <Text style={{ color: '#fff', fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          )}

          <View style={homeStyles.settingsSection}>
            {scheduleLoading ? (
              <View style={homeStyles.settingsCenter}>
                <ActivityIndicator size="large" color={Theme.colors.actionPink} />
                <Text style={homeStyles.settingsDim}>載入中…</Text>
              </View>
            ) : (
              <>
                {schedules.length === 0 ? (
                  <View style={homeStyles.settingsEmpty}>
                    <Text style={homeStyles.settingsEmptyTitle}>尚未建立任何報平安模式</Text>
                    <Text style={homeStyles.settingsDim}>點擊下方按鈕新增一個吧！</Text>
                  </View>
                ) : (
                  <FlatList
                    scrollEnabled={false}
                    data={schedules}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={homeStyles.settingsListContent}
                  />
                )}

                <TouchableOpacity
                  style={homeStyles.settingsPrimaryBtn}
                  onPress={() => router.push('/tracking-mode/new')}
                  activeOpacity={0.8}
                >
                  <Text style={homeStyles.settingsPrimaryText}>建立報平安模式</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={homeStyles.disclaimer}>Safii 為輔助通知工具，緊急情況請立即撥打 110 或 119。</Text>
        </ScrollView>
      ) : (<FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <View style={homeStyles.settingsEmpty}>
            <Text style={homeStyles.settingsEmptyTitle}>尚未加入任何好友</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/friends')}>
              <Text style={[homeStyles.settingsDim, { color: Theme.colors.brandPink, textDecorationLine: 'underline' }]}>
                加入好友後即可分享位置
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isSharing = sharingContactIds.has(item.id);
          const contact = unifiedList.find(c => c.userId === item.id);
          const incoming = incomingShareMap.get(item.id);

          return (
            <View style={homeStyles.friendCard}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={homeStyles.friendAvatar} />
              ) : (
                <View style={[homeStyles.friendAvatar, homeStyles.friendAvatarPlaceholder]}>
                  <Text style={homeStyles.friendAvatarText}>
                    {(item.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={homeStyles.friendName}>{item.username}</Text>
                {incoming && (
                  <Text style={homeStyles.friendStatusIncoming}>● 正在向您分享位置</Text>
                )}

                <Text style={isSharing ? homeStyles.friendStatusOn :
                  homeStyles.friendStatusOff}>
                  {isSharing ? '● 正在分享位置給對方' : '● 位置分享關閉'}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                {incoming && (
                  <TouchableOpacity
                    style={homeStyles.flyButton}
                    onPress={() => {
                      router.navigate({
                        pathname: '/(tabs)/map',
                        params: {
                          flyToLat: incoming.lat.toString(),
                          flyToLong: incoming.long.toString(),
                          flyAt: Date.now().toString(), // forces re-trigger if same contact tapped again     
                        }
                      });
                    }}
                  >
                    <Text style={homeStyles.flyButtonText}>前往位置</Text>
                  </TouchableOpacity>
                )}
                {isSharing && contact ? (
                  <TouchableOpacity
                    style={homeStyles.stopButton}
                    onPress={() => stopSharingWithContact(contact)}
                  >
                    <Text style={homeStyles.stopButtonText}>停止分享</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={homeStyles.shareButton}
                    onPress={() => startSharingWithContact(item.id)}
                  >
                    <Text style={homeStyles.shareButtonText}>開始分享</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={<Text style={homeStyles.disclaimer}>Safii 為輔助通知工具，緊急情況請立即撥打 110 或 119。</Text>}
      />)}

    </SafeAreaView>

  );
}

const homeStyles = StyleSheet.create({
  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#C0C0C0',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    // justifyContent: 'center',
    // alignItems: 'center',
    // padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 3,
    borderColor: Theme.tracking_colors.coralRed,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Theme.colors.actionOrange,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  handle: {
    fontSize: 13,
    color: '#A9A9A9',
    marginBottom: 12,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  nameEditInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.brandPink,
    paddingVertical: 2,
    minWidth: 120,
  },
  nameEditConfirm: {
    backgroundColor: Theme.colors.brandPink,
    padding: 7,
    borderRadius: 20,
  },
  nameEditCancel: {
    backgroundColor: '#F3F4F6',
    padding: 7,
    borderRadius: 20,
  },
  accountModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  accountModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  accountModalText: {
    fontSize: 16,
    color: '#374151',
  },
  signOutButton: {
    backgroundColor: Theme.colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: Theme.radii.xl,
    marginBottom: 24,

    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 }, // 👈 bottom shadow

  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: 'white', // Lighter blue for disabled state
  },
  callButton: {
    backgroundColor: Theme.tracking_colors.coralRed,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  overlayText: {
    color: 'white',
    fontSize: 28,
    marginBottom: 20,
  },
  overlayButtons: {
    flexDirection: 'row',
    width: '60%',
    justifyContent: 'space-between',
  },
  // Styles from settings.tsx, renamed to avoid conflicts
  settingsSection: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
    paddingTop: 6, // Adjust as needed
  },


  settingsListContent: { paddingHorizontal: 12 },

  settingsCard: {
    width: '100%',
    alignSelf: 'center',
    // marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 16,

  },

  settingsBlurView: {
    width: '100%',
    borderRadius: Theme.radii.xl,
    overflow: 'hidden',
  },

  settingsInnerContainer: {
    backgroundColor: '#ECECECB3',
    paddingVertical: 16,
    paddingHorizontal: 28,
  },

  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  settingsCardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  settingsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  settingsBadgeOn: { backgroundColor: '#dcfce7' },
  settingsBadgeOff: { backgroundColor: '#f3f4f6' },
  settingsBadgeText: { color: '#111827', fontWeight: '600', fontSize: 12 },

  settingsRow: { flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 6, gap: 8 },
  settingsLabel: { color: '#6b7280' },
  settingsValue: { color: '#111827', fontWeight: '600' },

  settingsBtns: {
    marginTop: 12,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    gap: 8

  },

  settingsSmallBtn: {
    flex: 1,

    backgroundColor: Theme.tracking_colors.coralRed,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.radii.xl, marginRight: 8,
    borderWidth: 0.2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
  },
  settingsDeleteBtn: {
    flex: 1,
    backgroundColor: Theme.tracking_colors.white,
    borderRadius: Theme.radii.xl,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 0.2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  settingsEditBtnText: { color: '#fff', fontWeight: '700' },
  settingsDeleteBtnText: { color: Theme.colors.textDark, fontWeight: '700' },
  activePill: {
    backgroundColor: Theme.tracking_colors.successGreen,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  activePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  settingsPrimaryBtn: {
    marginTop: 8,
    backgroundColor: Theme.tracking_colors.coralRed, borderRadius: Theme.radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: 'grey', shadowOpacity: 0.3, shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  settingsPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  settingsCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  settingsEmpty: { alignItems: 'center', marginTop: 24, paddingHorizontal: 16 },
  settingsEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  settingsDim: { color: '#6b7280' },

  contactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: Theme.colors.gray75,
  },
  contactAvatarPlaceholder: {
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  contactAvatarMore: {
    backgroundColor: Theme.colors.gray150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarMoreText: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 10,
  },


  tabBar: {

    flexDirection: 'row',
    width: '85%',
    alignSelf: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: Theme.radii.xl,
    backgroundColor: Theme.colors.gray75,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Theme.radii.lg,
  },

  tabButtonActive: {
    backgroundColor: Theme.colors.brandPink,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.gray500,
  },
  tabButtonTextActive: {
    color: Theme.colors.white,
  },

  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray100,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendAvatarPlaceholder: {
    backgroundColor: Theme.colors.gray75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 2,
  },
  friendStatusIncoming: {
    fontSize: 12,
    color: Theme.colors.incomingStatus,
    marginBottom: 2,
  },
  friendStatusOn: {
    fontSize: 12,
    color: Theme.colors.greenSuccess,
  },
  friendStatusOff: {
    fontSize: 12,
    color: Theme.colors.gray400,
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
  stopButton: {
    backgroundColor: Theme.colors.brandPink,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.md,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  flyButton: {
    backgroundColor: Theme.colors.blueTint,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radii.md,
  },
  flyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.greenSuccess,
    borderRadius: Theme.radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff',
  },
  activeBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

});
