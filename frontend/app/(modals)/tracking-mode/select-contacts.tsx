import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import { useLocalSearchParams, router } from 'expo-router';

type FriendItem = {
  id: string;           // friends 子文件 ID（可用朋友 uid 當 docId，更單純）
  friendUid: string;    // 對方使用者 uid（用這個存進 TrackingMode）
  displayName?: string; // 顯示用
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
            if (userSnap.exists()) {
              const userData = userSnap.data() as any;
              displayName = userData.displayName ?? userData.username ?? userData.email ?? '(未命名)';
            }

            return {
              id: d.id,
              friendUid,
              displayName,
            };
          })
        );


        setFriends(list);

        // 2) 抓追蹤模式目前的 emergencyContactIds
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
      Alert.alert('已儲存', '已更新通知聯絡人');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('儲存失敗', '請稍後再試');
    }
  };

  const selectedCount = useMemo(() => selected.size, [selected]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>選擇通知聯絡人</Text>
        <Text style={styles.sub}>已選 {selectedCount} 位</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.friendUid}
          contentContainerStyle={friends.length ? undefined : styles.center}
          renderItem={({ item }) => {
            const checked = selected.has(item.friendUid);
            return (
              <TouchableOpacity
                onPress={() => toggle(item.friendUid)}
                style={[styles.row, checked && styles.rowChecked]}
                activeOpacity={0.8}
              >
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
  header: { paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 4, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowChecked: { borderColor: '#2563EB' },
  name: { fontSize: 16, color: '#111827' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkMark: { color: 'white', fontWeight: '900' },
  empty: { color: '#9CA3AF' },

  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});