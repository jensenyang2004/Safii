import { View, Text, TouchableOpacity , StyleSheet } from 'react-native'
import { Colors } from '../constants/Colors';
import React, { useCallback, useEffect } from 'react'
import { warmUpAsync, coolDownAsync, maybeCompleteAuthSession } from 'expo-web-browser'
import { useSSO } from '@clerk/clerk-expo' // Assuming useSSO is a named export


export const useWarmUpBrowser = () => {
  useEffect(() => {
    // Preloads the browser for Android devices to reduce authentication load time
    // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
    void warmUpAsync()
    return () => {
      // Cleanup: closes browser when component unmounts
      void coolDownAsync()
    }
  }, [])
}

maybeCompleteAuthSession()
export default function LoginScreen() {
    useWarmUpBrowser()

    // Use the `useSSO()` hook to access the `startSSOFlow()` method
  const { startSSOFlow } = useSSO()

  const onPress = useCallback(async () => {
    try {
      // Start the authentication process by calling `startSSOFlow()`
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
      })

      // If sign in was successful, set the active session
      if (createdSessionId) {
        setActive!({ session: createdSessionId })
      } else {
        // If there is no `createdSessionId`,
        // there are missing requirements, such as MFA
        // Use the `signIn` or `signUp` returned from `startSSOFlow`
        // to handle next steps
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }, [])
  return (
    <View>
        <View style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 100
        }}>

        {/* <Image source={require('../../assets/...')}
            style={{
            width: 220,
            height: 450,
            borderRadius: 20,
            borderWidth: 6,
            borderColor: '#000'
            }}
        /> */}

        </View> 

        <View style={styles.subContainer}>
            {/* <Text>Yout Ultimate</Text> */}
            <Text style={{ 
                color: Colors.PRIMARY,
                // alignContent: 'center',
                fontSize: 40
            }}>
              Safii
            </Text> 
            {/* <Text>App</Text> */}

            <TouchableOpacity style={styles.btn} 
            onPress={onPress}>
                <Text style={{
                    textAlign: 'center',
                    color: '#fff',
                    fontFamily: 'outfit'
                }} >Let's Get Started</Text>
            </TouchableOpacity>

        </View>

    </View>
    )
}

const styles = StyleSheet.create({
    subContainer: {
      backgroundColor: '#fff',
      padding: 20,
      marginTop: -20,
    },
    btn: {
      backgroundColor: Colors.PRIMARY,
      padding: 16,
      borderRadius: 99,
      marginTop: 20
    }
});
  
  