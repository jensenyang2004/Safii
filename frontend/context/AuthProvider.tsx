// context/AuthProvider.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/libs/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Alert } from 'react-native';

interface User {
  uid?: string;
  username?: string;
  nickname?: string;
  email?: string;
  displayName: string | null; 
  avatarUrl?: string;
  // Add other fields from your user document
}

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchUserInfo: (uid: string | undefined) => Promise<void>;
}>({
  user: null,
  loading: true, // Initial loading state
  signOut: async () => { }, // Default no-op function
  fetchUserInfo: async () => { }, // Default no-op function
});

// 2. Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      console.log("STARTING SIGN OUT");
      setLoading(true);
      await auth.signOut();
      console.log("FIREBASE SIGN OUT COMPLETE");
      setUser(null); // Force update the user state to null
      console.log("USER STATE CLEARED");
      // router.replace('/(auth)/sign-in');/
      // router.replace('/(auth)');
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false); // Hide loading regardless of outcome
    }
  }

  const fetchUserInfo = async (uid: string | undefined) => {
    if (!uid) {
      setLoading(false);
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUser(docSnap.data());
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user info:", err); // More specific error message
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {  // Renamed for clarity
      fetchUserInfo(authUser?.uid);
    });

    return () => {
      unsubscribe(); // No need for the typeof check, unsubscribe will always be a function
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, fetchUserInfo }}>
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
