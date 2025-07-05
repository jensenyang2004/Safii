// app/features/videoCall/VideoCallScreen.tsx
import React, { useEffect } from 'react';
import { View, Button, StyleSheet, Dimensions } from 'react-native';
import {
  useMeeting,
  MeetingLayout,
  ParticipantView,
} from '@videosdk.live/react-native-sdk';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function VideoCallScreen() {
  const router = useRouter();
  const {
    join,
    leave,
    participants,       // map of participantId → Participant
    toggleMic,
    toggleWebcam,
    isMicOn,
    isWebcamOn,
  } = useMeeting();

  useEffect(() => {
    join();             // join on mount
    return () => { leave(); };  // clean up on unmount
  }, []);

  return (
    <View style={styles.container}>
      {/* camera previews in a grid */}
      <MeetingLayout layout="GRID">
        {Array.from(participants.values()).map(p => (
          <ParticipantView
            key={p.id}
            participantId={p.id}
            style={styles.participant}
          />
        ))}
      </MeetingLayout>

      {/* controls */}
      <View style={styles.controls}>
        <Button
          title={isMicOn ? "Mute" : "Unmute"}
          onPress={toggleMic}
        />
        <Button
          title={isWebcamOn ? "Stop Cam" : "Start Cam"}
          onPress={toggleWebcam}
        />
        <Button
          title="End Call"
          color="#d32f2f"
          onPress={() => {
            leave();
            router.back();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  participant:{ width: width/2, height: height/2 },
  controls:   {
    position: 'absolute',
    bottom: 20,
    left:   0,
    right:  0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});