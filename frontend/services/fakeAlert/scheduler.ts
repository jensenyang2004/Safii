import * as Notifications from 'expo-notifications';
import { v4 as uuidv4 } from 'uuid';
import { FAKE_ALERT_NOTIFICATION_TYPES } from '@/constants/fakeAlert';
import {
  FakeAlertKind,
  FakeAlertSchedule,
  FakeCallConfig,
  FakeComboConfig,
  FakeContact,
  FakeMessageConfig,
  MessageTemplate,
  ScheduledFakeMessage,
} from '@/types/fakeAlert';
import {
  addActiveSchedule,
  clearAllFakeAlertData,
  getActiveSchedule,
  getHasVerifiedSetup,
  getActiveSchedules,
  removeActiveSchedule,
  saveActiveSchedules,
} from './storage';
import {
  NotificationUsage,
  getRemainingFakeAlertSlots,
  getRequiredNotificationCount,
  validateCapacity,
} from './validation';

/**
 * Thrown when scheduling would exceed the fake alert notification budget
 * (see validation.ts / constants). `message` is user-facing.
 */
export class FakeAlertCapacityError extends Error {
  constructor(public required: number, public remaining: number, message: string) {
    super(message);
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

const isFakeAlertRequest = (request: Notifications.NotificationRequest) =>
  FAKE_ALERT_NOTIFICATION_TYPES.has((request.content.data as { type?: string } | null)?.type ?? '');

/** Live counts from the OS — storage can be stale, the OS can't. */
export const getNotificationUsage = async (): Promise<NotificationUsage> => {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return { totalPending: pending.length, fakeAlertPending: pending.filter(isFakeAlertRequest).length };
};

const assertCapacity = async (kind: FakeAlertKind, messageCount: number) => {
  const usage = await getNotificationUsage();
  const result = validateCapacity(kind, messageCount, usage);
  if (!result.ok) {
    throw new FakeAlertCapacityError(
      getRequiredNotificationCount(kind, messageCount),
      getRemainingFakeAlertSlots(usage),
      result.reason
    );
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

/**
 * Runs `build`, which hands notifications to the OS (recording each id in
 * `scheduledIds`) and returns the record to persist. If anything throws
 * before that record is saved, every notification already scheduled is
 * cancelled — otherwise it would fire with no record for FakeAlertGate or
 * the schedule list to find.
 */
const scheduleWithRollback = async (
  build: (scheduledIds: string[]) => Promise<FakeAlertSchedule>
): Promise<FakeAlertSchedule> => {
  const scheduledIds: string[] = [];
  try {
    const schedule = await build(scheduledIds);
    await addActiveSchedule(schedule);
    return schedule;
  } catch (err) {
    await Promise.all(
      scheduledIds.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
    );
    throw err;
  }
};

const secondsUntil = (epochMs: number) => Math.max(Math.round((epochMs - Date.now()) / 1000), 1);

const scheduleCallNotification = (contact: FakeContact, scheduleId: string, seconds: number) =>
  Notifications.scheduleNotificationAsync({
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
      seconds,
      repeats: false,
    },
  });

/**
 * Lays out the burst: first message at `startAt`, each next one a random
 * whole-second gap later (whole seconds so fireAt matches when the
 * TIME_INTERVAL notification actually lands).
 */
const buildMessageBurst = (
  templateIds: string[],
  templates: MessageTemplate[],
  startAt: number,
  [minGap, maxGap]: [number, number]
): ScheduledFakeMessage[] => {
  const messages: ScheduledFakeMessage[] = [];
  let fireAt = startAt;
  for (const templateId of templateIds) {
    const template = templates.find(t => t.id === templateId);
    if (!template) continue;
    messages.push({ id: uuidv4(), notificationId: null, text: template.text, fireAt });
    fireAt += Math.round(minGap + Math.random() * (maxGap - minGap)) * 1000;
  }
  if (messages.length === 0) {
    throw new Error('No usable message templates for this burst.');
  }
  return messages;
};

/**
 * Schedules each message as its own local notification. iOS notifications
 * are NOT visually grouped into one thread by the OS — expo-notifications
 * has no JS-level threadIdentifier support for locally scheduled
 * notifications on this SDK version (checked against 0.32.x).
 * `threadIdentifier` is still recorded so the chat screen can group them
 * itself, and so real OS grouping can be wired in later without a data
 * migration if this gets patched.
 */
const scheduleMessageNotifications = async (
  messages: ScheduledFakeMessage[],
  contact: FakeContact,
  scheduleId: string,
  threadIdentifier: string,
  scheduledIds: string[]
) => {
  for (const message of messages) {
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
        seconds: secondsUntil(message.fireAt),
        repeats: false,
      },
    });
    message.notificationId = notificationId;
    scheduledIds.push(notificationId);
  }
};

export const scheduleFakeCall = async (
  config: FakeCallConfig,
  contact: FakeContact,
  options: ScheduleOptions = {}
): Promise<FakeAlertSchedule> => {
  await assertVerified(options.bypassVerification ?? false);
  await assertCapacity('call', 0);

  return scheduleWithRollback(async scheduledIds => {
    const scheduleId = uuidv4();
    const now = Date.now();
    const seconds = Math.max(config.delaySeconds, 1);

    const callNotificationId = await scheduleCallNotification(contact, scheduleId, seconds);
    scheduledIds.push(callNotificationId);

    const fireAt = now + seconds * 1000;
    return {
      id: scheduleId,
      kind: 'call',
      mode: 'instant',
      contactId: contact.id,
      threadIdentifier: `fake-call-${scheduleId}`,
      call: config,
      callNotificationId,
      scheduledAt: now,
      fireAt,
      lastFireAt: fireAt,
      notificationIds: [...scheduledIds],
      verifiedSkipped: options.bypassVerification ?? false,
    };
  });
};

export const scheduleFakeMessages = async (
  config: FakeMessageConfig,
  contact: FakeContact,
  templates: MessageTemplate[],
  options: ScheduleOptions = {}
): Promise<FakeAlertSchedule> => {
  await assertVerified(options.bypassVerification ?? false);
  await assertCapacity('message', config.templateIds.length);

  return scheduleWithRollback(async scheduledIds => {
    const scheduleId = uuidv4();
    const threadIdentifier = `fake-message-${scheduleId}`;
    const now = Date.now();

    const messages = buildMessageBurst(
      config.templateIds,
      templates,
      now + config.firstDelaySeconds * 1000,
      config.gapSecondsRange
    );
    await scheduleMessageNotifications(messages, contact, scheduleId, threadIdentifier, scheduledIds);

    return {
      id: scheduleId,
      kind: 'message',
      mode: 'instant',
      contactId: contact.id,
      threadIdentifier,
      messages,
      scheduledAt: now,
      fireAt: messages[0].fireAt,
      lastFireAt: messages[messages.length - 1].fireAt,
      notificationIds: [...scheduledIds],
      verifiedSkipped: options.bypassVerification ?? false,
    };
  });
};

/**
 * Message burst first, then the call `callAfterLastMessageSeconds` after the
 * last message. Both share one scheduleId so FakeAlertGate and the chat
 * screen see one schedule; it's deleted when the call is handled (or the
 * user stops it), not when the messages finish — see useFakeMessage.
 */
export const scheduleFakeCombo = async (
  config: FakeComboConfig,
  contact: FakeContact,
  templates: MessageTemplate[],
  options: ScheduleOptions = {}
): Promise<FakeAlertSchedule> => {
  await assertVerified(options.bypassVerification ?? false);
  await assertCapacity('combo', config.templateIds.length);

  return scheduleWithRollback(async scheduledIds => {
    const scheduleId = uuidv4();
    const threadIdentifier = `fake-combo-${scheduleId}`;
    const now = Date.now();

    const messages = buildMessageBurst(
      config.templateIds,
      templates,
      now + config.firstDelaySeconds * 1000,
      config.gapSecondsRange
    );
    await scheduleMessageNotifications(messages, contact, scheduleId, threadIdentifier, scheduledIds);

    const callFireAt =
      messages[messages.length - 1].fireAt + config.callAfterLastMessageSeconds * 1000;
    const callNotificationId = await scheduleCallNotification(
      contact,
      scheduleId,
      secondsUntil(callFireAt)
    );
    scheduledIds.push(callNotificationId);

    return {
      id: scheduleId,
      kind: 'combo',
      mode: 'instant',
      contactId: contact.id,
      threadIdentifier,
      messages,
      call: {
        contactId: contact.id,
        delaySeconds: Math.round((callFireAt - now) / 1000),
        ringtoneKey: config.ringtoneKey,
      },
      callNotificationId,
      scheduledAt: now,
      fireAt: messages[0].fireAt,
      lastFireAt: callFireAt,
      notificationIds: [...scheduledIds],
      verifiedSkipped: options.bypassVerification ?? false,
    };
  });
};

/**
 * Cancels each id, retries the failures once, and returns the ids that
 * still failed. Never throws. Each id is cancelled independently, so one
 * failure never causes a later id to be skipped.
 */
const cancelNotificationsWithRetry = async (ids: string[]): Promise<string[]> => {
  const attempt = async (batch: string[]) => {
    const results = await Promise.allSettled(
      batch.map(id => Notifications.cancelScheduledNotificationAsync(id))
    );
    return batch.filter((_, i) => results[i].status === 'rejected');
  };
  const failedOnce = await attempt(ids);
  return failedOnce.length > 0 ? attempt(failedOnce) : [];
};

/**
 * Cancels everything still pending for this schedule — for combo that
 * includes the call, which must go even if a message id failed to cancel.
 */
export const cancelFakeAlertSchedule = async (scheduleId: string) => {
  const schedule = await getActiveSchedule(scheduleId);
  if (!schedule) return;

  const failed = await cancelNotificationsWithRetry(schedule.notificationIds);
  if (failed.length > 0) {
    console.error('[FakeAlert] cancel schedule: failed to cancel after retry', scheduleId, failed);
  }
  await removeActiveSchedule(scheduleId);
};

export const cancelAllFakeAlerts = async () => {
  const schedules = await getActiveSchedules();
  const failed = await cancelNotificationsWithRetry(schedules.flatMap(s => s.notificationIds));
  if (failed.length > 0) {
    console.error('[FakeAlert] cancel all: failed to cancel after retry', failed);
  }
  await saveActiveSchedules([]);
};

/**
 * Sign-out cleanup — called explicitly by AuthProvider.signOut (deleteAccount
 * goes through it too), not left to TrackProvider's cancel side effects.
 *
 * Cancels by data.type against the OS's pending list rather than by stored
 * ids, so fake alert notifications with no storage record go too — which is
 * also why storage isn't needed for cancelling and is always wiped, even if
 * some cancels failed: keeping it would leak this account's fake contacts,
 * templates and schedules to whoever signs in next.
 *
 * Never throws: a failure here must not block auth.signOut().
 */
export const clearFakeAlertsForSignOut = async () => {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const fakeAlertIds = pending.filter(isFakeAlertRequest).map(request => request.identifier);
    const failed = await cancelNotificationsWithRetry(fakeAlertIds);
    if (failed.length > 0) {
      console.error('[FakeAlert] sign-out: failed to cancel after retry', failed);
    }
  } catch (err) {
    console.error('[FakeAlert] sign-out: could not cancel pending notifications', err);
  }

  try {
    await clearAllFakeAlertData();
  } catch (err) {
    console.error('[FakeAlert] sign-out: failed to clear local fake alert data', err);
  }
};
