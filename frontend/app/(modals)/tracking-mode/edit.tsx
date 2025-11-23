import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';
import { useLocalSearchParams, router } from 'expo-router';
import * as Theme from '@/constants/Theme';

export default function EditTrackingModeScreen() {
  const { modeId } = useLocalSearchParams() as { modeId?: string };
  const { trackingModes, updateTrackingMode } = useTracking();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>編輯追蹤模式</Text>
        <Text style={styles.sub}>調整參數後儲存</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>模式名稱</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </View>

      <View style={styles.inline}>
        <View style={styles.inlineItem}>
          <Text style={styles.labelSmall}>檢查間隔(分)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={checkIntervalMinutes} onChangeText={setCheckIntervalMinutes} />
        </View>
        <View style={styles.inlineItem}>
          <Text style={styles.labelSmall}>無回應閾值</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={unresponsiveThreshold} onChangeText={setUnresponsiveThreshold} />
        </View>
        {/* <View style={styles.inlineItem}>
          <Text style={styles.labelSmall}>回報到數間隔(分)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={intervalReductionMinutes} onChangeText={setIntervalReductionMinutes} />
        </View> */}
      </View>

      
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: Theme.tracking_colors.coralRed, marginTop: 12 }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16 },
  header: { paddingTop: 8, paddingBottom: 12, paddingLeft: 48 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 4, color: '#6b7280' },
  section: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelSmall: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10 },
  inline: { marginTop: 12, flexDirection: 'row', gap: 12 },
  inlineItem: { flex: 1 },
  saveBtn: { marginTop: 20, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
