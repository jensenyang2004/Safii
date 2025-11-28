// app/tracking-mode/new.tsx
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Theme from '@/constants/Theme';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import { router } from 'expo-router';
import { useTracking } from '@/context/TrackProvider';

async function handleCreateAndPickContacts(userUid: string, fields: any) {
    // Persist a full TrackingMode document, then navigate to select contacts
    const docRef = await addDoc(collection(db, 'TrackingMode'), {
        userId: userUid,
        name: fields.name,
        activityLocation: fields.activityLocation,
        activity: fields.activity,
        notes: fields.notes,
        On: fields.on ?? false,
        autoStart: fields.autoStart ?? false,
        checkIntervalMinutes: Number(fields.checkIntervalMinutes) || 5,
        unresponsiveThreshold: Number(fields.unresponsiveThreshold) || 3,
        intervalReductionMinutes: Number(fields.intervalReductionMinutes) || 1,
        startTime: {
          dayOfWeek: fields.dayOfWeek ? [fields.dayOfWeek] : [],
          time: fields.startTime || '00:00',
        },
        emergencyContactIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Navigate to contact picker with the new mode id
    router.push({ pathname: '/tracking-mode/select-contacts', params: { modeId: docRef.id } });
}


export default function CreateTrackingModeScreen() {
    const { user } = useAuth();
    const { createTrackingMode } = useTracking();

    const [name, setName] = useState('');
    const [activityLocation, setActivityLocation] = useState('');
    const [activity, setActivity] = useState('');
    const [notes, setNotes] = useState('');
    const [checkIntervalMinutes, setCheckIntervalMinutes] = useState('5');
    const [unresponsiveThreshold, setUnresponsiveThreshold] = useState('3');
    const [intervalReductionMinutes, setIntervalReductionMinutes] = useState('1');
    const [dayOfWeek, setDayOfWeek] = useState('Monday');
    const [startTime, setStartTime] = useState('19:00');

    const saving = React.useRef(false);

    const handleSave = async () => {
        if (saving.current) return;
        if (!user?.uid) {
            Alert.alert('錯誤', '尚未登入');
            return;
        }
        if (!name.trim()) {
            Alert.alert('請輸入模式名稱');
            return;
        }

        saving.current = true;
        const newMode = {
            name: name.trim(),
            activityLocation: activityLocation.trim(),
            activity: activity.trim(),
            notes: notes.trim(),
            userId: user.uid,
            checkIntervalMinutes: Number(checkIntervalMinutes) || 5,
            unresponsiveThreshold: Number(unresponsiveThreshold) || 3,
            intervalReductionMinutes: Number(intervalReductionMinutes) || 1,
            startTime: {
                dayOfWeek: [dayOfWeek],
                time: startTime,
            },
            emergencyContactIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            On: false, // default to false on creation
        };

        try {
            await createTrackingMode(newMode); // Use context function
            Alert.alert('成功', '已建立 Tracking 模式');
            router.back(); // Return to settings page
        } catch (e) {
            console.error(e);
            Alert.alert('失敗', '建立失敗，請稍後再試');
        } finally {
            saving.current = false;
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.title}>建立追蹤模式</Text>
                            </View>
            {/* <ScrollView contentContainerStyle={styles.scrollContainer}> */}
                <Text style={styles.introText}>
                    適度追蹤會在你設定的時間主動定期確認您的狀況。若你三次未回覆，Safii 才會通知你的守護者。
                </Text>

                <View style={[styles.card, { backgroundColor: Theme.colors.brandOffWhite }]}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>模式名稱</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：下班回家、夜跑、搭計程車"
                            value={name}
                            onChangeText={setName}
                            maxLength={30}
                        />
                    </View>
                    <View style={styles.fieldGroup}>
                        <View style={styles.row}>
                            <Text style={styles.label}>多久確認一次您的安全呢？</Text>
                            <View style={styles.inputWithUnit}>
                                <TextInput
                                    style={styles.smallInput}
                                    keyboardType="number-pad"
                                    value={checkIntervalMinutes}
                                    onChangeText={setCheckIntervalMinutes}
                                    maxLength={3}
                                />
                            </View>
                        </View>
                        <Text style={[styles.helperText]}>
                            💡 小提示：若您在移動中（如騎車）不便操作手機，建議將間隔設長一些，避免因未回報而觸發警報。
                        </Text>
                    </View>
                </View>

                <View style={[styles.card,  { backgroundColor: Theme.colors.brandOffWhite }]}>
                    <Text style={[styles.cardTitle]}>補充資訊</Text>
                    <Text style={[styles.helperText, { marginBottom: 16 }]}>
                        這裡填寫的內容，會連同定位一起傳送喔！ 多留點線索（在哪裡、做什麼），萬一需要幫忙，讓聯絡人能立刻了解你的處境，救援更即時
                    </Text>
                    
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>活動地點</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：台北市大安區"
                            value={activityLocation}
                            onChangeText={setActivityLocation}
                            maxLength={50}
                        />
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>活動</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="例如：從公司走路回家"
                            value={activity}
                            onChangeText={setActivity}
                            maxLength={30}
                        />
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>備註</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="例如：大概要20分鐘"
                            value={notes}
                            onChangeText={setNotes}
                            maxLength={100}
                            multiline
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: Theme.tracking_colors.coralRed }]}
                    onPress={async () => {
                        if (saving.current) return;
                        if (!user?.uid) { Alert.alert('錯誤', '尚未登入'); return; }
                        if (!name.trim()) { Alert.alert('請輸入模式名稱'); return; }
                        saving.current = true;
                        try {
                            await handleCreateAndPickContacts(user.uid, {
                                name: name.trim(),
                                activityLocation: activityLocation.trim(),
                                activity: activity.trim(),
                                notes: notes.trim(),
                                on: false,
                                autoStart: false,
                                checkIntervalMinutes,
                                unresponsiveThreshold,
                                intervalReductionMinutes,
                                dayOfWeek,
                                startTime,
                            });
                        } catch (e) {
                            console.error('Failed to create and pick contacts', e);
                            Alert.alert('錯誤', '建立失敗，請稍後再試');
                        } finally {
                            saving.current = false;
                        }
                    }}>
                    <Text style={styles.saveText}>建立並選擇聯絡人</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Theme.tracking_colors.coralRed }]} onPress={handleSave}>
                    <Text style={[styles.saveText, styles.saveBtnSecondaryText]}>僅儲存</Text>
                </TouchableOpacity> */}
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