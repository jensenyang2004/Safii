// app/features/videoPlayer/VideoPlayerScreen.tsx
// app/features/fakePhoneCallPlayer/FakePhoneCallScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { parse } from 'subtitle';
import * as FileSystem from 'expo-file-system';

import { useFakePhoneCall } from '../fakePhoneCallPlayer/hooks/useFakePhoneCall';
import VideoWithSubtitles from './components/VideoWithSubtitles';

const { width } = Dimensions.get('window');

// ...rest of your code...
export default function VideoPlayerScreen() {
  const video = useRef<Video>(null);
  const [subtitles, setSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const { incoming, paused, startFakeCall, answerCall, declineCall } = useFakePhoneCall();

  // Load subtitles once
  React.useEffect(() => {
    (async () => {
      const asset = require('../../../assets/subtitles.srt');
      const srt = await FileSystem.readAsStringAsync(asset);
      const cues = parse(srt); // [{ start, end, text }, ...]
      setSubtitles(cues);
    })();
  }, []);

  // Update playback time
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.positionMillis != null) {
      setCurrentTime(status.positionMillis / 1000);
    }
  };

  // Find active subtitle
  const active = subtitles.find(c => currentTime >= c.start && currentTime <= c.end);

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require('../../../assets/video.mp4')}
        style={styles.video}
        useNativeControls
        resizeMode="contain"
        paused={paused}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />

      {/* Subtitle overlay */}
      {active && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>{active.text}</Text>
        </View>
      )}

      {/* Simulate incoming call */}
      <View style={styles.buttonRow}>
        <Button title="🔔 Fake Phone Call" onPress={startFakeCall} />
      </View>

      {/* Incoming Call UI */}
      {incoming && (
        <View style={styles.callOverlay}>
          <Text style={styles.callText}>Incoming Call</Text>
          <View style={styles.callButtons}>
            <Button title="Answer" onPress={answerCall} color="#4CAF50" />
            <Button title="Decline" onPress={declineCall} color="#F44336" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width: width, height: (width * 9) / 16 },
  subtitleContainer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 6,
    borderRadius: 4,
  },
  buttonRow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  callOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
  },
  callButtons: {
    flexDirection: 'row',
    width: '60%',
    justifyContent: 'space-around',
  },
});