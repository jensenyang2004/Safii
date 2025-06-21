// app/(tabs)/voice-chat.tsx
import React, { useState, useRef } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const VoiceChat = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const sound = useRef<Audio.Sound | null>(null);

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(recording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (uri) {
      // Upload audio for transcription
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'input.wav',
        type: 'audio/wav'
      } as any);

      const res1 = await fetch('http://<your-local-ip>:5000/transcribe', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { text } = await res1.json();

      // Get reply from LLM
      const res2 = await fetch('http://<your-local-ip>:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });

      const { reply } = await res2.json();
      setResponse(reply);

      // Request TTS
      const res3 = await fetch('http://<your-local-ip>:5000/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply })
      });

      const { audio_url } = await res3.json();

      // Play the TTS audio
      sound.current = new Audio.Sound();
      await sound.current.loadAsync({ uri: audio_url });
      await sound.current.playAsync();
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title={recording ? "Stop Recording" : "Start Talking"} onPress={recording ? stopRecording : startRecording} />
      {loading && <ActivityIndicator size="large" />}
      <Text style={{ marginTop: 20 }}>🤖 {response}</Text>
    </View>
  );
};

export default VoiceChat;