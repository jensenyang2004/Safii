import { sendAlertNotification } from '../../apis/notifications';

/**
 * This script sends a single local notification to test the custom alert sound.
 * 
 * To run it, you can execute it via a custom command in your package.json,
 * for example: "test:notification": "ts-node scripts/testAlertNotification.ts"
 */

console.log("Sending a local test alert notification in 3 seconds...");

setTimeout(() => {
  sendAlertNotification().catch(console.error);
}, 3000);
