import { Text, StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '@/libs/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { router, Stack } from 'expo-router';
import { AntDesign } from '@expo/vector-icons'
import { FirebaseError } from 'firebase/app';

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '密碼與確認密碼不符');
      return;
    }

    setLoading(true)
    try {
      // 1) 建帳號
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user: FirebaseUser = cred.user;

      // 2) 在 Auth Profile 加上 displayName
      await updateProfile(user, { displayName: username });

      // 3) 組出你的完整 User Schema
      const userDoc = {
        uid: user.uid,
        phone: '',                // 如果有電話，可傳入
        email: user.email!,
        nickname: username,
        avatarUrl: '',            // 可後續讓使用者上傳
        gender: 'other',
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        locationSharing: true,
        currentLocation: { latitude: 0, longitude: 0 },
        subscriptionStatus: 'free',
        emergencyLevel: 'basic',
        deviceTokens: [],
        blockList: [],
        reportCount: 0,
        isHelper: false,
        isVerified: false,
      };

      // 4) 寫入 Firestore
      await setDoc(doc(db, 'users', user.uid), userDoc);

      // 5) 註冊成功，跳到主畫面
      router.replace('/');

    } catch (err: unknown) {
      setLoading(false);

      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            Alert.alert('註冊失敗', '此電子郵件已經註冊。');
            break;
          case 'auth/invalid-email':
            Alert.alert('註冊失敗', '請輸入有效的電子郵件地。');
            break;
          case 'auth/weak-password':
            Alert.alert('註冊失敗', '密碼強度不足，請使用 6 個以上字元。');
            break;
          default:
            Alert.alert('註冊失敗', err.message);
        }
      } else {
        Alert.alert('註冊失敗', '發生未知錯誤，請稍後再試。');
        console.error(err);
      }
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
            placeholder="暱稱"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="密碼"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />


          <TextInput
            style={styles.input}
            placeholder="確認密碼"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>註冊</Text>
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
  buttonDisabled: { opacity: 0.6 },
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