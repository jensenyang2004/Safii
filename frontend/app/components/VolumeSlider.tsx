import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import Slider from '@react-native-community/slider'

interface VolumeSliderProps {
  value: number
  onValueChange: (v: number) => void
}

export default function VolumeSlider({ value, onValueChange }: VolumeSliderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Alarm Volume</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor="#D32F2F"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#D32F2F"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '90%', alignSelf: 'center', marginVertical: 16 },
  label: { color: '#fff', marginBottom: 4, textAlign: 'center' },
  slider: { height: 40 },
})