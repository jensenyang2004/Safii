// Dark pill button with the pink "record" dot ("建立並儲存"). Styles copied
// 1:1 from TrackingModeForm's primaryBtn. The one addition is `disabled`,
// which the original never needed: it dims to 0.4 like manage.tsx's
// disabled buttons.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { INK, PINK } from './tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function PrimaryPillButton({ label, onPress, disabled = false }: Props) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={styles.recordDot}><View style={styles.recordDotInner} /></View>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: INK, borderRadius: 999, height: 58,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  recordDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  recordDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: INK },
  primaryBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: 1, color: '#fff' },
});
