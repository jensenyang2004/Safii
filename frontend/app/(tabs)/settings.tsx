// app/(tabs)/settings.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
    View, Text, FlatList, TouchableOpacity, ActivityIndicator,
    RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';

import { useAuth } from '@/context/AuthProvider';
import {
    collection, query, where, orderBy, onSnapshot, getDocs,
} from 'firebase/firestore';
import { useTracking } from '@/context/TrackProvider';

type TrackingMode = {
    id: string;
    name: string;
    userId: string;
    On: boolean;
    autoStart: boolean;
    checkIntervalMinutes: number;
    unresponsiveThreshold: number;
    intervalReductionMinutes: number;
    startTime: {
        dayOfWeek: string[];
        time: string;
    };
    emergencyContactIds: string[];
};

// async function deleteTrackingMode(modeId: string) {
//     return deleteDoc(doc(db, 'TrackingMode', modeId));
// }

// // need to add cloud functions for subset deletion
// function confirmDelete(modeId: string, modeName?: string) {
//     Alert.alert(
//         '刪除確認',
//         `確定要刪除「${modeName || '未命名模式'}」嗎？此動作無法復原。`,
//         [
//             { text: '取消', style: 'cancel' },
//             {
//                 text: '刪除',
//                 style: 'destructive',
//                 onPress: async () => {
//                     try {
//                         await deleteTrackingMode(modeId);
//                         // 若你的列表是 onSnapshot 監聽，畫面會自動刷新
//                     } catch (e) {
//                         console.error(e);
//                         Alert.alert('刪除失敗', '請稍後再試');
//                     }
//                 },
//             },
//         ],
//     );
// }

interface TrackingContext {
    deleteTrackingMode: (modeId: string) => Promise<void>;
}

export default function SettingsScreen() {
    const { user } = useAuth();
    const [modes, setModes] = useState<TrackingMode[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const trackingContext = useTracking() as TrackingContext | null;


    if (!trackingContext) {
        console.error('Tracking context is null');
        return <Text>Error: Tracking context is unavailable</Text>;
    }

    const { deleteTrackingMode } = trackingContext;

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
                            await deleteTrackingMode(modeId); // Use context function
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
            setLoading(false);
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
                setLoading(false);
            },
            (err) => {
                console.error(err);
                Alert.alert('讀取失敗', '無法載入 Tracking 模式');
                setLoading(false);
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
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name || '(未命名)'}
                    </Text>
                    <View style={[styles.badge, item.On ? styles.badgeOn : styles.badgeOff]}>
                        <Text style={styles.badgeText}>{item.On ? '啟用中' : '關閉'}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => confirmDelete(item.id, item.name)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.deleteBtnText}>刪除</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>排程</Text>
                    <Text style={styles.value}>{days} · {time}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>檢查間隔</Text>
                    <Text style={styles.value}>{item.checkIntervalMinutes ?? '—'} 分鐘</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>無回應閾值 / 縮短間隔</Text>
                    <Text style={styles.value}>
                        {item.unresponsiveThreshold ?? '—'} 次 / {item.intervalReductionMinutes ?? '—'} 分
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>聯絡人</Text>
                    <Text style={styles.value}>{contactsCount} 位</Text>
                </View>

                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => router.push({ pathname: '/tracking-mode/select-contacts', params: { modeId: item.id } })}
                    >
                        <Text style={styles.smallBtnText}>編輯聯絡人</Text>
                    </TouchableOpacity>

                    {/* 若未來要做完整編輯頁
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#111827' }]}
            onPress={() => router.push({ pathname: '/tracking-mode/edit/[modeId]', params: { modeId: item.id } })}
          >
            <Text style={styles.smallBtnText}>編輯模式</Text>
          </TouchableOpacity>
          */}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.title}>設定</Text>
                <Text style={styles.sub}>目前的 Tracking 模式</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.dim}>載入中…</Text>
                </View>
            ) : (
                <>
                    {modes.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>尚未建立任何 Tracking 模式</Text>
                            <Text style={styles.dim}>點擊下方按鈕新增一個吧！</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={modes}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={[
                                styles.listContent,
                                { paddingBottom: tabBarHeight + insets.bottom + 90 },
                            ]}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                        />
                    )}

                    <TouchableOpacity
                        style={[
                            styles.primaryBtn,
                            { bottom: tabBarHeight + insets.bottom + 12 },
                        ]}
                        onPress={() => router.push('/tracking-mode/new')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryText}>+ 建立 Tracking 模式</Text>
                    </TouchableOpacity>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    deleteBtn: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#fee2e2', // 淺紅
    },
    deleteBtnText: {
        color: '#b91c1c', // 深紅
        fontWeight: '700',
        fontSize: 12,
    },
    safe: { flex: 1, backgroundColor: '#f9fafb' },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#111827' },
    sub: { marginTop: 4, color: '#6b7280' },

    listContent: { paddingHorizontal: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeOn: { backgroundColor: '#dcfce7' },
    badgeOff: { backgroundColor: '#f3f4f6' },
    badgeText: { color: '#111827', fontWeight: '600', fontSize: 12 },

    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    label: { color: '#6b7280' },
    value: { color: '#111827', fontWeight: '600' },

    smallBtn: {
        backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 10, marginRight: 8,
    },
    smallBtnText: { color: '#fff', fontWeight: '700' },

    primaryBtn: {
        position: 'absolute', left: 16, right: 16,
        backgroundColor: '#2563eb', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        shadowColor: '#2563eb', shadowOpacity: 0.25, shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 24, paddingHorizontal: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    dim: { color: '#6b7280' },
});