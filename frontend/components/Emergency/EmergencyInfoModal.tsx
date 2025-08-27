import React from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';

const EmergencyInfoModal = ({ emergency, onClose }) => {
  const { user } = useAuth();

  if (!emergency || !user) {
    return null;
  }

  const handleAcknowledge = async () => {
    if (!emergency.emergencyDocId || !user.uid) {
      console.error("Missing data for acknowledgement");
      return;
    }
    try {
      const trackingDocRef = doc(db, 'active_tracking', emergency.emergencyDocId);
      const fieldPath = `contactStatus.${user.uid}.status`;
      await updateDoc(trackingDocRef, {
        [fieldPath]: 'acknowledged'
      });
      console.log('Emergency acknowledged successfully.');
      onClose(); // Close the modal after acknowledging
    } catch (error) {
      console.error('Failed to acknowledge emergency:', error);
    }
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={emergency !== null}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Emergency Details</Text>
          <Text style={styles.modalText}>
            User: {emergency.trackedUserName}
          </Text>
          <Text style={styles.modalText}>
            Last Update: {emergency.updateTime ? emergency.updateTime.toDate().toLocaleString() : 'N/A'}
          </Text>
          
          {emergency.contactStatus?.[user.uid]?.status === 'active' && (
             <Button title="Acknowledge" onPress={handleAcknowledge} />
          )}

          <View style={{ marginTop: 10 }}>
            <Button title="Close" onPress={onClose} color="gray" />
          </View>
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
    shadowOffset: { width: 0, height: 2 },
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
    marginBottom: 10,
  },
});

export default EmergencyInfoModal;
