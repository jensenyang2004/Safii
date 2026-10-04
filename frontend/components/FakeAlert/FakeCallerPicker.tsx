// Picks who the fake call / messages appear to come from. These are the
// local FakeContacts from the manage tab — a different thing from tracking's
// emergency contacts (friends), so this deliberately shares nothing with
// ContactPickerModal.
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FakeContactAvatar from '@/components/FakeAlert/FakeContactAvatar';
import { INK, PINK } from '@/components/ui/tokens';
import { FakeContact } from '@/types/fakeAlert';

type Props = {
  contacts: FakeContact[];
  selectedId: string | null;
  onSelect: (contactId: string) => void;
};

export default function FakeCallerPicker({ contacts, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {contacts.map(contact => {
        const selected = contact.id === selectedId;
        return (
          <TouchableOpacity
            key={contact.id}
            style={styles.item}
            onPress={() => onSelect(contact.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={contact.name}
          >
            <View style={[styles.avatarRing, selected && styles.avatarRingSelected]}>
              <FakeContactAvatar contact={contact} size={48} />
            </View>
            <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
              {contact.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingVertical: 4, paddingRight: 4 },
  item: { width: 64, alignItems: 'center' },
  avatarRing: {
    padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent',
  },
  avatarRingSelected: { borderColor: INK, backgroundColor: PINK },
  name: { marginTop: 4, fontSize: 12, fontWeight: '600', color: INK, opacity: 0.6 },
  nameSelected: { opacity: 1, fontWeight: '800' },
});
