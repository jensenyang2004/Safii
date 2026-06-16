import React from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';
import { ScheduledTracking } from '@/types/scheduledTracking';
import * as Theme from '@/constants/Theme';

const INK = '#15223F';
const CREAM = Theme.colors.brandOffWhite;
const PINK = Theme.colors.brandPink;
const TEAL = Theme.colors.edit;

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function DayChips({ days }: { days: number[] }) {
    return (
        <View style={styles.dayRow}>
            {DAY_LABELS.map((label, i) => (
                <View
                    key={i}
                    style={[styles.dayChip, days.includes(i) && styles.dayChipActive]}
                >
                    <Text style={[styles.dayChipText, days.includes(i) && styles.dayChipTextActive]}>
                        {label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

function ScheduleCard({ item }: { item: ScheduledTracking }) {
    const { updateSchedule, deleteSchedule } = useScheduledTracking();

    const handleToggle = () => {
        updateSchedule(item.id, { isEnabled: !item.isEnabled });
    };

    const handleDelete = () => {
        Alert.alert('刪除排程', `確定要刪除「${item.name}」嗎？`, [
            { text: '取消', style: 'cancel' },
            {
                text: '刪除',
                style: 'destructive',
                onPress: () => deleteSchedule(item.id),
            },
        ]);
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/(modals)/scheduled-tracking/edit',
                                params: { scheduleId: item.id },
                            })
                        }
                        style={styles.iconBtn}
                    >
                        <Ionicons name="pencil-outline" size={18} color={TEAL} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={18} color={PINK} />
                    </TouchableOpacity>
                </View>
            </View>

            <DayChips days={item.daysOfWeek} />

            <Text style={styles.cardTime}>
                {item.startTime} – {item.endTime}
            </Text>

            {item.destination?.address ? (
                <Text style={styles.cardDest} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={Theme.colors.gray500} />{' '}
                    {item.destination.useDefaultHome ? '預設家' : item.destination.address}
                </Text>
            ) : null}

            <TouchableOpacity
                onPress={handleToggle}
                style={[styles.toggleBtn, item.isEnabled && styles.toggleBtnOn]}
            >
                <Text style={[styles.toggleText, item.isEnabled && styles.toggleTextOn]}>
                    {item.isEnabled ? '已啟用' : '已停用'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default function ScheduleListScreen() {
    const { schedules, loading, activeSession } = useScheduledTracking();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={INK} />
                </TouchableOpacity>
                <Text style={styles.title}>自動排程報平安</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(modals)/scheduled-tracking/new')}
                    style={styles.addBtn}
                >
                    <Ionicons name="add" size={24} color={TEAL} />
                </TouchableOpacity>
            </View>

            {/* Active session banner */}
            {activeSession && (
                <TouchableOpacity
                    style={styles.activeBanner}
                    onPress={() => router.push('/(modals)/scheduled-tracking/current')}
                >
                    <Ionicons name="radio-button-on" size={14} color="#fff" />
                    <Text style={styles.activeBannerText}>報平安中 — 點此查看</Text>
                    <Ionicons name="chevron-forward" size={14} color="#fff" />
                </TouchableOpacity>
            )}

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={TEAL} />
            ) : schedules.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="calendar-outline" size={48} color={Theme.colors.gray300} />
                    <Text style={styles.emptyText}>尚無排程</Text>
                    <Text style={styles.emptyHint}>點右上角 + 新增第一個排程</Text>
                </View>
            ) : (
                <FlatList
                    data={schedules}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <ScheduleCard item={item} />}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CREAM },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.gray100,
        backgroundColor: '#fff',
    },
    backBtn: { padding: 4 },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: INK },
    addBtn: { padding: 4 },

    activeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Theme.colors.greenSuccess,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    activeBannerText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardName: { flex: 1, fontSize: 16, fontWeight: '700', color: INK },
    cardActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 6 },
    dayRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
    dayChip: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: Theme.colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    dayChipActive: { backgroundColor: INK },
    dayChipText: { fontSize: 12, color: Theme.colors.gray500 },
    dayChipTextActive: { color: '#fff', fontWeight: '600' },
    cardTime: { fontSize: 15, color: INK, fontWeight: '500', marginBottom: 4 },
    cardDest: { fontSize: 13, color: Theme.colors.gray500, marginBottom: 10 },
    toggleBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.gray300,
    },
    toggleBtnOn: { borderColor: Theme.colors.greenSuccess, backgroundColor: '#E6F9F2' },
    toggleText: { fontSize: 13, color: Theme.colors.gray500 },
    toggleTextOn: { color: Theme.colors.greenSuccess, fontWeight: '600' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText: { fontSize: 16, color: Theme.colors.gray500, fontWeight: '600' },
    emptyHint: { fontSize: 13, color: Theme.colors.gray400 },
});
