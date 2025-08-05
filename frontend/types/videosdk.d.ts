declare module '@videosdk.live/react-native-sdk' {
  export interface MeetingContextType {
    meetingId: string;
    meeting: any;
    localParticipant: any;
    activeSpeakerId: string;
    participants: Map<string, any>;
    join: () => void;
    leave: () => void;
    toggleMic: () => void;
    isMicOn: boolean;
    isMeetingJoined: boolean;
    // Add other properties you use
  }

  export function useMeeting(): MeetingContextType;
  
  // Re-export other components/functions
  export function register(): void;
  export const MeetingProvider: React.FC<any>;
  export const MeetingLayout: React.FC<any>;
  export const ParticipantView: React.FC<any>;
}