// context/AuthProvider.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/libs/firebase';
import { onAuthStateChanged, User as FirebaseUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

interface User {
  uid: string;
  username?: string;
  nickname?: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string;
  // Add other fields from your user document
}

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  fetchUserInfo: (authUser: FirebaseUser | null) => Promise<void>;
}>({
  user: null,
  loading: true,
  onboardingComplete: false,
  completeOnboarding: () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  fetchUserInfo: async () => {},
});

// 2. Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const completeOnboarding = () => {
    if (user) {
      const userOnboardingKey = `${ONBOARDING_COMPLETED_KEY}_${user.uid}`;
      SecureStore.setItemAsync(userOnboardingKey, 'true');
      setOnboardingComplete(true);
    }
  };

  const deleteAccount = async () => {
    const doDelete = async () => {
      const uid = user!.uid;
      if (user?.username) await deleteDoc(doc(db, 'usernames', user.username.toLowerCase()));
      const friendsSnap = await getDocs(collection(db, 'users', uid, 'friends'));
      await Promise.all(friendsSnap.docs.map(d => deleteDoc(d.ref)));
      const schedSnap = await getDocs(query(collection(db, 'scheduled_tracking'), where('userId', '==', uid)));
      await Promise.all(schedSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'users', uid));
      await auth.currentUser!.delete();
      await signOut();
    };

    try {
      await doDelete();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        Alert.prompt(
          '請確認您的身份',
          '為了安全，請輸入您的密碼以確認刪除帳號。',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '確認',
              onPress: async (password) => {
                if (!password) return;
                try {
                  const credential = EmailAuthProvider.credential(user!.email!, password);
                  await reauthenticateWithCredential(auth.currentUser!, credential);
                  await doDelete();
                } catch {
                  Alert.alert('刪除失敗', '密碼錯誤，請稍後再試。');
                }
              },
            },
          ],
          'secure-text'
        );
      } else {
        Alert.alert('刪除失敗', '請稍後再試。');
      }
    }
  };

  const signOut = async () => {
    try {
      console.log('STARTING SIGN OUT');
      setLoading(true);
      
      await auth.signOut();
      console.log('FIREBASE SIGN OUT COMPLETE');
      setUser(null); // Force update the user state to null
      setOnboardingComplete(false);
      console.log('USER STATE CLEARED');
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('錯誤', '登出失敗，請稍後再試。');
    } finally {
      setLoading(false); // Hide loading regardless of outcome
    }
  };

  const fetchUserInfo = async (authUser: FirebaseUser | null) => {
    if (!authUser) {
      setLoading(false);
      setUser(null);
      setOnboardingComplete(false);
      return;
    }
    // setLoading(true);
    try {
      const userOnboardingKey = `${ONBOARDING_COMPLETED_KEY}_${authUser.uid}`;
      const status = await SecureStore.getItemAsync(userOnboardingKey);
      setOnboardingComplete(status === 'true');

      const docRef = doc(db, 'users', authUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        // Merge auth data and firestore data
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          ...firestoreData,
        } as User);
      } else {
        // User is authenticated, but no document in Firestore.
        // Create user object from auth data only.
        console.warn(`No user document found for uid: ${authUser.uid}. Using auth data as fallback.`);
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
        });
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      // On error, create a minimal user object to avoid breaking the session
      setUser({
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      fetchUserInfo(authUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, deleteAccount, fetchUserInfo, onboardingComplete, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
