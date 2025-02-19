// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// import { getReactNativePersisience, initializeAuth } from "firebase/auth";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getFirestore, collection } from "firebase/firestore";
// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyCt4q2bLfRKWpav_IYnVeUlMbhnLWJJY8Q",
//   authDomain: "safii-90f1d.firebaseapp.com",
//   databaseURL: "https://safii-90f1d-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "safii-90f1d",
//   storageBucket: "safii-90f1d.firebasestorage.app",
//   messagingSenderId: "500399645906",
//   appId: "1:500399645906:web:f74fa7b73f7e4f1b7db90b",
//   measurementId: "G-DEC81ZMGL7"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// // const analytics = getAnalytics(app);

// export const auth = initializeAuth(app, {
//     persistence: getReactNativePersisience(AsyncStorage)
// });

// export const db = getFirestore(app);

// export const userRef = collection(db, 'users');
// export const roomRef = collection(db, 'users');