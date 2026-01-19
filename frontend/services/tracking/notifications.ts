import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TimelineEvent } from '@/types/tracking';

export const configureNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Logic for handling foreground notifications could go here
      // For now, we just define the presentation options
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tracking', {
      name: 'Safety Tracking',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', // Or custom sound
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
};

export const scheduleSessionNotifications = async (timeline: TimelineEvent[]): Promise<string[]> => {
  const notificationIds: string[] = [];
  const now = Date.now();

  for (const event of timeline) {
    if (event.time <= now) {
      continue;
    }

    let title: string, body: string;
    if (event.type === 'session_end') {
      title = `⏰ 請回報安全`;
      body = '請在一分鐘內回報安全狀態';
    } else if (event.type === 'missed_report') {
      if (event.strike < (event.strikeThreshold ?? 3)) {
        title = `⚠️ 錯過安全回報`;
        body = `您未在時限內回報。新的安全追蹤時段已開始，請務必在下次時限內回報。`;
      } else {
        title = '🚨 觸發緊急通知';
        body = `因為尚未回報安全，您的即時位置已經分享給設定的緊急聯絡人`;
      }
    } else {
      title = 'Safety Alert';
      body = 'Please check your safety status';
    }

    const seconds = Math.max(Math.round((event.time - now) / 1000), 1);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: {
          type: event.type,
          strike: event.strike,
          eventTime: event.time,
          deadline: event.deadline,
          strikeThreshold: event.strikeThreshold,
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });

    notificationIds.push(notificationId);
  }

  return notificationIds;
};

export const cancelAllNotifications = async (notificationIds: string[]) => {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
};

export const cancelAllSystemNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
