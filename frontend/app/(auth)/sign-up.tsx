import { Text, StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
<<<<<<< HEAD
import { auth, db } from '@/apis/firebase'
=======
import { auth, db } from '@/libs/firebase'
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
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
    if (!email || !password || !username || !confirmPassword) {
        Alert.alert('錯誤', '請填寫所有欄位');
        return;
    }
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
        username: username,
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
      router.replace('/(onboarding)');

    } catch (err: unknown) {
      setLoading(false);

      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            Alert.alert('註冊失敗', '此電子郵件已經註冊。');
            break;
          case 'auth/invalid-email':
            Alert.alert('註冊失敗', '請輸入有效的電子郵件地址。');
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
      <Stack.Screen
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
          headerShown: false,
        }}
      />

      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(auth)/sign-in');
            }
          }}
        >
          <AntDesign name="arrowleft" size={28} color="#F18C8E" />
        </TouchableOpacity>
        <View style={styles.formContainer}>
          <Text style={styles.title}>建立帳號</Text>

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
              placeholder="使用者名稱"
              value={username}
              onChangeText={setUsername}
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
              placeholderTextColor="#A9A9A9"
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="確認密碼"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#A9A9A9"
            />
          </View>

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
        </View>
      </SafeAreaView>
    </>
  )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF6F0',
    },
    formContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 24,
        zIndex: 1,
        padding: 10,
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
    buttonDisabled: { 
        opacity: 0.6 
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
})