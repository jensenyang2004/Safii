// One row in the manage tab's schedule list: who, what (call / messages /
// both), when, and its state — including "lost", when the notifications it
// still needs are gone from the OS and it will never ring.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Theme from '@/constants/Theme';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';
import { INK } from '@/components/ui/tokens';
import { FakeAlertScheduleListItem, FakeContact } from '@/types/fakeAlert';

type Props = {
  item: FakeAlertScheduleListItem;
  /** Undefined if the fake contact was deleted after scheduling. */
  contact: FakeContact | undefined;
  now: number;
  busy: boolean;
  /** Re-arming is blocked (e.g. while a real check-in is due); cancel still works. */
  rescheduleBlocked: boolean;
  onCancel: () => void;
  onReschedule: () => void;
};

const formatClock = (epochMs: number) => {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatUntil = (epochMs: number, now: number) => {
  const minutes = Math.ceil((epochMs - now) / 60_000);
  return minutes <= 1 ? '不到 1 分鐘後' : `${minutes} 分鐘後`;
};

export default function FakeAlertScheduleCard({
  item, contact, now, busy, rescheduleBlocked, onCancel, onReschedule,
}: Props) {
  const { schedule, status, messagesFired } = item;
  const firstAt = schedule.fireAt ?? schedule.scheduledAt;
  const lastAt = schedule.lastFireAt ?? schedule.scheduledAt;
  const messageTotal = schedule.messages?.length ?? 0;

  const kindLabel =
    schedule.kind === 'call'
      ? '來電'
      : schedule.kind === 'message'
        ? `訊息 ×${messageTotal}`
        : `訊息 ×${messageTotal}＋來電`;

  const statusLine = (() => {
    switch (status) {
      case 'pending':
        return `${formatUntil(firstAt, now)} · 約 ${formatClock(firstAt)}`;
      case 'inProgress':
        return schedule.kind === 'combo' && messagesFired >= messageTotal
          ? `訊息已送達 · 來電約 ${formatClock(lastAt)}`
          : `進行中 · 已收到 ${messagesFired}/${messageTotal} 則`;
      case 'fired':
        return `已觸發 · ${formatClock(lastAt)}`;
      case 'lost':
        return '遺失：通知已被清除，時間到時不會響';
    }
  })();

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <FakeContactAvatar contact={contact ?? null} size={40} />
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{contact?.name ?? '（已刪除的聯絡人）'}</Text>
            <View style={styles.kindChip}>
              <Text style={styles.kindChipText}>{kindLabel}</Text>
            </View>
          </View>
          <Text style={[styles.status, status === 'lost' && styles.statusLost]}>{statusLine}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {status === 'lost' ? (
          <Pressable
            style={[styles.button, styles.buttonPrimary, (busy || rescheduleBlocked || !contact) && styles.buttonDisabled]}
            onPress={onReschedule}
            disabled={busy || rescheduleBlocked || !contact}
            accessibilityRole="button"
          >
            <Text style={styles.buttonPrimaryText}>重新排程</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.button, styles.buttonSecondary, busy && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.buttonSecondaryText}>{status === 'fired' ? '移除' : '取消排程'}</Text>
        </Pressable>
      </View>
      {status === 'lost' && !contact ? (
        <Text style={styles.note}>假聯絡人已被刪除，無法重新排程。</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#000' },
  kindChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: Theme.colors.gray75,
  },
  kindChipText: { fontSize: 12, fontWeight: '600', color: INK },
  status: { fontSize: 13, color: Theme.colors.gray600 },
  statusLost: { color: Theme.colors.redAccent, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  buttonPrimary: { backgroundColor: INK },
  buttonPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  buttonSecondary: { backgroundColor: '#eee' },
  buttonSecondaryText: { fontSize: 14, color: '#333' },
  buttonDisabled: { opacity: 0.4 },
  note: { fontSize: 12, color: Theme.colors.gray600, textAlign: 'right' },
});
