import AsyncStorage from '@react-native-async-storage/async-storage';
import { FAKE_ALERT_STORAGE_KEYS, DEFAULT_MESSAGE_TEMPLATES } from '@/constants/fakeAlert';
import { FakeContact, MessageTemplate, FakeAlertSchedule } from '@/types/fakeAlert';

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

export const getActiveSchedules = async (): Promise<FakeAlertSchedule[]> => {
  const str = await AsyncStorage.getItem(FAKE_ALERT_STORAGE_KEYS.ACTIVE_SCHEDULES);
  return str ? JSON.parse(str) : [];
};

export const saveActiveSchedules = async (schedules: FakeAlertSchedule[]) => {
  await AsyncStorage.setItem(FAKE_ALERT_STORAGE_KEYS.ACTIVE_SCHEDULES, JSON.stringify(schedules));
};

export const addActiveSchedule = async (schedule: FakeAlertSchedule) => {
  const schedules = await getActiveSchedules();
  schedules.push(schedule);
  await saveActiveSchedules(schedules);
};

export const removeActiveSchedule = async (scheduleId: string) => {
  const schedules = await getActiveSchedules();
  await saveActiveSchedules(schedules.filter(s => s.id !== scheduleId));
};

export const getActiveSchedule = async (scheduleId: string): Promise<FakeAlertSchedule | null> => {
  const schedules = await getActiveSchedules();
  return schedules.find(s => s.id === scheduleId) ?? null;
};

export const updateActiveSchedule = async (schedule: FakeAlertSchedule) => {
  const schedules = await getActiveSchedules();
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

// --- Cleanup ---
// Used by the logout flow (stage 5). Cancelling any OS notifications first
// is the scheduler's job — this just wipes the persisted state.

export const clearAllFakeAlertData = async () => {
  await AsyncStorage.multiRemove(Object.values(FAKE_ALERT_STORAGE_KEYS));
};
