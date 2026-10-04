import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Theme from '@/constants/Theme';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';
import FakeAlertScheduleCard from '@/components/FakeAlert/FakeAlertScheduleCard';
import { INK } from '@/components/ui/tokens';
import { useSetupTestFlow } from '@/hooks/useSetupTestFlow';
import { useTracking } from '@/context/TrackProvider';
import {
  getFakeContacts,
  saveFakeContacts,
  getMessageTemplates,
  saveMessageTemplates,
  getHasVerifiedSetup,
} from '@/services/fakeAlert/storage';
import {
  scheduleFakeCall,
  scheduleFakeMessages,
  cancelAllFakeAlerts,
  cancelFakeAlertSchedule,
  getScheduleList,
  rescheduleLostFakeAlert,
  FakeAlertVerificationError,
  FakeAlertCapacityError,
} from '@/services/fakeAlert/scheduler';
import {
  DEFAULT_AVATAR_KEYS,
  DEFAULT_CALL_DELAY_SECONDS,
  DEFAULT_FIRST_MESSAGE_DELAY_SECONDS,
  DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
} from '@/constants/fakeAlert';
import { FakeAlertScheduleListItem, FakeContact, MessageTemplate } from '@/types/fakeAlert';

// This is the "manage.tsx" screen from the plan — it lives at the (tabs)
// route path so it can register as a tab, but tabBarIcon/title (set in
// _layout.tsx) are deliberately generic ("工具" + a wrench) so nothing here
// gives away what this tab actually does at a glance.
export default function ManageFakeAlertScreen() {
  const [contacts, setContacts] = useState<FakeContact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [hasVerified, setHasVerified] = useState(false);
  const { status: setupStatus, runTest } = useSetupTestFlow();
  const { isTracking, isReportDue, isInfoSent } = useTracking();
  // Same condition FakeAlertGate swallows on — keep the two in sync.
  const isFakeAlertPaused = isReportDue || isInfoSent;
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [scheduleItems, setScheduleItems] = useState<FakeAlertScheduleListItem[]>([]);
  const [listError, setListError] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [newContactName, setNewContactName] = useState('');
  const [newContactAvatarKey, setNewContactAvatarKey] = useState<string | null>(DEFAULT_AVATAR_KEYS[0]);
  const [newContactAvatarUri, setNewContactAvatarUri] = useState<string | null>(null);

  const [newTemplateText, setNewTemplateText] = useState('');

  const refresh = useCallback(async () => {
    const [loadedContacts, loadedTemplates, verified] = await Promise.all([
      getFakeContacts(),
      getMessageTemplates(),
      getHasVerifiedSetup(),
    ]);
    setContacts(loadedContacts);
    setTemplates(loadedTemplates);
    setHasVerified(verified);
  }, []);

  // The test flow sets the verified flag in storage as a side effect —
  // re-read it once the flow reports success so the badge below updates.
  useEffect(() => {
    if (setupStatus === 'verified') {
      setHasVerified(true);
    }
  }, [setupStatus]);

  const addContact = async () => {
    const name = newContactName.trim();
    if (!name) return;
    const contact: FakeContact = {
      id: uuidv4(),
      name,
      avatarKey: newContactAvatarUri ? null : newContactAvatarKey,
      avatarUri: newContactAvatarUri,
    };
    const next = [...contacts, contact];
    await saveFakeContacts(next);
    setContacts(next);
    setNewContactName('');
    setNewContactAvatarUri(null);
  };

  const deleteContact = async (id: string) => {
    const next = contacts.filter(c => c.id !== id);
    await saveFakeContacts(next);
    setContacts(next);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '需要相簿權限才能選擇照片。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setNewContactAvatarUri(result.assets[0].uri);
    }
  };

  const addTemplate = async () => {
    const text = newTemplateText.trim();
    if (!text) return;
    const next = [...templates, { id: uuidv4(), text, isCustom: true }];
    await saveMessageTemplates(next);
    setTemplates(next);
    setNewTemplateText('');
  };

  const deleteTemplate = async (id: string) => {
    const next = templates.filter(t => t.id !== id);
    await saveMessageTemplates(next);
    setTemplates(next);
  };

  const confirmDeleteTemplate = (template: MessageTemplate) => {
    Alert.alert('刪除範本', `確定要刪除「${template.text}」嗎？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => deleteTemplate(template.id) },
    ]);
  };

  const triggerCall = async (bypassVerification = false) => {
    if (isFakeAlertPaused) return;
    if (contacts.length === 0) {
      Alert.alert('還沒有假聯絡人', '請先在下面新增一個假聯絡人。');
      return;
    }
    const contact = contacts[0];
    try {
      await scheduleFakeCall(
        { contactId: contact.id, delaySeconds: DEFAULT_CALL_DELAY_SECONDS, ringtoneKey: 'default' },
        contact,
        { bypassVerification }
      );
      Alert.alert('已排程', `${DEFAULT_CALL_DELAY_SECONDS} 秒後會有一通來自「${contact.name}」的假來電。`);
    } catch (err) {
      if (err instanceof FakeAlertVerificationError) {
        Alert.alert(
          '尚未驗證通知功能',
          '還沒確認過通知能正常送達這台裝置。可以先在上面「測試通知功能」，或直接略過風險排程。',
          [
            { text: '取消', style: 'cancel' },
            { text: '我知道風險，仍要排程', style: 'destructive', onPress: () => triggerCall(true) },
          ]
        );
        return;
      }
      if (err instanceof FakeAlertCapacityError) {
        Alert.alert('無法排程', err.message);
        return;
      }
      Alert.alert('排程失敗', String(err));
    }
  };

  const triggerMessages = async (bypassVerification = false) => {
    if (isFakeAlertPaused) return;
    if (contacts.length === 0) {
      Alert.alert('還沒有假聯絡人', '請先在下面新增一個假聯絡人。');
      return;
    }
    if (templates.length === 0) {
      Alert.alert('還沒有訊息範本', '請先在下面新增至少一則訊息範本。');
      return;
    }
    const contact = contacts[0];
    try {
      await scheduleFakeMessages(
        {
          contactId: contact.id,
          templateIds: templates.slice(0, 3).map(t => t.id),
          firstDelaySeconds: DEFAULT_FIRST_MESSAGE_DELAY_SECONDS,
          gapSecondsRange: DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
        },
        contact,
        templates,
        { bypassVerification }
      );
      Alert.alert('已排程', `${DEFAULT_FIRST_MESSAGE_DELAY_SECONDS} 秒後開始收到來自「${contact.name}」的假訊息。`);
    } catch (err) {
      if (err instanceof FakeAlertVerificationError) {
        Alert.alert(
          '尚未驗證通知功能',
          '還沒確認過通知能正常送達這台裝置。可以先在上面「測試通知功能」，或直接略過風險排程。',
          [
            { text: '取消', style: 'cancel' },
            { text: '我知道風險，仍要排程', style: 'destructive', onPress: () => triggerMessages(true) },
          ]
        );
        return;
      }
      if (err instanceof FakeAlertCapacityError) {
        Alert.alert('無法排程', err.message);
        return;
      }
      Alert.alert('排程失敗', String(err));
    }
  };

  const loadSchedules = useCallback(async () => {
    try {
      setScheduleItems(await getScheduleList());
      setListError(false);
    } catch (err) {
      console.error('[FakeAlert] failed to load schedule list', err);
      setListError(true);
    }
    setNow(Date.now());
  }, []);

  // Re-read everything whenever the tab regains focus (e.g. back from the
  // create form), and keep statuses / "N 分鐘後" current while it stays open.
  useFocusEffect(
    useCallback(() => {
      refresh();
      loadSchedules();
      const interval = setInterval(loadSchedules, 30_000);
      return () => clearInterval(interval);
    }, [refresh, loadSchedules])
  );

  // One schedule action at a time — cancel / reschedule both touch OS
  // notifications and storage, and a double tap must not run them twice.
  const busyRef = useRef(false);
  const [busyScheduleId, setBusyScheduleId] = useState<string | null>(null);
  const runScheduleAction = async (scheduleId: string, action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyScheduleId(scheduleId);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setBusyScheduleId(null);
      loadSchedules();
    }
  };

  const confirmCancelSchedule = (item: FakeAlertScheduleListItem) => {
    if (item.status === 'fired') {
      runScheduleAction(item.schedule.id, () => cancelFakeAlertSchedule(item.schedule.id));
      return;
    }
    Alert.alert('取消排程', '這個排程尚未響起的通知都會取消。', [
      { text: '保留', style: 'cancel' },
      {
        text: '取消排程',
        style: 'destructive',
        onPress: () => runScheduleAction(item.schedule.id, () => cancelFakeAlertSchedule(item.schedule.id)),
      },
    ]);
  };

  const reschedule = (item: FakeAlertScheduleListItem, bypassVerification = false) =>
    runScheduleAction(item.schedule.id, async () => {
      const contact = contacts.find(c => c.id === item.schedule.contactId);
      if (!contact) {
        Alert.alert('無法重新排程', '這個排程的假聯絡人已被刪除。');
        return;
      }
      try {
        await rescheduleLostFakeAlert(item.schedule, contact, { bypassVerification });
        Alert.alert('已重新排程', '已用原本的設定，從現在起重新計時。');
      } catch (err) {
        if (err instanceof FakeAlertVerificationError) {
          Alert.alert(
            '尚未驗證通知功能',
            '還沒確認過通知能正常送達這台裝置。可以先在上面「測試通知功能」，或直接略過風險排程。',
            [
              { text: '取消', style: 'cancel' },
              { text: '我知道風險，仍要排程', style: 'destructive', onPress: () => reschedule(item, true) },
            ]
          );
          return;
        }
        if (err instanceof FakeAlertCapacityError) {
          Alert.alert('無法排程', err.message);
          return;
        }
        Alert.alert('排程失敗', String(err));
      }
    });

  const confirmReschedule = (item: FakeAlertScheduleListItem) => {
    if (isFakeAlertPaused) return;
    const leadMinutes = Math.max(
      Math.round(((item.schedule.fireAt ?? item.schedule.scheduledAt) - item.schedule.scheduledAt) / 60_000),
      1
    );
    Alert.alert('重新排程', `會用原本的設定，從現在起約 ${leadMinutes} 分鐘後開始。`, [
      { text: '取消', style: 'cancel' },
      { text: '重新排程', onPress: () => reschedule(item) },
    ]);
  };

  const cancelAll = () => {
    Alert.alert('取消所有排程', '會取消目前所有排程中的假來電/假訊息通知。', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        style: 'destructive',
        onPress: async () => {
          await cancelAllFakeAlerts();
          loadSchedules();
        },
      },
    ]);
  };

  const setupStatusLabel: Record<typeof setupStatus, string> = {
    idle: hasVerified ? '已驗證過' : '尚未測試',
    requesting_permission: '請求通知權限中…',
    permission_denied: '通知權限被拒絕',
    testing: '測試中，等待通知送達…',
    verified: '已驗證，通知功能正常',
    timed_out: '逾時沒收到通知，請檢查系統通知設定',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        // The tab bar is position: absolute, so content needs room under it.
        { paddingTop: insets.top + 16, paddingBottom: tabBarHeight + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {isFakeAlertPaused ? (
        <View style={[styles.trackingBanner, styles.trackingBannerPaused]}>
          <MaterialIcons name="pause-circle-outline" size={20} color={Theme.colors.redAccent} />
          <Text style={[styles.trackingBannerText, styles.trackingBannerTextPaused]}>
            有待回報的平安確認，假來電暫停中
          </Text>
          <Pressable onPress={() => router.navigate('/(tabs)/home')} hitSlop={8}>
            <Text style={styles.trackingBannerLink}>前往首頁</Text>
          </Pressable>
        </View>
      ) : isTracking ? (
        <View style={styles.trackingBanner}>
          <MaterialIcons name="my-location" size={20} color={Theme.colors.textPrimary} />
          <Text style={styles.trackingBannerText}>追蹤進行中，假來電可正常使用</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>設定檢查</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>{setupStatusLabel[setupStatus]}</Text>
        <Pressable style={styles.secondaryButton} onPress={runTest}>
          <Text style={styles.secondaryButtonText}>測試通知功能</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>已排程</Text>
      <Pressable
        style={[styles.primaryButton, isFakeAlertPaused && styles.primaryButtonDisabled]}
        onPress={() => router.push('/(modals)/fake-alert/new')}
        disabled={isFakeAlertPaused}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>建立假來電／假訊息</Text>
      </Pressable>
      {isFakeAlertPaused && (
        <Text style={styles.disabledReasonText}>
          有平安確認待回報，暫停排程假來電/假訊息。請先到首頁完成回報。
        </Text>
      )}
      {listError ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>無法讀取排程清單，請稍後再試。</Text>
        </View>
      ) : scheduleItems.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.hintText}>目前沒有排程。排程後會在時間到時收到通知，點擊即可開啟。</Text>
        </View>
      ) : (
        <>
          {scheduleItems.map(item => (
            <FakeAlertScheduleCard
              key={item.schedule.id}
              item={item}
              contact={contacts.find(c => c.id === item.schedule.contactId)}
              now={now}
              busy={busyScheduleId !== null}
              rescheduleBlocked={isFakeAlertPaused}
              onCancel={() => confirmCancelSchedule(item)}
              onReschedule={() => confirmReschedule(item)}
            />
          ))}
          <Pressable style={styles.dangerButton} onPress={cancelAll} accessibilityRole="button">
            <Text style={styles.dangerButtonText}>取消所有排程</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.sectionTitle}>假聯絡人</Text>
      <View style={styles.card}>
        {contacts.map((contact, index) => (
          <View key={contact.id} style={[styles.row, index > 0 && styles.rowDivider]}>
            <FakeContactAvatar contact={contact} size={40} />
            <Text style={[styles.rowText, styles.flexGrow]}>{contact.name}</Text>
            <Pressable onPress={() => deleteContact(contact.id)} hitSlop={8} accessibilityLabel={`刪除 ${contact.name}`}>
              <MaterialIcons name="close" size={20} color="#8e8e93" />
            </Pressable>
          </View>
        ))}

        <View style={styles.avatarPicker}>
          {DEFAULT_AVATAR_KEYS.map(key => {
            const selected = !newContactAvatarUri && newContactAvatarKey === key;
            return (
              <Pressable
                key={key}
                style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
                onPress={() => {
                  setNewContactAvatarKey(key);
                  setNewContactAvatarUri(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <FakeContactAvatar
                  contact={{ id: 'preview', name: newContactName || '?', avatarKey: key, avatarUri: null }}
                  size={32}
                />
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.avatarOption, !!newContactAvatarUri && styles.avatarOptionSelected]}
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityState={{ selected: !!newContactAvatarUri }}
            accessibilityLabel="從相簿選擇照片"
          >
            {newContactAvatarUri ? (
              <FakeContactAvatar
                contact={{ id: 'preview', name: newContactName || '?', avatarKey: null, avatarUri: newContactAvatarUri }}
                size={32}
              />
            ) : (
              <View style={styles.photoButton}>
                <MaterialIcons name="add-a-photo" size={20} color="#666" />
              </View>
            )}
          </Pressable>
        </View>
        <Text style={styles.warningText}>請勿使用他人的照片 — 選用上面的內建頭像會更安全</Text>

        <View style={styles.inlineForm}>
          <TextInput
            style={styles.input}
            placeholder="聯絡人名稱"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <Pressable style={styles.addButton} onPress={addContact} accessibilityLabel="新增聯絡人">
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>訊息範本</Text>
      <View style={styles.card}>
        {templates.map((template, index) => (
          <View key={template.id} style={[styles.row, index > 0 && styles.rowDivider]}>
            <Text style={[styles.rowText, styles.flexGrow]}>{template.text}</Text>
            <Pressable onPress={() => confirmDeleteTemplate(template)} hitSlop={8} accessibilityLabel="刪除範本">
              <MaterialIcons name="close" size={20} color="#8e8e93" />
            </Pressable>
          </View>
        ))}
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.input}
            placeholder="新增範本"
            value={newTemplateText}
            onChangeText={setNewTemplateText}
          />
          <Pressable style={styles.addButton} onPress={addTemplate} accessibilityLabel="新增範本">
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Quick-test path for development builds only. */}
      {__DEV__ && (
        <>
          <Text style={styles.sectionTitle}>開發測試</Text>
          <View style={styles.card}>
            <Pressable
              style={[styles.primaryButton, isFakeAlertPaused && styles.primaryButtonDisabled]}
              onPress={() => triggerCall(false)}
              disabled={isFakeAlertPaused}
            >
              <Text style={styles.primaryButtonText}>排程假來電（{DEFAULT_CALL_DELAY_SECONDS} 秒後）</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isFakeAlertPaused && styles.primaryButtonDisabled]}
              onPress={() => triggerMessages(false)}
              disabled={isFakeAlertPaused}
            >
              <Text style={styles.primaryButtonText}>排程假訊息（{DEFAULT_FIRST_MESSAGE_DELAY_SECONDS} 秒後開始）</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.brandOffWhite,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.gray200,
    paddingTop: 10,
  },
  rowText: {
    fontSize: 15,
    color: '#000',
  },
  flexGrow: {
    flex: 1,
  },
  avatarPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  avatarOption: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: INK,
  },
  photoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7c7cc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 12,
    color: Theme.colors.redAccent,
  },
  inlineForm: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    // INK, not brandPink: white on the pink was too low-contrast.
    backgroundColor: INK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  trackingBannerPaused: {
    // No light-red tint in Theme's palette yet.
    backgroundColor: '#fdecea',
  },
  trackingBannerText: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textPrimary,
  },
  trackingBannerTextPaused: {
    color: Theme.colors.redAccent,
    fontWeight: '600',
  },
  trackingBannerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.brandBlue,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    // INK, not brandPink: white on the pink was too low-contrast.
    backgroundColor: INK,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  disabledReasonText: {
    fontSize: 12,
    color: Theme.colors.redAccent,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  hintText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  dangerButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: Theme.colors.redAccent,
    fontSize: 14,
  },
});
