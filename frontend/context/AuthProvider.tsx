// context/AuthProvider.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
<<<<<<< HEAD
import { auth, db } from '@/apis/firebase';
=======
import { auth, db } from '@/libs/firebase';
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Alert } from 'react-native';

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
  signOut: () => Promise<void>;
  fetchUserInfo: (authUser: FirebaseUser | null) => Promise<void>;
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
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false); // Hide loading regardless of outcome
    }
  }

  const fetchUserInfo = async (authUser: FirebaseUser | null) => {
    if (!authUser) {
      setLoading(false);
      setUser(null);
      return;
    }
    setLoading(true);
    try {
      const docRef = doc(db, "users", authUser.uid);
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
      console.error("Error fetching user info:", err);
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
