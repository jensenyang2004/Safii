// app/(tabs)/home.tsx

import { ActivityIndicator, View, Text, Pressable, Alert, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Dimensions } from 'react-native';

import { useEffect, useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import '@/global.css';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import ProfilePhotoUploader from '@/components/ProfilePhotoUploader';
import * as Theme from '../../constants/Theme';
import { useTracking } from '@/context/TrackProvider';
// 1. Import your fake-call hook

type TrackingMode = {
  id: string;
  name: string;
  userId: string;
  On?: boolean;
  autoStart?: boolean;
  checkIntervalMinutes: number;
  unresponsiveThreshold: number;
  intervalReductionMinutes: number;
  startTime: {
    dayOfWeek: string[];
    time: string;
  };
  emergencyContactIds: string[];
};

interface TrackingContext {
  deleteTrackingMode: (modeId: string) => Promise<void>;
}


export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert("Signed out successfully!");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // State and functions from SettingsScreen
  const [modes, setModes] = useState<TrackingMode[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true); // Renamed to avoid conflict
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const trackingContext = useTracking() as TrackingContext | null;

  if (!trackingContext) {
    console.error('Tracking context is null');
    // You might want to render an error state or handle this differently
  }

  const { deleteTrackingMode } = trackingContext || {}; // Handle null trackingContext

  const confirmDelete = (modeId: string, modeName: string) => {
    Alert.alert(
      '刪除確認',
      `確定要刪除「${modeName || '未命名模式'}」嗎？此動作無法復原。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (deleteTrackingMode) { // Ensure deleteTrackingMode is not undefined
                await deleteTrackingMode(modeId);
              }
            } catch (e) {
              console.error(e);
              Alert.alert('刪除失敗', '請稍後再試');
            }
          },
        },
      ],
    );
  };

  const listQuery = useMemo(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'TrackingMode'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!listQuery) {
      setModes([]);
      setSettingsLoading(false);
      return;
    }
    const unsub = onSnapshot(
      listQuery,
      (snap) => {
        const rows: TrackingMode[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TrackingMode, 'id'>),
        }));
        setModes(rows);
        setSettingsLoading(false);
      },
      (err) => {
        console.error(err);
        Alert.alert('讀取失敗', '無法載入 Tracking 模式');
        setSettingsLoading(false);
      }
    );
    return () => unsub();
  }, [listQuery]);

  const onRefresh = useCallback(async () => {
    if (!listQuery) return;
    setRefreshing(true);
    try {
      const snap = await getDocs(listQuery);
      const rows: TrackingMode[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TrackingMode, 'id'>),
      }));
      setModes(rows);
    } catch (e) {
      console.error(e);
      Alert.alert('重新整理失敗', '請稍後再試');
    } finally {
      setRefreshing(false);
    }
  }, [listQuery]);

  const renderItem = ({ item }: { item: TrackingMode }) => {
    const days = item.startTime?.dayOfWeek?.join('、') ?? '—';
    const time = item.startTime?.time ?? '—';
    const contactsCount = item.emergencyContactIds?.length ?? 0;

    return (
      <View style={homeStyles.settingsCard}>
        <View style={homeStyles.settingsCardHeader}>
          <Text style={homeStyles.settingsCardTitle} numberOfLines={1}>
            {item.name || '(未命名)'}
          </Text>
          <View style={[homeStyles.settingsBadge, item.On ? homeStyles.settingsBadgeOn : homeStyles.settingsBadgeOff]}>
            <Text style={homeStyles.settingsBadgeText}>{item.On ? '啟用中' : '關閉'}</Text>
          </View>

          <TouchableOpacity
            style={homeStyles.settingsDeleteBtn}
            onPress={() => confirmDelete(item.id, item.name)}
            activeOpacity={0.7}
          >
            <Text style={homeStyles.settingsDeleteBtnText}>刪除</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={homeStyles.settingsRow}>
          <Text style={homeStyles.settingsLabel}>排程</Text>
          <Text style={homeStyles.settingsValue}>{days} · {time}</Text>
        </View> */}

        <View style={homeStyles.settingsRow}>
          <Text style={homeStyles.settingsLabel}>檢查間隔</Text>
          <Text style={homeStyles.settingsValue}>{item.checkIntervalMinutes ?? '—'} 分鐘</Text>
        </View>

        <View style={homeStyles.settingsRow}>
          <Text style={homeStyles.settingsLabel}>無回應閾值 / 回報倒數間隔</Text>
          <Text style={homeStyles.settingsValue}>
            {item.unresponsiveThreshold ?? '—'} 次 / {item.intervalReductionMinutes ?? '—'} 分
          </Text>
        </View>

        <View style={homeStyles.settingsRow}>
          <Text style={homeStyles.settingsLabel}>聯絡人</Text>
          <Text style={homeStyles.settingsValue}>{contactsCount} 位</Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[homeStyles.settingsSmallBtn, { backgroundColor: Theme.tracking_colors.coralRed }]}
            onPress={() => router.push({ pathname: '/tracking-mode/edit', params: { modeId: item.id } })}
          >
            <Text style={homeStyles.settingsSmallBtnText}>編輯模式</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // useEffect(() => {
  //   if (user) {
  //     console.log('User ID:', user.uid);
  //     console.log('Username:', user.username);
  //     console.log('Email:', user.email);
  //     console.log('Avatar URL:', user.avatarUrl);
  //     console.log('All properties:', Object.keys(user));
  //   } else {
  //     console.log('User is null or undefined');
  //   }
  // }, [user]);

  return (
    <SafeAreaView style={homeStyles.container}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 80, // Add extra padding for tab bar
          paddingHorizontal: 20,
          alignItems: 'center'
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* <View style={homeStyles.container}> */}

        <View style={homeStyles.headerContainer}>
          <ProfilePhotoUploader />

          <Text style={homeStyles.username}>
            {user?.displayName || user?.username || user?.nickname || user?.email || 'Unknown User'}
          </Text>
        </View>

        {/* Settings content starts here */}
        <View style={homeStyles.settingsSection}>
          <View style={homeStyles.settingsHeader}>

            <Text style={homeStyles.settingsTitle}>設定</Text>
            <Text style={homeStyles.settingsSub}>目前的追蹤模式</Text>
          </View>

          {settingsLoading ? (
            <View style={homeStyles.settingsCenter}>
              <ActivityIndicator size="large" color={Theme.colors.actionPink} />
              <Text style={homeStyles.settingsDim}>載入中…</Text>
            </View>
          ) : (
            <>
              {modes.length === 0 ? (
                <View style={homeStyles.settingsEmpty}>
                  <Text style={homeStyles.settingsEmptyTitle}>尚未建立任何追蹤模式</Text>
                  <Text style={homeStyles.settingsDim}>點擊下方按鈕新增一個吧！</Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={modes}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  contentContainerStyle={[
                    homeStyles.settingsListContent,
                    { paddingBottom: insets.bottom + 90 },
                  ]}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                />
              )}

              <TouchableOpacity
                style={[
                  homeStyles.settingsPrimaryBtn,
                  { bottom: insets.bottom + 12 },
                ]}
                onPress={() => router.push('/tracking-mode/new')}
                activeOpacity={0.8}
              >
                <Text style={homeStyles.settingsPrimaryText}>+ 建立追蹤模式</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {/* Settings content ends here */}

        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.actionOrange} />
        ) : (
          <Pressable
            onPress={signOut}
            style={[homeStyles.signOutButton, loading && homeStyles.disabledButton]}
            disabled={loading}
          >
            <Text style={homeStyles.signOutText}>
              Sign Out
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>

  );
}

const homeStyles = StyleSheet.create({
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
    marginBottom: 24,
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
    paddingTop: 20, // Adjust as needed
  },
  settingsDeleteBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fee2e2', // 淺紅
  },
  settingsDeleteBtnText: {
    color: '#b91c1c', // 深紅
    fontWeight: '700',
    fontSize: 12,
  },
  settingsHeader: {
    paddingLeft: 48,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative'
  },
  settingsTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827'
  },
  settingsSub: {
    flex: 1,
    marginTop: 4,
    color: '#6b7280'
  },

  settingsListContent: { paddingHorizontal: 16 },

  settingsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  settingsCardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  settingsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  settingsBadgeOn: { backgroundColor: '#dcfce7' },
  settingsBadgeOff: { backgroundColor: '#f3f4f6' },
  settingsBadgeText: { color: '#111827', fontWeight: '600', fontSize: 12 },

  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  settingsLabel: { color: '#6b7280' },
  settingsValue: { color: '#111827', fontWeight: '600' },

  settingsSmallBtn: {
    backgroundColor: Theme.tracking_colors.coralRed, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: Theme.radii.xl, marginRight: 8,
  },
  settingsSmallBtnText: { color: '#fff', fontWeight: '700' },

  settingsPrimaryBtn: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: Theme.tracking_colors.coralRed, borderRadius: Theme.radii.xl,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: 'grey', shadowOpacity: 0.3, shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  settingsPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  settingsCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  settingsEmpty: { alignItems: 'center', marginTop: 24, paddingHorizontal: 16 },
  settingsEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  settingsDim: { color: '#6b7280' },
});
