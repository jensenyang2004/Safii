import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFakeCall } from '@/hooks/useFakeCall';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';

// Deliberately no Safii branding anywhere on this screen — the entire point
// is that it reads as a normal incoming call to anyone glancing at the phone.
export default function FakeCallScreen() {
  const { contactId, scheduleId } = useLocalSearchParams<{ contactId: string; scheduleId?: string }>();
  const insets = useSafeAreaInsets();
  const { contact, phase, callDurationSeconds, answer, decline, endCall } = useFakeCall({
    contactId: contactId ?? '',
    scheduleId,
  });

  const displayName = contact?.name || '未知號碼';
  const minutes = Math.floor(callDurationSeconds / 60);
  const seconds = callDurationSeconds % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={[styles.top, { paddingTop: insets.top + 60 }]}>
        <View style={styles.avatarWrapper}>
          <FakeContactAvatar contact={contact} size={120} />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.status}>
          {phase === 'ringing' ? 'iPhone' : phase === 'active' ? formattedDuration : ''}
        </Text>
      </View>

      {phase === 'ringing' && (
        <View style={[styles.ringingActions, { paddingBottom: insets.bottom + 48 }]}>
          <View style={styles.actionColumn}>
            <Pressable style={[styles.actionButton, styles.decline]} onPress={decline}>
              <MaterialIcons name="call-end" size={32} color="#fff" />
            </Pressable>
            <Text style={styles.actionLabel}>拒接</Text>
          </View>
          <View style={styles.actionColumn}>
            <Pressable style={[styles.actionButton, styles.accept]} onPress={answer}>
              <MaterialIcons name="call" size={32} color="#fff" />
            </Pressable>
            <Text style={styles.actionLabel}>接聽</Text>
          </View>
        </View>
      )}

      {phase === 'active' && (
        <View style={[styles.activeActions, { paddingBottom: insets.bottom + 48 }]}>
          <View style={styles.actionColumn}>
            <Pressable style={[styles.actionButton, styles.decline]} onPress={endCall}>
              <MaterialIcons name="call-end" size={32} color="#fff" />
            </Pressable>
            <Text style={styles.actionLabel}>結束</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: 20,
  },
  name: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    color: '#a1a1a6',
  },
  ringingActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  activeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionColumn: {
    alignItems: 'center',
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  decline: {
    backgroundColor: '#ff3b30',
  },
  accept: {
    backgroundColor: '#34c759',
  },
  actionLabel: {
    color: '#e5e5e7',
    fontSize: 14,
  },
});
