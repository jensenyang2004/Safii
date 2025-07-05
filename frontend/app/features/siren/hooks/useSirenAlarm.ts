import { useState, useRef, useEffect } from 'react'
import { Audio } from 'expo-av'

export function useSirenAlarm() {
  const [isRinging, setIsRinging] = useState(false)
  const [volume, setVolume]       = useState(1)
  const soundRef = useRef<Audio.Sound | null>(null)

  // load once
  useEffect(() => {
    ;(async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/siren.mp3'),
        { isLooping: true, volume }
      )
      soundRef.current = sound
    })()
    return () => { soundRef.current?.unloadAsync() }
  }, [])

  // update volume dynamically
  useEffect(() => {
    soundRef.current?.setVolumeAsync(volume)
  }, [volume])

  async function startSiren() {
    if (soundRef.current && !isRinging) {
      await soundRef.current.playAsync()
      setIsRinging(true)
    }
  }

  async function stopSiren() {
    if (soundRef.current && isRinging) {
      await soundRef.current.stopAsync()
      setIsRinging(false)
    }
  }

  return { isRinging, startSiren, stopSiren, volume, setVolume }
}