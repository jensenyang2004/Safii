// app/tracking-mode/new.tsx
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import { router } from 'expo-router';
import { useTracking } from '@/context/TrackProvider';

async function handleCreateAndPickContacts(userUid: string, fields: any) {
    // 1) 先建空殼
    const docRef = await addDoc(collection(db, 'TrackingMode'), {
        userId: userUid,
        name: fields.name,
        On: fields.on ?? false,
        autoStart: fields.autoStart ?? true,
        emergencyContactIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // 2) 帶著 modeId 去選人
    router.push({ pathname: '/tracking-mode/select-contacts', params: { modeId: docRef.id } });
}


export default function CreateTrackingModeScreen() {
    const { user } = useAuth();
    const { createTrackingMode } = useTracking();

    // 基本欄位（可依你的 schema 調整）
    const [name, setName] = useState('');
    const [autoStart, setAutoStart] = useState(true);
    const [on, setOn] = useState(false);
    const [checkIntervalMinutes, setCheckIntervalMinutes] = useState('5');          // string → 存檔時轉 number
    const [unresponsiveThreshold, setUnresponsiveThreshold] = useState('3');        // string → 存檔時轉 number
    const [intervalReductionMinutes, setIntervalReductionMinutes] = useState('1');  // string → 存檔時轉 number

    // 簡化的時間設定（進階可做 day-of-week 多選）
    const [dayOfWeek, setDayOfWeek] = useState('Monday');
    const [startTime, setStartTime] = useState('19:00');

    // 簡化：先放空陣列，之後可加「選聯絡人」頁面回填
    const [emergencyContactIds, setEmergencyContactIds] = useState<string[]>([]);

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

        // saving.current = true;
        // try {
        //     await addDoc(collection(db, 'TrackingMode'), {
        //         name: name.trim(),
        //         userId: user.uid,
        //         On: on,
        //         autoStart,
        //         checkIntervalMinutes: Number(checkIntervalMinutes) || 5,
        //         unresponsiveThreshold: Number(unresponsiveThreshold) || 3,
        //         intervalReductionMinutes: Number(intervalReductionMinutes) || 1,
        //         startTime: {
        //             dayOfWeek: [dayOfWeek],   // 符合你現有的資料結構（陣列）
        //             time: startTime,
        //         },
        //         emergencyContactIds,        // 目前空陣列
        //         createdAt: serverTimestamp(),
        //         updatedAt: serverTimestamp(),
        //     });

        //     Alert.alert('成功', '已建立 Tracking 模式');
        //     router.back(); // 回到設定頁
        // } catch (e) {
        //     console.error(e);
        //     Alert.alert('失敗', '建立失敗，請稍後再試');
        // } finally {
        //     saving.current = false;
        // }


        saving.current = true;
        const newMode = {
            name: name.trim(),
            userId: user.uid,
            On: on,
            autoStart,
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
            <View style={styles.header}>
                <Text style={styles.title}>建立 Tracking 模式</Text>
                <Text style={styles.sub}>填寫模式名稱與基本參數</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>模式名稱</Text>
                <TextInput
                    style={styles.input}
                    placeholder="例如：下班回家、夜跑、搭計程車"
                    value={name}
                    onChangeText={setName}
                    maxLength={30}
                />
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>啟用中</Text>
                <Switch value={on} onValueChange={setOn} />
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>自動開始</Text>
                <Switch value={autoStart} onValueChange={setAutoStart} />
            </View>

            <View style={styles.inline}>
                <View style={styles.inlineItem}>
                    <Text style={styles.labelSmall}>檢查間隔(分)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={checkIntervalMinutes}
                        onChangeText={setCheckIntervalMinutes}
                    />
                </View>
                <View style={styles.inlineItem}>
                    <Text style={styles.labelSmall}>無回應閾值</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={unresponsiveThreshold}
                        onChangeText={setUnresponsiveThreshold}
                    />
                </View>
                <View style={styles.inlineItem}>
                    <Text style={styles.labelSmall}>縮短間隔(分)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={intervalReductionMinutes}
                        onChangeText={setIntervalReductionMinutes}
                    />
                </View>
            </View>

            <View style={styles.inline}>
                <View style={[styles.inlineItem, { flex: 1.2 }]}>
                    <Text style={styles.labelSmall}>星期</Text>
                    <TextInput
                        style={styles.input}
                        value={dayOfWeek}
                        onChangeText={setDayOfWeek}
                        placeholder="Monday"
                    />
                </View>
                <View style={styles.inlineItem}>
                    <Text style={styles.labelSmall}>時間</Text>
                    <TextInput
                        style={styles.input}
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="19:00"
                    />
                </View>
            </View>

            {/* 之後可做：挑選聯絡人頁（multi-select），回填 emergencyContactIds */}
            <TouchableOpacity onPress={() => handleCreateAndPickContacts(user.uid, formValues)}>
                <Text>建立並選擇聯絡人</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>儲存</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16 },
    header: { paddingTop: 8, paddingBottom: 12 },
    title: { fontSize: 20, fontWeight: '700', color: '#111827' },
    sub: { marginTop: 4, color: '#6b7280' },

    section: { marginTop: 12 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
    labelSmall: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    row: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    inline: { marginTop: 12, flexDirection: 'row', gap: 12 },
    inlineItem: { flex: 1 },

    saveBtn: {
        marginTop: 20,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});