import { useCallback, useEffect, useRef, useState } from 'react';
import { FakeAlertSchedule, FakeContact, ScheduledFakeMessage } from '@/types/fakeAlert';
import { getActiveSchedule, getFakeContacts, removeActiveSchedule } from '@/services/fakeAlert/storage';
import { cancelFakeAlertSchedule } from '@/services/fakeAlert/scheduler';

interface UseFakeMessageParams {
  scheduleId: string;
}

/**
 * Drives the chat screen. The OS notifications (scheduled in stage 1's
 * scheduler.ts) are what actually deliver messages while the app isn't in
 * the foreground — this hook only re-derives + live-updates what the chat
 * thread should show while this screen is open. `fireAt <= now` decides
 * what's already "arrived" at any read, so this is correct however long the
 * app was backgrounded before the user opened the thread; the setTimeout
 * timers below only matter for revealing new messages *while the screen is
 * mounted and foregrounded*, since JS timers don't run while backgrounded.
 */
export function useFakeMessage({ scheduleId }: UseFakeMessageParams) {
  const [schedule, setSchedule] = useState<FakeAlertSchedule | null>(null);
  const [contact, setContact] = useState<FakeContact | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<ScheduledFakeMessage[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loadedSchedule, contacts] = await Promise.all([
        getActiveSchedule(scheduleId),
        getFakeContacts(),
      ]);
      if (cancelled || !loadedSchedule) return;

      setSchedule(loadedSchedule);
      setContact(contacts.find(c => c.id === loadedSchedule.contactId) ?? null);

      const allMessages = loadedSchedule.messages ?? [];
      const now = Date.now();
      const arrived = allMessages.filter(m => m.fireAt <= now);
      const pending = allMessages.filter(m => m.fireAt > now);

      setVisibleMessages(arrived);

      for (const message of pending) {
        const timer = setTimeout(() => {
          setVisibleMessages(prev => [...prev, message]);
        }, message.fireAt - Date.now());
        timersRef.current.push(timer);
      }
    })();

    return () => {
      cancelled = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [scheduleId]);

  // Once every message in the burst is visible — whether that happened
  // instantly on mount (opened after it all fired) or live via the timers
  // above — the schedule's job is done. Cleaning up here (rather than on a
  // fixed timer) means it also self-heals if the app was backgrounded and
  // only catches up once the user actually opens the thread.
  // Combo is the exception: its call is still to come, so the schedule must
  // survive the messages finishing — useFakeCall deletes it once the call is
  // handled (or read-time expiry drops it if the call never is).
  useEffect(() => {
    if (!schedule?.messages) return;
    if (schedule.kind === 'combo') return;
    if (visibleMessages.length >= schedule.messages.length) {
      removeActiveSchedule(scheduleId);
    }
  }, [visibleMessages.length, schedule, scheduleId]);

  const cancelRemaining = useCallback(async () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    await cancelFakeAlertSchedule(scheduleId);
  }, [scheduleId]);

  const totalCount = schedule?.messages?.length ?? 0;
  const isComplete = totalCount > 0 && visibleMessages.length >= totalCount;

  return {
    contact,
    messages: visibleMessages,
    totalCount,
    isComplete,
    cancelRemaining,
  };
}
