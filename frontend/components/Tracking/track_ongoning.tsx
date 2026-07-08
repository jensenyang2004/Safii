import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '@/context/TrackProvider';
import { useLocationSharing, GroupedSharingContact } from '@/hooks/useLocationSharing';
import { authenticateWithBiometrics } from '@/utils/biometrics';
import { BlurView } from 'expo-blur';
import { uiParameters } from '../../constants/Theme';

interface TrackingMode {
  id: string;
  name: string;
  checkIntervalMinutes: number;
  emergencyContactIds: string[];
  unresponsiveThreshold: number;
}

const Card_ongoing = ({ trackingMode }: { trackingMode: TrackingMode }) => {
  const { stopTrackingMode, currentStrike, nextCheckInTime } = useTracking();
  const { createSharingSession, stopSharingWithContact, unifiedList } = useLocationSharing();

  const [localSharing, setLocalSharing] = React.useState(false);
  const firestoreSharing = (trackingMode.emergencyContactIds ?? []).some(
    id => unifiedList.find(c => c.userId === id)
  );
  const isSharingForThisMode = localSharing || firestoreSharing;

  const [remainingTime, setRemainingTime] = React.useState(0);

  React.useEffect(() => {
    if (nextCheckInTime) {
      const updateRemaining = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((nextCheckInTime - now) / 1000));
        setRemainingTime(timeLeft);
      };

      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => {
        clearInterval(interval);
      };
    } else {
      setRemainingTime(0);
    }
  }, [nextCheckInTime]);

  const handleShareImmediate = () => {
    if (isSharingForThisMode) {
      Alert.alert('停止分享', '確定要停止與緊急聯絡人分享位置嗎？', [
        { text: '取消', style: 'cancel' },
        { text: '停止分享', style: 'destructive', onPress: async () => {
            const contactsToStop = (trackingMode.emergencyContactIds ?? [])
              .map(id => unifiedList.find(c => c.userId === id))
              .filter((c): c is GroupedSharingContact => !!c);
            await Promise.all(contactsToStop.map(c => stopSharingWithContact(c)));
            setLocalSharing(false);
          }},
      ]);
      return;
    }
    const ids = trackingMode.emergencyContactIds ?? [];
    if (ids.length === 0) {
      Alert.alert('沒有緊急聯絡人', '此模式尚未設定緊急聯絡人。');
      return;
    }
    Alert.alert(
      '分享位置',
      `將立即與「${trackingMode.name}」的緊急聯絡人分享您的即時位置，確認繼續？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '確認分享', onPress: async () => { await createSharingSession(ids); setLocalSharing(true); } },
      ]
    );
  };

  const totalDuration = trackingMode.checkIntervalMinutes * 60;
  const progressPercentage = totalDuration > 0 ? ((totalDuration - remainingTime) / totalDuration) * 100 : 0;

  const StrikeDots = () => (
    <View style={styles.strikeDotsContainer}>
      {[...Array(trackingMode?.unresponsiveThreshold || 1)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.strikeDot,
            { backgroundColor: i < currentStrike ? uiParameters.countingDot.active : uiParameters.countingDot.background },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.shadowContainer}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={[styles.innerContainer, { backgroundColor: uiParameters.mainComponent.background }]}>
          <View style={styles.leftContent}>
            <Text style={[styles.title, { color: uiParameters.mainComponent.text }]} numberOfLines={1}>
              進行{trackingMode?.name ?? '模式'}...
            </Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: uiParameters.progressBar.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: uiParameters.progressBar.fill,
                    },
                  ]}
                />
              </View>
              <StrikeDots />
            </View>
            {isSharingForThisMode && (
              <Text style={styles.sharingIndicator}>位置分享中</Text>
            )}
          </View>

          <View style={styles.rightContent}>
            <TouchableOpacity
              style={[styles.iconButton, {
                backgroundColor: isSharingForThisMode
                  ? uiParameters.buttons.locationShare.active.background
                  : uiParameters.buttons.locationShare.default.background,
              }]}
              onPress={handleShareImmediate}
            >
              <Ionicons
                name="location-sharp"
                size={24}
                color={isSharingForThisMode
                  ? uiParameters.buttons.locationShare.active.icon
                  : uiParameters.buttons.locationShare.default.icon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const ok = await authenticateWithBiometrics('請驗證身份以停止報平安');
                if (!ok) return;
                stopTrackingMode();
              }}
              style={[styles.iconButton, { backgroundColor: uiParameters.buttons.action.background }]}
            >
              <Ionicons name="pause" size={24} color={uiParameters.buttons.action.text} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    width: '90%',
    height: 100,
    paddingTop: 10,
    paddingBottom: 10,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  blurView: {
    flex: 1,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  leftContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  sharingIndicator: {
    fontSize: 11,
    fontWeight: '600',
    color: uiParameters.progressBar.fill,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 96,
    height: 10,
    borderRadius: 9999,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  strikeDotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  strikeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Card_ongoing;
