// for chat app test
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });
    return unsub;
  }, []);

//   return unsub;
// };
    const login = async (email, password) => {
        try {
            // Logout logic here
        } catch (e) {
            // Handle error
        }
    };

    const logout = async () => {
        try {
        // Logout logic here
            await signOut(auth);
            return {success: true}
        } catch (e) {
        // Handle error
            return {success: false, msg: e.message, error: e};
        }
    };
  
    const register = async (email, password, username, profileUrl) => {
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log('response.user :', response.user);
            
            // Optionally set user and authentication state
            // setUser(response.user);
            // setIsAuthenticated(true);

            await setDoc(doc(db, "users", response.user?.uid), {
            username,
            profileUrl,
            userId: response.user?.uid
            });

            return { success: true, data: response.user };
        } catch (e) {
            let msg = e.message;
            if (msg.includes('auth/invalid-email')) {
            msg = 'Invalid email';
            }
            return { success: false, msg };
        }
    };
}