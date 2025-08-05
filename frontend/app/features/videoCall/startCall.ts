// app/features/videoCall/startCall.ts

import { router } from 'expo-router';
import { Share } from 'react-native';
import { createMeeting } from './videoConfig';
import { firebase } from '@/app/config/firebase';

// Global loading state
let isLoading = false;
const setIsLoading = (state: boolean) => { isLoading = state; };

// Call a specific contact
export const callUser = async (userId: string, userName: string) => {
  setIsLoading(true);
  
  try {
    console.log(`Initiating call with ${userName} (${userId})`);
    
    // Create a room on the server
    const roomId = await createMeeting();
    
    const auth = firebase.auth();
    const callerId = auth.currentUser?.uid;
    const callerProfile = await firebase.firestore()
      .collection('users')
      .doc(callerId)
      .get();
    const callerName = callerProfile.data()?.displayName || "Unknown User";
    
    const initiateCallFn = firebase.functions().httpsCallable('initiateCall');
    const result = await initiateCallFn({
      recipientId: userId,
      callerId,
      callerName,
      meetingId: roomId,
    });
    
    if (!result.data.success) {
      alert("User is not available right now");
      return null;
    }
    
    // Navigate to call screen
    router.push({
      pathname: '/(modals)/video-call',
      params: {
        meetingId: roomId,
        recipient: userId,
        recipientName: userName,
        isInitiator: 'true'
      }
    });

    // Here you would typically send a notification to the recipient
    // sendCallNotification(userId, roomId, userName);
    
    return roomId;
  } catch (error) {
    console.error("Failed to start call:", error);
    alert("Could not start call. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

// Share meeting link with recipient
export const shareMeetingLink = async (meetingId: string, recipientName?: string) => {
  try {
    await Share.share({
      message: `Join my video call${recipientName ? ' with ' + recipientName : ''}: ${meetingId}`,
    });
  } catch (error) {
    console.error("Error sharing meeting link:", error);
  }
};

// Answer an incoming call
export const answerCall = async (callData: { meetingId: string; callerId: string; callerName: string }) => {
  try {
    // Update call status
    const updateCallStatusFn = firebase.functions().httpsCallable('updateCallStatus');
    await updateCallStatusFn({
      meetingId: callData.meetingId,
      callerId: callData.callerId,
      recipientId: firebase.auth().currentUser?.uid,
      status: 'accepted'
    });
    
    // Navigate to call screen
    router.push({
      pathname: '/(modals)/video-call',
      params: {
        meetingId: callData.meetingId,
        recipient: callData.callerId,
        recipientName: callData.callerName,
        isInitiator: 'false'
      }
    });
  } catch (error) {
    console.error("Error answering call:", error);
  }
};

export const rejectCall = async (callData: { meetingId: string; callerId: string }) => {
  try {
    // Update call status
    const updateCallStatusFn = firebase.functions().httpsCallable('updateCallStatus');
    await updateCallStatusFn({
      meetingId: callData.meetingId,
      callerId: callData.callerId,
      recipientId: firebase.auth().currentUser?.uid,
      status: 'rejected'
    });
    
    // Navigate back or to home
    router.back();
  } catch (error) {
    console.error("Error rejecting call:", error);
    router.back();
  }
};
// the below is for client-generated id without API call
// import { v4 as uuidv4 } from 'uuid';

// // Global loading state
// let isLoading = false;
// const setIsLoading = (state: boolean) => { isLoading = state; };

// // Start a new call as the initiator
// export const startOneToOneCall = async (recipientId: string) => {
//   setIsLoading(true);
  
//   try {
//     // Generate a local UUID instead of API call
//     const meetingId = uuidv4();
//     console.log(`Created local meeting: ${meetingId} for ${recipientId}`);
    
//     // Navigate to call screen with the UUID as meeting ID
//     router.push(`/(modals)/video-call?meetingId=${meetingId}&recipient=${recipientId}&isInitiator=true`);
//     return meetingId;
//   } catch (error) {
//     console.error("Failed to start call:", error);
//     alert("Could not start call. Please try again.");
//   } finally {
//     setIsLoading(false);
//   }
// };

// export const callUser = async (userId: string, userName: string) => {
//   try {
//     console.log(`Initiating call with user: ${userName} (${userId})`);
    
//     // Generate a unique meeting ID
//     const meetingId = uuidv4();
    
//     // Navigate to call screen with user details
//     router.push({
//       pathname: '/(modals)/video-call',
//       params: {
//         meetingId,
//         recipient: userId,
//         recipientName: userName,
//         isInitiator: 'true'
//       }
//     });
    
//     // Optional: Notify the recipient about the incoming call
//     // This would typically be done through a push notification service
//     // notifyUserOfCall(userId, meetingId);
    
//     return meetingId;
//   } catch (error) {
//     console.error("Failed to start call:", error);
//     alert("Could not start call. Please try again.");
//   }
// };

// // Share meeting link with recipient
// export const shareMeetingLink = async (meetingId: string, recipientName?: string) => {
//   try {
//     await Share.share({
//       message: `Join my video call${recipientName ? ' with ' + recipientName : ''}: ${meetingId}`,
//     });
//   } catch (error) {
//     console.error("Error sharing meeting link:", error);
//   }
// };

// // Join an existing call with a provided meeting ID
// export const joinExistingCall = (meetingId: string) => {
//   if (!meetingId) {
//     alert("Please enter a valid meeting ID");
//     return;
//   }
  
//   console.log(`Joining existing meeting: ${meetingId}`);
//   router.push(`/(modals)/video-call?meetingId=${meetingId}`);
// };