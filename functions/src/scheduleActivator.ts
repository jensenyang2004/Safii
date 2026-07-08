// functions/src/scheduleActivator.ts

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DateTime } from 'luxon';
import axios from 'axios';

export const scheduleActivator = onSchedule('every 1 minutes', async () => {
    const db = admin.firestore();

    const schedulesSnap = await db.collection('scheduled_tracking')
        .where('isEnabled', '==', true)
        .get();

    if (schedulesSnap.empty) return;

    for (const scheduleDoc of schedulesSnap.docs) {
        const schedule = scheduleDoc.data();
        const scheduleId = scheduleDoc.id;

        // Convert current time to the schedule's timezone
        const nowInTz = DateTime.now().setZone(schedule.timezone || 'UTC');
        // luxon weekday: 1=Mon...7=Sun → convert to JS convention 0=Sun...6=Sat
        const currentDay = nowInTz.weekday % 7;

        if (!(schedule.daysOfWeek as number[]).includes(currentDay)) continue;

        // Allow up to 3 minutes of Cloud Scheduler drift
        const [startH, startM] = (schedule.startTime as string).split(':').map(Number);
        const startTotalMinutes = startH * 60 + startM;
        const nowTotalMinutes = nowInTz.hour * 60 + nowInTz.minute;
        const minutesSinceStart = nowTotalMinutes - startTotalMinutes;
        if (minutesSinceStart < 0 || minutesSinceStart > 3) continue;

        // Skip if this schedule was already activated today (active or manually stopped)
        const todayStr = nowInTz.toFormat('yyyy-MM-dd');
        if (schedule.lastActivatedDate === todayStr) {
            console.log(`[scheduleActivator] Schedule ${scheduleId} already activated today (${todayStr}), skipping.`);
            continue;
        }

        // Resolve destination (fetch user doc once, reuse for pushToken too)
        const userDoc = await db.collection('users').doc(schedule.userId).get();
        const userData = userDoc.data() || {};

        let destination: { lat: number; lng: number; radius: number; address: string };
        if (schedule.destination?.useDefaultHome && userData.defaultHome) {
            const h = userData.defaultHome;
            destination = { lat: h.lat, lng: h.lng, radius: h.radius, address: h.address };
        } else {
            const d = schedule.destination || {};
            destination = { lat: d.lat, lng: d.lng, radius: d.radius ?? 100, address: d.address ?? '' };
        }

        // Calculate scheduledEndTime in the same timezone
        // If end time is earlier than or equal to now (start time), it's a cross-day schedule → shift to next day
        const [endHour, endMin] = (schedule.endTime as string).split(':').map(Number);
        let scheduledEndDt = nowInTz.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
        if (scheduledEndDt <= nowInTz) {
            scheduledEndDt = scheduledEndDt.plus({ days: 1 });
        }
        const scheduledEndTime = admin.firestore.Timestamp.fromMillis(scheduledEndDt.toMillis());

        // Build contactStatus map (same shape as manual tracking)
        const emergencyContactIds: string[] = schedule.emergencyContactIds || [];
        const contactStatusMap: Record<string, { status: string; notificationCount: number }> = {};
        for (const contactId of emergencyContactIds) {
            contactStatusMap[contactId] = { status: 'active', notificationCount: 0 };
        }

        const trackingDocRef = db.collection('active_tracking').doc();
        await scheduleDoc.ref.update({ lastActivatedDate: todayStr });
        await trackingDocRef.set({
            trackedUserId: schedule.userId,
            emergencyContactIds,
            emergencyActivationTime: scheduledEndTime,
            lastUpdateTime: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            nextNotificationTime: scheduledEndTime,
            overallStatus: 'tracking',
            contactStatus: contactStatusMap,
            activity: schedule.activity || '',
            activityLocation: destination.address,
            notes: schedule.notes || '',
            // Scheduled-tracking-only fields
            triggeredBy: 'schedule',
            scheduleId,
            scheduledEndTime,
            destination,
            hasArrivedHome: false,
            arrivedAt: null,
        });

        console.log(`[scheduleActivator] Created active_tracking ${trackingDocRef.id} for schedule ${scheduleId}`);

        // Push notification to the tracked user (not contacts)
        const pushToken = userData.pushToken;
        if (pushToken) {
            await axios.post('https://exp.host/--/api/v2/push/send', {
                to: pushToken,
                title: '📍 自動報平安已開啟',
                body: `已自動開啟報平安：${schedule.name}`,
                sound: 'default',
                channelId: 'scheduled_tracking',
                data: {
                    type: 'schedule_started',
                    scheduleId,
                    activeTrackingId: trackingDocRef.id,
                },
            }, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            console.log(`[scheduleActivator] Push sent to user ${schedule.userId}`);
        }
    }
});
