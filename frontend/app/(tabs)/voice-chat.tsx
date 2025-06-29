// // voice-chat.tsx
// import React, { useRef, useState } from "react";
// import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
// import { Audio } from "expo-av";

// const BACKEND_URL = "http://<your-ip>:5000"; // Replace with your IP

// export default function VoiceChat() {
//   const [recording, setRecording] = useState<Audio.Recording | null>(null);
//   const [response, setResponse] = useState("");
//   const [loading, setLoading] = useState(false);
//   const sound = useRef(new Audio.Sound());

//   const startRecording = async () => {
//     await Audio.requestPermissionsAsync();
//     await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
//     const { recording } = await Audio.Recording.createAsync(
//       Audio.RecordingOptionsPresets.HIGH_QUALITY
//     );
//     setRecording(recording);
//   };

//   const stopRecording = async () => {
//     if (!recording) return;

//     setLoading(true);
//     await recording.stopAndUnloadAsync();
//     const uri = recording.getURI();
//     setRecording(null);

//     if (!uri) return;

//     const formData = new FormData();
//     formData.append("audio", {
//       uri,
//       name: "input.wav",
//       type: "audio/wav",
//     } as any);

//     // Transcribe
//     const transcribeRes = await fetch(`${BACKEND_URL}/transcribe`, {
//       method: "POST",
//       body: formData,
//       headers: { "Content-Type": "multipart/form-data" },
//     });
//     const { text } = await transcribeRes.json();

//     // Chat
//     const chatRes = await fetch(`${BACKEND_URL}/chat`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ prompt: text }),
//     });
//     const { reply } = await chatRes.json();
//     setResponse(reply);

//     // TTS
//     const speakRes = await fetch(`${BACKEND_URL}/speak`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text: reply }),
//     });
//     const { audio_url } = await speakRes.json();

//     // Play audio
//     await sound.current.unloadAsync();
//     await sound.current.loadAsync({ uri: audio_url });
//     await sound.current.playAsync();

//     setLoading(false);
//   };

//   return (
//     <View style={styles.container}>
//       <Button
//         title={recording ? "🛑 Stop" : "🎙️ Start Talking"}
//         onPress={recording ? stopRecording : startRecording}
//       />
//       {loading && <ActivityIndicator style={{ margin: 10 }} />}
//       <Text style={styles.response}>🤖 {response}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { padding: 20 },
//   response: { marginTop: 20, fontSize: 16 },
// });