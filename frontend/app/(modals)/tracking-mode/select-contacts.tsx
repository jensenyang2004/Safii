import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image } from 'react-native';
import * as Theme from '@/constants/Theme';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { uiParameters } from '@/constants/Theme';

type FriendItem = {
  id: string;
  friendUid: string;
  displayName?: string;
  avatarUrl?: string;
};

export default function SelectContactsScreen() {
  const { user } = useAuth();
  const { modeId } = useLocalSearchParams<{ modeId: string }>();

  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // 存 friendUid


  // 讀我的 friends 清單 & 讀該 mode 目前已選 contactIds
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;

      try {
        // 1) 抓朋友清單
        const friendsCol = collection(db, 'users', user.uid, 'friends');
        const snap = await getDocs(friendsCol);

        console.log("🔥 Friends raw snapshot:", snap.docs.map(d => ({ id: d.id, data: d.data() })));

        const list: FriendItem[] = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as any;
            const friendUid = data.friendUid ?? d.id;

            // 🔥 再到 users/{friendUid} 抓 user profile
            const userRef = doc(db, 'users', friendUid);
            const userSnap = await getDoc(userRef);

            let displayName = '(未命名)';
            let avatarUrl: string | undefined;
            if (userSnap.exists()) {
              const userData = userSnap.data() as any;
              displayName = userData.displayName ?? userData.username ?? userData.email ?? '(未命名)';
              avatarUrl = userData.avatarUrl ?? userData.photoURL;
            }

            return {
              id: d.id,
              friendUid,
              displayName,
              avatarUrl,
            };
          })
        );


        setFriends(list);

        // 2) 抓報平安目前的 emergencyContactIds
        if (modeId) {
          const modeRef = doc(db, 'TrackingMode', String(modeId));
          const modeSnap = await getDoc(modeRef);
          if (modeSnap.exists()) {
            const m = modeSnap.data() as any;
            const picked = new Set<string>((m.emergencyContactIds ?? []) as string[]);
            setSelected(picked);
          }
        }
      } catch (e) {
        console.error(e);
        Alert.alert('讀取失敗', '請稍後再試');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, modeId]);

  const toggle = (friendUid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(friendUid) ? next.delete(friendUid) : next.add(friendUid);
      return next;
    });
  };

  const onSave = async () => {
    if (!modeId) {
      Alert.alert('錯誤', '缺少 modeId');
      return;
    }
    try {
      const modeRef = doc(db, 'TrackingMode', String(modeId));
      await updateDoc(modeRef, {
        emergencyContactIds: Array.from(selected),
        updatedAt: new Date(),
      });
      // Alert.alert('已儲存', '已更新通知聯絡人', [
      //   { text: 'OK', onPress: () => router.dismissAll() }
      // ]);
      // router.back();
      // router.dismiss(2)
      router.back();
      // router.replace('/(tabs)/home');   
    } catch (e) {
      console.error(e);
      Alert.alert('儲存失敗', '請稍後再試');
      // router.replace('/(tabs)/home');   
    }
  };

  const selectedCount = useMemo(() => selected.size, [selected]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>選擇緊急聯絡人</Text>
          <Text style={styles.sub}>已選 {selectedCount} 位</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.friendUid}
          contentContainerStyle={friends.length ? { paddingHorizontal: 20 } : styles.center}
          renderItem={({ item }) => {
            const checked = selected.has(item.friendUid);
            const initial = (item.displayName || 'U')[0].toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => toggle(item.friendUid)}
                style={styles.row}
                activeOpacity={0.7}
              >
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
                <Text style={styles.name}>{item.displayName}</Text>
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>你還沒有任何好友</Text>}
        />
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading}>
        <Text style={styles.saveText}>儲存</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 4, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray100,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: Theme.colors.gray75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginLeft: 12,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: uiParameters.buttons.setting.edit, borderColor: uiParameters.buttons.setting.edit },
  checkMark: { color: 'white', fontWeight: '900' },
  empty: { color: '#9CA3AF' },

  saveBtn: {
    backgroundColor: uiParameters.buttons.setting.save,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});