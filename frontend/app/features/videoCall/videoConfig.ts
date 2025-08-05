// app/features/voiceCall/videoConfig.ts
// API key from your VideoSDK dashboard
export const VIDEO_SDK_API_KEY = "5e81579c7217a84401c3cdf04aa2f73b79db6c9ac8d9aa6ba3fb8853eaab75bd";
// export const VIDEO_SDK_API_KEY = "339ef44e-ac96-4929-a965-9586bedb7446";
export const VIDEO_SDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIzMzllZjQ0ZS1hYzk2LTQ5MjktYTk2NS05NTg2YmVkYjc0NDYiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1NDAzNDM1OSwiZXhwIjoxNzg1NTcwMzU5fQ.hSmALs1ChN579XiQRHb_hgzASAPfwmq4H8UIPxTQz4w";
// Default meeting ID for quick connections (can be overridden in components)
export const DEFAULT_MEETING_ID = "safii-default-meeting";

// Video quality settings
export const VIDEO_CONFIG = {
  width: 640,
  height: 480,
  frameRate: 30,
  bitrate: 1000000,
  optimizationMode: "balanced", // Options: "detail", "motion", "balanced"
};

// Audio settings
export const AUDIO_CONFIG = {
  sampleRate: 48000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
};

// Permissions helper (optional)
export const checkPermissions = async () => {
  // Implementation depends on your permission checking logic
};

// Meeting preset configurations (optional)
export const MEETING_PRESETS = {
  audioOnly: {
    micEnabled: true,
    webcamEnabled: false,
  },
  videoCall: {
    micEnabled: true,
    webcamEnabled: true,
  },
};

// Default export for convenience
export default {
  apiKey: VIDEO_SDK_API_KEY,
  defaultMeetingId: DEFAULT_MEETING_ID,
  video: VIDEO_CONFIG,
  audio: AUDIO_CONFIG,
};

// Add this function to your videoConfig.ts file

// Function to create a unique meeting room
export const createMeeting = async () => {
  try {
    const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
      method: "POST",
      headers: {
        authorization: VIDEO_SDK_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`Failed to create meeting: ${res.status}`);
    }

    const { roomId } = await res.json();
    return roomId;
  } catch (error) {
    console.error("Error creating meeting:", error);
    // Fallback to default meeting ID in case of error
    return DEFAULT_MEETING_ID;
  }
};