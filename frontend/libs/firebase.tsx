// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyCt4q2bLfRKWpav_IYnVeUlMbhnLWJJY8Q",
  authDomain: "safii-90f1d.firebaseapp.com",
  projectId: "safii-90f1d",
  // storageBucket: "safii-90f1d.firebasestorage.app",
  storageBucket: "safii-90f1d.appspot.com",
  messagingSenderId: "500399645906",
  appId: "1:500399645906:web:f74fa7b73f7e4f1b7db90b",
  measurementId: "G-DEC81ZMGL7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const storage = getStorage(app, 'gs://safii-90f1d.appspot.com');
export const db = getFirestore(app)
// export const storage = getStorage(app)

