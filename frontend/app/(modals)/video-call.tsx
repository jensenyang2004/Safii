// app/(modals)/video-call.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-native-sdk';
// import { RTCView } from 'react-native-webrtc';
import { RTCView } from '@videosdk.live/react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import { updateCallStatus } from '@/app/features/videoCall/callManager';
import { VIDEO_SDK_TOKEN } from '@/app/features/videoCall/videoConfig';

export default function VideoCallScreen() {
  const params = useLocalSearchParams();
  const { meetingId, recipientName, isInitiator } = params;
  const callerId = params.callerId as string;

  // Handle back button and call termination
  useEffect(() => {
    // Set a timeout for unanswered calls (for initiator only)
    let timeout: NodeJS.Timeout | null = null;

    if (isInitiator === 'true') {
      timeout = setTimeout(() => {
        Alert.alert(
          "No Answer",
          "The recipient didn't answer the call",
          [{ text: "OK", onPress: () => router.back() }]
        );
        updateCallStatus(meetingId as string, 'ended', callerId);
      }, 45000); // 45 second timeout
    }

    return () => {
      // Clear timeout if component unmounts
      if (timeout) clearTimeout(timeout);

      // When screen is unmounted, update call status if needed
      if (isInitiator === 'true') {
        updateCallStatus(meetingId as string, 'ended', callerId);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <MeetingProvider
        token={VIDEO_SDK_TOKEN}
        meetingId={meetingId as string}
        participantId={undefined}
        micEnabled={true}
        webcamEnabled={true}
      >
        <MeetingView
          recipientName={recipientName as string}
          isInitiator={isInitiator === 'true'}
          callerId={callerId}
          meetingId={meetingId as string}
        />
      </MeetingProvider>
    </View>
  );
}

function MeetingView({ recipientName, isInitiator, callerId, meetingId }) {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);

  const { join, leave, toggleMic, toggleWebcam, participants, localParticipant } = useMeeting({
    onMeetingJoined: () => {
      console.log("Meeting joined successfully");
      setConnectionStatus('connected');

      // Notify server that call was accepted (if recipient)
      if (!isInitiator) {
        updateCallStatus(meetingId, 'accepted', callerId);
      }
    },
    onMeetingLeft: () => {
      console.log("Meeting left");
      router.back();
    },
    onParticipantLeft: () => {
      Alert.alert("Call Ended", "The other participant has left the call");
      setTimeout(() => router.back(), 2000);
    },
    onError: (error) => {
      console.error("Meeting error:", error);
      Alert.alert(
        "Connection Error",
        "There was a problem connecting to the call",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  });

  const [micOn, setMicOn] = useState(true);
  const [webcamOn, setWebcamOn] = useState(true);

  // Update toggle handlers
  const handleToggleMic = () => {
    toggleMic();
    setMicOn(!micOn);
  };

  const handleToggleWebcam = () => {
    toggleWebcam();
    setWebcamOn(!webcamOn);
  };

  // Join meeting when component mounts
  useEffect(() => {
    join();
    return () => {
      try {
        leave();
      } catch (error) {
        console.error("Error leaving meeting:", error);
      }
    };
  }, []);

  useEffect(() => {
    let timer;
    if (connectionStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connectionStatus]);

  const participantIds = [...participants.keys()];

  // Check if the call is connected to another participant
  const isConnected = participantIds.length > (localParticipant ? 1 : 0);

  // Update connection status based on participants
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    }
  }, [isConnected]);

  return (
    <View style={styles.meetingContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {isInitiator ?
            connectionStatus === 'connected' ?
              `Call with ${recipientName}` :
              `Calling ${recipientName}...`
            : "Incoming Call"}
        </Text>
        {connectionStatus === 'connected' && (
          <Text style={styles.durationText}>
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>
      <View style={styles.participantsContainer}>
        {participantIds.length > 0 ? (
          participantIds.map((participantId) => (
            <ParticipantView
              key={participantId}
              participantId={participantId}
            />
          ))
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Connecting...</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleToggleMic}>
          <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endButton]}
          onPress={() => {
            if (isInitiator) {
              updateCallStatus(meetingId, 'ended', callerId);
            }
            leave();
            router.back();
          }}
        >
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleToggleWebcam}>
          <Ionicons name={webcamOn ? "videocam" : "videocam-off"} size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ParticipantView({ participantId }) {
  const { webcamStream, webcamOn, micOn, displayName } = useParticipant(participantId);

  return (
    <View style={styles.participantContainer}>
      {webcamOn && webcamStream ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit="cover"
          style={styles.participantVideo}
        />
      ) : (
        <View style={styles.noVideoContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(displayName || "User").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{displayName || "Participant"}</Text>
        {!micOn && <Ionicons name="mic-off" size={16} color="white" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  meetingContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantsContainer: {
    flex: 1,
  },
  participantContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  participantVideo: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  participantName: {
    color: 'white',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  endButton: {
    backgroundColor: 'red',
    transform: [{ rotate: '135deg' }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
});
// import React, { useState, useEffect } from "react";
// import { View, Button, StyleSheet, Dimensions, Text } from "react-native";
// import { MeetingProvider, useMeeting, register } from "@videosdk.live/react-native-sdk";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { VIDEO_SDK_API_KEY, VIDEO_SDK_TOKEN } from '@/app/features/videoCall/videoConfig';
// import { shareMeetingLink } from '@/app/features/videoCall/startCall';

// const { width, height } = Dimensions.get("window");

// // Register SDK at file level
// try {
//   register();
//   console.log("VideoSDK registered at module level");
// } catch (error) {
//   console.error("Error registering VideoSDK:", error);
// }

// // Call UI Component
// function VoiceCallContent({ meetingId, recipientName }: {
//   meetingId: string;
//   recipientName?: string;
// }) {
//   const meeting = useMeeting();
//   const [callStatus, setCallStatus] = useState("Initializing...");
//   const [participantCount, setParticipantCount] = useState(0);
//   const router = useRouter();

//   const isMountedRef = React.useRef(true);
//   const hasJoinedRef = React.useRef(false);
//   const hasLeftRef = React.useRef(false);

//   // Join the meeting when component mounts
//   useEffect(() => {
//     console.log("Join effect running, meeting object:", meeting ? "exists" : "null");
//     let timer: NodeJS.Timeout | null = null;

//     // Only join if we haven't already
//     if (meeting && typeof meeting.join === 'function' && !hasJoinedRef.current) {
//       console.log("Setting up join timer");

//       timer = setTimeout(() => {
//         try {
//           console.log("Attempting to join meeting now");
//           if (isMountedRef.current && !hasJoinedRef.current) {
//             meeting.join();
//             hasJoinedRef.current = true;
//             if (isMountedRef.current) {
//               setCallStatus("Connected");
//               console.log("Joined meeting:", meetingId);
//             }
//           }
//         } catch (error) {
//           console.error("Error joining meeting:", error);
//           if (isMountedRef.current) {
//             setCallStatus("Connection failed");
//           }
//         }
//       }, 2000);
//     } else if (!meeting) {
//       console.log("Meeting object not available yet");
//       if (isMountedRef.current) {
//         setCallStatus("Waiting for connection...");
//       }
//     } else if (hasJoinedRef.current) {
//       console.log("Already joined, not joining again");
//     }

//     // Cleanup function
//     return () => {
//       // Mark component as unmounted first
//       isMountedRef.current = false;

//       // Clear any pending timers
//       if (timer) clearTimeout(timer);

//       // Only try to leave if we've joined but haven't left yet
//       if (hasJoinedRef.current && !hasLeftRef.current) {
//         console.log("Component unmounting, leaving meeting");
//         try {
//           if (meeting && typeof meeting.leave === 'function') {
//             hasLeftRef.current = true;
//             meeting.leave();
//             console.log("Left meeting cleanly:", meetingId);
//           }
//         } catch (error) {
//           console.error("Error in cleanup:", error);
//         }
//       }
//     };
//   }, [meeting, meetingId]);

//   useEffect(() => {
//     return () => {
//       console.log("Final unmount cleanup running");
//       isMountedRef.current = false;

//       // This will run only when the component is truly unmounting
//       if (hasJoinedRef.current && !hasLeftRef.current) {
//         try {
//           if (meeting && typeof meeting.leave === 'function') {
//             hasLeftRef.current = true;
//             console.log("Leaving meeting in final cleanup");
//             meeting.leave();
//           }
//         } catch (error) {
//           console.error("Error leaving meeting in final cleanup:", error);
//         }
//       }
//     };
//   }, []); // Empty dependency array means this only runs on mount and unmount

//   // Update participant count with improved error handling
//   useEffect(() => {
//     // Only run if component is still mounted
//     if (isMountedRef.current && meeting?.participants) {
//       try {
//         const count = meeting.participants.size;
//         if (isMountedRef.current) {
//           setParticipantCount(count);

//           // Use ref to track previous count
//           if (count !== participantCount) {
//             console.log("Participants:", count);
//           }
//         }
//       } catch (error) {
//         console.error("Error getting participants:", error);
//       }
//     }
//   }, [meeting?.participants, participantCount]);


//   // Call controls
//   const handleEndCall = () => {
//     try {
//       setCallStatus("Disconnecting...");

//       // Set a small timeout to ensure UI updates before leaving
//       setTimeout(() => {
//         if (meeting && typeof meeting.leave === 'function') {
//           try {
//             meeting.leave();
//             console.log("Call ended by user");
//           } catch (error) {
//             console.error("Error ending call:", error);
//           } finally {
//             // Always navigate back regardless of errors
//             router.back();
//           }
//         } else {
//           router.back();
//         }
//       }, 100);
//     } catch (error) {
//       console.error("Error in handleEndCall:", error);
//       router.back();
//     }
//   };

//   const handleToggleMic = () => {
//     try {
//       if (meeting && typeof meeting.toggleMic === 'function') {
//         meeting.toggleMic();
//       }
//     } catch (error) {
//       console.error("Error toggling mic:", error);
//     }
//   };

//   const handleShareLink = () => {
//     try {
//       shareMeetingLink(meetingId, recipientName);
//     } catch (error) {
//       console.error("Error sharing link:", error);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.statusContainer}>
//         <Text style={styles.statusText}>Status: {callStatus}</Text>
//         <Text style={styles.statusText}>
//           Call with: {recipientName || "Unknown User"}
//         </Text>
//         <Text style={styles.statusText}>
//           Participants: {participantCount}
//         </Text>
//         <Text style={styles.meetingIdText}>Room ID: {meetingId}</Text>
//       </View>

//       <View style={styles.controlsContainer}>
//         <Button
//           title="Share Link"
//           onPress={handleShareLink}
//           color="#4CAF50"
//         />
//         <Button
//           title={meeting?.isMicOn ? "Mute" : "Unmute"}
//           onPress={handleToggleMic}
//         />
//         <Button
//           title="End Call"
//           onPress={handleEndCall}
//           color="#F44336"
//         />
//       </View>
//     </View>
//   );
// }

// // Main video call modal component
// export default function VideoCallModal() {
//   const { meetingId, recipient, recipientName, isInitiator } = useLocalSearchParams<{
//     meetingId: string;
//     recipient: string;
//     recipientName: string;
//     isInitiator: string;
//   }>();

//   const router = useRouter();

//   if (!meetingId) {
//     return (
//       <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
//         <Text style={{ color: '#FF5252', fontSize: 18 }}>
//           Error: Missing meeting ID
//         </Text>
//         <Button title="Go Back" onPress={() => router.back()} />
//       </View>
//     );
//   }

//   console.log(`${isInitiator === 'true' ? "Starting" : "Joining"} call in room ${meetingId}`);
//   if (recipient) console.log(`Call with: ${recipientName || recipient}`);

//   // Simplified meeting configuration
//   // const meetingConfig = {
//   //   apiKey: VIDEO_SDK_API_KEY,
//   //   token: VIDEO_SDK_TOKEN,
//   //   meetingId,
//   //   micEnabled: true,
//   //   webcamEnabled: false,
//   //   name: `User-${Date.now().toString().slice(-4)}`,
//   // };

//   return (
//     // <MeetingProvider config={meetingConfig}>
//     <MeetingProvider
//       config={{
//         meetingId,
//         micEnabled: true,
//         webcamEnabled: false,
//         name: `User-${Date.now().toString().slice(-4)}`,
//       }}
//       token={VIDEO_SDK_TOKEN}
//       apiKey={VIDEO_SDK_API_KEY}
//     >
//       <VoiceCallContent
//         meetingId={meetingId}
//         recipientName={recipientName}
//       />
//     </MeetingProvider>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#121212",
//     justifyContent: "space-between",
//     padding: 20,
//   },
//   statusContainer: {
//     marginTop: 40,
//     alignItems: "center",
//   },
//   statusText: {
//     color: "#FFFFFF",
//     fontSize: 18,
//     marginBottom: 10,
//   },
//   meetingIdText: {
//     color: "#AAAAAA",
//     fontSize: 14,
//     marginTop: 20,
//   },
//   controlsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-around",
//     marginBottom: 30,
//   }
// });






// the below is for client-generated id without API call
// "use client";
// import React, { useState, useEffect } from "react";
// import { View, Button, StyleSheet, Dimensions, Text, TextInput, Share } from "react-native";
// import { MeetingProvider, useMeeting } from "@videosdk.live/react-native-sdk";
// import { router, useLocalSearchParams, useRouter } from "expo-router";
// import { VIDEO_SDK_API_KEY, VIDEO_SDK_TOKEN, DEFAULT_MEETING_ID } from '@/app/features/videoCall/videoConfig';
// import { shareMeetingLink } from '@/app/features/videoCall/startCall';
// import { v4 as uuidv4 } from 'uuid';

// const { width, height } = Dimensions.get("window");

// // This component uses the useMeeting hook and must be inside MeetingProvider
// function VoiceCallContent({ meetingId, recipientId, recipientName }: {
//   meetingId: string;
//   recipientId?: string;
//   recipientName?: string;
// }) {
//   const meeting = useMeeting() as any;
//   const [callStatus, setCallStatus] = useState("Initializing...");
//   const [participantCount, setParticipantCount] = useState(0);
//   const router = useRouter();

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (meeting && meeting.join) {
//         meeting.join();
//         setCallStatus("Connected");
//       }
//     }, 500);

//     return () => {
//       clearTimeout(timer);
//       if (meeting && meeting.leave) {
//         meeting.leave();
//       }
//     };
//   }, [meeting]);

//   // Update participant count when participants change
//   useEffect(() => {
//     if (meeting && meeting.participants) {
//       setParticipantCount(meeting.participants.size);
//     }
//   }, [meeting?.participants]);

//   const handleEndCall = () => {
//     if (meeting && meeting.leave) {
//       meeting.leave();
//     }
//     router.back();
//   };

//   const handleToggleMic = () => {
//     if (meeting && meeting.toggleMic) {
//       meeting.toggleMic();
//     }
//   };

//   const handleShareLink = () => {
//     shareMeetingLink(meetingId);
//   };

//   // Simple UI for PoC
//   return (
//     <View style={styles.container}>
//       <View style={styles.statusContainer}>
//         <Text style={styles.statusText}>Status: {callStatus}</Text>
//         <Text style={styles.statusText}>
//           Call with: {recipientName || "Unknown User"}
//         </Text>
//         <Text style={styles.statusText}>
//           Participants: {participantCount}
//         </Text>
//         <Text style={styles.meetingIdText}>Meeting ID: {meetingId}</Text>
//       </View>

//       <View style={styles.controlsContainer}>
//         <Button
//           title="Share Link"
//           onPress={handleShareLink}
//           color="#4CAF50"
//         />
//         <Button
//           title={meeting?.isMicOn ? "Mute" : "Unmute"}
//           onPress={handleToggleMic}
//         />
//         <Button
//           title="End Call"
//           onPress={handleEndCall}
//           color="#F44336"
//         />
//       </View>
//     </View>
//   );
// }


// export default function VideoCallModal() {
//   const { meetingId, recipient, recipientName, isInitiator } = useLocalSearchParams<{
//     meetingId: string;
//     recipient: string;
//     recipientName: string;
//     isInitiator: string;
//   }>();

//   const actualMeetingId = meetingId || uuidv4();
//   const router = useRouter();
//   const [sdkReady, setSdkReady] = useState(false);

//   console.log(`${isInitiator ? "Starting" : "Joining"} call in room ${actualMeetingId}`);
//   if (recipient) console.log(`Call with: ${recipient}`);

//   // Force a string value for the token and log its actual content
//   const token = VIDEO_SDK_TOKEN || "";
//   console.log("Token content:", token.substring(0, 20) + "...");
//   if (recipient) console.log(`Call with: ${recipient}`);

//   // Hardcoded token for reliability
//   const hardcodedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIzMzllZjQ0ZS1hYzk2LTQ5MjktYTk2NS05NTg2YmVkYjc0NDYiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1NDAzNDM1OSwiZXhwIjoxNzg1NTcwMzU5fQ.hSmALs1ChN579XiQRHb_hgzASAPfwmq4H8UIPxTQz4w";

//   // Wait for SDK registration before rendering MeetingProvider
//   useEffect(() => {
//     try {
//       import('@videosdk.live/react-native-sdk').then(sdk => {
//         if (typeof sdk.register === 'function') {
//           sdk.register();
//           console.log("VideoSDK registered successfully in component");
//           // Wait a moment after registration before setting ready
//           setTimeout(() => setSdkReady(true), 500);
//         } else {
//           console.log("SDK imported but register function not found");
//           setSdkReady(true);
//         }
//       }).catch(err => {
//         console.error("Error importing SDK:", err);
//         // If import fails, still try to continue
//         setSdkReady(true);
//       });
//     } catch (error) {
//       console.error("Error in SDK registration:", error);
//       setSdkReady(true);
//     }
//   }, []);

//   // Check if token exists and is non-empty
//   if (!token || token.trim() === "") {
//     console.error("VideoSDK Token is missing or empty!");
//     return (
//       <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
//         <Text style={{ color: '#FF5252', fontSize: 18 }}>
//           Error: VideoSDK Token is missing. Please check your configuration.
//         </Text>
//         <Button title="Go Back" onPress={() => router.back()} />
//       </View>
//     );
//   }

//   // Use a hardcoded configuration to rule out any weird parameter passing issues
//   const meetingConfig = {
//     apiKey: VIDEO_SDK_API_KEY,
//     token: hardcodedToken,
//     // token, // Use the local variable to ensure it's a string
//     meetingId: actualMeetingId,
//     micEnabled: true,
//     webcamEnabled: false,
//     participantId: uuidv4(),
//     name: `User-${Date.now()}`,
//   };

//   console.log("Meeting config:", JSON.stringify({
//     apiKey: meetingConfig.apiKey ? "Present" : "Missing",
//     token: meetingConfig.token ? "Present" : "Missing",
//     tokenLength: meetingConfig.token?.length || 0,
//     meetingId: meetingConfig.meetingId,
//   }));

//   if (!sdkReady) {
//     return (
//       <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
//         <Text style={{ color: 'white', fontSize: 18 }}>Initializing call...</Text>
//         <Text style={{ color: '#AAAAAA', marginTop: 10 }}>Please wait a moment</Text>
//       </View>
//     );
//   }

//   return (
//     <MeetingProvider config={meetingConfig}>
//       <VoiceCallContent
//         meetingId={actualMeetingId}
//         recipientId={recipient}
//         recipientName={recipientName}
//       />
//     </MeetingProvider>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#121212",
//     justifyContent: "space-between",
//     padding: 20,
//   },
//   statusContainer: {
//     marginTop: 40,
//     alignItems: "center",
//   },
//   statusText: {
//     color: "#FFFFFF",
//     fontSize: 18,
//     marginBottom: 10,
//   },
//   meetingIdText: {
//     color: "#AAAAAA",
//     fontSize: 14,
//     marginTop: 20,
//   },
//   controlsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-around",
//     marginBottom: 30,
//   }
// });