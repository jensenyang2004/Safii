// frontend/components/TrackingModeForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ScrollView, TouchableWithoutFeedback, Keyboard,
    Platform, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Theme from '@/constants/Theme';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';
import ContactPickerModal from '@/components/Tracking/ContactPickerModal';

const INK = '#15223F';
const PINK = Theme.colors.brandPink;
const CREAM = Theme.colors.brandOffWhite;
const TEAL = Theme.colors.edit;
const INTERVAL_PRESETS = [5, 10, 15, 30, 45, 60];
const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Props = { mode: 'new' | 'edit' };

export default function TrackingModeForm({ mode }: Props) {
    const { modeId } = useLocalSearchParams() as { modeId?: string };
    const { schedules, createSchedule, updateSchedule } = useScheduledTracking();
    const saving = useRef(false);
    const [loaded, setLoaded] = useState(mode === 'new');

    const [name, setName] = useState('');
    const [activity, setActivity] = useState('');
    const [notes, setNotes] = useState('');
    const [checkIntervalMinutes, setCheckIntervalMinutes] = useState('15');
    const [isManualOnly, setIsManualOnly] = useState(true);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
    const [pickerDate, setPickerDate] = useState(new Date());
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [contactModalVisible, setContactModalVisible] = useState(false);

    useEffect(() => {
        if (mode !== 'edit' || !modeId) return;
        const s = schedules.find(sc => sc.id === modeId);
        if (!s) return;
        setName(s.name || '');
        setActivity(s.activity || '');
        setNotes(s.notes || '');
        setCheckIntervalMinutes(String(s.checkIntervalMinutes ?? 15));
        setIsManualOnly(s.isManualOnly ?? (s.daysOfWeek?.length === 0));
        setDaysOfWeek(s.daysOfWeek ?? []);
        setStartTime(s.startTime || '09:00');
        setEndTime(s.endTime || '10:00');
        setSelectedContactIds(s.emergencyContactIds ?? []);
        setLoaded(true);
    }, [mode, modeId, schedules.length]);

    const ratioText = useMemo(() => {
        const n = Number(checkIntervalMinutes) || 1;
        const r = 60 / n;
        return `約 ${Number.isInteger(r) ? r : Math.round(r * 10) / 10}`;
    }, [checkIntervalMinutes]);

    const toggleDay = (day: number) =>
        setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

    const timeStringToDate = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const d = new Date();
        d.setHours(h || 0, m || 0, 0, 0);
        return d;
    };
    const dateToTimeString = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const openPicker = (target: 'start' | 'end') => {
        setPickerTarget(target);
        setPickerDate(timeStringToDate(target === 'start' ? startTime : endTime));
        setPickerVisible(true);
    };

    const commitPicker = (date?: Date) => {
        if (date) {
            const str = dateToTimeString(date);
            if (pickerTarget === 'start') setStartTime(str);
            else setEndTime(str);
        }
        setPickerVisible(false);
    };

    const validate = () => {
        if (!name.trim()) { Alert.alert('請輸入模式名稱'); return false; }
        return true;
    };

    const buildPayload = () => ({
        name: name.trim(),
        daysOfWeek,
        startTime,
        endTime,
        timezone: DEFAULT_TIMEZONE,
        destination: { useDefaultHome: true, lat: 0, lng: 0, radius: 100, address: '' },
        emergencyContactIds: selectedContactIds,
        checkIntervalMinutes: Number(checkIntervalMinutes) || 15,
        isManualOnly,
        unresponsiveThreshold: 3,
        activity: activity.trim(),
        notes: notes.trim(),
    });

    const handleSave = async () => {
        if (saving.current || !validate()) return;
        saving.current = true;
        try {
            if (mode === 'new') {
                await createSchedule({
                    ...buildPayload(),
                    isEnabled: true,
                });
            } else {
                await updateSchedule(modeId!, buildPayload());
            }
            router.back();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', mode === 'new' ? '建立失敗，請稍後再試' : '更新失敗，請稍後再試');
        } finally {
            saving.current = false;
        }
    };

    const isEdit = mode === 'edit';

    if (!loaded) {
        return (
            <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={TEAL} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={INK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? '編輯報平安' : '建立報平安'}</Text>
                <View style={styles.backButton} />
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

                    <Text style={styles.title}>多久確認一次安全？</Text>
                    <Text style={styles.subtitle}>
                        {isEdit
                            ? '定期確認您的狀況\n若未定時回覆安全狀況，SAFII將在 10 分鐘後通知聯絡人'
                            : '定期確認您的狀況\n若未定時回覆安全狀況，SAFII將在 10 分鐘後通知聯絡人'}
                    </Text>

                    {/* Interval hero */}
                    <View style={styles.heroCard}>
                        <View style={styles.heroRow}>
                            <Text style={styles.heroEvery}>每隔</Text>
                            <TextInput
            allowFontScaling={false}
                                style={styles.heroNum}
                                value={checkIntervalMinutes}
                                onChangeText={v => setCheckIntervalMinutes(v.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                maxLength={3}
                                selectTextOnFocus
                                placeholderTextColor={`${INK}60`}
                                placeholder="–"
                            />
                            <Text style={styles.heroUnit}>分鐘</Text>
                        </View>
                        <View style={styles.heroRatio}>
                            <Text style={styles.heroRatioText}>{ratioText}</Text>
                            <Text style={styles.heroRatioText}>次／小時</Text>
                        </View>
                    </View>
                    <FlatList
                        data={INTERVAL_PRESETS}
                        keyExtractor={v => String(v)}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipScroll}
                        renderItem={({ item: v }) => (
                            <TouchableOpacity
                                style={[styles.chip, String(v) === checkIntervalMinutes && styles.chipActive]}
                                activeOpacity={0.8}
                                onPress={() => setCheckIntervalMinutes(String(v))}>
                                <Text style={styles.chipNum}>{v}</Text>
                                <Text style={styles.chipUnit}>分</Text>
                            </TouchableOpacity>
                        )}
                    />

                    {/* Name */}
                    <Text style={styles.sectionLabel}>模式名稱</Text>
                    <View style={styles.nameField}>
                        {/* <Text style={styles.nameArrow}>↳</Text> */}
                        <TextInput allowFontScaling={false} style={styles.nameInput} placeholder="例如：下班回家、夜跑"
                            placeholderTextColor={Theme.colors.gray400} value={name} onChangeText={setName} maxLength={30} />
                    </View>

                    {/* Manual vs Scheduled toggle */}
                    <Text style={styles.sectionLabel}>開啟方式</Text>
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeOption, isManualOnly && styles.typeOptionActive]}
                            onPress={() => setIsManualOnly(true)} activeOpacity={0.8}>
                            <Text style={[styles.typeOptionText, isManualOnly && styles.typeOptionTextActive]}>手動開啟</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeOption, !isManualOnly && styles.typeOptionActive]}
                            onPress={() => setIsManualOnly(false)} activeOpacity={0.8}>
                            <Text style={[styles.typeOptionText, !isManualOnly && styles.typeOptionTextActive]}>自動排程</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Schedule — only shown for scheduled modes */}
                    {!isManualOnly && (
                        <>
                            <View style={styles.dayRow}>
                                {DAY_LABELS.map((label, i) => (
                                    <TouchableOpacity key={i} onPress={() => toggleDay(i)}
                                        style={[styles.dayChip, daysOfWeek.includes(i) && styles.dayChipActive]}>
                                        <Text style={[styles.dayText, daysOfWeek.includes(i) && styles.dayTextActive]}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.timeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>開始</Text>
                                    <TouchableOpacity style={styles.timeDisplay} onPress={() => openPicker('start')} activeOpacity={0.75}>
                                        <Ionicons name="time-outline" size={15} color={TEAL} />
                                        <Text style={styles.timeDisplayText}>{startTime}</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.timeSep}>→</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>結束</Text>
                                    <TouchableOpacity style={styles.timeDisplay} onPress={() => openPicker('end')} activeOpacity={0.75}>
                                        <Ionicons name="time-outline" size={15} color={TEAL} />
                                        <Text style={styles.timeDisplayText}>{endTime}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>活動</Text>
                        <TextInput allowFontScaling={false} style={styles.input} placeholder="例如：從公司走路回家"
                            placeholderTextColor={Theme.colors.gray400} value={activity} onChangeText={setActivity} maxLength={30} />
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>備註</Text>
                        <TextInput allowFontScaling={false} style={[styles.input, styles.multiline]} placeholder="例如：大概要20分鐘"
                            placeholderTextColor={Theme.colors.gray400} value={notes} onChangeText={setNotes} maxLength={100} multiline />
                    </View>

                    {/* Contact picker */}
                    <TouchableOpacity style={styles.contactPickerBtn}
                        onPress={() => setContactModalVisible(true)} activeOpacity={0.85}>
                        <Ionicons name="people-outline" size={18} color={TEAL} />
                        <Text style={styles.contactPickerText}>
                            {selectedContactIds.length > 0
                                ? `已選擇 ${selectedContactIds.length} 位緊急聯絡人`
                                : '選擇緊急聯絡人'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={Theme.colors.gray400} />
                    </TouchableOpacity>

                    {/* Save */}
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} activeOpacity={0.85}>
                        <View style={styles.recordDot}><View style={styles.recordDotInner} /></View>
                        <Text style={styles.primaryBtnText}>{isEdit ? '儲存變更' : '建立並儲存'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </TouchableWithoutFeedback>

            <ContactPickerModal
                visible={contactModalVisible}
                selectedIds={selectedContactIds}
                onClose={(ids) => { setSelectedContactIds(ids); setContactModalVisible(false); }}
            />

            {/* Time picker */}
            {pickerVisible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    display="default"
                    onChange={(_, date) => commitPicker(date)}
                />
            )}
            {Platform.OS === 'ios' && (
                <Modal visible={pickerVisible} transparent animationType="slide">
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerSheet}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                    <Text style={styles.pickerCancel}>取消</Text>
                                </TouchableOpacity>
                                <Text style={styles.pickerTitle}>
                                    {pickerTarget === 'start' ? '開始時間' : '結束時間'}
                                </Text>
                                <TouchableOpacity onPress={() => commitPicker(pickerDate)}>
                                    <Text style={styles.pickerDone}>完成</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={pickerDate}
                                mode="time"
                                display="spinner"
                                onChange={(_, date) => date && setPickerDate(date)}
                                locale="zh-TW"
                                style={{ height: 200 }}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: CREAM },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10,
    },
    backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: INK },
    scroll: { flex: 1 },
    scrollContainer: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

    title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5, color: INK, marginTop: 4 },
    subtitle: { fontSize: 13.5, lineHeight: 21, color: Theme.colors.gray600, marginTop: 10 },

    heroCard: { backgroundColor: PINK, borderRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, marginTop: 10 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
    heroEvery: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: INK, opacity: 0.75, marginBottom: 8, marginRight: 8 },
    heroNum: { fontSize: 56, lineHeight: 56, fontWeight: '800', letterSpacing: -2, color: INK, padding: 0, minWidth: 64 },
    heroUnit: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 8, marginLeft: 6 },
    heroRatio: { position: 'absolute', top: 16, right: 18, alignItems: 'flex-end' },
    heroRatioText: { fontSize: 11, fontWeight: '700', color: INK, opacity: 0.7, lineHeight: 15 },

    chipScroll: { paddingVertical: 10, gap: 8, paddingRight: 4 },
    chip: {
        width: 72, height: 52, borderRadius: 14, borderWidth: 1.6, borderColor: INK,
        backgroundColor: '#fff', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
    },
    chipActive: { backgroundColor: PINK },
    chipNum: { fontSize: 20, fontWeight: '800', color: INK },
    chipUnit: { fontSize: 11, fontWeight: '700', color: INK, opacity: 0.7, marginLeft: 3 },

    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: INK, opacity: 0.5, marginTop: 10, marginBottom: 8 },
    label: { fontSize: 12, fontWeight: '600', color: INK, opacity: 0.7, marginBottom: 6 },

    nameField: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderWidth: 1.6, borderColor: INK, borderRadius: 14, paddingHorizontal: 14, height: 50,
    },
    nameArrow: { color: INK, opacity: 0.4, marginRight: 8, fontSize: 15 },
    nameInput: { flex: 1, fontSize: 15, fontWeight: '700', color: INK, padding: 0 },

    dayRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
    dayChip: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#fff', borderWidth: 1.6, borderColor: INK,
        alignItems: 'center', justifyContent: 'center',
    },
    dayChipActive: { backgroundColor: INK },
    dayText: { fontSize: 13, fontWeight: '700', color: INK },
    dayTextActive: { color: '#fff' },

    timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    timeSep: { fontSize: 16, color: Theme.colors.gray400, paddingBottom: 10, paddingHorizontal: 2 },
    timeDisplay: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderWidth: 1.6, borderColor: INK, borderRadius: 12,
        paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    },
    timeDisplayText: { fontSize: 16, fontWeight: '700', color: INK },

    pickerOverlay: {
        flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)',
    },
    pickerSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 32,
    },
    pickerHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    pickerTitle: { fontSize: 16, fontWeight: '700', color: INK },
    pickerCancel: { fontSize: 16, color: Theme.colors.gray500 },
    pickerDone: { fontSize: 16, fontWeight: '700', color: TEAL },

    input: {
        backgroundColor: '#fff', borderWidth: 1.6, borderColor: INK, borderRadius: 12,
        paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
        fontSize: 14, fontWeight: '500', color: INK,
    },
    typeToggle: {
        flexDirection: 'row', backgroundColor: Theme.colors.gray75,
        borderRadius: 12, padding: 3, marginBottom: 12,
    },
    typeOption: {
        flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
    },
    typeOptionActive: { backgroundColor: INK },
    typeOptionText: { fontSize: 14, fontWeight: '700', color: INK },
    typeOptionTextActive: { color: '#fff' },
    fieldGroup: { marginTop: 10 },
    multiline: { minHeight: 60, textAlignVertical: 'top' },

    contactPickerBtn: {
        marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1.6, borderColor: TEAL, borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#fff',
    },
    contactPickerText: { flex: 1, fontSize: 15, fontWeight: '600', color: TEAL },

    primaryBtn: {
        marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: INK, borderRadius: 999, height: 58,
    },
    recordDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    recordDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: INK },
    primaryBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: 1, color: '#fff' },
});
