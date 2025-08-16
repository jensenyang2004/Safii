// app/(auth)/sign-in.tsx

import { auth, db } from '@/libs/firebase';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { FirebaseError } from 'firebase/app';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
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
            Alert.alert('登入失敗', '帳號不存在');
            break;
          case 'auth/wrong-password':
            Alert.alert('登入失敗', '密碼錯誤');
            break;
          case 'auth/invalid-email':
            Alert.alert('登入失敗', '無效的電子郵件格式');
            break;
          default:
            Alert.alert('登入失敗', '帳號或密碼錯誤');
        }
      } else {
        // something unexpected
        Alert.alert('登入失敗', '發生未知錯誤');
        console.error(err);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
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
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Sign In" onPress={submit} />
      <Button title="Sign Up" onPress={() => { router.replace('/(auth)/sign-up') }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});

export default SignInScreen;
