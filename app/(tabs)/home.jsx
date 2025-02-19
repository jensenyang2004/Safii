import React from 'react'
// import Header from '../../components/Home/Header'
import Slider from '../../components/Home/Slider'
// import HomeHeader from '../../components/HomeHeader'

import { View, Text, StyleSheet, Platform } from 'react-native';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { router, useNavigation, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';

export default function HomeScreen() {
  // const { user, loading } = useAuth()
  const rootNavigationState = useRootNavigationState();
  
  const [user, setUser] = useState(null); // No type annotations
  const [loading, setLoading] = useState(true); // Add loading state
  
  const onAuthStateChangedHandler = (user) => {
    // Logging the current user object
    console.log('onAuthStateChanged, user existing:', !!user);
    setUser(user);
    // Once we have the user (or null), stop the initializing state
    if (!user) router.replace('/(auth)/sign-in');
    
  };


  useEffect(() => {
    // Getting the auth instance
    const auth = getAuth();
    // Subscribing to the auth state changes
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedHandler);
    // Cleanup the subscription when the component unmounts
    return () => subscriber();
  }, []);


  // useEffect(() => {
  //   console.log("this is the user in 'home':", !!user);
    
  //   if(!user ){
  //     // router.replace('/(auth)/sign-in')
  //     // if(!rootNavigationState?.key){
  //     //   //do nothing 
  //     //   router.replace('/(authi)/sign-in')
  //     // }else{
  //     //   console.log("this is the user in 'home':", !!user);
  //     //   // router.replace('/(auth)/sign-in')
  //     //   console.log("this is the user in 'home':", !!user);
  //     // }
  //   }
  // }, [user])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Page</Text>
      
      {/* Header */}
      {/* <HomeHeader /> */}
      {/* Slider */}
      {/* <Slider /> */}
      {/* Category */}

      {/* Popular Business List */}
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
