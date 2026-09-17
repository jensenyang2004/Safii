import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFakeMessage } from '@/hooks/useFakeMessage';
import { ScheduledFakeMessage } from '@/types/fakeAlert';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';

// Deliberately no Safii branding — reads as a normal Messages thread. No
// text input at the bottom: this is a one-way burst of incoming messages,
// not a real conversation, and a text field that goes nowhere when tapped
// would be more suspicious than just not having one.
export default function FakeMessageScreen() {
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const insets = useSafeAreaInsets();
  const { contact, messages, totalCount, isComplete, cancelRemaining } = useFakeMessage({
    scheduleId: scheduleId ?? '',
  });
  const listRef = useRef<FlatList<ScheduledFakeMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const displayName = contact?.name || '未知號碼';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={32} color="#007AFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <FakeContactAvatar contact={contact} size={36} />
          <Text style={styles.headerName}>{displayName}</Text>
        </View>
        {!isComplete ? (
          <Pressable onPress={cancelRemaining} hitSlop={12}>
            <Text style={styles.stopLabel}>停止</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.bubbleRow}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {!isComplete && totalCount > 0 && (
        <Text style={[styles.typingHint, { paddingBottom: insets.bottom + 12 }]}>
          {messages.length}/{totalCount}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  headerName: {
    fontSize: 12,
    color: '#000',
  },
  stopLabel: {
    fontSize: 15,
    color: '#ff3b30',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    backgroundColor: '#e5e5ea',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleText: {
    fontSize: 16,
    color: '#000',
  },
  typingHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#a1a1a6',
  },
});
