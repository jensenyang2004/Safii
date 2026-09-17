import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FAKE_CALL_RINGTONE_SOURCE } from '@/constants/fakeAlert';
import { FakeContact } from '@/types/fakeAlert';
import { getFakeContacts, removeActiveSchedule } from '@/services/fakeAlert/storage';
import { playRingtone, stopRingtone } from '@/services/fakeAlert/audioPlayback';

export type FakeCallPhase = 'ringing' | 'active' | 'ended';

interface UseFakeCallParams {
  contactId: string;
  scheduleId?: string;
}

// [wait, buzz, pause, buzz, longer pause] — repeats via Vibration's own
// `repeat` flag, which loops the whole pattern from the top. This is a
// sustained, looping vibration, so it belongs on `Vibration.vibrate`, not
// `expo-haptics` (that API is for one-off discrete feedback, e.g. a button
// tap — firing it repeatedly on a timer doesn't produce a real ring feel,
// it produces a series of unrelated short taps).
const RING_VIBRATION_PATTERN = [0, 500, 200, 500, 1200];

export function useFakeCall({ contactId, scheduleId }: UseFakeCallParams) {
  const [contact, setContact] = useState<FakeContact | null>(null);
  const [phase, setPhase] = useState<FakeCallPhase>('ringing');
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Load the fake contact this call is "from".
  useEffect(() => {
    let cancelled = false;
    getFakeContacts().then(contacts => {
      if (cancelled) return;
      setContact(contacts.find(c => c.id === contactId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  // Ring: loop the ringtone + a looping vibration pattern, same lifecycle,
  // both cleaned up together whenever the phase leaves 'ringing' or the
  // screen unmounts.
  useEffect(() => {
    if (phase !== 'ringing') return;

    playRingtone(FAKE_CALL_RINGTONE_SOURCE).catch(() => {
      // Non-fatal — a silent "ring" still lets the user answer/decline.
    });
    Vibration.vibrate(RING_VIBRATION_PATTERN, true);

    return () => {
      stopRingtone();
      Vibration.cancel();
    };
  }, [phase]);

  // Call timer while "on the call".
  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => setCallDurationSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const cleanUpSchedule = useCallback(async () => {
    // The call's single notification already fired to get us here — nothing
    // left to cancel with the OS, just drop the bookkeeping record.
    if (scheduleId) {
      await removeActiveSchedule(scheduleId);
    }
  }, [scheduleId]);

  const answer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('active');
    setCallDurationSeconds(0);
  }, []);

  const decline = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('ended');
    await cleanUpSchedule();
    router.back();
  }, [cleanUpSchedule]);

  const endCall = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('ended');
    await cleanUpSchedule();
    router.back();
  }, [cleanUpSchedule]);

  return {
    contact,
    phase,
    callDurationSeconds,
    answer,
    decline,
    endCall,
  };
}
