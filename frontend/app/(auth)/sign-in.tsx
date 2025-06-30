// src/screens/SignInScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Timestamp } from '@react-native-firebase/firestore';

import { db } from '@/libs/firebase';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider
} from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const auth = getAuth(getApp());
  const db = getFirestore(getApp());

  const submit = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // 寫入 token collection（可選）
      const idToken = await user.getIdToken();
      await setDoc(doc(db, 'tokens', user.uid), {
        uid: user.uid,
        idToken,
        createdAt: Timestamp.now(),
      });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error(err);
      Alert.alert('登入失敗', err.message || '請確認帳號密碼');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Create a Google provider instance
      const provider = new GoogleAuthProvider();
      
      // Add scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      // Sign in with redirect/popup (for web) or credential (for mobile)
      // Note: For React Native, you'll need to implement the OAuth flow manually
      // or use a web view to handle the Google OAuth flow
      
      Alert.alert('Info', 'Google Sign-in requires additional setup for React Native. Please implement OAuth flow using WebView or redirect to web authentication.');
      
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      Alert.alert('Error', 'Google sign in failed');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      Alert.alert('Info', 'Facebook Sign-in requires Facebook SDK setup and OAuth flow implementation.');
    } catch (error) {
      console.error('Facebook Sign In Error:', error);
      Alert.alert('Error', 'Failed to sign in with Facebook');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          animation: 'slide_from_left',
          presentation: 'card',
        }}
      />
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

        <TouchableOpacity style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.oauthContainer}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => router.push('/phone-auth')}
          >
            <AntDesign name="phone" size={24} color="#34C759" />
            <Text style={styles.oauthButtonText}>Sign in with Phone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.oauthButton} onPress={handleGoogleSignIn}>
            <AntDesign name="google" size={24} color="#DB4437" />
            <Text style={styles.oauthButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.oauthButton} onPress={handleFacebookSignIn}>
            <AntDesign name="facebook-square" size={24} color="#4267B2" />
            <Text style={styles.oauthButtonText}>Sign in with Facebook</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
          <Text style={styles.signUpText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  oauthContainer: { marginTop: 20, gap: 10 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 5,
  },
  oauthButtonText: { marginLeft: 10, fontSize: 16, color: '#333' },
  signUpText: { marginTop: 20, color: '#007AFF', textAlign: 'center' },
});

export default SignInScreen;