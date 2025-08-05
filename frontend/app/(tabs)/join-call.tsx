// app/(tabs)/join-call.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { joinExistingCall } from '@/app/features/videoCall/startCall';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinCallScreen() {
  const [meetingId, setMeetingId] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Join a Video Call</Text>
      <Text style={styles.subtitle}>Enter a meeting ID to join an existing call</Text>
      
      <TextInput
        style={styles.input}
        value={meetingId}
        onChangeText={setMeetingId}
        placeholder="Enter meeting ID"
        placeholderTextColor="#999"
      />
      
      <Button
        title="Join Call"
        onPress={() => joinExistingCall(meetingId)}
        color="#2196F3"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  }
});