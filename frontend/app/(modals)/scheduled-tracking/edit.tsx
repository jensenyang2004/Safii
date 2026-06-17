// frontend/app/(modals)/scheduled-tracking/edit.tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Alert, Switch, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Theme from '@/constants/Theme';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';
import { useFriends } from '@/context/FriendProvider';
import { ScheduledTrackingDestination } from '@/types/scheduledTracking';

const INK = '#15223F';
const CREAM = Theme.colors.brandOffWhite;
const TEAL = Theme.colors.edit;

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function EditScheduleScreen() {
    const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
    const { schedules, updateSchedule } = useScheduledTracking();
    const { friends } = useFriends();
    const saving = React.useRef(false);

    const schedule = schedules.find(s => s.id === scheduleId);

    const [name, setName] = useState('');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [useDefaultHome, setUseDefaultHome] = useState(true);
    const [destAddress, setDestAddress] = useState('');
    const [destLat, setDestLat] = useState('');
    const [destLng, setDestLng] = useState('');
    const [destRadius, setDestRadius] = useState('100');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [unresponsiveThreshold, setUnresponsiveThreshold] = useState('3');
    const [activity, setActivity] = useState('');
    const [notes, setNotes] = useState('');

    // Populate form when schedule loads from context
    useEffect(() => {
        if (!schedule) return;
        setName(schedule.name);
        setDaysOfWeek(schedule.daysOfWeek);
        setStartTime(schedule.startTime);
        setEndTime(schedule.endTime);
        setUseDefaultHome(schedule.destination?.useDefaultHome ?? true);
        setDestAddress(schedule.destination?.address ?? '');
        setDestLat(schedule.destination?.lat?.toString() ?? '');
        setDestLng(schedule.destination?.lng?.toString() ?? '');
        setDestRadius(schedule.destination?.radius?.toString() ?? '100');
        setSelectedContactIds(schedule.emergencyContactIds ?? []);
        setUnresponsiveThreshold(schedule.unresponsiveThreshold?.toString() ?? '3');
        setActivity(schedule.activity ?? '');
        setNotes(schedule.notes ?? '');
    }, [schedule?.id]);

    const toggleDay = (day: number) =>
        setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

    const toggleContact = (id: string) =>
        setSelectedContactIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

    const validate = () => {
        if (!name.trim()) { Alert.alert('請輸入排程名稱'); return false; }
        if (daysOfWeek.length === 0) { Alert.alert('請至少選擇一天'); return false; }
        if (!startTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('請輸入正確的開始時間（HH:MM）'); return false; }
        if (!endTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('請輸入正確的結束時間（HH:MM）'); return false; }
        if (!useDefaultHome && (!destLat || !destLng)) {
            Alert.alert('請輸入目的地座標'); return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (saving.current || !scheduleId) return;
        if (!validate()) return;
        saving.current = true;

        const destination: ScheduledTrackingDestination = useDefaultHome
            ? { useDefaultHome: true, lat: 0, lng: 0, radius: Number(destRadius) || 100, address: '' }
            : {
                useDefaultHome: false,
                lat: Number(destLat),
                lng: Number(destLng),
                radius: Number(destRadius) || 100,
                address: destAddress.trim(),
            };

        try {
            await updateSchedule(scheduleId, {
                name: name.trim(),
                daysOfWeek,
                startTime,
                endTime,
                destination,
                emergencyContactIds: selectedContactIds,
                unresponsiveThreshold: Number(unresponsiveThreshold) || 3,
                activity: activity.trim(),
                notes: notes.trim(),
            });
            router.back();
        } catch {
            Alert.alert('錯誤', '儲存失敗，請稍後再試。');
        } finally {
            saving.current = false;
        }
    };

    if (!schedule) {
        return (
            <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={TEAL} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={INK} />
                </TouchableOpacity>
                <Text style={styles.title}>編輯排程</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>儲存</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>排程名稱</Text>
                <TextInput allowFontScaling={false} style={styles.input} value={name} onChangeText={setName} placeholderTextColor={Theme.colors.gray400} />

                <Text style={styles.label}>重複日</Text>
                <View style={styles.dayRow}>
                    {DAY_LABELS.map((label, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => toggleDay(i)}
                            style={[styles.dayChip, daysOfWeek.includes(i) && styles.dayChipActive]}
                        >
                            <Text style={[styles.dayText, daysOfWeek.includes(i) && styles.dayTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>開始時間</Text>
                        <TextInput allowFontScaling={false} style={styles.input} value={startTime} onChangeText={setStartTime} placeholderTextColor={Theme.colors.gray400} />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>結束時間</Text>
                        <TextInput allowFontScaling={false} style={styles.input} value={endTime} onChangeText={setEndTime} placeholderTextColor={Theme.colors.gray400} />
                    </View>
                </View>

                <Text style={styles.label}>目的地</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>使用預設家位置</Text>
                    <Switch value={useDefaultHome} onValueChange={setUseDefaultHome} trackColor={{ true: TEAL }} thumbColor="#fff" />
                </View>
                {!useDefaultHome && (
                    <View style={{ gap: 8 }}>
                        <TextInput allowFontScaling={false} style={styles.input} placeholder="地址描述" value={destAddress} onChangeText={setDestAddress} placeholderTextColor={Theme.colors.gray400} />
                        <View style={styles.row}>
                            <TextInput allowFontScaling={false} style={[styles.input, { flex: 1 }]} placeholder="緯度" value={destLat} onChangeText={setDestLat} keyboardType="numeric" placeholderTextColor={Theme.colors.gray400} />
                            <View style={{ width: 8 }} />
                            <TextInput allowFontScaling={false} style={[styles.input, { flex: 1 }]} placeholder="經度" value={destLng} onChangeText={setDestLng} keyboardType="numeric" placeholderTextColor={Theme.colors.gray400} />
                        </View>
                    </View>
                )}
                <View style={[styles.row, { marginTop: 8 }]}>
                    <Text style={[styles.switchLabel, { flex: 1 }]}>到達判定半徑（公尺）</Text>
                    <TextInput allowFontScaling={false} style={[styles.input, { width: 80, textAlign: 'center' }]} value={destRadius} onChangeText={setDestRadius} keyboardType="numeric" placeholderTextColor={Theme.colors.gray400} />
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/(modals)/scheduled-tracking/set-home')}
                    style={styles.setHomeBtn}
                >
                    <Ionicons name="home-outline" size={16} color={TEAL} />
                    <Text style={styles.setHomeBtnText}>設定預設家位置</Text>
                </TouchableOpacity>

                <Text style={styles.label}>緊急聯絡人</Text>
                {friends.length === 0 ? (
                    <Text style={styles.hint}>尚無好友</Text>
                ) : (
                    friends.map(f => (
                        <TouchableOpacity key={f.id} onPress={() => toggleContact(f.id)} style={styles.contactRow}>
                            {f.avatarUrl ? (
                                <Image source={{ uri: f.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={16} color={Theme.colors.gray400} />
                                </View>
                            )}
                            <Text style={styles.contactName}>{f.displayName || f.username}</Text>
                            {selectedContactIds.includes(f.id) && (
                                <Ionicons name="checkmark-circle" size={20} color={TEAL} />
                            )}
                        </TouchableOpacity>
                    ))
                )}

                <Text style={styles.label}>未回應視為緊急（次數）</Text>
                <TextInput allowFontScaling={false} style={styles.input} value={unresponsiveThreshold} onChangeText={setUnresponsiveThreshold} keyboardType="numeric" placeholderTextColor={Theme.colors.gray400} />

                <Text style={styles.label}>活動</Text>
                <TextInput allowFontScaling={false} style={styles.input} placeholder="例如：下班通勤" value={activity} onChangeText={setActivity} placeholderTextColor={Theme.colors.gray400} />

                <Text style={styles.label}>備註</Text>
                <TextInput allowFontScaling={false} style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="備註（選填）" value={notes} onChangeText={setNotes} multiline placeholderTextColor={Theme.colors.gray400} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CREAM },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    backBtn: { padding: 4 },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: INK },
    saveBtn: { padding: 4 },
    saveBtnText: { color: TEAL, fontSize: 16, fontWeight: '600' },
    body: { padding: 16, paddingBottom: 60 },
    label: { fontSize: 14, fontWeight: '600', color: INK, marginTop: 18, marginBottom: 6 },
    input: {
        backgroundColor: '#fff', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 15, color: INK, borderWidth: 1, borderColor: Theme.colors.gray100,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end' },
    dayRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    dayChip: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.colors.gray200,
        alignItems: 'center', justifyContent: 'center',
    },
    dayChipActive: { backgroundColor: INK, borderColor: INK },
    dayText: { fontSize: 13, color: Theme.colors.gray600 },
    dayTextActive: { color: '#fff', fontWeight: '700' },
    switchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 10,
        padding: 12, borderWidth: 1, borderColor: Theme.colors.gray100, marginBottom: 8,
    },
    switchLabel: { flex: 1, fontSize: 14, color: INK },
    setHomeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4, paddingVertical: 6 },
    setHomeBtnText: { color: TEAL, fontSize: 14, fontWeight: '500' },
    contactRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6,
        borderWidth: 1, borderColor: Theme.colors.gray100, gap: 10,
    },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: { backgroundColor: Theme.colors.gray100, alignItems: 'center', justifyContent: 'center' },
    contactName: { flex: 1, fontSize: 14, color: INK },
    hint: { fontSize: 13, color: Theme.colors.gray400, marginTop: 4 },
});
