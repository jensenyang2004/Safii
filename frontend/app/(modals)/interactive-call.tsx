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
const avatarMap: Record<string, any> = {
  alice: require('../../assets/avatar-photo/alice.jpg'),
  bob:   require('../../assets/avatar-photo/bob.jpg'),
  mike:   require('../../assets/avatar-photo/mike.jpg'),
}

export default function InteractiveCallRoute() {
  const { contact } = useLocalSearchParams<{ contact: string }>()
  const key = contact?.toLowerCase() ?? ''
  const photo = avatarMap[key] ?? require('../../assets/avatar-photo/Wowzowski.jpg')

  return (
    <SafeAreaView style={styles.container}>
      <InteractiveCallScreen
        contactName={contact ?? 'Unknown'}
        contactPhoto={photo}
      />
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