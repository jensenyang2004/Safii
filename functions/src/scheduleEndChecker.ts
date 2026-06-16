import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import axios from 'axios';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sendUserPush(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
) {
    await axios.post(
        'https://exp.host/--/api/v2/push/send',
        { to: pushToken, title, body, sound: 'default', channelId: 'scheduled_tracking', data },
        { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
    );
}

export const scheduleEndChecker = onSchedule('every 1 minutes', async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const sessionsSnap = await db.collection('active_tracking')
        .where('isActive', '==', true)
        .where('triggeredBy', '==', 'schedule')
        .where('overallStatus', '==', 'tracking')
        .where('scheduledEndTime', '<=', now)
        .get();

    if (sessionsSnap.empty) return;

    for (const sessionDoc of sessionsSnap.docs) {
        const session = sessionDoc.data();
        const sessionId = sessionDoc.id;

        const userDoc = await db.collection('users').doc(session.trackedUserId).get();
        const pushToken = userDoc.data()?.pushToken as string | undefined;

        // Path 1: user already tapped "I'm home"
        if (session.hasArrivedHome === true) {
            await sessionDoc.ref.update({
                isActive: false,
                overallStatus: 'safe_arrived',
                endedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[scheduleEndChecker] Session ${sessionId}: marked safe (hasArrivedHome=true)`);
            if (pushToken) {
                await sendUserPush(pushToken, '✅ 報平安結束', '已安全到家，報平安已結束。', {
                    type: 'schedule_ended_safe',
                    sessionId,
                });
            }
            continue;
        }

        // Path 2: GPS-based check
        const destination = session.destination as { lat: number; lng: number; radius: number } | null;
        let isAtDestination = false;

        if (destination) {
            const locDoc = await db
                .collection('users')
                .doc(session.trackedUserId)
                .collection('real_time_location')
                .doc('current')
                .get();

            if (locDoc.exists) {
                const loc = locDoc.data()!;
                const dist = haversineMeters(loc.lat, loc.long, destination.lat, destination.lng);
                console.log(`[scheduleEndChecker] Session ${sessionId}: distance=${Math.round(dist)}m radius=${destination.radius}m`);
                isAtDestination = dist <= destination.radius;
            }
        }

        if (isAtDestination) {
            await sessionDoc.ref.update({
                isActive: false,
                overallStatus: 'safe_arrived',
                endedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[scheduleEndChecker] Session ${sessionId}: marked safe (GPS in radius)`);
            if (pushToken) {
                await sendUserPush(pushToken, '✅ 報平安結束', '已安全到家，報平安已結束。', {
                    type: 'schedule_ended_safe',
                    sessionId,
                });
            }
        } else {
            // Trigger emergency — onEmergencyTriggered in index.ts handles pushing to contacts
            await sessionDoc.ref.update({
                overallStatus: 'notifying',
                lastUpdateTime: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[scheduleEndChecker] Session ${sessionId}: overallStatus -> notifying`);
        }
    }
});
