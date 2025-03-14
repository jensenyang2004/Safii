import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/libs/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// 1. Create the context
const AuthContext = createContext<{
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchUserInfo: (uid: string) => Promise<void>;
}>({
  user: null,
  loading: true, // Initial loading state
  signOut: async () => {}, // Default no-op function
  fetchUserInfo: async () => {}, // Default no-op function
});

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await auth.signOut();
      console.log('Signed out successfully!');
      console.log(user);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const fetchUserInfo = async (uid) => {
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
