import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import VideoPlayer from './components/VideoPlayer'
import SubtitleOverlay from './components/SubtitleOverlay'
import { readAsStringAsync } from 'expo-file-system'
import { Asset } from 'expo-asset'
import { parseSrt, Cue } from '../../utils/subtitles'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')
// const VIDEO_HEIGHT = (width * 9) / 16

export default function InteractiveCallScreen({
    contactName,
    contactPhoto,
}: {
    contactName: string,
    contactPhoto: any
}) {
    const router = useRouter()
    const [paused, setPaused] = useState(false)
    const [cues, setCues] = useState<Cue[]>([])
    const [currentMs, setCurrentMs] = useState(0)

    // load + parse subtitles on mount
    useEffect(() => {
        ; (async () => {
            const asset = Asset.fromModule(require('./assets/subtitles.srt'))
            await asset.downloadAsync()
            const raw = await readAsStringAsync(asset.localUri!)
            setCues(parseSrt(raw))
        })()
    }, [])

    const handleEndCall = () => {
        // navigate back / close modal
        router.back()
    }

    return (
        <SafeAreaView style={styles.container}>
            <VideoPlayer
                source={require('./assets/video.mp4')}
                paused={paused}
                onProgress={setCurrentMs}
            />
            {/* <LinearGradient
                colors={['#000', 'rgba(0, 0, 0, 0)']}
                start={{ x: 0.5, y: 0 }}         // 顶部中间
                end={{ x: 0.5, y: 1 }}
                style={styles.gradientOverlay}
            /> */}
            <LinearGradient
                colors={['rgba(0,0,0,0.9)', 'transparent']}
                style={styles.topFade}
            />
            <View style={styles.headerBar}>
                <Image source={contactPhoto} style={styles.avatar} />
                <Text style={styles.headerText}>{contactName}</Text>
            </View>
            {/* <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {contactName}
                </Text>
            </View> */}

            {/* <SubtitleOverlay cues={cues} currentMs={currentMs} /> */}

            <View style={styles.subtitleWrapper}>
                <SubtitleOverlay
                    cues={cues}
                    currentMs={currentMs}
                />
            </View>
            <View style={styles.buttonWrapper}>
                {/* End call */}
                <TouchableOpacity
                    style={[styles.circleButton, styles.endCallButton]}
                    onPress={handleEndCall}
                >
                    <MaterialIcons name="call-end" size={28} color="white" />
                </TouchableOpacity>

                {/* Play / Pause */}
                <TouchableOpacity
                    style={styles.circleButton}
                    onPress={() => setPaused((p) => !p)}
                >
                    <Text style={styles.buttonText}>
                        {paused ? '▶️' : '⏸️'}
                    </Text>
                </TouchableOpacity>
            </View>
            {/* <View style={styles.buttonWrapper}>
                <TouchableOpacity
                    style={styles.circleButton}
                    onPress={() => setPaused(!paused)}
                >
                    <Text style={styles.buttonText}>
                        {paused ? '▶️' : '⏸️'}
                    </Text>
                </TouchableOpacity>
            </View> */}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,            // how tall the fade should be
    },
    headerBar: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 50,   // makes it circular
        borderWidth: 0,
        borderColor: 'white',
    },
    headerText: {
        color: 'white',
        fontSize: 24,
        fontWeight: '600',
        marginLeft: 12,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150, // adjust height as needed
    },
    header: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },

    subtitleWrapper: {
        position: 'relative',
        left: 0,
        right: 0,
        top: '80%',  // Center vertically
        alignItems: 'center',
        paddingHorizontal: 20,
    },

    buttonWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 40,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    circleButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },

    endCallButton: {
        backgroundColor: '#D32F2F', // red
    },

    buttonText: {
        fontSize: 24,
        color: '#000',
    },
})



// import React, { useState, useRef, useEffect } from 'react';
// import { View, Text, TouchableOpacity, Button, StyleSheet, Dimensions } from 'react-native';
// import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
// import * as FileSystem from 'expo-file-system';
// import { Asset } from 'expo-asset';

// import VideoWithSubtitles from './components/VideoWithSubtitles';

// const { width } = Dimensions.get('window');

// export default function InteractiveCallScreen() {
//     const [paused, setPaused] = useState(true);

//     return (
//         <View style={styles.container}>
//             <VideoWithSubtitles
//                 source={require('./assets/video.mp4')}
//                 paused={paused}
//             />
//             <TouchableOpacity 
//                 style={styles.circleButton}
//                 onPress={() => setPaused(!paused)}
//             >
//                 <Text style={styles.buttonText}>
//                     {paused ? '▶️' : '⏸️'}
//                 </Text>
//             </TouchableOpacity>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#000',
//         alignItems: 'center',
//     },
//     circleButton: {
//         position: 'absolute',
//         bottom: 40,
//         width: 60,
//         height: 60,
//         borderRadius: 30,
//         backgroundColor: 'rgba(255, 255, 255, 0.9)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         elevation: 5,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.25,
//         shadowRadius: 3.84,
//     },
//     buttonText: {
//         fontSize: 24,
//         textAlign: 'center',
//     }
// });

// import React, { useRef, useState, useEffect } from 'react';
// // import { router } from 'expo-router';
// import { useRouter } from 'expo-router';

// import {
//     View,
//     Text,
//     Button,
//     StyleSheet,
//     Dimensions,
//     ActivityIndicator,
//     Alert,
// } from 'react-native';
// import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
// import * as FileSystem from 'expo-file-system';
// import { Asset } from 'expo-asset';
// import SrtParser2 from 'srt-parser-2';
// import { Audio } from 'expo-av';

// import { useFakePhoneCall } from './hooks/useFakePhoneCall';

// const { width } = Dimensions.get('window');
// const VIDEO_HEIGHT = (width * 9) / 16;

// function toMs(ts: string): number {
//     const [hms, ms] = ts.split(',');
//     const [h, m, s] = hms.split(':').map(Number);
//     return ((h * 3600 + m * 60 + s) * 1000) + Number(ms);
// }

// interface Cue {
//   start: number;
//   end: number;
//   text: string;
//   speaker: 'speaker1' | 'speaker2';  // Add speaker identification
// }

// export default function InteractiveCallScreen() {
//     const router = useRouter();
//     const videoRef = useRef<Video>(null);
//     const [cues, setCues] = useState<{ start: number; end: number; text: string }[]>([]);
//     const [pos, setPos] = useState(0);
//     const [subtitle, setSubtitle] = useState('');
//     const [recording, setRecording] = useState<Audio.Recording | null>(null);
//     const [loading, setLoading] = useState(false);
//     const replySound = useRef<Audio.Sound | null>(null);


//     const { incoming, paused, startFakeCall, answerCall, declineCall } = useFakePhoneCall();

//     // 1) load & parse subtitles once
//     useEffect(() => {
//         (async () => {
//             const asset = Asset.fromModule(require('./assets/subtitles.srt'));
//             await asset.downloadAsync();
//             const srt = await FileSystem.readAsStringAsync(asset.localUri!);
//             const parser = new SrtParser2();
//             const items = parser.fromSrt(srt);
//             setCues(items.map(i => ({
//                 start: toMs(i.startTime),
//                 end: toMs(i.endTime),
//                 text: i.text.trim(),
//             })));
//         })();
//     }, []);

//     // 2) update current playback position
//     // const onStatus = (status: any) => {
//     //     if (status.isLoaded && status.positionMillis != null) {
//     //         setPos(status.positionMillis);
//     //     }
//     // };
//     const onStatus = (status: AVPlaybackStatus) => {
//         if (status.isLoaded && status.positionMillis != null) {
//             setPos(status.positionMillis);
//         }
//     };

//     // 3) pick current subtitle
//     useEffect(() => {
//         const cue = cues.find(c => pos >= c.start && pos <= c.end);
//         setSubtitle(cue?.text || '');
//     }, [pos, cues]);

//     // 4) recording handlers
//     // const startRecording = async () => {
//     //     // 1) tell the hook “we’re in call” (pauses video & shows overlay)
//     //     startFakeCall();

//     //     // 2) begin audio recording
//     //     await Audio.requestPermissionsAsync();
//     //     await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
//     //     // const { recording } = await Audio.Recording.createAsync(
//     //     //     Audio.RecordingOptionsPresets.HIGH_QUALITY
//     //     // );

//     //     const { recording } = await Audio.Recording.createAsync(
//     //         Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
//     //     );
//     //     setRecording(recording);
//     // };

//     const startRecording = async () => {
//         startFakeCall(); // pause video & show overlay

//         const { granted } = await Audio.requestPermissionsAsync();
//         if (!granted) {
//             Alert.alert('Permission required', 'Please enable microphone permissions.');
//             return;
//         }
//         await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

//         // ⚠️ use the correct preset constant
//         const { recording } = await Audio.Recording.createAsync(
//             Audio.RecordingOptionsPresets.HIGH_QUALITY
//         );
//         setRecording(recording);
//     };

//     const stopRecording = async () => {
//         if (!recording) return;
//         setLoading(true);

//         // 3) stop & unload recording
//         await recording.stopAndUnloadAsync();
//         const uri = recording.getURI()!;
//         setRecording(null);

//         // 4) STT → Chat → TTS
//         const form = new FormData();
//         form.append('audio', { uri, name: 'input.wav', type: 'audio/wav' } as any);

//         const { text } = await fetch('http://<your-ip>:5000/transcribe', {
//             method: 'POST',
//             body: form,
//             headers: { 'Content-Type': 'multipart/form-data' },
//         }).then(r => r.json());

//         const { reply } = await fetch('http://<your-ip>:5000/chat', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ prompt: text }),
//         }).then(r => r.json());

//         const { audio_url } = await fetch('http://<your-ip>:5000/speak', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ text: reply }),
//         }).then(r => r.json());

//         // 5) play AI’s answer
//         const { sound } = await Audio.Sound.createAsync({ uri: audio_url });
//         replySound.current = sound;
//         await sound.playAsync();

//         // 6) tell the hook “call is over” (hide overlay & resume video)
//         declineCall();

//         router.back();

//         setLoading(false);
//     };

//     // Clean up TTS sound on unmount
//     useEffect(() => () => {
//         replySound.current?.unloadAsync();
//     }, []);

//     useEffect(() => {
//         console.log('Recording state changed:', recording);
//     }, [recording]);

//     return (
//         <View style={styles.container}>

//             {/* VIDEO (pauses when paused===true) */}
//             <Video
//                 ref={videoRef}
//                 source={require('./assets/video.mp4')}
//                 style={styles.video}
//                 useNativeControls
//                 resizeMode={ResizeMode.CONTAIN}
//                 shouldPlay={!paused}
//                 onPlaybackStatusUpdate={onStatus}
//             />

//             {/* SUBTITLE */}
//             {subtitle !== '' && (
//                 <View style={styles.subtitleBox}>
//                     <Text style={styles.subtitleText}>{subtitle}</Text>
//                 </View>
//             )}

//             {/* SHOW “Speak” BUTTON when not already in call */}
//             {!incoming && !loading && subtitle !== '' && (
//                 <Button title="📞 Speak to Character" onPress={startRecording} />
//             )}

//             {/* SHOW “Stop & Send” after recording starts */}
//             {/* {recording && (
//                 <Button title="🔴 Stop & Send" onPress={stopRecording} />
//             )} */}

//             {/* OPTIONAL OVERLAY during the user’s turn */}
//             {incoming && (
//                 <View style={styles.overlay}>
//                     <Text style={styles.overlayText}>Recording…</Text>
//                     {recording && (
//                         <Button
//                             title="🔴 Stop & Send"
//                             onPress={stopRecording}
//                             disabled={loading}
//                         />
//                     )}
//                 </View>
//             )}

//             {loading && <ActivityIndicator style={{ margin: 20 }} />}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
//     video: { width, height: VIDEO_HEIGHT },
//     subtitleBox: {
//         position: 'absolute', bottom: 60, width: '100%', alignItems: 'center', padding: 10
//     },
//     subtitleText: {
//         color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)',
//         padding: 4, borderRadius: 4
//     },
//     overlay: {
//         ...StyleSheet.absoluteFillObject,
//         backgroundColor: 'rgba(0,0,0,0.5)',
//         justifyContent: 'center',
//         alignItems: 'center'
//     },
//     overlayText: { color: '#fff', fontSize: 24 },
// });