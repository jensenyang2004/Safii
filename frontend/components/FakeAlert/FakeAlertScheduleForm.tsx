// Instant-mode fake alert form: "N minutes from now", as a call, a message
// burst, or both (messages first, then the call). Layout and styles follow
// TrackingModeForm via components/ui; every rule comes from
// services/fakeAlert/validation.ts so the disabled reason shown here is the
// same check the scheduler enforces.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Theme from '@/constants/Theme';
import ScreenHeader from '@/components/ui/ScreenHeader';
import HeroNumberCard from '@/components/ui/HeroNumberCard';
import PresetChips, { PresetChip } from '@/components/ui/PresetChips';
import SegmentedToggle, { SegmentedOption } from '@/components/ui/SegmentedToggle';
import PrimaryPillButton from '@/components/ui/PrimaryPillButton';
import { CREAM, INK, PINK } from '@/components/ui/tokens';
import FakeCallerPicker from '@/components/FakeAlert/FakeCallerPicker';
import { useTracking } from '@/context/TrackProvider';
import {
  COMBO_CALL_AFTER_LAST_MESSAGE_SECONDS,
  DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
  DEFAULT_RINGTONE_KEY,
  FAKE_ALERT_MAX_PENDING,
  INSTANT_DELAY_PRESET_MINUTES,
} from '@/constants/fakeAlert';
import { FakeAlertKind, FakeContact, MessageTemplate } from '@/types/fakeAlert';
import { getFakeContacts, getMessageTemplates } from '@/services/fakeAlert/storage';
import {
  FakeAlertCapacityError,
  FakeAlertVerificationError,
  getNotificationUsage,
  scheduleFakeCall,
  scheduleFakeCombo,
  scheduleFakeMessages,
} from '@/services/fakeAlert/scheduler';
import {
  NotificationUsage,
  getRemainingFakeAlertSlots,
  validateInstantFakeAlert,
} from '@/services/fakeAlert/validation';

const KIND_OPTIONS: SegmentedOption<FakeAlertKind>[] = [
  { key: 'call', label: '來電' },
  { key: 'message', label: '訊息' },
  { key: 'combo', label: '訊息＋來電' },
];

const CUSTOM_CHIP_KEY = 'custom';
const DELAY_CHIPS: PresetChip[] = [
  ...INSTANT_DELAY_PRESET_MINUTES.map(m => ({ key: String(m), label: String(m), unit: '分' })),
  { key: CUSTOM_CHIP_KEY, label: '自訂' },
];

// Preselected on first load so the common case is one tap; the user can
// deselect or reorder by tapping.
const DEFAULT_SELECTED_TEMPLATE_COUNT = 3;

const formatClock = (epochMs: number) => {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function FakeAlertScheduleForm() {
  const { isReportDue, isInfoSent } = useTracking();
  // Same condition FakeAlertGate and the manage tab pause on.
  const isFakeAlertPaused = isReportDue || isInfoSent;

  const [contacts, setContacts] = useState<FakeContact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [usage, setUsage] = useState<NotificationUsage | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [kind, setKind] = useState<FakeAlertKind>('call');
  const [contactId, setContactId] = useState<string | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(String(INSTANT_DELAY_PRESET_MINUTES[1]));
  const [isCustomDelay, setIsCustomDelay] = useState(false);
  const delayInputRef = useRef<TextInput>(null);

  // Scheduling isn't atomic with the capacity check, so a second tap must
  // never get through: the ref blocks re-entry immediately, the state drives
  // the disabled button. `scheduled` keeps it disabled after success while
  // the confirmation alert is up.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const templatesSeeded = useRef(false);

  // Keeps the "約 21:43" preview current while the screen sits open.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [loadedContacts, loadedTemplates, loadedUsage] = await Promise.all([
          getFakeContacts(),
          getMessageTemplates(),
          getNotificationUsage(),
        ]);
        if (cancelled) return;
        setContacts(loadedContacts);
        setTemplates(loadedTemplates);
        setUsage(loadedUsage);
        setContactId(prev =>
          prev && loadedContacts.some(c => c.id === prev) ? prev : loadedContacts[0]?.id ?? null
        );
        setSelectedTemplateIds(prev => {
          if (!templatesSeeded.current) {
            templatesSeeded.current = true;
            return loadedTemplates.slice(0, DEFAULT_SELECTED_TEMPLATE_COUNT).map(t => t.id);
          }
          return prev.filter(id => loadedTemplates.some(t => t.id === id));
        });
        setLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const usesMessages = kind !== 'call';
  const usesCall = kind !== 'message';
  const messageCount = usesMessages ? selectedTemplateIds.length : 0;
  const minutes = Number(delayMinutes);

  const validation = useMemo(
    () =>
      usage
        ? validateInstantFakeAlert({ kind, contactId, delayMinutes: minutes, messageCount, usage })
        : null,
    [kind, contactId, minutes, messageCount, usage]
  );

  // Shown under the button whenever it's disabled for a reason the user can act on.
  const disabledReason = isFakeAlertPaused
    ? '有待回報的平安確認，假來電暫停中'
    : !usage
      ? '正在讀取通知額度…'
      : validation && !validation.ok
        ? validation.reason
        : null;
  const canSubmit = !disabledReason && !submitting && !scheduled;

  const remainingSlots = usage ? getRemainingFakeAlertSlots(usage) : null;
  const firesAt = Number.isFinite(minutes) && minutes > 0 ? now + minutes * 60_000 : null;

  const selectedDelayChip = isCustomDelay
    ? CUSTOM_CHIP_KEY
    : DELAY_CHIPS.some(c => c.key === delayMinutes) ? delayMinutes : CUSTOM_CHIP_KEY;

  const onSelectDelayChip = (key: string) => {
    if (key === CUSTOM_CHIP_KEY) {
      setIsCustomDelay(true);
      delayInputRef.current?.focus();
      return;
    }
    setIsCustomDelay(false);
    setDelayMinutes(key);
  };

  const onChangeDelay = (digits: string) => {
    setDelayMinutes(digits);
    setIsCustomDelay(!DELAY_CHIPS.some(c => c.key !== CUSTOM_CHIP_KEY && c.key === digits));
  };

  const toggleTemplate = (templateId: string) =>
    setSelectedTemplateIds(prev =>
      prev.includes(templateId) ? prev.filter(id => id !== templateId) : [...prev, templateId]
    );

  const schedule = async (bypassVerification: boolean) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) throw new Error('Selected fake contact no longer exists.');
    const delaySeconds = minutes * 60;
    const options = { bypassVerification };

    if (kind === 'call') {
      return scheduleFakeCall(
        { contactId: contact.id, delaySeconds, ringtoneKey: DEFAULT_RINGTONE_KEY },
        contact,
        options
      );
    }
    if (kind === 'message') {
      return scheduleFakeMessages(
        {
          contactId: contact.id,
          templateIds: selectedTemplateIds,
          firstDelaySeconds: delaySeconds,
          gapSecondsRange: DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
        },
        contact,
        templates,
        options
      );
    }
    return scheduleFakeCombo(
      {
        contactId: contact.id,
        templateIds: selectedTemplateIds,
        firstDelaySeconds: delaySeconds,
        gapSecondsRange: DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
        callAfterLastMessageSeconds: COMBO_CALL_AFTER_LAST_MESSAGE_SECONDS,
        ringtoneKey: DEFAULT_RINGTONE_KEY,
      },
      contact,
      templates,
      options
    );
  };

  const submit = async (bypassVerification = false) => {
    if (submittingRef.current || scheduled || isFakeAlertPaused) return;
    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      // Re-check against live counts right before scheduling — the ones the
      // button was enabled with may be stale.
      const freshUsage = await getNotificationUsage();
      setUsage(freshUsage);
      const result = validateInstantFakeAlert({
        kind, contactId, delayMinutes: minutes, messageCount, usage: freshUsage,
      });
      if (!result.ok) {
        Alert.alert('無法排程', result.reason);
        return;
      }

      await schedule(bypassVerification);
      setScheduled(true);
      Alert.alert('已排程', `${minutes} 分鐘後（約 ${formatClock(Date.now() + minutes * 60_000)}）會收到通知。`, [
        { text: '好', onPress: () => router.back() },
      ]);
    } catch (err) {
      if (err instanceof FakeAlertVerificationError) {
        Alert.alert(
          '尚未驗證通知功能',
          '還沒確認過通知能正常送達這台裝置。可以先在「工具」頁「測試通知功能」，或直接略過風險排程。',
          [
            { text: '取消', style: 'cancel' },
            { text: '我知道風險，仍要排程', style: 'destructive', onPress: () => submit(true) },
          ]
        );
        return;
      }
      if (err instanceof FakeAlertCapacityError) {
        Alert.alert('無法排程', err.message);
        getNotificationUsage().then(setUsage).catch(() => {});
        return;
      }
      Alert.alert('排程失敗', String(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const callerLabel = kind === 'message' ? '傳訊者' : '來電者';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="建立排程" onBack={() => router.back()} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>幾分鐘後響起？</Text>
          <Text style={styles.subtitle}>時間到時會收到通知，點擊即可開啟。</Text>

          <HeroNumberCard
            value={delayMinutes}
            onChangeText={onChangeDelay}
            unit="分鐘後"
            cornerLines={firesAt ? [`約 ${formatClock(firesAt)}`, usesMessages ? '開始' : '響起'] : undefined}
            inputRef={delayInputRef}
          />
          <PresetChips items={DELAY_CHIPS} selectedKey={selectedDelayChip} onSelect={onSelectDelayChip} />

          <Text style={styles.sectionLabel}>類型</Text>
          <SegmentedToggle options={KIND_OPTIONS} value={kind} onChange={setKind} />
          {kind === 'combo' ? (
            <Text style={styles.hint}>
              先收到訊息，最後一則之後 {COMBO_CALL_AFTER_LAST_MESSAGE_SECONDS} 秒來電。
            </Text>
          ) : null}

          <Text style={styles.sectionLabel}>{callerLabel}</Text>
          {loaded && contacts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>還沒有假聯絡人，請先到「工具」頁新增。</Text>
            </View>
          ) : (
            <FakeCallerPicker contacts={contacts} selectedId={contactId} onSelect={setContactId} />
          )}

          {usesMessages ? (
            <>
              <Text style={styles.sectionLabel}>
                訊息內容（已選 {selectedTemplateIds.length} 則，依點選順序傳送）
              </Text>
              {loaded && templates.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>還沒有訊息範本，請先到「工具」頁新增。</Text>
                </View>
              ) : (
                <View style={styles.templateList}>
                  {templates.map((template, index) => {
                    const order = selectedTemplateIds.indexOf(template.id);
                    const selected = order !== -1;
                    return (
                      <TouchableOpacity
                        key={template.id}
                        style={[styles.templateRow, index > 0 && styles.templateRowDivider]}
                        onPress={() => toggleTemplate(template.id)}
                        activeOpacity={0.8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <View style={[styles.orderBadge, selected && styles.orderBadgeSelected]}>
                          {selected ? <Text style={styles.orderBadgeText}>{order + 1}</Text> : null}
                        </View>
                        <Text style={styles.templateText}>{template.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          <PrimaryPillButton
            label={submitting ? '排程中…' : '建立排程'}
            onPress={() => submit(false)}
            disabled={!canSubmit}
          />
          {disabledReason ? <Text style={styles.disabledReason}>{disabledReason}</Text> : null}

          {remainingSlots !== null ? (
            <Text style={styles.quotaText}>
              還可以排 {remainingSlots} 則通知（{usesCall && usesMessages
                ? `這次需要 ${messageCount + 1} 則`
                : usesMessages ? `這次需要 ${messageCount} 則` : '這次需要 1 則'}）。
              為了保留報平安提醒的通知空間，假來電／假訊息最多同時排 {FAKE_ALERT_MAX_PENDING} 則。
            </Text>
          ) : null}
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Copied 1:1 from TrackingModeForm.
  safe: { flex: 1, backgroundColor: CREAM },
  scroll: { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5, color: INK, marginTop: 4 },
  subtitle: { fontSize: 13.5, lineHeight: 21, color: Theme.colors.gray600, marginTop: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: INK, opacity: 0.5, marginTop: 10, marginBottom: 8 },

  // New for this form, in the same visual language (white, 1.6 ink border).
  hint: { fontSize: 12, color: Theme.colors.gray600, marginTop: -4, marginBottom: 4 },
  emptyBox: {
    backgroundColor: '#fff', borderWidth: 1.6, borderColor: INK, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  emptyText: { fontSize: 14, color: INK, opacity: 0.7 },
  templateList: {
    backgroundColor: '#fff', borderWidth: 1.6, borderColor: INK, borderRadius: 14, overflow: 'hidden',
  },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  templateRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.colors.gray200 },
  orderBadge: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.6, borderColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
  orderBadgeSelected: { backgroundColor: PINK },
  orderBadgeText: { fontSize: 12, fontWeight: '800', color: INK },
  templateText: { flex: 1, fontSize: 15, color: INK },
  disabledReason: { fontSize: 13, color: '#c0392b', textAlign: 'center', marginTop: 10 },
  quotaText: { fontSize: 12, lineHeight: 18, color: Theme.colors.gray600, marginTop: 14 },
});
