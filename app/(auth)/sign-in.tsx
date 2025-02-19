import { auth, db } from '@/libs/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from "@/context/AuthProvider";

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading } = useAuth()
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
          // console.log(loading)
          // console.log(user)
        });
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