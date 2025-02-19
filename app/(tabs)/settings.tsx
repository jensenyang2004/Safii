import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
// import { auth } from '../firebaseConfig'; // Import Firebase auth
import { auth, db } from '@/libs/firebase';

const SignOutButton = () => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      Alert.alert("Signed out successfully!");
    } catch (error) {
      console.error("Error signing out: ", error);
      // Alert.alert("Error signing out: ", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={handleSignOut} 
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'gray' : '#1e90ff', 
            padding: 10, 
            borderRadius: 5

          }
        ]}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Sign Out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Take up the entire screen (or parent container)
    justifyContent: 'center', // Vertically center the content
    alignItems: 'center', // Horizontally center the content
    padding: 20
  }
});

export default SignOutButton;
