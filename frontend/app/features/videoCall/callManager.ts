import { firebase } from '@/app/config/firebase';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { createMeeting } from './videoConfig';

/**
 * Initiates a video call with a specific user
 */
export const callUser = async (userId: string, userName: string) => {
  try {
    console.log(`Initiating call with ${userName} (${userId})`);
    
    // Create a meeting room using VideoSDK
    const meetingId = await createMeeting();
    
    // Get caller information
    const auth = firebase.auth();
    const callerId = auth.currentUser?.uid;
    const callerProfile = await firebase.firestore()
      .collection('users')
      .doc(callerId)
      .get();
    const callerName = callerProfile.data()?.displayName || "Unknown User";
    
    // Call the Firebase function to send notification
    const initiateCallFn = firebase.functions().httpsCallable('initiateCall');
    const result = await initiateCallFn({
      recipientId: userId,
      callerId,
      callerName,
      meetingId,
    });
    
    if (!result.data.success) {
      Alert.alert("Call Failed", "User is not available right now");
      return null;
    }
    
    // Navigate to call screen
    router.push({
      pathname: '/(modals)/video-call',
      params: {
        meetingId,
        recipient: userId,
        recipientName: userName,
        isInitiator: 'true',
        callerId
      }
    });
    
    return meetingId;
  } catch (error) {
    console.error("Failed to start call:", error);
    Alert.alert("Call Error", "Could not start call. Please try again.");
    return null;
  }
};

/**
 * Updates the status of a call (accepted, rejected, ended)
 */
export const updateCallStatus = async (
  meetingId: string, 
  status: 'accepted' | 'rejected' | 'ended', 
  callerId: string
) => {
  try {
    const auth = firebase.auth();
    const recipientId = auth.currentUser?.uid;
    
    // Call Firebase function to update status
    const updateStatusFn = firebase.functions().httpsCallable('updateCallStatus');
    await updateStatusFn({
      meetingId,
      status,
      recipientId,
      callerId
    });
    
    return true;
  } catch (error) {
    console.error("Failed to update call status:", error);
    return false;
  }
};

/**
 * Handles an incoming call notification
 */
export const handleIncomingCall = (notification: any) => {
  // Extract data from notification
  const { meetingId, callerId, callerName } = notification.data;
  
  // Show custom UI for incoming call
  Alert.alert(
    "Incoming Video Call",
    `Call from ${callerName}`,
    [
      {
        text: "Decline",
        onPress: () => {
          updateCallStatus(meetingId, 'rejected', callerId);
        },
        style: "cancel"
      },
      {
        text: "Answer",
        onPress: () => {
          updateCallStatus(meetingId, 'accepted', callerId);
          router.push({
            pathname: '/(modals)/video-call',
            params: {
              meetingId,
              recipientName: callerName,
              isInitiator: 'false',
              callerId
            }
          });
        }
      }
    ],
    { cancelable: false }
  );
};