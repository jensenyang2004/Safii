import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert,
    TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Theme from '@/constants/Theme';
import { useScheduledTracking } from '@/context/ScheduledTrackingContext';

const INK = '#15223F';
const TEAL = Theme.colors.edit;
const PINK = Theme.colors.brandPink;

const FALLBACK_REGION: Region = {
    latitude: 25.033,
    longitude: 121.5654,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export default function SetHomeLocationScreen() {
    const { updateDefaultHome, defaultHome } = useScheduledTracking();
    const [region, setRegion] = useState<Region | null>(null);
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
    const [radius, setRadius] = useState('100');
    const [address, setAddress] = useState('');
    const saving = useRef(false);
    const homeLoaded = useRef(false);

    // Pre-populate with existing defaultHome once it arrives from context
    useEffect(() => {
        if (homeLoaded.current || !defaultHome) return;
        homeLoaded.current = true;
        setPin({ lat: defaultHome.lat, lng: defaultHome.lng });
        setRadius(String(defaultHome.radius ?? 100));
        setAddress(defaultHome.address ?? '');
        setRegion({
            latitude: defaultHome.lat,
            longitude: defaultHome.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        });
    }, [defaultHome]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (!homeLoaded.current) setRegion(FALLBACK_REGION);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            // Only move map to current location if no saved home was loaded yet
            if (!homeLoaded.current) {
                setRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        })();
    }, []);

    const handleMapPress = (e: MapPressEvent) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setPin({ lat: latitude, lng: longitude });
    };

    const handleSave = async () => {
        if (saving.current) return;
        if (!pin) { Alert.alert('請在地圖上點選家的位置'); return; }
        const r = Number(radius);
        if (!r || r < 10) { Alert.alert('半徑請設定至少 10 公尺'); return; }
        saving.current = true;
        try {
            await updateDefaultHome({
                lat: pin.lat,
                lng: pin.lng,
                radius: r,
                address: address.trim(),
            });
            console.log('✅ updateDefaultHome resolved');
            Alert.alert('✅ 已儲存', '預設家位置已更新。', [
                { text: '確定', onPress: () => router.back() },
            ]);
        } catch (e) {
            console.error('❌ updateDefaultHome failed:', e);
            Alert.alert('錯誤', '儲存失敗，請稍後再試。');
        } finally {
            saving.current = false;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={INK} />
                </TouchableOpacity>
                <Text style={styles.title}>設定家位置</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>儲存</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.hint}>點擊地圖標記家的位置</Text>

            {!region ? (
                <View style={styles.mapLoading}>
                    <ActivityIndicator color={TEAL} />
                </View>
            ) : (
            <MapView
                style={styles.map}
                initialRegion={region}
                showsUserLocation
                onPress={handleMapPress}
            >
                {pin && (
                    <>
                        <Marker
                            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                            pinColor={PINK}
                        />
                        <Circle
                            center={{ latitude: pin.lat, longitude: pin.lng }}
                            radius={Number(radius) || 100}
                            strokeColor={TEAL}
                            fillColor={`${TEAL}22`}
                        />
                    </>
                )}
            </MapView>
            )}

            <View style={styles.panel}>
                {defaultHome ? (
                    <Text style={styles.savedBadge}>✅ 已有儲存的家位置，點地圖可更新</Text>
                ) : (
                    <Text style={styles.savedBadge}>尚未設定家位置</Text>
                )}
                <Text style={styles.label}>地址描述（選填）</Text>
                <TextInput
            allowFontScaling={false}
                    style={styles.input}
                    placeholder="例如：家"
                    value={address}
                    onChangeText={setAddress}
                    placeholderTextColor={Theme.colors.gray400}
                />

                <Text style={styles.label}>到達判定半徑（公尺）</Text>
                <View style={styles.sliderRow}>
                    {[50, 100, 150, 200, 300].map(r => (
                        <TouchableOpacity
                            key={r}
                            onPress={() => setRadius(r.toString())}
                            style={[styles.radiusChip, radius === r.toString() && styles.radiusChipActive]}
                        >
                            <Text style={[styles.radiusText, radius === r.toString() && styles.radiusTextActive]}>
                                {r}m
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
            allowFontScaling={false}
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="自訂半徑"
                    value={radius}
                    onChangeText={setRadius}
                    keyboardType="numeric"
                    placeholderTextColor={Theme.colors.gray400}
                />

                {pin && (
                    <Text style={styles.coords}>
                        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Theme.colors.gray100,
    },
    backBtn: { padding: 4 },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: INK },
    saveBtn: { padding: 4 },
    saveBtnText: { color: TEAL, fontSize: 16, fontWeight: '600' },
    hint: { textAlign: 'center', fontSize: 13, color: Theme.colors.gray500, paddingVertical: 8 },
    map: { flex: 1 },
    mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    panel: { padding: 16, paddingBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: INK, marginTop: 12, marginBottom: 6 },
    input: {
        backgroundColor: Theme.colors.gray50, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 15, color: INK,
    },
    sliderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    radiusChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        borderWidth: 1, borderColor: Theme.colors.gray200,
    },
    radiusChipActive: { backgroundColor: INK, borderColor: INK },
    radiusText: { fontSize: 13, color: Theme.colors.gray600 },
    radiusTextActive: { color: '#fff', fontWeight: '600' },
    coords: { fontSize: 12, color: Theme.colors.gray400, marginTop: 8, textAlign: 'center' },
    savedBadge: { fontSize: 13, color: Theme.colors.gray500, marginBottom: 4, textAlign: 'center' },
});
