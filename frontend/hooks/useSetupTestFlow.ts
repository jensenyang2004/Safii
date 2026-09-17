import { useCallback, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import { setHasVerifiedSetup } from '@/services/fakeAlert/storage';

export type SetupTestStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'testing'
  | 'verified'
  | 'timed_out';

const TEST_NOTIFICATION_DELAY_SECONDS = 3;
const TEST_TIMEOUT_MS = 10_000;

/**
 * Confirms local notifications actually reach this device before letting the
 * scheduler treat the setup as "verified" (see FakeAlertVerificationError in
 * scheduler.ts). Schedules a throwaway notification and listens for it to
 * actually arrive — permission being granted isn't enough on its own (Focus
 * modes, notification summary batching, etc. can still swallow it).
 */
export function useSetupTestFlow() {
  const [status, setStatus] = useState<SetupTestStatus>('idle');
  const subscriptionRef = useRef<EventSubscription | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const runTest = useCallback(async () => {
    cleanup();
    setStatus('requesting_permission');

    let permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) {
      permissions = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: true },
      });
    }

    if (!permissions.granted) {
      setStatus('permission_denied');
      return;
    }

    setStatus('testing');

    subscriptionRef.current = Notifications.addNotificationReceivedListener(notification => {
      if (notification.request.content.data?.type === 'fake_alert_setup_test') {
        cleanup();
        setHasVerifiedSetup(true);
        setStatus('verified');
      }
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '測試通知',
        body: '如果你看到這則通知，代表通知功能正常運作。',
        sound: 'default',
        data: { type: 'fake_alert_setup_test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: TEST_NOTIFICATION_DELAY_SECONDS,
        repeats: false,
      },
    });

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setStatus(prev => (prev === 'testing' ? 'timed_out' : prev));
    }, TEST_TIMEOUT_MS);
  }, [cleanup]);

  return { status, runTest };
}
