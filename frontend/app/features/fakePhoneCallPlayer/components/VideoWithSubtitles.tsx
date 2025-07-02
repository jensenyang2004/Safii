// app/features/fakePhoneCallPlayer/components/VideoWithSubtitles.tsx

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Video, VideoPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { parse } from 'subtitle';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 9) / 16;

interface SubtitleCue {
  start: number; // milliseconds
  end: number;   // milliseconds
  text: string;
}

interface VideoWithSubtitlesProps {
  videoSource: any;     // require(...) or { uri: string }
  subtitleSource: any;  // require(...) or { uri: string }
  paused?: boolean;
}

export default function VideoWithSubtitles({
  videoSource,
  subtitleSource,
  paused = false,
}: VideoWithSubtitlesProps) {
  const videoRef = useRef<Video>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [currentTime, setCurrentTime] = useState(0);   // in ms
  const [activeText, setActiveText] = useState('');

  // Load & parse the SRT file on mount
  useEffect(() => {
    (async () => {
      // Ensure the subtitle asset is downloaded locally
      const asset = Asset.fromModule(subtitleSource);
      await asset.downloadAsync();
      const fileUri = asset.localUri || asset.uri;

      // Read the SRT as text
      const srtString = await FileSystem.readAsStringAsync(fileUri!);
      // parse() returns an array of { start, end, text } in milliseconds
      const cues = parse(srtString) as SubtitleCue[];
      setSubtitles(cues);
    })();
  }, [subtitleSource]);

  // Update currentTime whenever the video plays
  const onPlaybackStatusUpdate = (status: VideoPlaybackStatus) => {
    if (status.isLoaded && status.positionMillis != null) {
      setCurrentTime(status.positionMillis);
    }
  };

  // Whenever currentTime changes, pick the matching subtitle
  useEffect(() => {
    const cue = subtitles.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    );
    setActiveText(cue ? cue.text : '');
  }, [currentTime, subtitles]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={videoSource}
        style={styles.video}
        useNativeControls
        resizeMode="contain"
        shouldPlay={!paused}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />

      {activeText !== '' && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>{activeText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
});