// app/(auth)/sign-in.tsx

import { auth, db } from '@/libs/firebase';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { FirebaseError } from 'firebase/app';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('登入失敗', '請輸入電子郵件與密碼');
      return;
    }
    try {
      // Try to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store their token
      const idToken = await user.getIdToken();
      await setDoc(doc(db, 'tokens', user.uid), {
        uid: user.uid,
        idToken,
        createdAt: Timestamp.now(),
      });

      // On success, go to home
      router.replace('/(tabs)/home');

    } catch (err) {
      // FirebaseError has a `code` property
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-email':
            Alert.alert('登入失敗', '帳號或密碼錯誤');
            break;
          default:
            Alert.alert('登入失敗', '發生未知錯誤');
        }
      } else {
        // something unexpected
        Alert.alert('登入失敗', '發生未知錯誤');
        console.error(err);
      }
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>登入</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="電子郵件"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#A9A9A9"
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="密碼"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onSubmitEditing={submit}
            placeholderTextColor="#A9A9A9"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>登入</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => { router.push('/(auth)/sign-up') }}>
          <Text style={styles.secondaryButtonText}>還沒有帳號？註冊</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF6F0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#333',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  input: {
    height: 55,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#F18C8E',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#F18C8E',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  secondaryButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F18C8E',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignInScreen;