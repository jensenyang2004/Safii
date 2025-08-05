import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyCt4q2bLfRKWpav_IYnVeUlMbhnLWJJY8Q",
  authDomain: "safii-90f1d.firebaseapp.com",
  databaseURL: "https://safii-90f1d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "safii-90f1d",
  storageBucket: "safii-90f1d.firebasestorage.app",
  messagingSenderId: "500399645906",
  appId: "1:500399645906:web:f74fa7b73f7e4f1b7db90b",
  measurementId: "G-DEC81ZMGL7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
