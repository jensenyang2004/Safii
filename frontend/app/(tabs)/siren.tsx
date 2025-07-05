import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import VolumeSlider from '../components/VolumeSlider'
import { useSirenAlarm } from '../features/siren/hooks/useSirenAlarm'

export default function SirenScreen() {
  const { isRinging, startSiren, stopSiren, volume, setVolume } = useSirenAlarm()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Emergency Siren</Text>

      <TouchableOpacity
        style={[
          styles.button,
          isRinging ? styles.buttonActive : styles.buttonIdle
        ]}
        onPress={isRinging ? stopSiren : startSiren}
      >
        <MaterialIcons
          name="warning"
          size={48}
          color={isRinging ? 'white' : '#D32F2F'}
        />
        <Text style={[
          styles.buttonText,
          isRinging ? styles.textActive : styles.textIdle
        ]}>
          {isRinging ? 'Stop Alarm' : 'Trigger Alarm'}
        </Text>
      </TouchableOpacity>

      <VolumeSlider value={volume} onValueChange={setVolume} />

      <TouchableOpacity
        style={styles.maxButton}
        onPress={() => setVolume(1)}
      >
        <Text style={styles.maxButtonText}>🔊 Max Volume</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20
  },
  title: {
    color: '#fff', fontSize: 24, marginBottom: 40
  },
  button: {
    width: 200, height: 200,
    borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 40,
  },
  buttonIdle: {
    backgroundColor: '#fff'
  },
  buttonActive: {
    backgroundColor: '#D32F2F'
  },
  buttonText: {
    marginTop: 12, fontSize: 18, fontWeight: '600'
  },
  textIdle: {
    color: '#D32F2F'
  },
  textActive: {
    color: '#fff'
  },

  maxButton: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  maxButtonText: {
    color: '#fff',
    fontSize: 16,
  },
})