import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Theme from '@/constants/Theme';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';

const INK = '#15223F';
const TEAL = Theme.colors.edit;
const GREEN = Theme.colors.greenSuccess;
const PINK = Theme.colors.brandPink;

function useCountdown(targetMs: number | null): string {
    const [remaining, setRemaining] = useState('');

    useEffect(() => {
        if (!targetMs) { setRemaining('—'); return; }
        const tick = () => {
            const diff = targetMs - Date.now();
            if (diff <= 0) { setRemaining('已到時'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setRemaining(`${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [targetMs]);

    return remaining;
}

export default function CurrentTrackingScreen() {
    const { activeSession, schedules, markArrivedHome, stopActiveSession } = useScheduledTracking();

    const schedule = activeSession
        ? schedules.find(s => s.id === activeSession.scheduleId)
        : null;

    const endTimeMs = activeSession?.scheduledEndTime
        ? (activeSession.scheduledEndTime as any).toMillis?.() ?? null
        : null;

    const countdown = useCountdown(endTimeMs);

    const handleArrived = () => {
        Alert.alert('確認到家', '標記為已安全到家？', [
            { text: '取消', style: 'cancel' },
            {
                text: '確認',
                onPress: async () => {
                    await markArrivedHome();
                    Alert.alert('✅ 已標記', '到時間後報平安將自動結束。');
                },
            },
        ]);
    };

    const handleStop = () => {
        Alert.alert('停止報平安', '確定要提早停止這次報平安？', [
            { text: '取消', style: 'cancel' },
            {
                text: '停止',
                style: 'destructive',
                onPress: async () => {
                    await stopActiveSession();
                    router.back();
                },
            },
        ]);
    };

    if (!activeSession) {
        return (
            <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="checkmark-circle-outline" size={64} color={GREEN} />
                <Text style={styles.noSessionText}>目前沒有進行中的排程報平安</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>返回</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const statusLabel: Record<string, string> = {
        tracking: '報平安中',
        notifying: '緊急通報中',
        safe_arrived: '已安全到家',
        safe_stopped: '已停止',
        completed: '已完成',
    };

    const isTracking = activeSession.overallStatus === 'tracking';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-down" size={24} color={INK} />
                </TouchableOpacity>
                <Text style={styles.title}>報平安狀態</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.body}>
                {/* Status badge */}
                <View style={[styles.statusBadge, isTracking && styles.statusBadgeActive]}>
                    <Ionicons
                        name={isTracking ? 'radio-button-on' : 'alert-circle'}
                        size={16}
                        color={isTracking ? GREEN : PINK}
                    />
                    <Text style={[styles.statusText, isTracking && styles.statusTextActive]}>
                        {statusLabel[activeSession.overallStatus] ?? activeSession.overallStatus}
                    </Text>
                </View>

                {/* Schedule name */}
                <Text style={styles.scheduleName}>{schedule?.name ?? '自動排程'}</Text>

                {/* End time countdown */}
                {isTracking && (
                    <View style={styles.countdownCard}>
                        <Text style={styles.countdownLabel}>距離結束判定</Text>
                        <Text style={styles.countdownValue}>{countdown}</Text>
                        {activeSession.destination?.address ? (
                            <Text style={styles.destText}>
                                目的地：{activeSession.destination.address}
                            </Text>
                        ) : null}
                    </View>
                )}

                {/* hasArrivedHome indicator */}
                {activeSession.hasArrivedHome && (
                    <View style={styles.arrivedBanner}>
                        <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                        <Text style={styles.arrivedText}>已標記到家，結束時將自動判定安全</Text>
                    </View>
                )}

                {/* Actions */}
                {isTracking && (
                    <View style={styles.actions}>
                        {!activeSession.hasArrivedHome && (
                            <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived}>
                                <Ionicons name="home" size={20} color="#fff" />
                                <Text style={styles.arrivedBtnText}>我到家了</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                            <Ionicons name="stop-circle-outline" size={20} color={PINK} />
                            <Text style={styles.stopBtnText}>立即停止報平安</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Info row */}
                {schedule && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>排程時段</Text>
                        <Text style={styles.infoValue}>{schedule.startTime} – {schedule.endTime}</Text>
                        {schedule.activity ? (
                            <>
                                <Text style={styles.infoLabel}>活動</Text>
                                <Text style={styles.infoValue}>{schedule.activity}</Text>
                            </>
                        ) : null}
                        <Text style={styles.infoLabel}>緊急聯絡人</Text>
                        <Text style={styles.infoValue}>
                            {schedule.emergencyContactIds.length > 0
                                ? `${schedule.emergencyContactIds.length} 位`
                                : '未設定'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.brandOffWhite },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    backBtn: { padding: 4 },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: INK },
    body: { padding: 20, alignItems: 'center', paddingBottom: 60 },

    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Theme.colors.gray100, marginBottom: 12,
    },
    statusBadgeActive: { backgroundColor: '#E6F9F2' },
    statusText: { fontSize: 14, fontWeight: '600', color: Theme.colors.gray600 },
    statusTextActive: { color: GREEN },

    scheduleName: { fontSize: 24, fontWeight: '700', color: INK, marginBottom: 24, textAlign: 'center' },

    countdownCard: {
        width: '100%', backgroundColor: '#fff',
        borderRadius: 16, padding: 20, alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    countdownLabel: { fontSize: 13, color: Theme.colors.gray500, marginBottom: 8 },
    countdownValue: { fontSize: 48, fontWeight: '700', color: INK, fontVariant: ['tabular-nums'] },
    destText: { fontSize: 13, color: Theme.colors.gray500, marginTop: 8 },

    arrivedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E6F9F2', borderRadius: 12,
        padding: 12, width: '100%', marginBottom: 16,
    },
    arrivedText: { flex: 1, fontSize: 13, color: GREEN, fontWeight: '500' },

    actions: { width: '100%', gap: 12, marginBottom: 24 },
    arrivedBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
    },
    arrivedBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    stopBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: PINK, borderRadius: 14, paddingVertical: 14,
    },
    stopBtnText: { color: PINK, fontSize: 16, fontWeight: '600' },

    infoCard: {
        width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    infoLabel: { fontSize: 12, color: Theme.colors.gray400, marginTop: 10, marginBottom: 2 },
    infoValue: { fontSize: 15, color: INK, fontWeight: '500' },

    noSessionText: { fontSize: 16, color: Theme.colors.gray500, marginTop: 16, marginBottom: 24 },
    backLink: { paddingVertical: 10 },
    backLinkText: { color: TEAL, fontSize: 16 },
});
