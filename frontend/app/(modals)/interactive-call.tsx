// app/(modals)/interactive-call.tsx

import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import InteractiveCallScreen from '../features/fakePhoneCallPlayer/InteractiveCallScreen'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'
// export const options = {
//   headerShown: false,
//   presentation: 'fullScreenModal',
//   gestureEnabled: true,
// }

export default function InteractiveCallRoute() {
  const { contact } = useLocalSearchParams<{ contact: string }>()
  const key = contact?.toLowerCase() ?? ''

  return (
    <SafeAreaView style={styles.container}>

    </SafeAreaView>
  )
  
  // return <InteractiveCallScreen contactName={contact} />
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#000',
    },
})