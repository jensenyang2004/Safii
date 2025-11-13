import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  spot: {
    name: string;
    distance: { text: string };
    duration: { text: string };
  };
  onCancel: () => void;
  onNavigate: () => void;
}

const NearestSafeSpotCard: React.FC<Props> = ({ spot, onCancel, onNavigate }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nearest Safe Route</Text>
      <Text style={styles.spotName}>{spot.name}</Text>
      <Text style={styles.info}>{`Distance: ${spot.distance.text}`}</Text>
      <Text style={styles.info}>{`ETA: ${spot.duration.text}`}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onNavigate} style={[styles.button, styles.navigateButton]}>
          <Text style={styles.buttonText}>Open in Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    width: 320,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  spotName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'column',
    marginTop: 15,
    width: '100%',
  },
  button: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 5,
    alignItems: 'center',
  },
  navigateButton: {
    backgroundColor: '#3498DB',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default NearestSafeSpotCard;
