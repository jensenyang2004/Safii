// Pure validation for the fake alert scheduling form. No OS calls here —
// the caller passes in live notification counts (scheduler.ts
// getNotificationUsage) so the same rules drive both the form's disabled
// states and scheduler.ts's last-line capacity check.

import {
  FAKE_ALERT_MAX_PENDING,
  INSTANT_DELAY_MAX_MINUTES,
  INSTANT_DELAY_MIN_MINUTES,
  IOS_MAX_PENDING_NOTIFICATIONS,
  NON_FAKE_ALERT_RESERVED_NOTIFICATIONS,
} from '@/constants/fakeAlert';
import { FakeAlertKind } from '@/types/fakeAlert';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const OK: ValidationResult = { ok: true };

export interface NotificationUsage {
  /** Every pending local notification this app has with the OS. */
  totalPending: number;
  /** The subset whose data.type is fake_call / fake_message. */
  fakeAlertPending: number;
}

/**
 * How many more fake alert notifications can be scheduled right now.
 * `released` = pending notifications that are about to be cancelled (an
 * edit's old schedule), counted as already free.
 */
export const getRemainingFakeAlertSlots = (
  { totalPending, fakeAlertPending }: NotificationUsage,
  released = 0
): number => {
  const underFakeAlertCap = FAKE_ALERT_MAX_PENDING - (fakeAlertPending - released);
  const underGlobalCap =
    IOS_MAX_PENDING_NOTIFICATIONS - NON_FAKE_ALERT_RESERVED_NOTIFICATIONS - (totalPending - released);
  return Math.max(0, Math.min(underFakeAlertCap, underGlobalCap));
};

export const getRequiredNotificationCount = (kind: FakeAlertKind, messageCount: number): number => {
  switch (kind) {
    case 'call':
      return 1;
    case 'message':
      return messageCount;
    case 'combo':
      return messageCount + 1;
  }
};

/** Upper bound for the message-count stepper. */
export const getMaxMessageCount = (
  kind: FakeAlertKind,
  remainingSlots: number,
  selectedTemplateCount: number
): number => {
  const slotsForMessages = remainingSlots - (kind === 'combo' ? 1 : 0);
  return Math.max(0, Math.min(slotsForMessages, selectedTemplateCount));
};

export const validateInstantDelayMinutes = (minutes: number): ValidationResult => {
  if (!Number.isInteger(minutes) || minutes < INSTANT_DELAY_MIN_MINUTES) {
    return { ok: false, reason: `請輸入至少 ${INSTANT_DELAY_MIN_MINUTES} 分鐘` };
  }
  if (minutes > INSTANT_DELAY_MAX_MINUTES) {
    return { ok: false, reason: `最多 ${INSTANT_DELAY_MAX_MINUTES} 分鐘` };
  }
  return OK;
};

export const validateCaller = (contactId: string | null): ValidationResult =>
  contactId ? OK : { ok: false, reason: '請先選擇一位假聯絡人' };

export const validateMessageCount = (kind: FakeAlertKind, messageCount: number): ValidationResult => {
  if (kind === 'call') return OK;
  if (messageCount < 1) return { ok: false, reason: '請至少選一則訊息範本' };
  return OK;
};

export const validateCapacity = (
  kind: FakeAlertKind,
  messageCount: number,
  usage: NotificationUsage,
  released = 0
): ValidationResult => {
  const required = getRequiredNotificationCount(kind, messageCount);
  const remaining = getRemainingFakeAlertSlots(usage, released);
  if (required > remaining) {
    return {
      ok: false,
      reason: `通知額度不足：需要 ${required} 則，目前還可以排 ${remaining} 則。請先取消一些已排程的項目。`,
    };
  }
  return OK;
};

interface InstantFakeAlertInput {
  kind: FakeAlertKind;
  contactId: string | null;
  delayMinutes: number;
  messageCount: number;
  usage: NotificationUsage;
  released?: number;
}

/** First failing rule wins — drives the create button's disabled reason. */
export const validateInstantFakeAlert = ({
  kind,
  contactId,
  delayMinutes,
  messageCount,
  usage,
  released = 0,
}: InstantFakeAlertInput): ValidationResult => {
  for (const result of [
    validateCaller(contactId),
    validateInstantDelayMinutes(delayMinutes),
    validateMessageCount(kind, messageCount),
    validateCapacity(kind, messageCount, usage, released),
  ]) {
    if (!result.ok) return result;
  }
  return OK;
};
