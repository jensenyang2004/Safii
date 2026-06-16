// frontend/components/Tracking/LocationSentCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import * as LocalAuthentication from 'expo-local-authentication';

interface Contact {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface LocationSentCardProps {
  onDismiss: () => void;
  activityLocation?: string;
  activity?: string;
  notes?: string;
  contacts?: Contact[];
}

const LocationSentCard: React.FC<LocationSentCardProps> = ({ onDismiss, activityLocation, activity, notes, contacts = [] }) => {
  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  const handleReportSafety = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();

    if (hasHardware) {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: '請驗證身分以回報安全',
          fallbackLabel: '輸入密碼',
        });

        if (result.success) {
          console.log('✅ 生物辨識成功，回報安全 button pressed');
          onDismiss(); // 驗證成功才放行
        } else {
          Alert.alert('身分驗證失敗', '請再試一次');
        }
      } else {
        Alert.alert(
          '設定 Face ID 或 指紋',
          '您尚未設定生物辨識。請至您的裝置設定中啟用。',
          [
            {
              text: '取消',
              style: 'cancel',
            },
            {
              text: '前往設定',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } else {
      console.log('⚠️ 無生物辨識硬體，直接放行');
      onDismiss();
    }
  };

  return (
    <BlurView intensity={80} tint="dark" style={styles.overlayContainer} pointerEvents="auto">
      <View style={styles.card}>
        {/* Illustration */}
        {/* <Image
          source={require('@/assets/images/alert_illustration')} // replace with your image
          style={styles.image}
        /> */}

        {/* Title */}
        <Text style={styles.title}>已發送自動通報</Text>

        {/* Details */}
        {activityLocation ? <Text style={styles.detail}>活動地點：{activityLocation}</Text> : null}
        {activity ? <Text style={styles.detail}>活動：{activity}</Text> : null}
        {notes ? <Text style={styles.detail}>備註：{notes}</Text> : null}

        {/* Notified Contacts */}
        {contacts.length > 0 && (
          <View style={styles.contactsRow}>
            <Text style={styles.contactsLabel}>已通報聯絡人</Text>
            <View style={styles.avatarRow}>
              {visibleContacts.map((contact, index) =>
                contact.avatarUrl ? (
                  <Image
                    key={contact.id}
                    source={{ uri: contact.avatarUrl }}
                    style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0 }]}
                  />
                ) : (
                  <View
                    key={contact.id}
                    style={[styles.avatar, styles.avatarPlaceholder, { marginLeft: index > 0 ? -10 : 0 }]}
                  >
                    <Text style={styles.avatarText}>
                      {(contact.username || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              )}
              {moreCount > 0 && (
                <View style={[styles.avatar, styles.avatarMore, { marginLeft: -10 }]}>
                  <Text style={styles.avatarText}>{`+${moreCount}`}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          {/* <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => { console.log('關閉 button pressed'); onDismiss(); }}
          >
            <Text style={styles.actionButtonText}>關閉</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => {
              handleReportSafety();
            }}
          >
            <Text style={[styles.actionButtonText, styles.primaryButtonText]}>回報安全</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  card: {
    backgroundColor: '#E74C3C',
    width: '80%', // 稍微加寬一點讓兩個按鈕有空間
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  detail: {
    fontSize: 14,
    color: 'white',
    marginBottom: 6,
    textAlign: 'left',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 20,
    justifyContent: 'center',
    gap: 12, // 按鈕間距
  },
  actionButton: {
    // flex: 1, // 讓兩個按鈕平分寬度
    width: '70%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // 關閉按鈕用半透明 white
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  primaryButton: {
    backgroundColor: 'white', // 回報安全用實心 white
    borderWidth: 0,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  primaryButtonText: {
    color: '#E74C3C',
  },
  contactsRow: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  contactsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMore: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default LocationSentCard;