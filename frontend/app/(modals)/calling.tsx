import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

// --- Type Definitions for Gemini API ---
// Based on the successful hook example
type LiveClientMessage = {
  setup?: {};
  realtimeInput?: {
    audio?: {
      data: string; // Base64 encoded audio chunk
      mimeType: 'audio/pcm;rate=16000';
    };
    text?: string; // Text input
  };
};

type LiveServerMessage = {
  setupComplete?: boolean;
  serverContent?: {
    modelTurn?: {
      parts: {
        inlineData?: {
          data: string; // Base64 encoded audio chunk
        };
      }[];
    };
    generationComplete?: boolean;
    turnComplete?: boolean;
  };
  usageMetadata?: any;
};


// IMPORTANT: Replace with your computer's local network IP address
const BACKEND_URL = 'http://localhost:5010'; // Your local python server

// --- Audio Configuration ---
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.WAV,
    audioEncoder: Audio.AndroidAudioEncoder.PCM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000, // 16000 * 16 * 1
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {}, // Web not supported in this context
};

const CallingModal = () => {
  const [status, setStatus] = useState('Initializing...');
  const [isMuted, setIsMuted] = useState(false); // UI only for now

  const webSocketRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const playbackRef = useRef<Audio.Sound | null>(null);
  const audioResponseQueue = useRef<string[]>([]);
  const isRecording = useRef(false);
  const isSpeaking = useRef(false);

  const stopCall = useCallback(() => {
    console.log('Stopping call...');
    isRecording.current = false; // Stop recording loop
    webSocketRef.current?.close();
    recordingRef.current?.stopAndUnloadAsync().catch(console.error);
    playbackRef.current?.unloadAsync().catch(console.error);
    router.back();
  }, []);

  // --- Main Connection & Audio Lifecycle ---
  useEffect(() => {
    let isActive = true;

    const connectAndRecord = async () => {
      try {
        // 1. Permissions
        setStatus('Requesting permissions...');
        const audioPerm = await Audio.requestPermissionsAsync();
        if (audioPerm.status !== 'granted') {
          throw new Error('Microphone permission is required!');
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // 2. Fetch Auth Token
        setStatus('Fetching auth token...');
        const res = await fetch(`${BACKEND_URL}/session`);
        if (!res.ok) throw new Error(`Failed to fetch token: ${res.statusText}`);
        const { token } = await res.json();
        if (!token) throw new Error('Received an empty token.');

        // 3. Connect WebSocket
        setStatus('Connecting to Gemini...');
        const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`);
        webSocketRef.current = ws;

        ws.onopen = () => {
          if (!isActive) return;
          console.log('WebSocket connected. Sending setup message.');
          setStatus('Connection open.');
          const setupMessage: LiveClientMessage = { setup: {} };
          ws.send(JSON.stringify(setupMessage));
        };

        ws.onmessage = async (event) => {
          if (!isActive) return;

          try {
            let text = "";
            if (typeof event.data === 'string') {
              text = event.data;
            } else if (event.data instanceof ArrayBuffer) {
              text = new TextDecoder().decode(event.data);
            } else if (event.data instanceof Blob) { // For web compatibility
              text = await event.data.text();
            } else {
              console.warn("Unknown WebSocket message type:", typeof event.data);
              return;
            }

            if (!text.trim()) {
              console.warn("Received empty or whitespace-only message.");
              return;
            }

            const message: LiveServerMessage = JSON.parse(text);
            console.log('Received message:', message);

            if (message.setupComplete) {
              setStatus('Connected. Prompting friend to speak...');
              // Send a kickoff message to make Gemini speak first.
              const kickoffMessage: LiveClientMessage = { realtimeInput: { text: "Hello?" } };
              webSocketRef.current.send(JSON.stringify(kickoffMessage));

              // Start the recording loop. It will wait until Gemini is done speaking.
              isRecording.current = true;
              startRecordingStream();
            }

            if (message.serverContent?.modelTurn?.parts) {
              isSpeaking.current = true;
              message.serverContent.modelTurn.parts.forEach(part => {
                if (part.inlineData?.data) {
                  audioResponseQueue.current.push(part.inlineData.data);
                }
              });
            }

            if (message.serverContent?.turnComplete) {
              setStatus('Playing response...');
              playCombinedAudio();
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
            setStatus("Error: Received invalid message from server.");
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
          setStatus('Connection error occurred');
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setStatus('Connection closed.');
          isRecording.current = false;
        };

      } catch (error) {
        console.error('Failed to start call:', error);
        setStatus(`Error: ${error.message}`);
      }
    };

    connectAndRecord();

    // --- Cleanup ---
    return () => {
      isActive = false;
      isRecording.current = false;
      webSocketRef.current?.close();
      recordingRef.current?.stopAndUnloadAsync().catch(console.error);
    };
  }, []);


  // --- Audio Streaming Functions ---

  const startRecordingStream = async () => {
    if (!isRecording.current) {
      return; // Stop the loop if the flag is turned off
    }

    if (isSpeaking.current) {
      // If Gemini is speaking, just wait and poll again without recording.
      setTimeout(startRecordingStream, 100);
      return;
    }

    try {
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(RECORDING_OPTIONS);
      recordingRef.current = newRecording; // Keep track of the current recording

      await newRecording.startAsync();
      console.log('Recording chunk...');

      await new Promise(resolve => setTimeout(resolve, 500)); // Record for 500ms

      // Ensure the recording object still exists before stopping
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null; // Clear the ref after unloading

        if (uri) {
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            const message: LiveClientMessage = {
              realtimeInput: {
                audio: {
                  data: base64Data,
                  mimeType: 'audio/pcm;rate=16000',
                },
              },
            };
            webSocketRef.current.send(JSON.stringify(message));
            console.log('Sent audio chunk.');
          }
        }
      }
    } catch (error) {
      console.error('Error during recording chunk:', error);
      // If an error occurs, clear the ref to be safe
      recordingRef.current = null;
    } finally {
      // Schedule the next iteration of the loop with a small delay
      // This prevents deep recursion and gives the native side time to clean up.
      if (isRecording.current) {
        setTimeout(startRecordingStream, 100);
      }
    }
  };

  const playCombinedAudio = async () => {
    if (audioResponseQueue.current.length === 0) {
      isSpeaking.current = false;
      setStatus('Your turn to speak...');
      return;
    }

    // 1. Decode and combine all PCM data chunks
    const pcmChunks = audioResponseQueue.current.map(chunk => Buffer.from(chunk, 'base64'));
    const pcmData = Buffer.concat(pcmChunks);
    audioResponseQueue.current = []; // Clear queue

    // 2. Create a WAV header
    const sampleRate = 24000; // Gemini output is 24kHz
    const channels = 1;
    const bitDepth = 16;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length, true); // ChunkSize
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, channels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * channels * (bitDepth / 8), true); // ByteRate
    view.setUint16(32, channels * (bitDepth / 8), true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length, true); // Subchunk2Size

    // 3. Combine header and PCM data
    const wavData = Buffer.concat([Buffer.from(header), pcmData]);
    const combinedBase64 = wavData.toString('base64');

    // 4. Play the sound
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${combinedBase64}` },
        { shouldPlay: true }
      );
      playbackRef.current = sound;
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          playbackRef.current = null;
          isSpeaking.current = false; // Gemini is done
          setStatus('Your turn to speak...');
          console.log('Playback finished.');
        }
      });
    } catch (error) {
      console.error('Failed to play combined audio:', error);
      isSpeaking.current = false; // Reset on error
      setStatus('Error playing audio.');
    }
  };


  return (
    <LinearGradient colors={['#000428', '#004e92']} style={styles.container}>
      <View style={styles.callingContainer}>
        <Text style={styles.callingText}>{status}</Text>
        <View style={styles.glowContainer}>
          <View style={styles.glow} />
        </View>
        <View style={styles.callControls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setIsMuted(!isMuted)}>
            <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.hangUpButton]} onPress={stopCall}>
            <MaterialIcons name="call-end" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <MaterialIcons name={'videocam-off'} size={30} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  glowContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  callControls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangUpButton: {
    backgroundColor: 'red',
  },
});

export default CallingModal;
