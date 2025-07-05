// app/(modals)/calling.tsx
import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Text,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

export const options = {
  headerShown:      false,
  presentation:     'fullScreenModal',
  animation:        'fade',
  gestureEnabled:   true,
  gestureDirection: 'vertical',
}

export default function CallingRoute() {
  const { contact } = useLocalSearchParams<{ contact: string }>()
  const router      = useRouter()
  const opacity     = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue:       0.4,
          duration:      800,
          useNativeDriver:true,
        }),
        Animated.timing(opacity, {
          toValue:       1,
          duration:      800,
          useNativeDriver:true,
        }),
      ])
    ).start()

    // random 2–5 sec delay, then replace with real call screen
    const delay = 500 + Math.random() * 300
    const id    = setTimeout(() => {
      router.replace({
        pathname: '/interactive-call',
        params:   { contact },
      })
    }, delay)

    return () => clearTimeout(id)
  }, [])

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.text, { opacity }]}>
        Calling {contact}...
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:             1,
    backgroundColor: '#000',
    justifyContent:  'center',
    alignItems:      'center',
  },
  text: {
    color:    '#fff',
    fontSize: 28,
    fontWeight:'600',
  },
})