import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FAKE_ALERT_STORAGE_KEYS,
  DEFAULT_MESSAGE_TEMPLATES,
  SCHEDULE_EXPIRY_AFTER_LAST_FIRE_MS,
} from '@/constants/fakeAlert';
import {
  FakeContact,
  MessageTemplate,
  FakeAlertSchedule,
  FakeAlertScheduleListItem,
  FakeAlertScheduleStatus,
} from '@/types/fakeAlert';

// --- Contacts ---

export const getFakeContacts = async (): Promise<FakeContact[]> => {
  const str = await AsyncStorage.getItem(FAKE_ALERT_STORAGE_KEYS.CONTACTS);
  return str ? JSON.parse(str) : [];
};

export const saveFakeContacts = async (contacts: FakeContact[]) => {
  await AsyncStorage.setItem(FAKE_ALERT_STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
};

// --- Message templates ---
// Defaults are seeded into storage on first read so they behave like any
// other saved template from then on — editable and deletable, not special-cased.

export const getMessageTemplates = async (): Promise<MessageTemplate[]> => {
  const str = await AsyncStorage.getItem(FAKE_ALERT_STORAGE_KEYS.MESSAGE_TEMPLATES);
  if (str) {
    return JSON.parse(str);
  }
  await saveMessageTemplates(DEFAULT_MESSAGE_TEMPLATES);
  return DEFAULT_MESSAGE_TEMPLATES;
};

export const saveMessageTemplates = async (templates: MessageTemplate[]) => {
  await AsyncStorage.setItem(FAKE_ALERT_STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(templates));
};

// --- Active schedules ---
// Every armed fake call / message burst lives here until it's cancelled or
// it finishes firing, so the scheduler can bulk-cancel OS notifications and
// stage 3's chat screen can read message timing.
//
// Reads filter out expired records (past lastFireAt + expiry) but never write
// the filtered list back — expired records stay on disk untouched. Writes
// below go through the raw, unfiltered list for the same reason. The one
// place that actually deletes expired records is reconcileActiveSchedules,
// run when the manage tab's schedule list loads.

const readAllSchedules = async (): Promise<FakeAlertSchedule[]> => {
  const str = await AsyncStorage.getItem(FAKE_ALERT_STORAGE_KEYS.ACTIVE_SCHEDULES);
  return str ? JSON.parse(str) : [];
};

const isExpired = (schedule: FakeAlertSchedule, now: number) =>
  // Records written before fireAt/lastFireAt existed only have scheduledAt.
  now > (schedule.lastFireAt ?? schedule.scheduledAt) + SCHEDULE_EXPIRY_AFTER_LAST_FIRE_MS;

export const getActiveSchedules = async (): Promise<FakeAlertSchedule[]> => {
  const now = Date.now();
  const schedules = await readAllSchedules();
  return schedules.filter(s => !isExpired(s, now));
};

// A notification firing right about now may already be gone from the OS's
// pending list; don't read that as "lost".
const FIRE_BOUNDARY_GRACE_MS = 2000;

/** Every OS notification of a schedule with the time it's due. */
const notificationFireTimes = (schedule: FakeAlertSchedule) => {
  const times: { id: string; at: number }[] = [];
  for (const message of schedule.messages ?? []) {
    if (message.notificationId) times.push({ id: message.notificationId, at: message.fireAt });
  }
  if (schedule.callNotificationId) {
    // The call is always a schedule's last notification (see lastFireAt).
    times.push({ id: schedule.callNotificationId, at: schedule.lastFireAt ?? schedule.scheduledAt });
  }
  return times;
};

/**
 * Builds the manage tab's schedule list against the OS's pending
 * notifications (passed in so this file stays free of OS calls), and is the
 * only place that writes expired records back out of storage. Nothing is
 * written when nothing expired.
 */
export const reconcileActiveSchedules = async (
  pendingNotificationIds: ReadonlySet<string>,
  now = Date.now()
): Promise<FakeAlertScheduleListItem[]> => {
  const all = await readAllSchedules();
  const kept = all.filter(s => !isExpired(s, now));
  if (kept.length !== all.length) {
    await saveActiveSchedules(kept);
  }

  return kept
    .map(schedule => {
      const times = notificationFireTimes(schedule);
      const firedCount = times.filter(t => t.at <= now).length;
      const isLost = times.some(
        t => t.at > now + FIRE_BOUNDARY_GRACE_MS && !pendingNotificationIds.has(t.id)
      );
      const status: FakeAlertScheduleStatus = isLost
        ? 'lost'
        : firedCount === times.length
          ? 'fired'
          : firedCount === 0 ? 'pending' : 'inProgress';
      const messagesFired = (schedule.messages ?? []).filter(m => m.fireAt <= now).length;
      return { schedule, status, messagesFired };
    })
    .sort((a, b) => (a.schedule.fireAt ?? a.schedule.scheduledAt) - (b.schedule.fireAt ?? b.schedule.scheduledAt));
};

export const saveActiveSchedules = async (schedules: FakeAlertSchedule[]) => {
  await AsyncStorage.setItem(FAKE_ALERT_STORAGE_KEYS.ACTIVE_SCHEDULES, JSON.stringify(schedules));
};

export const addActiveSchedule = async (schedule: FakeAlertSchedule) => {
  const schedules = await readAllSchedules();
  schedules.push(schedule);
  await saveActiveSchedules(schedules);
};

export const removeActiveSchedule = async (scheduleId: string) => {
  const schedules = await readAllSchedules();
  await saveActiveSchedules(schedules.filter(s => s.id !== scheduleId));
};

export const getActiveSchedule = async (scheduleId: string): Promise<FakeAlertSchedule | null> => {
  const schedules = await getActiveSchedules();
  return schedules.find(s => s.id === scheduleId) ?? null;
};

export const updateActiveSchedule = async (schedule: FakeAlertSchedule) => {
  const schedules = await readAllSchedules();
  const index = schedules.findIndex(s => s.id === schedule.id);
  if (index === -1) {
    schedules.push(schedule);
  } else {
    schedules[index] = schedule;
  }
  await saveActiveSchedules(schedules);
};

// --- Setup verification gate ---
// Set by stage 4's SetupTestFlow once it confirms notifications actually
// fire on this device. The scheduler treats this as a soft gate (see
// scheduler.ts FakeAlertVerificationError) rather than a hard block.

export const getHasVerifiedSetup = async (): Promise<boolean> => {
  const str = await AsyncStorage.getItem(FAKE_ALERT_STORAGE_KEYS.HAS_VERIFIED_SETUP);
  return str === 'true';
};

export const setHasVerifiedSetup = async (verified: boolean) => {
  await AsyncStorage.setItem(FAKE_ALERT_STORAGE_KEYS.HAS_VERIFIED_SETUP, verified.toString());
};

// --- Handled notification ids ---
// FakeAlertGate's dedup set: request ids of fake alert notifications already
// acted on (navigated or deliberately swallowed). Persisted so a remount or
// JS reload can't replay the same last notification response. Capped — ids
// are only ever compared against recent responses.

const HANDLED_NOTIFICATION_IDS_KEY = 'fake_alert_handled_notification_ids';
const HANDLED_NOTIFICATION_IDS_LIMIT = 50;

const getHandledNotificationIds = async (): Promise<string[]> => {
  const str = await AsyncStorage.getItem(HANDLED_NOTIFICATION_IDS_KEY);
  return str ? JSON.parse(str) : [];
};

export const hasHandledNotification = async (notificationId: string): Promise<boolean> => {
  const ids = await getHandledNotificationIds();
  return ids.includes(notificationId);
};

export const markNotificationHandled = async (notificationId: string) => {
  const ids = await getHandledNotificationIds();
  if (ids.includes(notificationId)) return;
  ids.push(notificationId);
  await AsyncStorage.setItem(
    HANDLED_NOTIFICATION_IDS_KEY,
    JSON.stringify(ids.slice(-HANDLED_NOTIFICATION_IDS_LIMIT))
  );
};

// --- Cleanup ---
// Used by the logout flow (stage 5). Cancelling any OS notifications first
// is the scheduler's job — this just wipes the persisted state.

export const clearAllFakeAlertData = async () => {
  await AsyncStorage.multiRemove([
    ...Object.values(FAKE_ALERT_STORAGE_KEYS),
    HANDLED_NOTIFICATION_IDS_KEY,
  ]);
};
