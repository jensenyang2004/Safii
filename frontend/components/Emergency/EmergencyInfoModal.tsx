import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
          <Text style={styles.modalTitle}>求救訊息詳情</Text>
          <Text style={styles.modalText}>
            {emergency.trackedUserName}
          </Text>
          <Text style={styles.modalText}>
            最後更新: {emergency.updateTime ? emergency.updateTime.toDate().toLocaleString() : 'N/A'}
          </Text>
          
          {emergency.contactStatus?.[user.uid]?.status === 'active' && (
             <TouchableOpacity style={styles.button} onPress={handleAcknowledge}>
                <Text style={styles.buttonText}>確認</Text>
             </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
              <Text style={styles.buttonText}>關閉</Text>
          </TouchableOpacity>
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
    backgroundColor: '#F8F1EC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
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
  button: {
    backgroundColor: '#15223F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '80%'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#6c757d',
  }
});

export default EmergencyInfoModal;