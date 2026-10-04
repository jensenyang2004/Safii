import { MessageTemplate } from '@/types/fakeAlert';

export const FAKE_ALERT_STORAGE_KEYS = {
  CONTACTS: 'fake_alert_contacts',
  MESSAGE_TEMPLATES: 'fake_alert_message_templates',
  ACTIVE_SCHEDULES: 'fake_alert_active_schedules',
  HAS_VERIFIED_SETUP: 'fake_alert_has_verified_setup',
  COMBO_SETTINGS: 'fake_alert_combo_settings',
};

// Editable defaults — seeded into storage on first read, then freely
// edited/removed by the user like any other template (see storage.ts).
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: 'default-1', text: '妳現在在哪', isCustom: false },
  { id: 'default-2', text: '家裡水管爆了 到處都是水', isCustom: false },
  { id: 'default-3', text: '妳快回來 我不知道怎麼關', isCustom: false },
  { id: 'default-4', text: '媽剛剛在醫院打給我 妳有空嗎', isCustom: false },
  { id: 'default-5', text: '東西忘記帶了 妳可以先回來一下嗎', isCustom: false },
  { id: 'default-6', text: '我到樓下了 妳好了嗎', isCustom: false },
  { id: 'default-7', text: '有急事 看到回我', isCustom: false },
];

// Built-in placeholder avatars a user can pick instead of uploading a real
// photo — the whole point is to avoid storing someone else's photo on the
// device. No illustration assets exist for these, so each key just maps to
// a flat color; FakeContactAvatar renders that color + the contact's
// initial. Swap in real illustrations later without touching callers if
// that's ever wanted — they only ever look up by key.
export const DEFAULT_AVATAR_KEYS = [
  'avatar_1',
  'avatar_2',
  'avatar_3',
  'avatar_4',
  'avatar_5',
  'avatar_6',
];

export const DEFAULT_AVATAR_COLORS: Record<string, string> = {
  avatar_1: '#F18C8E', // brandPink
  avatar_2: '#BFD3C1', // brandGreen
  avatar_3: '#FEE18B', // brandYellow
  avatar_4: '#007AFF', // brandBlue
  avatar_5: '#F8BF80', // actionOrange
  avatar_6: '#F3A8BB', // actionPink
};

// expo-notifications has no documented hard cap, but iOS silently stops
// delivering local notifications past 64 pending per app. We warn before
// hitting it rather than after messages silently stop arriving.
export const IOS_MAX_PENDING_NOTIFICATIONS = 64;

// data.type values of fake alert notifications. Exact match on purpose —
// the setup test notification is 'fake_alert_setup_test' and must not count
// toward the fake alert budget. Shared with TrackProvider, which keeps these
// when it clears its own notifications.
export const FAKE_ALERT_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'fake_call',
  'fake_message',
]);

// Apple 未文件化超過 64 則時哪些會被丟（尚未驗證，見 todo #23）。為了不碰到上限，
// 假通知自己設上限，並替追蹤與排程追蹤保留額度。
export const FAKE_ALERT_MAX_PENDING = 20;
export const NON_FAKE_ALERT_RESERVED_NOTIFICATIONS = 16;

// Instant mode ("N minutes from now").
export const INSTANT_DELAY_PRESET_MINUTES = [3, 5, 10];
export const INSTANT_DELAY_MIN_MINUTES = 1;
export const INSTANT_DELAY_MAX_MINUTES = 180;

// Combo: the message burst plays first, then the call rings this long after
// the last message — "you didn't reply, so they're calling".
export const COMBO_CALL_AFTER_LAST_MESSAGE_SECONDS = 30;

// __DEV__-only quick-test path on the manage tab.
export const DEFAULT_FIRST_MESSAGE_DELAY_SECONDS = 5;
export const DEFAULT_MESSAGE_GAP_SECONDS_RANGE: [number, number] = [3, 8];
export const DEFAULT_CALL_DELAY_SECONDS = 5;
export const DEFAULT_RINGTONE_KEY = 'default';

// require() targets must be static, so the one ringtone asset we ship with
// lives here rather than being passed around as a string path.
export const FAKE_CALL_RINGTONE_SOURCE = require('@/assets/sounds/fake_call_ringtone_iphone_X.mp3');
