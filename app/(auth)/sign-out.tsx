import { auth, db } from '@/libs/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { signOut } from "firebase/auth";
import { Stack, useRouter, useSegments } from "expo-router";

const SignOutScreen = () => {
  const router = useRouter();

  const submit = async () => {
    try {
      console.log("signing out")
      await signOut(auth)
      .then(() => {
        // Sign-out successful.
        console.log("sign out successfully")
        
      }).catch((error) => {
        // An error happened.
      });
      
    }catch(err) {
        console.log(err)
    }finally {

    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Out</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        
        secureTextEntry
      />
      <Button title="Sign Out" onPress={submit} />
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

export default SignOutScreen;