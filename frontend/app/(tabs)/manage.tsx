import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Theme from '@/constants/Theme';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';
import { useSetupTestFlow } from '@/hooks/useSetupTestFlow';
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
  FakeAlertVerificationError,
  FakeAlertCapacityError,
} from '@/services/fakeAlert/scheduler';
import {
  DEFAULT_AVATAR_KEYS,
  DEFAULT_CALL_DELAY_SECONDS,
  DEFAULT_FIRST_MESSAGE_DELAY_SECONDS,
  DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
} from '@/constants/fakeAlert';
import { FakeContact, MessageTemplate } from '@/types/fakeAlert';

// This is the "manage.tsx" screen from the plan — it lives at the (tabs)
// route path so it can register as a tab, but tabBarIcon/title (set in
// _layout.tsx) are deliberately generic ("工具" + a wrench) so nothing here
// gives away what this tab actually does at a glance.
export default function ManageFakeAlertScreen() {
  const [contacts, setContacts] = useState<FakeContact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [hasVerified, setHasVerified] = useState(false);
  const { status: setupStatus, runTest } = useSetupTestFlow();

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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const triggerCall = async (bypassVerification = false) => {
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
        Alert.alert('通知數量接近上限', `目前已有 ${err.pending} 則排程中的通知，接近 iOS 的 ${err.limit} 筆上限，請先清一些再排。`);
        return;
      }
      Alert.alert('排程失敗', String(err));
    }
  };

  const triggerMessages = async (bypassVerification = false) => {
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
        Alert.alert('通知數量接近上限', `目前已有 ${err.pending} 則排程中的通知，接近 iOS 的 ${err.limit} 筆上限，請先清一些再排。`);
        return;
      }
      Alert.alert('排程失敗', String(err));
    }
  };

  const cancelAll = () => {
    Alert.alert('取消所有排程', '會取消目前所有排程中的假來電/假訊息通知。', [
      { text: '取消', style: 'cancel' },
      { text: '確定', style: 'destructive', onPress: () => cancelAllFakeAlerts() },
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>設定檢查</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>{setupStatusLabel[setupStatus]}</Text>
        <Pressable style={styles.secondaryButton} onPress={runTest}>
          <Text style={styles.secondaryButtonText}>測試通知功能</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>假聯絡人</Text>
      <View style={styles.card}>
        {contacts.map(contact => (
          <View key={contact.id} style={styles.row}>
            <FakeContactAvatar contact={contact} size={40} />
            <Text style={styles.rowText}>{contact.name}</Text>
            <Pressable onPress={() => deleteContact(contact.id)} hitSlop={8}>
              <MaterialIcons name="close" size={20} color="#8e8e93" />
            </Pressable>
          </View>
        ))}

        <View style={styles.avatarPicker}>
          {DEFAULT_AVATAR_KEYS.map(key => (
            <Pressable
              key={key}
              onPress={() => {
                setNewContactAvatarKey(key);
                setNewContactAvatarUri(null);
              }}
            >
              <FakeContactAvatar
                contact={{ id: 'preview', name: newContactName || '?', avatarKey: key, avatarUri: null }}
                size={32}
              />
            </Pressable>
          ))}
          <Pressable style={styles.photoButton} onPress={pickPhoto}>
            <MaterialIcons name="add-a-photo" size={20} color="#666" />
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
          <Pressable style={styles.addButton} onPress={addContact}>
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>訊息範本</Text>
      <View style={styles.card}>
        {templates.map(template => (
          <View key={template.id} style={styles.row}>
            <Text style={[styles.rowText, styles.flexGrow]}>{template.text}</Text>
            <Pressable onPress={() => deleteTemplate(template.id)} hitSlop={8}>
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
          <Pressable style={styles.addButton} onPress={addTemplate}>
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>立即測試</Text>
      <View style={styles.card}>
        <Pressable style={styles.primaryButton} onPress={() => triggerCall(false)}>
          <Text style={styles.primaryButtonText}>排程假來電（{DEFAULT_CALL_DELAY_SECONDS} 秒後）</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => triggerMessages(false)}>
          <Text style={styles.primaryButtonText}>排程假訊息（{DEFAULT_FIRST_MESSAGE_DELAY_SECONDS} 秒後開始）</Text>
        </Pressable>
        <Text style={styles.hintText}>
          排程後手機會照時間響/收到通知——目前點通知還不會自動打開畫面（那段串接還沒做），要直接看畫面請用除錯路徑。
        </Text>
        <Pressable style={styles.dangerButton} onPress={cancelAll}>
          <Text style={styles.dangerButtonText}>取消所有排程</Text>
        </Pressable>
      </View>
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
    paddingBottom: 100,
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
  rowText: {
    fontSize: 15,
    color: '#000',
  },
  flexGrow: {
    flex: 1,
  },
  avatarPicker: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
    color: '#c0392b',
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
    backgroundColor: Theme.colors.brandPink,
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
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Theme.colors.brandPink,
    alignItems: 'center',
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
    color: '#c0392b',
    fontSize: 14,
  },
});
