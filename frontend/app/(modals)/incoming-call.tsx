// // app/(modals)/incoming-call.tsx

// import React, { useEffect, useState } from 'react';
// import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { answerCall, rejectCall } from '@/app/features/videoCall/startCall';
// import { Audio } from 'expo-av';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';

// const { width, height } = Dimensions.get('window');

// // Timeout for auto-declining calls
// const CALL_TIMEOUT_MS = 30000; // 30 seconds

// export default function IncomingCallScreen() {
//   const { meetingId, callerId, callerName } = useLocalSearchParams<{
//     meetingId: string;
//     callerId: string;
//     callerName: string;
//   }>();
//   const router = useRouter();
//   const [sound, setSound] = useState<Audio.Sound | null>(null);
  
//   // Start the ringtone and set up auto-decline
//   useEffect(() => {
//     let timeout: NodeJS.Timeout;
    
//     // Play ringtone
//     async function playRingtone() {
//       const { sound } = await Audio.Sound.createAsync(
//         require('@/assets/sounds/ringtone.mp3'),
//         { isLooping: true, volume: 1.0 }
//       );
//       setSound(sound);
//       await sound.playAsync();
//     }
    
//     playRingtone();
    
//     // Auto-decline after timeout
//     timeout = setTimeout(() => {
//       handleReject();
//     }, CALL_TIMEOUT_MS);
    
//     return () => {
//       // Clean up
//       if (sound) {
//         sound.stopAsync().catch(() => {});
//         sound.unloadAsync().catch(() => {});
//       }
//       clearTimeout(timeout);
//     };
//   }, []);
  
//   // Handle accept call
//   const handleAccept = async () => {
//     // Stop ringtone
//     if (sound) {
//       await sound.stopAsync();
//     }
    
//     // Navigate to call screen
//     await answerCall({
//       meetingId,
//       callerId,
//       callerName
//     });
//   };
  
//   // Handle reject call
//   const handleReject = async () => {
//     // Stop ringtone
//     if (sound) {
//       await sound.stopAsync();
//     }
    
//     // Reject and go back
//     await rejectCall({
//       meetingId,
//       callerId
//     });
//   };
  
//   return (
//     <LinearGradient
//       colors={['#1a237e', '#3949ab', '#3f51b5']}
//       style={styles.container}
//     >
//       <View style={styles.callerInfoContainer}>
//         <View style={styles.avatarContainer}>
//           <Image 
//             source={{ uri: `https://ui-avatars.com/api/?name=${callerName}&background=random&size=128` }}
//             style={styles.avatar}
//           />
//         </View>
//         <Text style={styles.callerName}>{callerName}</Text>
//         <Text style={styles.callingText}>Incoming video call...</Text>
//       </View>
      
//       <View style={styles.actionsContainer}>
//         <TouchableOpacity 
//           style={[styles.actionButton, styles.declineButton]}
//           onPress={handleReject}
//         >
//           <Ionicons name="close" size={32} color="white" />
//           <Text style={styles.actionText}>Decline</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           style={[styles.actionButton, styles.acceptButton]}
//           onPress={handleAccept}
//         >
//           <Ionicons name="videocam" size={32} color="white" />
//           <Text style={styles.actionText}>Accept</Text>
//         </TouchableOpacity>
//       </View>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'space-between',
//     padding: 20,
//   },
//   callerInfoContainer: {
//     marginTop: height * 0.15,
//     alignItems: 'center',
//   },
//   avatarContainer: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     overflow: 'hidden',
//     borderWidth: 2,
//     borderColor: 'white',
//     marginBottom: 20,
//   },
//   avatar: {
//     width: '100%',
//     height: '100%',
//   },
//   callerName: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 10,
//   },
//   callingText: {
//     fontSize: 16,
//     color: 'rgba(255, 255, 255, 0.8)',
//   },
//   actionsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-evenly',
//     marginBottom: height * 0.1,
//   },
//   actionButton: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   declineButton: {
//     backgroundColor: '#F44336',
//   },
//   acceptButton: {
//     backgroundColor: '#4CAF50',
//   },
//   actionText: {
//     color: 'white',
//     marginTop: 5,
//     fontSize: 12,
//   }
// });