import { Text, StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/libs/firebase'
import { doc, setDoc } from 'firebase/firestore'

const SignUp = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('');

  const handleSignUp = async() => {
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
    }catch (err) {
      console.log(err)
    }finally {
      setLoading(false)
    }
  
  }


  return (
    <SafeAreaView style={styles.container}>
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
  googleButton: {
    backgroundColor: '#DB4437',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
})