import { router } from 'expo-router';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GlobalSettingsButton() {
  return (
    <TouchableOpacity style={styles.button} onPress={() => router.push('/settings')}>
      <Ionicons name="settings-outline" size={24} color="black" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 50, // adjust as needed for status bar height
    marginVertical: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
