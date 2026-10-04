// Segmented control ("手動開啟 | 自動排程"). Styles copied 1:1 from
// TrackingModeForm's typeToggle; takes any number of options.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Theme from '@/constants/Theme';
import { INK } from './tokens';

export type SegmentedOption<K extends string> = {
  key: K;
  label: string;
};

type Props<K extends string> = {
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
};

export default function SegmentedToggle<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.typeToggle} accessibilityRole="tablist">
      {options.map(option => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.typeOption, active && styles.typeOptionActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  typeToggle: {
    flexDirection: 'row', backgroundColor: Theme.colors.gray75,
    borderRadius: 12, padding: 3, marginBottom: 12,
  },
  typeOption: {
    flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10,
  },
  typeOptionActive: { backgroundColor: INK },
  typeOptionText: { fontSize: 14, fontWeight: '700', color: INK },
  typeOptionTextActive: { color: '#fff' },
});
