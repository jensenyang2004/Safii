import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';

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
    <View style={styles.container}>
      <Text style={styles.username}>{user?.username}</Text>

      <Pressable onPress={handleSignOut} style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed
      ]}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  username: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    color: '#212529',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});