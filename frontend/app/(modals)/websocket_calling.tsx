import React, { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { Audio } from 'expo-av';
import { AudioSession } from 'expo-audio-streaming';
import { Buffer } from 'buffer';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';

// --- Type Definitions for Gemini API ---

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

// --- Backend and Security Configuration ---
const BACKEND_URL = 'https://safii-backend.onrender.com';
const BACKEND_URL_TEST = 'http://140.112.248.127:8000'
const BACKEND_API_KEY = 'M9vtHEM44u7K0Bsj3f0fcfzm2Adl8iEb'; // IMPORTANT: Store securely

export default function WebsocketCalling() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const { addToBuffer, play, pause, resetBuffer } = usePlayer();
  const { start: startRecording, stop: stopRecording } = useRecorder({
    onNewBuffer: (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && isCallActive) {
        const message: LiveClientMessage = {
          realtimeInput: {
            audio: {
              data: event.buffer, // event.buffer is already base64
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        };
        ws.send(JSON.stringify(message));
      }
    },
  });


  // --- Effect for Initializing and Cleaning Up ---
  useEffect(() => {
    AudioSession.init({
      playerSampleRate: 24000, // Gemini output is 24kHz
      recorderSampleRate: 16000,
      recorderBufferSize: 4096,
    });

    // Cleanup function on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
      AudioSession.destroy();
    };
  }, [ws]);

  const startCall = async () => {
    if (isCallActive) return;
    console.log('Starting call...');
    resetBuffer(); // Start with a clean buffer

    try {
      // 1. Permissions
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting microphone permission...');
        await requestPermission();
      }

      // 2. Fetch Auth Token
      setConnectionStatus('Fetching token...');
      const res = await fetch(`${BACKEND_URL_TEST}/session`, {
        headers: { 'X-API-Key': BACKEND_API_KEY },
      });
      if (!res.ok) throw new Error(`Failed to fetch token: ${res.statusText}`);
      const { token, config } = await res.json(); // Destructure token and config
      if (!token) throw new Error('Received an empty token.');

      // 3. Connect WebSocket
      setConnectionStatus('Connecting...');
      const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`);
      setWs(socket);

      socket.onopen = () => {
        setConnectionStatus('Connected');
        console.log('WebSocket connected. Sending setup message with config from backend.');
        // Use the config received from the backend for the setup message
        // const setupMessage: LiveClientMessage = { setup: config };
        const setupMessage: LiveClientMessage = { setup: {} };
        socket.send(JSON.stringify(setupMessage));
      };

      socket.onmessage = async (event) => {
        let text = "";
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else if (event.data instanceof Blob) {
          text = await event.data.text();
        } else {
          console.warn("Unknown WebSocket message type:", typeof event.data);
          return;
        }

        if (!text.trim()) {
          return;
        }

        try {
          const message: LiveServerMessage = JSON.parse(text);

          if (message.setupComplete) {
            console.log('Gemini setup complete. Starting audio stream and prompting.');
            setIsCallActive(true);
            startRecording(); // Start recording
            const kickoffMessage: LiveClientMessage = { realtimeInput: { text: "the brake feels a little weird" } };
            socket.send(JSON.stringify(kickoffMessage));
          }

          if (message.serverContent?.modelTurn?.parts) {
            message.serverContent.modelTurn.parts.forEach(part => {
              if (part.inlineData?.data) {
                addToBuffer(part.inlineData.data);
              }
            });
            play(); // Ensure player is active after adding new chunks
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message as JSON:", e, "Raw data:", text);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setConnectionStatus('Error');
        setIsCallActive(false);
      };

      socket.onclose = () => {
        setConnectionStatus('Disconnected');
        console.log('WebSocket closed.');
        setIsCallActive(false);
        stopRecording();
      };

    } catch (err) {
      console.error('Failed to start call', err);
      setConnectionStatus(`Failed: ${err.message}`);
    }
  };

  const stopCall = () => {
    console.log('Stopping call...');
    setIsCallActive(false);
    ws?.close();
    setWs(null);
    // Stop playback and clear buffer
    pause();
    resetBuffer();
    stopRecording();
  };

  const playTestTone = () => {
    console.log("Generating and playing test tone...");

    // Hard reset the player to ensure it plays
    pause();
    resetBuffer();

    // --- Tone Generation ---
    const sampleRate = 24000; // Match player sample rate
    const duration = 1; // 1 second
    const frequency = 440; // A4 note
    const volume = 0.5;

    const numSamples = duration * sampleRate;
    const samples = new Int16Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const amplitude = Math.sin(2 * Math.PI * frequency * t);
      samples[i] = amplitude * 32767 * volume;
    }

    // --- Base64 Encoding ---
    const buffer = Buffer.from(samples.buffer);
    const base64Pcm = buffer.toString('base64');

    // --- Playback ---
    addToBuffer(base64Pcm);
    play();
  };


  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Connection: {connectionStatus}</Text>
      <Text>Call Status: {isCallActive ? "Active" : "Inactive"}</Text>
      <View style={{ margin: 10 }}>
        <Button title="Start Call" onPress={startCall} disabled={isCallActive} />
      </View>
      <View style={{ margin: 10 }}>
        <Button title="Stop Call" onPress={stopCall} disabled={!isCallActive} />
      </View>
      <View style={{ margin: 10 }}>
        <Button title="Test Tone" onPress={playTestTone} />
      </View>

    </View>
  );
}
