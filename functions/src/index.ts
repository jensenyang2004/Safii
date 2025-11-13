import * as admin from "firebase-admin";
import axios from 'axios';
import { onSchedule } from "firebase-functions/v2/scheduler"; // Correct import for scheduled functions

admin.initializeApp();

// --- Constants for the Emergency Scanner Function ---
const MAX_NOTIFICATIONS = 3; // Example: Max 3 reminders per contact
const REMINDER_INTERVAL_MINUTES = 15; // How often to check for reminders
const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_MINUTES * 60 * 1000;

// --- Scheduled Emergency Scanner Function ---
export const emergencyScanner = onSchedule(`every ${REMINDER_INTERVAL_MINUTES} minutes`, async (event) => {
  console.log('Emergency Scanner Function started.');

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // 1. Query for active emergency sessions that are due for a notification.
  const querySnapshot = await db.collection('active_tracking')
    .where('isActive', '==', true)
    .where('overallStatus', '==', 'notifying')
    .where('nextNotificationTime', '<=', now)
    .get();

  if (querySnapshot.empty) {
    console.log('No active tracking sessions due for notification.');
    return;
  }

  const updatesPromises: Promise<any>[] = [];

  for (const docSnapshot of querySnapshot.docs) { // Changed from forEach to for...of
    const sessionData = docSnapshot.data();
    const updates: { [key: string]: any } = {}; // updates object for this session
    let allContactsAcknowledged = true;
    const documentId = docSnapshot.id; // Get the document ID here

    // 2. Iterate Contacts: Loop through the keys (contactId) of the contactStatus map.
    const contactStatus = sessionData.contactStatus || {};

    for (const contactId of Object.keys(contactStatus)) { // Changed from forEach to for...of
      const contact = contactStatus[contactId];

      // 3. Check Each Contact: If contact needs a reminder
      if (contact.status !== 'acknowledged' && contact.notificationCount < MAX_NOTIFICATIONS) {
        allContactsAcknowledged = false; // At least one contact still needs reminders

        // 4. Notify & Prepare Updates: Send a notification to this specific contactId.
        try {
          // Get contact's push token
          const contactDoc = await db.collection('users').doc(contactId).get();
          const contactData = contactDoc.data();
          const pushToken = contactData?.pushToken;

          if (!pushToken) {
            console.log(`No push token found for contact: ${contactId}. Notification not sent.`);
            continue; // Use continue to skip to next contact if no token
          }

          // Get tracked user's display name for notification message
          let trackedUserName = 'Someone';
          const trackedUserDoc = await db.collection('users').doc(sessionData.trackedUserId).get();
          if (trackedUserDoc.exists) {
            trackedUserName = trackedUserDoc.data()?.displayName || trackedUserDoc.data()?.username || 'Someone';
          }

          const message = {
            to: pushToken,
            sound: 'safii_alert.wav',
            title: `Emergency Alert from ${trackedUserName}`,
            body: `${trackedUserName} needs your attention. Please check the app.`, // Customize message
            data: { // Data payload for deep linking
              type: 'emergency_alert',
              trackedUserId: sessionData.trackedUserId,
              sessionId: documentId, // Use documentId here
            },
          };

          await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
          });
          console.log(`Notification sent to emergency contact: ${contactId}.`);

          // Add updates for this contact
          updates[`contactStatus.${contactId}.notificationCount`] = contact.notificationCount + 1;
          updates[`contactStatus.${contactId}.status`] = 'notified';

        } catch (error) {
          console.error(`Error sending notification to ${contactId}:`, error);
        }
      }
    } // End of inner for...of loop

    // 5. Determine Next Step: After the inner loop finishes
    if (allContactsAcknowledged) {
      // Everyone has acknowledged. The process is over for this emergency.
      updates['overallStatus'] = 'completed';
      console.log(`Session ${documentId} completed as all contacts acknowledged.`);
    } else {
      // At least one person still needs reminders. Schedule the next check.
      updates['nextNotificationTime'] = admin.firestore.Timestamp.fromMillis(now.toMillis() + REMINDER_INTERVAL_MS);
      console.log(`Session ${documentId} scheduled for next reminder.`);
    }

    console.log('Updates for session:', documentId, updates); // Added log here

    // 6. Commit to Firestore: Perform a single doc.ref.update(updates) call
    if (Object.keys(updates).length > 0) {
      updatesPromises.push(docSnapshot.ref.update(updates));
    }
  } // End of outer for...of loop

  await Promise.all(updatesPromises);
  console.log('Emergency Scanner Function finished.');
  return;
});