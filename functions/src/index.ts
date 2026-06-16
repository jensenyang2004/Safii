import * as admin from "firebase-admin";
import axios from 'axios';
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore"; 

// 如果你這支檔案已經有寫過 admin.initializeApp()，保留一次就好
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// --- 常數設定 ---
const MAX_NOTIFICATIONS = 3;
const REMINDER_INTERVAL_MINUTES = 15;
const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_MINUTES * 60 * 1000;

// 抽取共用的推播發送邏輯，避免程式碼重複
async function sendEmergencyPush(contactId: string, sessionData: any, documentId: string) {
    const db = admin.firestore();
    try {
        const contactDoc = await db.collection('users').doc(contactId).get();
        const contactData = contactDoc.data();
        const pushToken = contactData?.pushToken;

        if (!pushToken) {
            console.log(`未找到聯絡人 ${contactId} 的 push token，跳過。`);
            return false;
        }

        let trackedUserName = 'Someone';
        const trackedUserDoc = await db.collection('users').doc(sessionData.trackedUserId).get();
        if (trackedUserDoc.exists) {
            trackedUserName = trackedUserDoc.data()?.displayName || trackedUserDoc.data()?.username || 'Someone';
        }

        const message = {
            to: pushToken,
            sound: 'safii_alert.wav',
            title: `緊急通報：來自 ${trackedUserName}`,
            body: `${trackedUserName} 發送了緊急通知，請盡快查看！`,
            data: {
                type: 'emergency_alert',
                trackedUserId: sessionData.trackedUserId,
                sessionId: documentId,
            },
        };

        await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        console.log(`成功發送通知給聯絡人: ${contactId}`);
        return true;
    } catch (error) {
        console.error(`發送通知給 ${contactId} 時發生錯誤:`, error);
        return false;
    }
}

async function handleEmergencyTriggered(
    db: admin.firestore.Firestore,
    collectionName: string,
    sessionId: string,
    beforeData: any,
    afterData: any
) {
    const isJustTriggered =
        afterData.overallStatus === 'notifying' &&
        (!beforeData || beforeData.overallStatus !== 'notifying');

    if (!isJustTriggered) return;

    console.log(`[即時觸發] 偵測到緊急通報！Collection: ${collectionName}, Session ID: ${sessionId}`);

    const updates: { [key: string]: any } = {};
    const contactStatus = afterData.contactStatus || {};
    const now = admin.firestore.Timestamp.now();

    for (const contactId of Object.keys(contactStatus)) {
        const success = await sendEmergencyPush(contactId, afterData, sessionId);
        if (success) {
            updates[`contactStatus.${contactId}.notificationCount`] = 1;
            updates[`contactStatus.${contactId}.status`] = 'notified';
        }
    }

    updates['nextNotificationTime'] = admin.firestore.Timestamp.fromMillis(now.toMillis() + REMINDER_INTERVAL_MS);

    if (Object.keys(updates).length > 0) {
        await db.collection(collectionName).doc(sessionId).update(updates);
        console.log(`[即時觸發] 第一波通知發送完畢。`);
    }
}

export const onEmergencyTriggered = onDocumentWritten("active_tracking/{sessionId}", async (event) => {
    const db = admin.firestore();
    const afterData = event.data?.after.data();
    if (!afterData) return;
    await handleEmergencyTriggered(db, 'active_tracking', event.params.sessionId, event.data?.before.data(), afterData);
});

export const onManualEmergencyTriggered = onDocumentWritten("manual_tracking/{sessionId}", async (event) => {
    const db = admin.firestore();
    const afterData = event.data?.after.data();
    if (!afterData) return;
    await handleEmergencyTriggered(db, 'manual_tracking', event.params.sessionId, event.data?.before.data(), afterData);
});

// ============================================================================
// ♻️ 修改：未讀提醒排程函式 (處理後續提醒)
// 每 15 分鐘檢查一次，專門處理「沒有按確認」的聯絡人
// ============================================================================
export { scheduleActivator } from './scheduleActivator';
export { scheduleEndChecker } from './scheduleEndChecker';

async function scanCollectionForEmergencies(
    db: admin.firestore.Firestore,
    collectionName: string,
    now: admin.firestore.Timestamp
): Promise<Promise<any>[]> {
    const snapshot = await db.collection(collectionName)
        .where('isActive', '==', true)
        .where('overallStatus', '==', 'notifying')
        .where('nextNotificationTime', '<=', now)
        .get();

    if (snapshot.empty) return [];

    const promises: Promise<any>[] = [];

    for (const docSnapshot of snapshot.docs) {
        const sessionData = docSnapshot.data();
        const documentId = docSnapshot.id;
        const updates: { [key: string]: any } = {};
        let allContactsAcknowledged = true;
        const contactStatus = sessionData.contactStatus || {};

        for (const contactId of Object.keys(contactStatus)) {
            const contact = contactStatus[contactId];
            if (contact.status !== 'acknowledged') {
                allContactsAcknowledged = false;
                if (contact.notificationCount < MAX_NOTIFICATIONS) {
                    console.log(`[排程掃描:${collectionName}] 聯絡人 ${contactId} 尚未確認，發送第 ${contact.notificationCount + 1} 次提醒。`);
                    await sendEmergencyPush(contactId, sessionData, documentId);
                    updates[`contactStatus.${contactId}.notificationCount`] = contact.notificationCount + 1;
                    updates[`contactStatus.${contactId}.status`] = 'notified';
                } else {
                    console.log(`[排程掃描:${collectionName}] 聯絡人 ${contactId} 已達提醒上限 (${MAX_NOTIFICATIONS}次)。`);
                }
            }
        }

        if (allContactsAcknowledged) {
            updates['overallStatus'] = 'completed';
            console.log(`[排程掃描:${collectionName}] Session ${documentId} 所有人皆已確認，結案。`);
        } else {
            updates['nextNotificationTime'] = admin.firestore.Timestamp.fromMillis(now.toMillis() + REMINDER_INTERVAL_MS);
        }

        if (Object.keys(updates).length > 0) {
            promises.push(docSnapshot.ref.update(updates));
        }
    }

    return promises;
}

export const emergencyScanner = onSchedule(`every ${REMINDER_INTERVAL_MINUTES} minutes`, async (event) => {
    console.log('[排程掃描] 尋找未確認的緊急通報...');
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const [scheduledPromises, manualPromises] = await Promise.all([
        scanCollectionForEmergencies(db, 'active_tracking', now),
        scanCollectionForEmergencies(db, 'manual_tracking', now),
    ]);

    const all = [...scheduledPromises, ...manualPromises];
    if (all.length === 0) {
        console.log('[排程掃描] 目前沒有需要發送提醒的通報。');
        return;
    }
    await Promise.all(all);
});