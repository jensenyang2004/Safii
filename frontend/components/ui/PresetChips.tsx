// Horizontal row of preset chips ("5 分", "10 分", …). Styles copied 1:1 from
// TrackingModeForm's interval presets. Items are generic so a caller can add
// a non-numeric chip (e.g. "自訂") with the same look.
import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { INK, PINK } from './tokens';

export type PresetChip = {
  key: string;
  label: string;
  /** Small suffix after the label, e.g. "分". */
  unit?: string;
};

type Props = {
  items: PresetChip[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export default function PresetChips({ items, selectedKey, onSelect }: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={item => item.key}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}
      renderItem={({ item }) => {
        const active = item.key === selectedKey;
        return (
          <TouchableOpacity
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.8}
            onPress={() => onSelect(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={styles.chipNum}>{item.label}</Text>
            {item.unit ? <Text style={styles.chipUnit}>{item.unit}</Text> : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  chipScroll: { paddingVertical: 10, gap: 8, paddingRight: 4 },
  chip: {
    width: 72, height: 52, borderRadius: 14, borderWidth: 1.6, borderColor: INK,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
  },
  chipActive: { backgroundColor: PINK },
  chipNum: { fontSize: 20, fontWeight: '800', color: INK },
  chipUnit: { fontSize: 11, fontWeight: '700', color: INK, opacity: 0.7, marginLeft: 3 },
});
