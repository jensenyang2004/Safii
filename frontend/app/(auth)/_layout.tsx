import { useAuth } from "@/context/AuthProvider";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

const AuthLayout = () => {

    const { user, loading } = useAuth()

    // return here for development purposes
    // return <Redirect href='/(tabs)/home'/>

    if( !loading && user ) return <Redirect href='/(tabs)/home'/>
    return (
    <>
        <Stack>
            <Stack.Screen
                name="sign-in"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="sign-up"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>

        {/* <Loader isLoading={loading} /> */}
        <StatusBar style="dark" />
    </>
  ); 
}

export default AuthLayout