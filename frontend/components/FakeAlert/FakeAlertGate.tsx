import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  router,
  useGlobalSearchParams,
  usePathname,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { useTracking } from '@/context/TrackProvider';
import {
  getActiveSchedule,
  hasHandledNotification,
  markNotificationHandled,
} from '@/services/fakeAlert/storage';

// Routes fake call / fake message notifications to their screens. Renders
// nothing. Mounted inside RootLayoutNav so auth + permissions are already
// resolved, but navigation is still queued until RootLayoutNav's own redirect
// has settled — otherwise its router.replace would clobber our push.
//
// Only acts on data.type 'fake_call' | 'fake_message'. Everything else
// (emergency_alert, missed_report, fake_alert_setup_test) is left alone.

interface FakeAlertNotificationData {
  type: 'fake_call' | 'fake_message';
  scheduleId: string;
  contactId: string;
}

interface PendingIntent {
  notification: Notifications.Notification;
  data: FakeAlertNotificationData;
  /** 'received' = fired while foregrounded, 'response' = user tapped it. */
  source: 'received' | 'response';
}

// A call tapped from Notification Center long after it rang shouldn't start
// ringing now.
const CALL_RESPONSE_MAX_AGE_MS = 2 * 60 * 1000;

const LOG_TAG = '[FakeAlertGate]';

const getFakeAlertData = (
  notification: Notifications.Notification
): FakeAlertNotificationData | null => {
  const data = notification.request.content.data as Partial<FakeAlertNotificationData> | undefined;
  if (data?.type !== 'fake_call' && data?.type !== 'fake_message') return null;
  if (!data.scheduleId) return null;
  return data as FakeAlertNotificationData;
};

export default function FakeAlertGate() {
  const { user, onboardingComplete } = useAuth();
  const { isReportDue, isInfoSent } = useTracking();
  const segments = useSegments();
  const pathname = usePathname();
  const { scheduleId: currentScheduleId } = useGlobalSearchParams<{ scheduleId?: string }>();
  const rootNavigationState = useRootNavigationState();

  const queueRef = useRef<PendingIntent[]>([]);
  const processingRef = useRef(false);
  const [queueVersion, setQueueVersion] = useState(0);

  // Read inside the async processing loop, so it must not be a stale closure.
  const latestRef = useRef({ isReportDue, isInfoSent, pathname, currentScheduleId });
  latestRef.current = { isReportDue, isInfoSent, pathname, currentScheduleId };

  const inAppGroup = segments[0] === '(tabs)' || segments[0] === '(modals)';
  const isReady = !!user && onboardingComplete && inAppGroup && !!rootNavigationState?.key;

  useEffect(() => {
    const enqueue = (intent: PendingIntent) => {
      queueRef.current.push(intent);
      setQueueVersion(v => v + 1);
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const data = getFakeAlertData(response.notification);
      if (data) enqueue({ notification: response.notification, data, source: 'response' });
    };

    // Cold start: the tap that launched the app. May also arrive through the
    // listener below — the persisted dedup set absorbs the duplicate.
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) handleResponse(response);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Foreground: only the call takes over the screen, like a real incoming
    // call. Messages stay a banner and go through the response path if tapped.
    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      const data = getFakeAlertData(notification);
      if (data?.type === 'fake_call') enqueue({ notification, data, source: 'received' });
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isReady || processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    (async () => {
      try {
        while (queueRef.current.length > 0) {
          await processIntent(queueRef.current.shift()!);
        }
      } catch (error) {
        console.error(LOG_TAG, 'failed to process intent:', error);
      } finally {
        processingRef.current = false;
        // Something may have been enqueued after the loop's last check.
        if (queueRef.current.length > 0) setQueueVersion(v => v + 1);
      }
    })();
  }, [isReady, queueVersion]);

  const processIntent = async ({ notification, data, source }: PendingIntent) => {
    const notificationId = notification.request.identifier;

    if (await hasHandledNotification(notificationId)) {
      console.log(LOG_TAG, 'duplicate, skipped', notificationId);
      return;
    }

    // Real emergency flow wins: swallow, don't defer — a fake call popping up
    // after the user resolves a check-in is confusing, and the call screen is
    // a non-dismissable fullScreenModal that would cover the check-in UI.
    // 冷啟動競態未解，待 TrackProvider isHydrated：TrackProvider restores the
    // active session asynchronously, so right after a cold start isReportDue /
    // isInfoSent can still be their initial false and a fake alert gets through.
    const { isReportDue, isInfoSent, pathname, currentScheduleId } = latestRef.current;
    const isEmergencyActive = isReportDue || isInfoSent;

    // Foreground fire swallowed: leave it unmarked so a later tap on the
    // banner still comes through the response path and lands on home.
    if (isEmergencyActive && source === 'received') {
      console.log(LOG_TAG, 'swallowed (foreground), real emergency flow active', { isReportDue, isInfoSent });
      return;
    }

    // Mark before acting — a swallowed or stale response is still "handled".
    await markNotificationHandled(notificationId);
    if (source === 'response') Notifications.clearLastNotificationResponse();

    if (isEmergencyActive) {
      console.log(LOG_TAG, 'swallowed (tap), real emergency flow active', { isReportDue, isInfoSent });
      router.navigate('/(tabs)/home');
      return;
    }

    // TODO: drop once notification.date's unit is confirmed on device.
    console.log(LOG_TAG, 'stale check', { notificationDate: notification.date, now: Date.now() });
    if (
      data.type === 'fake_call' &&
      source === 'response' &&
      Date.now() - notification.date > CALL_RESPONSE_MAX_AGE_MS
    ) {
      console.log(LOG_TAG, 'stale call response, skipped', data.scheduleId);
      return;
    }

    // Gone = already answered/declined/finished, or cancelled.
    if (!(await getActiveSchedule(data.scheduleId))) {
      console.log(LOG_TAG, 'schedule no longer active, skipped', data.scheduleId);
      return;
    }

    if (data.type === 'fake_call') {
      if (pathname === '/fake-alert/call' && currentScheduleId === data.scheduleId) return;
      if (source === 'received') await Notifications.dismissNotificationAsync(notificationId);
      console.log(LOG_TAG, 'opening call', data.scheduleId, source);
      router.push({
        pathname: '/(modals)/fake-alert/call',
        params: { contactId: data.contactId, scheduleId: data.scheduleId },
      });
    } else {
      if (pathname === '/fake-alert/message' && currentScheduleId === data.scheduleId) return;
      console.log(LOG_TAG, 'opening message', data.scheduleId);
      router.push({
        pathname: '/(modals)/fake-alert/message',
        params: { scheduleId: data.scheduleId },
      });
    }
  };

  return null;
}
