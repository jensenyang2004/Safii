import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store'
import { Platform } from 'react-native'
// import { TokenCache } from '@clerk/clerk-expo/dist/cache'

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        const item = await getItemAsync(key)
        if (item) {
          console.log(`${key} was used 🔐 \n`)
        } else {
          console.log('No values stored under key: ' + key)
        }
        return item
      } catch (error) {
        console.error('secure store get item error: ', error) 
        await deleteItemAsync(key)
        return null
      }
    },
    saveToken: (key: string, token: string) => {
        return setItemAsync(key, token)
      },
    // saveToken: (key: string, token: string) => {
    //   return SecureStore.setItemAsync(key, token)
    // },
  }
}

// SecureStore is not supported on the web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined