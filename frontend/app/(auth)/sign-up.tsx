import { Text, StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native'
import React, { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '@/libs/firebase'
import { doc, setDoc, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { router, Stack } from 'expo-router';
import { AntDesign } from '@expo/vector-icons'
import { FirebaseError } from 'firebase/app';

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const checkUsername = async (name: string) => {
    if (!name || !/^[a-zA-Z0-9_]{3,20}$/.test(name)) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    const snap = await getDoc(doc(db, 'usernames', name.toLowerCase()));
    setUsernameAvailable(!snap.exists());
    setUsernameChecking(false);
  };

  const handleSignUp = async () => {
    if (!email || !password || !username || !confirmPassword) {
        Alert.alert('錯誤', '請填寫所有欄位');
        return;
    }
    if (password !== confirmPassword) {
      Alert.alert('錯誤', '密碼與確認密碼不符');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      Alert.alert('使用者名稱格式錯誤', '名稱須為 3–20 個字元，只能包含英文、數字與底線。');
      return;
    }
    if (usernameAvailable === false) {
      Alert.alert('註冊失敗', '此使用者名稱已被使用，請選擇其他名稱。');
      return;
    }

    setLoading(true)
    let cred;
    try {
      // 1) 建帳號
      cred = await createUserWithEmailAndPassword(auth, email, password);
      const user: FirebaseUser = cred.user;

      // 2) 原子性地佔用使用者名稱（防止同時註冊相同名稱的競爭條件）
      const usernameKey = username.toLowerCase();
      try {
        await runTransaction(db, async (transaction) => {
          const usernameRef = doc(db, 'usernames', usernameKey);
          const snap = await transaction.get(usernameRef);
          if (snap.exists()) throw new Error('USERNAME_TAKEN');
          transaction.set(usernameRef, { uid: user.uid });
        });
      } catch (e: any) {
        await user.delete();
        Alert.alert('註冊失敗', '此使用者名稱已被使用，請選擇其他名稱。');
        setLoading(false);
        return;
      }

      // 3) 在 Auth Profile 加上 displayName
      await updateProfile(user, { displayName: username });

      // 4) 組出你的完整 User Schema
      const userDoc = {
        uid: user.uid,
        phone: '',                // 如果有電話，可傳入
        email: user.email!,
        username: username,
        displayName: username,
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

      // console.log('User registered with UID:', user.uid);
      // 5) 註冊成功，跳到主畫面
      setLoading(false);

      // console.log('User registered with UID:', user.uid);
      // router.replace('/(onboarding)');

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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <AntDesign name="arrow-left" size={28} color="#F18C8E" />
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
                onChangeText={(text) => { setUsername(text); setUsernameAvailable(null); }}
                onBlur={() => checkUsername(username)}
                autoCapitalize="none"
                placeholderTextColor="#A9A9A9"
              />
            </View>
            {usernameChecking && (
              <Text style={styles.usernameHint}>檢查中…</Text>
            )}
            {!usernameChecking && usernameAvailable === true && (
              <Text style={[styles.usernameHint, { color: '#4CAF50' }]}>✓ 此名稱可以使用</Text>
            )}
            {!usernameChecking && usernameAvailable === false && (
              <Text style={[styles.usernameHint, { color: '#EF4444' }]}>✗ 此名稱已被使用</Text>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="密碼"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
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
                textContentType="newPassword"
                autoComplete="new-password"
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
      </TouchableWithoutFeedback>
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
        paddingVertical: 16,
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
    usernameHint: {
        fontSize: 12,
        color: '#A9A9A9',
        marginTop: -14,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
})