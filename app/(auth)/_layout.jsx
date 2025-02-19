
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null); // No type annotations
  const router = useRouter();
  const segments = useSegments();

  const onAuthStateChangedHandler = (user) => {
    // Logging the current user object
    console.log('onAuthStateChanged, user existing:', !!user);
    setUser(user);
    // Once we have the user (or null), stop the initializing state
    if (initializing) setInitializing(false);
  };

  useEffect(() => {
    // Getting the auth instance
    const auth = getAuth();
    // Subscribing to the auth state changes
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedHandler);
    // Cleanup the subscription when the component unmounts
    return () => subscriber();
  }, []);

  useEffect(() => {
    
    // Don't perform routing if initializing is still true
    if (initializing) return;

    // Check if the user is in the '(auth)' segment or not
    const inAuthGroup = segments[0] === '(auth)';
    console.log('this is the user in "_layout":', !!user);
    console.log('this is the inAuthGroup in "_layout":', inAuthGroup);
    // If the user is logged in and is not in an auth route, navigate to home
    if (!!user && inAuthGroup) {
      console.log('Navigating to home...');
      router.replace('./../(tabs)/home');
      // If the user is not logged in and is in an auth route, stay in the auth routes
    } 
    // else if (!user) {
    //   router.replace('./sign-in');
    // }
    // else if (!user && inAuthGroup) {
    //   router.replace('/');
    // }
  }, [user, initializing]);

  if (initializing) 
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <Stack>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}



// import { useAuth } from "@/context/AuthProvider";
// import { Redirect, Stack } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React, { useEffect } from "react";

// const AuthLayout = () => {

//     const { user, loading } = useAuth()
//     // console.log(loading)
//     // console.log(user)

//     useEffect(() => {
//       console.log("User updated:", user);
//       console.log("Loading state:", loading);
//     }, [user, loading]);
  
//     if( !loading && user ) return <Redirect href='/(tabs)/home'/>

    
//     return (
//     <>
//         <Stack>
//             <Stack.Screen
//                 name="sign-in"
//                 options={{
//                     headerShown: false,
//                 }}
//             />
//             <Stack.Screen
//                 name="sign-up"
//                 options={{
//                     headerShown: false,
//                 }}
//             />
//         </Stack>

//         {/* <Loader isLoading={loading} /> */}
//         <StatusBar backgroundColor="#161622" style="light" />
//     </>
//   ); 
// }

// export default AuthLayout
