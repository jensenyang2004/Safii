import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { AudioSession } from 'expo-audio-streaming';
import { usePlayer } from '@/hooks/usePlayer';
import { useRecorder } from '@/hooks/useRecorder';
import { useAuth } from '@/context/AuthProvider';
import { useLocalSearchParams, router } from 'expo-router';
// --- Backend and Security Configuration ---
const BACKEND_URL = 'https://safii-backend-beta251104.onrender.com';
// const BACKEND_URL_TEST = 'http://192.168.1.173:8000'
// const BACKEND_API_KEY = 'M9vtHEM44u7K0Bsj3f0fcfzm2Adl8iEb'; // IMPORTANT: Store securely


const prompt_boyfriend = "你現在扮演「男友來電」的角色。\n" +
  "角色設定\n" +
  "- 語氣：溫柔、體貼、略帶打趣或撒嬌。\n" +
  "- 個性：有點愛開玩笑，但真心關心使用者的安全與狀況。\n" +
  "- 對話目標：\n" +
  "  - 一開始關心使用者現在在哪裡、是不是在回家的路上。\n" +
  "  - 在對話中表達關心，例如提醒注意安全、到家要回訊。\n" +
  "  - 可以自然地閒聊一天的事情，但語氣始終溫柔、有愛。\n" +
  "  - 結尾要自然、溫暖，比如「到家記得跟我說喔」。\n\n" +
  "互動規範\n" +
  "- 回應要自然、口語化，像真實男友講話的感覺。\n" +
  "- 一次說話不超過兩句話，留空間讓使用者回應。\n" +
  "- 根據使用者回覆內容主動延續話題或開啟新話題。\n" +
  "- 不要提到「AI」或「模擬」等字眼，維持真實對話氛圍。\n\n" +
  "開場示例\n" +
  "「嘿～寶貝，現在在哪？是不是要回家了？外面有點冷，記得拉好外套喔。」"

const prompt_mom = "你現在扮演「老媽來電」的角色。\n" +
    "角色設定\n" +
  "- 語氣：親切、熟悉、帶點碎念但充滿關愛。\n" +
    "- 個性：有點嘮叨，但出發點是擔心與疼愛。\n" +
    "- 對話目標：\n" +
    "- 問使用者現在在哪、吃飯了沒、什麼時候回家。\n" +
    "- 偶爾提醒使用者注意身體、少吃垃圾食物。\n" +
    "- 可以穿插生活關心，例如天氣、工作或朋友。\n" +
    "- 結尾自然收尾，例如「好啦，快到家就打給我喔～」。\n" +

  "【互動規範】\n" + 
  "- 回應要自然口語化，像真實媽媽講話的節奏。\n" +
  "- 帶點念但不兇，語氣溫柔有溫度。\n" +
  "- 每次講話不要太長，一次一到兩句。\n" +
  "- 不要脫離角色，也不要提及「AI」或「模擬通話」。\n" +

  "【開場示例】\n" +
  "「喂～你現在在哪？晚餐吃了沒啊？不要又吃那些垃圾食物喔。\n"

const prompt_bestie = 
  "你現在扮演「閨蜜來電」的角色。" +

  "【角色設定】" +
  "- 語氣：輕鬆自然、有活力、帶點幽默。" +
  "- 個性：愛聊天、會八卦、懂得逗對方開心。" +
  "- 對話目標：" +
    "- 陪使用者走夜路或回家路上聊天。" +
    "- 可以聊今天的事、工作、朋友、感情或八卦。" +
    "- 對話氛圍要讓人覺得輕鬆、有陪伴感。" +
    "- 結尾自然，比如「好啦，你快到家再聊～」。" +

  "【互動規範】" +
  "- 回應要有真實口語感，就像朋友在講電話。" +
  "- 一次講一句或兩句，別講太多。" +
  "- 根據使用者的語氣和回應調整節奏。" +
  "- 不要提到「AI」或「模擬」，要像真的閨蜜一樣。" +

  "【開場示例】" +
  "「欸～你走路回家喔？那我陪你聊一下！我今天有八卦要講～」"


const prompts: { [key: string]: string } = {
  '男友來電': prompt_boyfriend,
  '老媽來電': prompt_mom,
  '閨蜜來電': prompt_bestie
};

export default function OpenAICall() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // UI only for now
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Default to speaker ON

  const { user } = useAuth();
  const { addToBuffer, play, pause, resetBuffer } = usePlayer();
  const { start: startRecording, stop: stopRecording } = useRecorder({
    onNewBuffer: (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && isCallActive && !isMuted) { // Only send audio if not muted
        const message = {
          type: 'input_audio_buffer.append',
          audio: event.buffer, // event.buffer is already base64
        };
        ws.send(JSON.stringify(message));
      }
    },
  });

  const { title } = useLocalSearchParams<{ title: string }>();
  const characterPrompt = prompts[title || ''] || "You are a helpful assistant.";

  // --- Effect for Initializing and Cleaning Up ---
  useEffect(() => {
    AudioSession.init({
      playerSampleRate: 24000,
      recorderSampleRate: 24000, // OpenAI requires 24k input
      recorderBufferSize: 4096,
    });

    // startCall(); // Automatically start the call

    // Cleanup function on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
      AudioSession.destroy();
    };
  }, []);



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

      const res = await fetch(`${BACKEND_URL}/openai_session`, {
        headers: { 'USERID': user?.uid ?? 'Frontend error' },
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
            instructions: characterPrompt
          }
        };
        socket.send(JSON.stringify(sessionUpdateEvent));
        console.log("Session configuration sent.");

        // Step 1: Create user message
        const userMessage = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: "喂？" },
            ],
          },
        };
        socket.send(JSON.stringify(userMessage));
        const requestResponse = {
          type: "response.create",
          response: {
            instructions: "以「喂？....」來開始自然的對話。",
            output_modalities: ["audio"], // or ["audio", "text"] if you want both
          },
        };
        socket.send(JSON.stringify(requestResponse));
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
            if (message.delta && !isSpeakerOn) {
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

  const stopCall = useCallback(() => {
    console.log('Stopping call...');
    if (ws) {
      ws.close();
    }
    setWs(null);
    setIsCallActive(false);
    setIsMuted(false); // Reset mute state
    setIsSpeakerOn(true); // Reset speaker state
    stopRecording();
    pause();
    resetBuffer();
    router.replace({ pathname: '/(tabs)/firebase-test'});
    
  }, [ws, stopRecording, pause, resetBuffer]);

  const closeMic = () => {
    console.log('Close Mic button pressed');
    setIsMuted(prev => !prev); // Toggle mute state

  };

  const mute = () => {
    console.log('Mute button pressed');
    setIsSpeakerOn(prev => !prev); // Toggle mute state
  };

  return (
    <View style={styles.container}>
        <Image source={require('../../assets/avatar-photo/cool_ai.gif')} style={styles.avatar} />
        <Text style={styles.callingText}>{connectionStatus === 'Connected' ? 'Connected' : 'Connecting...'}</Text>
        <View style={styles.callControls}>
          <TouchableOpacity style={styles.controlButton} onPress={closeMic}>
            <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={30} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.hangUpButton]} onPress={stopCall}>
            <MaterialIcons name="call-end" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={mute}>
            <MaterialIcons name={isSpeakerOn ? 'volume-up' : 'volume-down'} size={30} color="black" />
          </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  callingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingText: {
    fontSize: 24,
    color: 'black',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 300, // Slightly smaller than glow to show the glow effect
    height: 600,
    resizeMode: 'contain',
    alignSelf: 'center',
    borderRadius: 100,
    marginBottom: 100,
    paddingHorizontal: 20,
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  hangUpButton: {
    backgroundColor: 'red',
  },
});
