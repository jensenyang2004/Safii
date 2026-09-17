import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getFakeContacts, saveFakeContacts, getMessageTemplates } from '@/services/fakeAlert/storage';
import { scheduleFakeMessages } from '@/services/fakeAlert/scheduler';
import { FakeContact } from '@/types/fakeAlert';
import {
  DEFAULT_FIRST_MESSAGE_DELAY_SECONDS,
  DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
} from '@/constants/fakeAlert';

// DEV-ONLY manual test entry point. Seeds one FakeContact into AsyncStorage
// so stage 2's call.tsx has something to render, then jumps straight there —
// stands in for stage 4's manage screen, which doesn't exist yet.
//
// Reach this on a real device without a debugger attached: open Safari on
// the device and go to `safii://fake-alert/debug-seed` (the dev client build
// must already be installed and the app scheme is "safii", per app.config.js).
// Delete this file once stage 4 ships a real way to create fake contacts.

const DEBUG_CONTACT_ID = 'debug-contact-1';

export default function FakeAlertDebugSeedScreen() {
  const [status, setStatus] = useState('seeding...');
  const [contact, setContact] = useState<FakeContact | null>(null);

  useEffect(() => {
    (async () => {
      const contacts = await getFakeContacts();
      let existing = contacts.find(c => c.id === DEBUG_CONTACT_ID) ?? null;
      if (!existing) {
        existing = {
          id: DEBUG_CONTACT_ID,
          name: '媽',
          avatarKey: null,
          avatarUri: null,
        };
        await saveFakeContacts([...contacts, existing]);
      }
      setContact(existing);
      setStatus('ready');
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fake Alert Debug Seed</Text>
      <Text style={styles.status}>status: {status}</Text>
      {contact && (
        <Text style={styles.status}>contact: {contact.name} ({contact.id})</Text>
      )}
      <Pressable
        style={styles.button}
        disabled={!contact}
        onPress={() =>
          router.push({
            pathname: '/(modals)/fake-alert/call',
            params: { contactId: DEBUG_CONTACT_ID },
          })
        }
      >
        <Text style={styles.buttonText}>打開假來電畫面</Text>
      </Pressable>

      {/* This one actually goes through scheduler.ts, unlike the call button
          above — messages arrive on their real fireAt timing, so opening
          right after tapping this exercises the same delay path a real
          notification-triggered open would. */}
      <Pressable
        style={styles.button}
        disabled={!contact}
        onPress={async () => {
          if (!contact) return;
          const templates = await getMessageTemplates();
          const schedule = await scheduleFakeMessages(
            {
              contactId: contact.id,
              templateIds: templates.slice(0, 3).map(t => t.id),
              firstDelaySeconds: DEFAULT_FIRST_MESSAGE_DELAY_SECONDS,
              gapSecondsRange: DEFAULT_MESSAGE_GAP_SECONDS_RANGE,
            },
            contact,
            templates,
            { bypassVerification: true }
          );
          router.push({
            pathname: '/(modals)/fake-alert/message',
            params: { scheduleId: schedule.id },
          });
        }}
      >
        <Text style={styles.buttonText}>排程假訊息（含延遲測試）</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
