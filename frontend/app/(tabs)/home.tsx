import { View, Text, Pressable, Alert } from 'react-native';
import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import '@/global.css';
export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();
  const rootNavigationState = useRootNavigationState();

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert("Signed out successfully!");
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  useEffect(() => {
    if (!user && rootNavigationState?.key) {
      router.replace('/(auth)/sign-in');
    }
  }, [user]);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold mb-6">{user?.username}</Text>

      <Pressable
        onPress={handleSignOut}
        className="bg-blue-500 px-4 py-2 rounded"
      >
        {({ pressed }) => (
          <Text className={`text-white text-center ${pressed ? 'opacity-70' : ''}`}>
            Sign Out
          </Text>
        )}
      </Pressable>
    </View>
  );
}