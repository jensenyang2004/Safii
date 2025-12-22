import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/libs/firebase';
import { useAuth } from '@/context/AuthProvider';
import Theme from '@/constants/Theme';
import { EmergencyData } from '@/hooks/useEmergencyListener'; // Import EmergencyData

interface EmergencyInfoModalProps {
  emergency: EmergencyData | null;
  onClose: () => void;
}

const EmergencyInfoModal = ({ emergency, onClose }: EmergencyInfoModalProps) => {
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
          <View style={styles.avatarContainer}>
            {emergency.trackedUserAvatarUrl ? (
              <Image
                source={{ uri: emergency.trackedUserAvatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(emergency.trackedUserName || 'U')[0]}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.modalTitle}>{emergency.trackedUserName} 發送了緊急位址訊息</Text>
          <Text style={styles.modalDescription}>
            {emergency.trackedUserName} 正在進行下列活動，但沒有即時回報安全狀態
          </Text>

          {emergency.activityLocation && (
            <Text style={styles.modalText}>活動地點：{emergency.activityLocation}</Text>
          )}
          {emergency.activity && (
            <Text style={styles.modalText}>活動：{emergency.activity}</Text>
          )}
          {emergency.notes && (
            <Text style={styles.modalText}>備註：{emergency.notes}</Text>
          )}
          
          <Text style={styles.modalText}>
            Last update: {emergency.updateTime ? emergency.updateTime.toDate().toLocaleString() : 'N/A'}
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
    paddingTop: 70, // Make space for the avatar
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    position: 'relative',
  },
  avatarContainer: {
    position: 'absolute',
    top: -50,
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48, // Larger font for the initial
    fontWeight: 'bold',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: Theme.colors.danger,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#6c757d',
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