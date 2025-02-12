import { Stack } from "expo-router";
import { ClerkProvider } from '@clerk/clerk-expo'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import LoginScreen from './../components/LoginScreen';
import { tokenCache } from './cache'

export default function RootLayout() {
  return (
    // <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <SignedIn>
        {/* <Text>Hello {user?.emailAddresses[0].emailAddress}</Text> */}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ 
            headerShown: false
          }}/>
        </Stack>
      </SignedIn>
      <SignedOut>
        <LoginScreen />
      </SignedOut>
     
    </ClerkProvider>
  )
  
}
