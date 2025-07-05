// app/components/SirenButton.tsx
import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSirenAlarm } from '../features/siren/hooks/useSirenAlarm'

export default function SirenButton() {
  const { isRinging, startSiren, stopSiren } = useSirenAlarm()

  return (
    <TouchableOpacity
      style={[styles.button, isRinging && styles.buttonActive]}
      onPress={() => (isRinging ? stopSiren() : startSiren())}
    >
      <MaterialIcons
        name="warning"
        size={28}
        color={isRinging ? 'yellow' : 'black'}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  buttonActive: {
    backgroundColor: '#FFEB3B',
  },
})