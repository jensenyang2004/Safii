// Big pink card with an editable number ("每隔 15 分鐘") and optional small
// lines in the top-right corner. Styles copied 1:1 from TrackingModeForm's
// interval hero. Input is digits-only, same as the original.
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { INK, PINK } from './tokens';

type Props = {
  value: string;
  onChangeText: (digits: string) => void;
  /** Small label before the number, e.g. "每隔". */
  prefix?: string;
  /** Unit after the number, e.g. "分鐘". */
  unit: string;
  /** Lines shown top-right, e.g. ["約 4", "次／小時"]. */
  cornerLines?: string[];
  maxLength?: number;
  inputRef?: React.Ref<TextInput>;
};

export default function HeroNumberCard({
  value,
  onChangeText,
  prefix,
  unit,
  cornerLines,
  maxLength = 3,
  inputRef,
}: Props) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroRow}>
        {prefix ? <Text style={styles.heroEvery}>{prefix}</Text> : null}
        <TextInput
          ref={inputRef}
          allowFontScaling={false}
          style={styles.heroNum}
          value={value}
          onChangeText={v => onChangeText(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={maxLength}
          selectTextOnFocus
          placeholderTextColor={`${INK}60`}
          placeholder="–"
        />
        <Text style={styles.heroUnit}>{unit}</Text>
      </View>
      {cornerLines && cornerLines.length > 0 ? (
        <View style={styles.heroRatio}>
          {cornerLines.map((line, i) => (
            <Text key={i} style={styles.heroRatioText}>{line}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: PINK, borderRadius: 24, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, marginTop: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroEvery: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: INK, opacity: 0.75, marginBottom: 8, marginRight: 8 },
  heroNum: { fontSize: 56, lineHeight: 56, fontWeight: '800', letterSpacing: -2, color: INK, padding: 0, minWidth: 64 },
  heroUnit: { fontSize: 16, fontWeight: '700', color: INK, marginBottom: 8, marginLeft: 6 },
  heroRatio: { position: 'absolute', top: 16, right: 18, alignItems: 'flex-end' },
  heroRatioText: { fontSize: 11, fontWeight: '700', color: INK, opacity: 0.7, lineHeight: 15 },
});
