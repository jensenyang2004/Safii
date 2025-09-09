"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emergencyScanner = void 0;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const scheduler_1 = require("firebase-functions/v2/scheduler"); // Correct import for scheduled functions
admin.initializeApp();
// --- Constants for the Emergency Scanner Function ---
const MAX_NOTIFICATIONS = 3; // Example: Max 3 reminders per contact
const REMINDER_INTERVAL_MINUTES = 15; // How often to check for reminders
const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_MINUTES * 60 * 1000;
// --- Scheduled Emergency Scanner Function ---
exports.emergencyScanner = (0, scheduler_1.onSchedule)(`every ${REMINDER_INTERVAL_MINUTES} minutes`, async (event) => {
    var _a, _b;
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
    const updatesPromises = [];
    for (const docSnapshot of querySnapshot.docs) { // Changed from forEach to for...of
        const sessionData = docSnapshot.data();
        const updates = {}; // updates object for this session
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
                    const pushToken = contactData === null || contactData === void 0 ? void 0 : contactData.pushToken;
                    if (!pushToken) {
                        console.log(`No push token found for contact: ${contactId}. Notification not sent.`);
                        continue; // Use continue to skip to next contact if no token
                    }
                    // Get tracked user's display name for notification message
                    let trackedUserName = 'Someone';
                    const trackedUserDoc = await db.collection('users').doc(sessionData.trackedUserId).get();
                    if (trackedUserDoc.exists) {
                        trackedUserName = ((_a = trackedUserDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || ((_b = trackedUserDoc.data()) === null || _b === void 0 ? void 0 : _b.username) || 'Someone';
                    }
                    const message = {
                        to: pushToken,
                        sound: 'default',
                        title: `Emergency Alert from ${trackedUserName}`,
                        body: `${trackedUserName} needs your attention. Please check the app.`, // Customize message
                        data: {
                            type: 'emergency_alert',
                            trackedUserId: sessionData.trackedUserId,
                            sessionId: documentId, // Use documentId here
                        },
                    };
                    await axios_1.default.post('https://exp.host/--/api/v2/push/send', message, {
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
                }
                catch (error) {
                    console.error(`Error sending notification to ${contactId}:`, error);
                }
            }
        } // End of inner for...of loop
        // 5. Determine Next Step: After the inner loop finishes
        if (allContactsAcknowledged) {
            // Everyone has acknowledged. The process is over for this emergency.
            updates['overallStatus'] = 'completed';
            console.log(`Session ${documentId} completed as all contacts acknowledged.`);
        }
        else {
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
//# sourceMappingURL=index.js.map