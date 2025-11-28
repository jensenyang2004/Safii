import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';
import { useLocalSearchParams, router } from 'expo-router';
import * as Theme from '@/constants/Theme';

export default function EditTrackingModeScreen() {
    const { modeId } = useLocalSearchParams() as { modeId?: string };
    const { trackingModes, updateTrackingMode } = useTracking();
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [activityLocation, setActivityLocation] = useState('');
    const [activity, setActivity] = useState('');
    const [notes, setNotes] = useState('');
    const [checkIntervalMinutes, setCheckIntervalMinutes] = useState('5');
    const [unresponsiveThreshold, setUnresponsiveThreshold] = useState('3');
    const [intervalReductionMinutes, setIntervalReductionMinutes] = useState('1');
    const [dayOfWeek, setDayOfWeek] = useState('Monday');
    const [startTime, setStartTime] = useState('19:00');

    useEffect(() => {
        if (!modeId) return;
        const mode = trackingModes.find((m: any) => m.id === modeId);
        if (mode) {
            setName(mode.name || '');
            setActivityLocation(mode.activityLocation || '');
            setActivity(mode.activity || '');
            setNotes(mode.notes || '');
            setCheckIntervalMinutes(String(mode.checkIntervalMinutes ?? 5));
            setUnresponsiveThreshold(String(mode.unresponsiveThreshold ?? 3));
            setIntervalReductionMinutes(String(mode.intervalReductionMinutes ?? 1));
            setDayOfWeek((mode.startTime?.dayOfWeek && mode.startTime.dayOfWeek[0]) || 'Monday');
            setStartTime(mode.startTime?.time || '19:00');
        }
        setLoading(false);
    }, [modeId, trackingModes]);

    const handleSave = async () => {
        if (!modeId) return;
        try {
            await updateTrackingMode(modeId, {
                name: name.trim(),
                activityLocation: activityLocation.trim(),
                activity: activity.trim(),
                notes: notes.trim(),
                checkIntervalMinutes: Number(checkIntervalMinutes) || 5,
                unresponsiveThreshold: Number(unresponsiveThreshold) || 3,
                intervalReductionMinutes: Number(intervalReductionMinutes) || 1,
                startTime: { dayOfWeek: [dayOfWeek], time: startTime },
            } as any);

            Alert.alert('成功', '已更新追蹤模式');
            router.back();
        } catch (e) {
            console.error('Failed to update mode', e);
            Alert.alert('錯誤', '更新失敗，請稍後再試');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>載入中...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.title}>編輯追蹤模式</Text>
                    </View>
                    {/* <ScrollView contentContainerStyle={styles.scrollContainer}> */}
                        <View style={[styles.card, { backgroundColor: Theme.colors.brandOffWhite }]}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>模式名稱</Text>
                                <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={30} />
                            </View>
                            <View style={styles.fieldGroup}>
                                <View style={styles.row}>
                                    <Text style={styles.label}>確認安全間隔</Text>
                                    <View style={styles.inputWithUnit}>
                                        <TextInput style={styles.smallInput} keyboardType="number-pad" value={checkIntervalMinutes} onChangeText={setCheckIntervalMinutes} maxLength={3} />
                                        <Text style={styles.unit}>分鐘</Text>
                                    </View>
                                </View>
                            </View>
                            {/* <View style={styles.fieldGroup}>
                        <View style={styles.row}>
                            <Text style={styles.label}>無回應幾次後發出警報</Text>
                            <View style={styles.inputWithUnit}>
                                <TextInput style={styles.smallInput} keyboardType="number-pad" value={unresponsiveThreshold} onChangeText={setUnresponsiveThreshold} maxLength={2} />
                                <Text style={styles.unit}>次</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.fieldGroup}>
                        <View style={styles.row}>
                            <Text style={styles.label}>警報倒數時間</Text>
                            <View style={styles.inputWithUnit}>
                                <TextInput style={styles.smallInput} keyboardType="number-pad" value={intervalReductionMinutes} onChangeText={setIntervalReductionMinutes} maxLength={2} />
                                <Text style={styles.unit}>分鐘</Text>
                            </View>
                        </View>
                    </View> */}
                        </View>

                        <View style={[styles.card, { backgroundColor: Theme.colors.brandOffWhite }]}>
                            <Text style={styles.cardTitle}>補充資訊 (選填)</Text>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>活動地點</Text>
                                <TextInput style={styles.input} value={activityLocation} onChangeText={setActivityLocation} maxLength={50} />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>活動</Text>
                                <TextInput style={styles.input} value={activity} onChangeText={setActivity} maxLength={30} />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>備註</Text>
                                <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} maxLength={100} multiline />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: Theme.tracking_colors.coralRed }]}
                            onPress={() => {
                                if (!modeId) return;
                                router.push({ pathname: '/tracking-mode/select-contacts', params: { modeId } });
                            }}
                        >
                            <Text style={styles.saveText}>編輯聯絡人</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveText}>儲存變更</Text>
                        </TouchableOpacity>
                    </ScrollView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        top: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    scrollContainer: {
        padding: 16,
    },
    introText: {
        fontSize: 15,
        color: '#4b5563',
        marginBottom: 20,
        lineHeight: 22,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: Theme.radii.xl,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderRadius: Theme.radii.xl,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputWithUnit: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    smallInput: {
        backgroundColor: '#f9fafb',
        borderRadius: Theme.radii.xl,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        width: 80,
        textAlign: 'center',
    },
    unit: {
        fontSize: 16,
        color: '#4b5563',
    },
    helperText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 8,
        lineHeight: 18,
    },
    saveBtn: {
        marginTop: 12,
        backgroundColor: '#2563eb',
        borderRadius: Theme.radii.xl,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    saveText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    saveBtnSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    saveBtnSecondaryText: {
        color: '#1f2937',
        fontWeight: '600',
    },
});
