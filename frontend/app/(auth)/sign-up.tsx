import { Text, StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/libs/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { router } from 'expo-router'
import { AntDesign } from '@expo/vector-icons'
import { Stack } from 'expo-router';

const SignUp = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    setLoading(true)
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, "users", res.user.uid), {
        username: username,
        email: email,
        id: res.user.uid,
      });
    } catch (err) {
      console.log(err)
      Alert.alert('Error', err.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* <Stack.Screen
        options={{
          animation: 'slide_from_left',
          presentation: 'modal',
        }}
      /> */}
      <Stack.Screen
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />

      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            router.replace({
              pathname: '/(auth)/sign-in',
            });
          }}
        // onPress={() => router.replace('/(auth)/sign-in')}
        >
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading} // Disable the button while loading
          >
            {loading ? (
              <ActivityIndicator color="white" /> // Show loading indicator
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => console.log('Sign up with Google')} // Replace with Google sign-up logic
            disabled={loading} // Disable the button while loading
          >
            {loading ? (
              <ActivityIndicator color="white" /> // Show loading indicator
            ) : (
              <Text style={styles.buttonText}>Sign Up with Google</Text>
            )}
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </>

  )
}

export default SignUp

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  googleButton: {
    backgroundColor: '#DB4437',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
})