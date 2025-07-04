import { auth, db } from '@/libs/firebase';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    try {
      console.log("signing in")
        await signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          user.getIdToken().then(async (idToken) => {
            await setDoc(doc(db, "tokens", user.uid), {
              uid: user.uid,
              idToken: idToken,
              createdAt: Timestamp.now(),
            });
          });
        });
        router.replace('/(tabs)/home');
        console.log("sign in successfully")
    }catch(err) {
        console.log(err)
    }finally {

    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Sign In" onPress={submit} />
      <Button title="Sign Up" onPress={() => {router.replace('/(auth)/sign-up')}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});

export default SignInScreen;

// // src/screens/SignInScreen.tsx
// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, PermissionsAndroid } from 'react-native';
// import { AntDesign } from '@expo/vector-icons';
// import { router, Stack } from 'expo-router';
// import { Timestamp } from '@react-native-firebase/firestore';

// import { db } from '@/libs/firebase';
// import {
//   getAuth,
//   signInWithEmailAndPassword,
//   onAuthStateChanged,
//   signInWithCredential,
//   GoogleAuthProvider
// } from '@react-native-firebase/auth';

// // import auth from '@react-native-firebase/auth';

// // import  GoogleAuthProvider from '@react-native-firebase/auth';

// // import {
// //   signInWithEmailAndPassword,
// //   GoogleAuthProvider,
// //   signInWithCredential,
// // } from 'firebase/auth';
// import { getFirestore, doc, setDoc } from '@react-native-firebase/firestore';
// import {
//   GoogleSignin,
//   statusCodes,
//   isErrorWithCode,
// } from '@react-native-google-signin/google-signin';
// import { getApp } from '@react-native-firebase/app';

// const SignInScreen = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [phoneNumber, setPhoneNumber] = useState('');
//   const [verificationCode, setVerificationCode] = useState('');
//   const [verificationId, setVerificationId] = useState('');
//   const [showVerificationInput, setShowVerificationInput] = useState(false);

//   const auth = getAuth(getApp());
//   const db = getFirestore(getApp());

//   // 1️⃣ 初始化 GoogleSignin
//   useEffect(() => {
//     GoogleSignin.configure({
//       webClientId: '500399645906-7tgv3282ovan18d80l6ep56fpr0a136d.apps.googleusercontent.com',
//       offlineAccess: true,
//     });
//     // GoogleSignin.configure({
//     //   webClientId: '500399645906-7tgv3282ovan18d80l6ep56fpr0a136d.apps.googleusercontent.com',
//     //   iosClientId: '92946340200-iop971tjmqg230luanhfs83hkul5dude.apps.googleusercontent.com',
//     // });
//   }, []);

//   const submit = async () => {
//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;
//       // 寫入 token collection（可選）
//       const idToken = await user.getIdToken();
//       await setDoc(doc(db, 'tokens', user.uid), {
//         uid: user.uid,
//         idToken,
//         createdAt: Timestamp.now(),
//       });
//       router.replace('/(tabs)/home');
//     } catch (err: any) {
//       console.error(err);
//       Alert.alert('登入失敗', err.message || '請確認帳號密碼');
//     }
//   };

//   // const handlePhoneAuth = async () => {
//   //   try {
//   //     // Format phone number to E.164 standard
//   //     const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

//   //     // Request OTP
//   //     const confirmation = await auth().signInWithPhoneNumber(formattedNumber);
//   //     setVerificationId(confirmation.verificationId);
//   //     setShowVerificationInput(true);
//   //     Alert.alert('Verification code sent to your phone');
//   //   } catch (error) {
//   //     console.error('Phone Auth Error:', error);
//   //     Alert.alert('Error', 'Failed to send verification code');
//   //   }
//   // };

//   // Verify OTP Code
//   // const handleVerifyCode = async () => {
//   //   try {
//   //     const credential = auth.PhoneAuthProvider.credential(
//   //       verificationId,
//   //       verificationCode
//   //     );

//   //     const userCredential = await signInWithCredential(getAuth(), credential);

//   //     // Store user data
//   //     await setDoc(doc(db, 'users', userCredential.user.uid), {
//   //       phoneNumber: userCredential.user.phoneNumber,
//   //       provider: 'phone',
//   //       lastLogin: Timestamp.now(),
//   //     }, { merge: true });

//   //     router.replace('/(tabs)/home');
//   //   } catch (error) {
//   //     console.error('Verification Error:', error);
//   //     Alert.alert('Error', 'Invalid verification code');
//   //   }
//   // };

//   const handleGoogleSignIn = async () => {
//     try {
//       // Check Play Services for Android
//       if (Platform.OS === 'android') {
//         await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//       }

//       const signInResult = await GoogleSignin.signIn();
//       // Try the new style of google-sign in result, from v13+ of that module
//       const idToken = signInResult.data?.idToken;

//       if (!idToken) {
//         // if you are using older versions of google-signin, try old style result
//         idToken = signInResult.idToken;
//       }
//       if (!idToken) {
//         throw new Error('No ID token found');
//       }

//       console.log("ID Token1: ", idToken);
//       const googleCredential = GoogleAuthProvider.credential(idToken);
//       // const googleCredential = auth.GoogleAuthProvider.credential(idToken);
//       console.log("ID Token2: ", idToken);
//       console.log("Google Credential: ", googleCredential);
//       // const userCredential = 
//       // await auth().signInWithCredential(credential);
//       await signInWithCredential(getAuth(), googleCredential);


//       // const { idToken, accessToken } = await GoogleSignin.signIn();
//       // if (!idToken) throw new Error('No ID token found');

//       // const credential = GoogleAuthProvider.credential(idToken, accessToken);
//       // const userCredential = await signInWithCredential(auth, credential);

//       // Save user data
//       // await setDoc(doc(db, 'users', userCredential.user.uid), {
//       //   email: userCredential.user.email,
//       //   name: userCredential.user.displayName,
//       //   photoURL: userCredential.user.photoURL,
//       //   provider: 'google',
//       //   lastLogin: new Date().toISOString(),
//       // }, { merge: true });

//       router.replace('/(tabs)/home');
//     } catch (error: any) {
//       console.error('Google Sign In Error:', error);
//       if (isErrorWithCode(error)) {
//         switch (error.code) {
//           case statusCodes.SIGN_IN_CANCELLED:
//             return;
//           case statusCodes.IN_PROGRESS:
//             return;
//           case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
//             Alert.alert('Error', 'Google Play services not available');
//             return;
//         }
//       }
//       Alert.alert('Error', 'Google sign in failed');
//     }
//   };
//   // const handleGoogleSignIn = async () => {
//   //   try {
//   //     // Android 要先檢查 Play Services
//   //     if (Platform.OS === 'android') {
//   //       await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//   //     }
//   //     // 取得 idToken
//   //     const signInResult = await GoogleSignin.signIn();
//   //     let idToken = signInResult.data?.idToken;
//   //     if (!idToken) throw new Error('No ID token found');

//   //     // 用 idToken 換 credential
//   //     const googleCredential = auth.GoogleAuthProvider.credential(idToken);

//   //     console.log("ID Token2: ", idToken);
//   //     console.log("Google Credential: ", googleCredential);
//   //     // Sign-in the user with the credential

//   //     // return signInWithCredential(getAuth(), googleCredential);
//   //     await signInWithCredential(getAuth(), googleCredential);
//   //     router.replace('/(tabs)/home');
//   //     // const credential = GoogleAuthProvider.credential(idToken);
//   //     // await signInWithCredential(auth, credential);
//   //     // router.replace('/(tabs)/home');
//   //   } catch (error: any) {
//   //     console.error(error);
//   //     if (isErrorWithCode(error)) {
//   //       switch (error.code) {
//   //         case statusCodes.SIGN_IN_CANCELLED:
//   //           return; // 使用者取消
//   //         case statusCodes.IN_PROGRESS:
//   //           return; // 正在處理中
//   //         case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
//   //           Alert.alert('錯誤', 'Google Play 服務不可用');
//   //           return;
//   //       }
//   //     }
//   //     Alert.alert('錯誤', 'Google 登入失敗');
//   //   }
//   // };

//   const handleFacebookSignIn = async () => {
//     try {
//       // Request login permissions
//       const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

//       if (result.isCancelled) {
//         throw new Error('User cancelled login');
//       }

//       // Get access token
//       const data = await AccessToken.getCurrentAccessToken();

//       if (!data) {
//         throw new Error('Failed to get access token');
//       }

//       // Create Firebase credential
//       const facebookCredential = auth.FacebookAuthProvider.credential(
//         data.accessToken
//       );

//       // Sign in with Firebase
//       const userCredential = await signInWithCredential(
//         getAuth(),
//         facebookCredential
//       );

//       // Store user data
//       await setDoc(doc(db, 'users', userCredential.user.uid), {
//         email: userCredential.user.email,
//         name: userCredential.user.displayName,
//         photoURL: userCredential.user.photoURL,
//         provider: 'facebook',
//         lastLogin: Timestamp.now(),
//       }, { merge: true });

//       router.replace('/(tabs)/home');
//     } catch (error) {
//       console.error('Facebook Sign In Error:', error);
//       Alert.alert('Error', 'Failed to sign in with Facebook');
//     }
//   };

//   return (
//     <>
//       <Stack.Screen
//         options={{
//           animation: 'slide_from_left',
//           presentation: 'card',
//         }}
//       />
//       <View style={styles.container}>
//         <Text style={styles.title}>Sign In</Text>

//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           value={email}
//           onChangeText={setEmail}
//           keyboardType="email-address"
//           autoCapitalize="none"
//         />
//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           value={password}
//           onChangeText={setPassword}
//           secureTextEntry
//         />

//         <TouchableOpacity style={styles.button} onPress={submit}>
//           <Text style={styles.buttonText}>Sign In</Text>
//         </TouchableOpacity>

//         <View style={styles.oauthContainer}>
//           <TouchableOpacity
//             style={styles.oauthButton}
//             onPress={() => router.push('/phone-auth')}
//           >
//             <AntDesign name="phone" size={24} color="#34C759" />
//             <Text style={styles.oauthButtonText}>Sign in with Phone</Text>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.oauthButton} onPress={handleGoogleSignIn}>
//             <AntDesign name="google" size={24} color="#DB4437" />
//             <Text style={styles.oauthButtonText}>Sign in with Google</Text>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.oauthButton} onPress={handleFacebookSignIn}>
//             <AntDesign name="facebook-square" size={24} color="#4267B2" />
//             <Text style={styles.oauthButtonText}>Sign in with Facebook</Text>
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           // onPress={() => {
//           //   router.replace({
//           //     pathname: '/(auth)/sign-up',
//           //     params: {
//           //       // animation: 'slide_from_right'
//           //       animation: 'slide_from_left'
//           //     }
//           //   });
//           // }}
//           onPress={() => router.replace('/(auth)/sign-up')}
//         >
//           <Text style={styles.signUpText}>Don't have an account? Sign Up</Text>
//         </TouchableOpacity>
//       </View>
//     </>

//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 16,
//     backgroundColor: '#fff',
//   },
//   title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
//   input: {
//     height: 40,
//     borderColor: '#ccc',
//     borderWidth: 1,
//     marginBottom: 12,
//     paddingHorizontal: 10,
//     borderRadius: 5,
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
//   oauthContainer: { marginTop: 20, gap: 10 },
//   oauthButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f5f5f5',
//     borderRadius: 8,
//     marginVertical: 5,
//   },
//   oauthButtonText: { marginLeft: 10, fontSize: 16, color: '#333' },
//   signUpText: { marginTop: 20, color: '#007AFF', textAlign: 'center' },
// });

// export default SignInScreen;