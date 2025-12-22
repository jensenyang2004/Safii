const axios = require('axios');

// IMPORTANT: Replace with the actual push token(s) of the recipient(s).
// You would typically get these from your database.
// Example: const PUSH_TOKENS = ["ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"];
const PUSH_TOKENS = ["ExponentPushToken[5SBx-WCx8OvXM45IGHKNpf]"];

const message = {
  sound: 'safii_alert.wav', // For iOS
  title: '🚨 Emergency Alert',
  body: 'Your friend needs attention. Check SAFII now.',
  data: { type: 'emergency_alert' },
  channelId: 'safii_alert_channel', // For Android, corresponds to the channel created in the app
};

async function sendPushNotification(pushTokens, messagePayload) {
  if (pushTokens.some(token => !token || !token.startsWith('ExponentPushToken'))) {
    console.error("Error: Invalid push token found. Please ensure all tokens are valid ExponentPushTokens.");
    return;
  }

  // The Expo API expects an array of message objects.
  const messages = pushTokens.map(token => ({
    to: token,
    ...messagePayload,
  }));

  try {
    console.log('Sending push notifications via Expo Push API...');
    const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('Push notifications sent successfully.');
    console.log('API Response Tickets:', response.data.data);

    // It's a good practice to check the receipts for errors (e.g., invalid tokens).
    // This part would typically be a separate process.

  } catch (error) {
    console.error('Error sending push notifications:');
    if (error.response) {
      console.error('Server responded with an error:');
      console.error(`  Status: ${error.response.status}`)
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
  }
}

// --- Script Execution ---
if (PUSH_TOKENS[0] && PUSH_TOKENS[0] !== "PUT_YOUR_PUSH_TOKEN_HERE") {
  sendPushNotification(PUSH_TOKENS, message);
} else {
  console.log("Please add at least one valid push token to the PUSH_TOKENS array to test.");
}
