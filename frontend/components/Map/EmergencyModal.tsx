import React from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

// The emergencyData prop will be passed from the map screen
const EmergencyModal = ({ emergencyData }) => {
  const { user } = useAuth();

  // The listener in useEmergencyListener should prevent this from showing,
  // but this is a good safeguard.
  if (!emergencyData || !user || emergencyData.contactStatus?.[user.uid]?.status !== 'active') {
    return null;
  }

  const handleAcknowledge = async () => {
    if (!emergencyData.emergencyDocId || !user.uid) {
      console.error("Missing data for acknowledgement");
      return;
    }
    try {
      const trackingDocRef = doc(db, 'active_tracking', emergencyData.emergencyDocId);
      // Use dot notation to update a nested field in the map
      const fieldPath = `contactStatus.${user.uid}.status`;
      await updateDoc(trackingDocRef, {
        [fieldPath]: 'acknowledged'
      });
      console.log('Emergency acknowledged successfully.');
      // The listener will now receive the updated doc and set emergencyData to null, closing the modal.
    } catch (error) {
      console.error('Failed to acknowledge emergency:', error);
    }
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={true} // Visibility is controlled by the parent's conditional rendering
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Emergency Alert</Text>
          <Text style={styles.modalText}>
            {emergencyData.trackedUserName} is not responding to safety reports.
          </Text>
          <Button title="Acknowledge" onPress={handleAcknowledge} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default EmergencyModal;