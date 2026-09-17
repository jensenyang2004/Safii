// Types for the Fake Alert feature — a fake incoming call and/or a burst of
// fake messages the user can trigger to give themselves a plausible reason
// to leave a situation.

export type FakeAlertKind = 'call' | 'message' | 'combo';

export interface FakeContact {
  id: string;
  name: string;
  /** Key into DEFAULT_AVATARS (constants/fakeAlert.ts). Null falls back to initials. */
  avatarKey: string | null;
  /** User-picked photo uri, if any. Still subject to the "don't use someone else's photo" warning. */
  avatarUri: string | null;
}

export interface MessageTemplate {
  id: string;
  text: string;
  /** false = one of the shipped defaults, true = added by the user. Both are freely editable/deletable. */
  isCustom: boolean;
}

export interface ScheduledFakeMessage {
  /** Stable local id, independent of the OS notification id. */
  id: string;
  /** Filled in once the notification is actually scheduled. */
  notificationId: string | null;
  text: string;
  /** Epoch ms this message is meant to appear. */
  fireAt: number;
}

export interface FakeCallConfig {
  contactId: string;
  delaySeconds: number;
  ringtoneKey: string;
}

export interface FakeMessageConfig {
  contactId: string;
  /** Ordered selection of template ids to fire as the burst. */
  templateIds: string[];
  firstDelaySeconds: number;
  /** Random gap range (seconds) between consecutive messages. */
  gapSecondsRange: [number, number];
}

export interface FakeAlertSchedule {
  id: string;
  kind: FakeAlertKind;
  contactId: string;
  /**
   * Grouping key for the in-app chat UI (stage 3). NOT currently passed to
   * the OS — expo-notifications has no JS-level threadIdentifier support for
   * locally scheduled notifications on this SDK version. See scheduler.ts.
   */
  threadIdentifier: string;
  call?: FakeCallConfig;
  callNotificationId?: string | null;
  messages?: ScheduledFakeMessage[];
  scheduledAt: number;
  /** Every OS notification id tied to this schedule, for bulk cancel. */
  notificationIds: string[];
  /** True if the user bypassed the "setup not verified" warning to schedule anyway. */
  verifiedSkipped: boolean;
}
