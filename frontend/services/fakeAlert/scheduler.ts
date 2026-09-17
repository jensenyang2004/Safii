import * as Notifications from 'expo-notifications';
import { v4 as uuidv4 } from 'uuid';
import {
  IOS_MAX_PENDING_NOTIFICATIONS,
  PENDING_NOTIFICATION_WARNING_THRESHOLD,
} from '@/constants/fakeAlert';
import {
  FakeAlertSchedule,
  FakeCallConfig,
  FakeContact,
  FakeMessageConfig,
  MessageTemplate,
  ScheduledFakeMessage,
} from '@/types/fakeAlert';
import {
  addActiveSchedule,
  getActiveSchedule,
  getHasVerifiedSetup,
  getActiveSchedules,
  removeActiveSchedule,
  saveActiveSchedules,
} from './storage';

/**
 * Thrown when scheduling would push pending local notifications past the
 * warning threshold. The caller (stage 4 UI) decides what to do — this
 * layer never blocks silently.
 */
export class FakeAlertCapacityError extends Error {
  constructor(public pending: number, public requested: number, public limit: number) {
    super(`Scheduling ${requested} more notifications would push pending count to ${pending + requested}, at/near the iOS limit of ${limit}.`);
    this.name = 'FakeAlertCapacityError';
  }
}

/**
 * Thrown when the user hasn't run SetupTestFlow (stage 4) yet and didn't
 * pass `bypassVerification`. This is a soft gate by design (decision: safety
 * tools shouldn't block on incomplete setup) — callers catch this, show the
 * "I understand the risk, schedule anyway" warning, and retry with
 * bypassVerification: true.
 */
export class FakeAlertVerificationError extends Error {
  constructor() {
    super('Fake alert setup has not been verified on this device yet.');
    this.name = 'FakeAlertVerificationError';
  }
}

export const getPendingNotificationCount = async (): Promise<number> => {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.length;
};

const assertCapacity = async (requested: number) => {
  const pending = await getPendingNotificationCount();
  if (pending + requested > PENDING_NOTIFICATION_WARNING_THRESHOLD) {
    throw new FakeAlertCapacityError(pending, requested, IOS_MAX_PENDING_NOTIFICATIONS);
  }
};

const assertVerified = async (bypassVerification: boolean) => {
  if (bypassVerification) return;
  const verified = await getHasVerifiedSetup();
  if (!verified) {
    throw new FakeAlertVerificationError();
  }
};

interface ScheduleOptions {
  /** Set true once the user clicked through the "I understand the risk" warning. */
  bypassVerification?: boolean;
}

export const scheduleFakeCall = async (
  config: FakeCallConfig,
  contact: FakeContact,
  options: ScheduleOptions = {}
): Promise<FakeAlertSchedule> => {
  await assertVerified(options.bypassVerification ?? false);
  await assertCapacity(1);

  const scheduleId = uuidv4();
  const threadIdentifier = `fake-call-${scheduleId}`;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: contact.name,
      body: '來電',
      sound: 'default',
      // 'timeSensitive' would need an Apple entitlement request + a
      // permissions-API patch neither of which exist yet — 'active' is the
      // default and needs no extra authorization. Revisit if that entitlement
      // ever gets requested/approved.
      interruptionLevel: 'active',
      data: {
        type: 'fake_call',
        scheduleId,
        contactId: contact.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(config.delaySeconds, 1),
      repeats: false,
    },
  });

  const schedule: FakeAlertSchedule = {
    id: scheduleId,
    kind: 'call',
    contactId: contact.id,
    threadIdentifier,
    call: config,
    callNotificationId: notificationId,
    scheduledAt: Date.now(),
    notificationIds: [notificationId],
    verifiedSkipped: options.bypassVerification ?? false,
  };

  await addActiveSchedule(schedule);
  return schedule;
};

/**
 * Schedules each message in the burst as its own local notification, spaced
 * by a random gap within config.gapSecondsRange. iOS notifications are NOT
 * visually grouped into one thread by the OS — expo-notifications has no
 * JS-level threadIdentifier support for locally scheduled notifications on
 * this SDK version (checked against 0.32.x). `threadIdentifier` is still
 * recorded on the schedule/messages so stage 3's chat screen can group them
 * itself, and so real OS grouping can be wired in later without a data
 * migration if this gets patched.
 */
export const scheduleFakeMessages = async (
  config: FakeMessageConfig,
  contact: FakeContact,
  templates: MessageTemplate[],
  options: ScheduleOptions = {}
): Promise<FakeAlertSchedule> => {
  await assertVerified(options.bypassVerification ?? false);
  await assertCapacity(config.templateIds.length);

  const scheduleId = uuidv4();
  const threadIdentifier = `fake-message-${scheduleId}`;
  const now = Date.now();
  const [minGap, maxGap] = config.gapSecondsRange;

  const messages: ScheduledFakeMessage[] = [];
  let offsetSeconds = config.firstDelaySeconds;

  for (const templateId of config.templateIds) {
    const template = templates.find(t => t.id === templateId);
    if (!template) continue;

    const fireAt = now + offsetSeconds * 1000;
    messages.push({
      id: uuidv4(),
      notificationId: null,
      text: template.text,
      fireAt,
    });

    const gap = minGap + Math.random() * (maxGap - minGap);
    offsetSeconds += gap;
  }

  const notificationIds: string[] = [];
  for (const message of messages) {
    const seconds = Math.max(Math.round((message.fireAt - Date.now()) / 1000), 1);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: contact.name,
        body: message.text,
        sound: 'default',
        data: {
          type: 'fake_message',
          scheduleId,
          contactId: contact.id,
          messageId: message.id,
          threadIdentifier,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    message.notificationId = notificationId;
    notificationIds.push(notificationId);
  }

  const schedule: FakeAlertSchedule = {
    id: scheduleId,
    kind: 'message',
    contactId: contact.id,
    threadIdentifier,
    messages,
    scheduledAt: now,
    notificationIds,
    verifiedSkipped: options.bypassVerification ?? false,
  };

  await addActiveSchedule(schedule);
  return schedule;
};

export const cancelFakeAlertSchedule = async (scheduleId: string) => {
  const schedule = await getActiveSchedule(scheduleId);
  if (!schedule) return;

  for (const notificationId of schedule.notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
  await removeActiveSchedule(scheduleId);
};

export const cancelAllFakeAlerts = async () => {
  const schedules = await getActiveSchedules();
  for (const schedule of schedules) {
    for (const notificationId of schedule.notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  }
  await saveActiveSchedules([]);
};
