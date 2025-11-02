import React, { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { Audio } from 'expo-av';
import { AudioSession } from 'expo-audio-streaming';
import { Buffer } from 'buffer';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';

// --- Backend and Security Configuration ---
const BACKEND_URL = 'https://safii-backend.onrender.com';
const BACKEND_URL_TEST = 'http://140.112.248.127:8000'
const BACKEND_API_KEY = 'M9vtHEM44u7K0Bsj3f0fcfzm2Adl8iEb'; // IMPORTANT: Store securely

export default function OpenAICall() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const { addToBuffer, play, pause, resetBuffer } = usePlayer();
  const { start: startRecording, stop: stopRecording } = useRecorder({
    onNewBuffer: (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && isCallActive) {
        const message = {
          type: 'input_audio_buffer.append',
          audio: event.buffer, // event.buffer is already base64
        };
        ws.send(JSON.stringify(message));
      }
    },
  });

  // --- Effect for Initializing and Cleaning Up ---
  useEffect(() => {
    AudioSession.init({
      playerSampleRate: 24000,
      recorderSampleRate: 24000, // OpenAI requires 24k input
      recorderBufferSize: 4096,
    });

    // Cleanup function on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
      AudioSession.destroy();
    };
  }, []); // ws dependency removed to avoid re-running on socket changes

  const configureSession = (socket: WebSocket) => {
    const sessionUpdateEvent = {
        type: "session.update",
        session: {
            type: "realtime",
            model: "gpt-realtime",
            output_modalities: ["audio"],
            audio: {
                input: {
                    format: {
                        type: "audio/pcm",
                        rate: 24000, // IMPORTANT: Must match your source audio
                    },
                    turn_detection: {
                        type: "semantic_vad"
                    }
                },
                output: {
                    format: {
                        type: "audio/pcm", // Using PCM instead of µ-law to work with existing player
                        rate: 24000,
                    },
                    voice: "marin"
                }
            },
            prompt: {
                variables: {
                    // The user prompt is likely set on the backend when creating the client_secret
                    // We can pass variables here if needed.
                    "context": "you're a f1 pit worker communicating with the driver."
                }
            }
        }
    };
    socket.send(JSON.stringify(sessionUpdateEvent));
    console.log("Session configuration sent.");
  }


  const startCall = async () => {
    if (isCallActive) return;
    console.log('Starting call...');
    resetBuffer(); // Start with a clean buffer

    try {
      // 1. Permissions
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting microphone permission...');
        await requestPermission();
        // Re-check permission after request
        const newPermissions = await Audio.getPermissionsAsync();
        if (newPermissions.status !== 'granted') {
            console.error("Microphone permission not granted.");
            setConnectionStatus("Failed: Mic permission denied");
            return;
        }
      }

      // 2. Fetch API Key from Backend
      setConnectionStatus('Fetching API Key...');
      const res = await fetch(`${BACKEND_URL_TEST}/openai_session`, {
        headers: { 'X-API-Key': BACKEND_API_KEY },
      });
      if (!res.ok) throw new Error(`Failed to fetch API key: ${res.statusText}`);
      const { client_secret: apiKey } = await res.json();
      if (!apiKey) throw new Error('Received an empty API key.');

      // 3. Connect WebSocket with Auth Header
      setConnectionStatus('Connecting...');
      const url = "wss://api.openai.com/v1/realtime";
      const socket = new WebSocket(url, null, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      setWs(socket);

      socket.onopen = () => {
        setConnectionStatus('Connected');
        console.log('WebSocket connected. Configuring session.');
        const sessionUpdateEvent = {
          type: "session.update",
          session: {
              type: "realtime",
              model: "gpt-realtime",
              output_modalities: ["audio"],
              audio: {
                  input: {
                      format: {
                          type: "audio/pcm",
                          rate: 24000,
                      },
                      turn_detection: {
                          type: "semantic_vad"
                      }
                  },
                  output: {
                      format: {
                          type: "audio/pcm",
                          rate: 24000,
                      },
                      voice: "marin"
                  }
              },
              instructions: "You are a Formula 1 pit crew engineer communicating with the driver. Be concise and technical."
          }
        };
        socket.send(JSON.stringify(sessionUpdateEvent));
        console.log("Session configuration sent.");
      };

      socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        // console.log(message)
        switch (message.type) {
            case 'session.created':
                console.log('OpenAI session started. ');
                break;
            case 'session.updated':
                console.log('OpenAI session updated. Starting audio stream.')
                if (!isCallActive) {
                    setIsCallActive(true);
                    startRecording();   
                }
            case 'response.output_audio.delta':
                if (message.delta) {
                    addToBuffer(message.delta);
                    play();
                }
                break;
            case 'turn.end':
                console.log('AI turn ended.');
                break;
            case 'session.end':
                console.log('OpenAI session ended.');
                stopCall();
                break;
            case 'error':
                console.error('Received error from OpenAI:', message.error);
                break;
            default:
                console.log('Received unhandled message type:', message.type);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setConnectionStatus('Error');
        setIsCallActive(false);
      };

      socket.onclose = (event) => {
        setConnectionStatus('Disconnected');
        console.log('WebSocket closed:', event.code, event.reason);
        setIsCallActive(false);
        stopRecording();
      };

    } catch (err) {
      console.error('Failed to start call', err);
      setConnectionStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const stopCall = () => {
    console.log('Stopping call...');
    if (ws) {
        // if (ws.readyState === WebSocket.OPEN) {
        //     // Gracefully end the session
        //     ws.send(JSON.stringify({ type: 'session.end' }));
        // }
        ws.close();
    }
    setWs(null);
    setIsCallActive(false);
    stopRecording();
    pause();
    resetBuffer();
  };

  const playTestTone = () => {
    console.log("Generating and playing test tone...");
    pause();
    resetBuffer();
    const sampleRate = 24000;
    const duration = 1;
    const frequency = 440;
    const volume = 0.5;
    const numSamples = duration * sampleRate;
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const amplitude = Math.sin(2 * Math.PI * frequency * t);
      samples[i] = amplitude * 32767 * volume;
    }
    const buffer = Buffer.from(samples.buffer);
    const base64Pcm = buffer.toString('base64');
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
