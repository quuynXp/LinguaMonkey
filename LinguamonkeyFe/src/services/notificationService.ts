import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import instance from '../api/axiosInstance';
import { useAppStore } from '../stores/appStore';
import messaging from '@react-native-firebase/messaging';
import { useUserStore } from '../stores/UserStore';

export interface NotificationPreferences {
  enablePush: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  scheduled: boolean;
  studyReminders: boolean;
  streakReminders: boolean;
  messageNotifications: boolean;
  coupleNotifications: boolean;
  groupInvitations: boolean;
  achievementNotifications: boolean;
  reminderFrequency: 'daily' | 'weekdays' | 'custom';
  customDays: number[];
  studyTime: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const STORAGE_KEY = 'notification-preferences';
// const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID; 

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default_channel_id', {
    name: 'Default Channel',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'notification.mp3',
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private preferences: NotificationPreferences;

  constructor() {
    this.preferences = {
      enablePush: true,
      soundEnabled: true,
      vibrationEnabled: true,
      scheduled: false,
      studyReminders: true,
      streakReminders: true,
      messageNotifications: true,
      coupleNotifications: true,
      groupInvitations: true,
      achievementNotifications: true,
      reminderFrequency: 'daily',
      customDays: [],
      studyTime: '09:00',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    };
    this.loadPreferences();
  }

  async requestFirebasePermissions(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('Firebase Permission status:', authStatus);
    return enabled;
  }

  async getFcmToken(): Promise<string | null> {
    const enabled = await this.requestFirebasePermissions();
    if (!enabled) return null;

    try {
      const fcmToken = await messaging().getToken();
      console.log('Firebase FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerTokenToBackend() {
    const fcmToken = await this.getFcmToken();
    if (!fcmToken) {
      console.log('Could not get FCM token, skipping registration.');
      return;
    }

    const userId = useUserStore.getState().user?.userId;
    if (!userId) {
      console.log('User not logged in, skipping token registration.');
      return;
    }

    try {
      const deviceId = Device.osInternalBuildId || Device.osBuildId || 'unknown_device';

      await instance.post('/api/v1/users/fcm-token', {
        fcmToken: fcmToken,
        userId: userId,
        deviceId: deviceId,
      });

      console.log('FCM Token registered to backend successfully.');
    } catch (error) {
      console.error('Error registering FCM token to backend:', error);
    }
  }


  async sendLocalNotification(title: string, body: string, data?: object): Promise<void> {
    const prefs = this.getPreferences();
    if (!prefs.enablePush || (prefs.quietHours.enabled && this.isQuietHours())) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as Record<string, unknown> | undefined,
        sound: prefs.soundEnabled ? 'default_sound.wav' : undefined,
        vibrate: prefs.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: null,
    });
  }

  async loadPreferences(): Promise<void> {
    try {
      const savedPrefs = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        this.preferences = { ...this.preferences, ...parsedPrefs };
        useAppStore.getState().setNotificationPreferences(this.preferences);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  async savePreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      useAppStore.getState().setNotificationPreferences(this.preferences);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async scheduleStudyReminder(): Promise<string | null> {
    if (!this.preferences.enablePush || !this.preferences.scheduled || !this.preferences.studyReminders) return null;

    const [hour, minute] = this.preferences.studyTime.split(':').map(Number);
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(hour, minute, 0, 0);

    if (triggerDate < now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    const secondsUntilTrigger = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

    if (this.preferences.reminderFrequency === 'daily') {
      return this.scheduleNotification('Daily Study Reminder', 'Time to practice your language skills!', secondsUntilTrigger);
    } else if (this.preferences.reminderFrequency === 'weekdays' && [1, 2, 3, 4, 5].includes(now.getDay())) {
      return this.scheduleNotification('Daily Study Reminder', 'Time to practice your language skills!', secondsUntilTrigger);
    } else if (this.preferences.reminderFrequency === 'custom' && this.preferences.customDays.includes(now.getDay())) {
      return this.scheduleNotification('Daily Study Reminder', 'Time to practice your language skills!', secondsUntilTrigger);
    }

    return null;
  }

  async scheduleNotification(title: string, body: string, seconds: number): Promise<string | null> {
    if (!this.preferences.enablePush || !this.preferences.scheduled || this.isQuietHours()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "../assets/sounds/notification.mp3",
        vibrate: this.preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });

    return id;
  }

  async cancelAllScheduled(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferences();
  }

  getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) return false;

    const now = new Date();
    const [startHour, startMinute] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = this.preferences.quietHours.end.split(':').map(Number);
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    return startTimeInMinutes < endTimeInMinutes
      ? currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes
      : currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
  }

  // async sendMessageNotification(sender: string, message: string, chatId: string, receiverId: string): Promise<void> {
  //   try {
  //     await instance.post('/api/v1/notifications/send-message', { // Giả sử bạn có endpoint này
  //       senderId: useUserStore.getState().user?.userId,
  //       receiverId: receiverId,
  //       title: `New Message from ${sender}`,
  //       content: message,
  //       payload: `{"screen":"Chat", "stackScreen":"ChatDetail", "chatId":"${chatId}"}`
  //     });
  //   } catch (error) {
  //     console.error('Error triggering message notification:', error);
  //   }
  // }

  async sendPurchaseCourseNotification(userId: string, courseName: string): Promise<void> {
    if (!this.preferences.achievementNotifications) return;
    try {
      await instance.post('/api/v1/notifications/email/purchase-course', null, {
        params: { userId, courseName },
      });
      await this.sendLocalNotification('Course Purchased', `You have successfully purchased ${courseName}!`);
    } catch (error) {
      console.error('Error sending course purchase notification:', error);
    }
  }

  async sendVoucherRegistrationNotification(userId: string, voucherCode: string): Promise<void> {
    if (!this.preferences.achievementNotifications) return;
    try {
      await instance.post('/api/v1/notifications/email/voucher-registration', null, {
        params: { userId, voucherCode },
      });
      await this.sendLocalNotification('Voucher Registered', `Voucher ${voucherCode} registered successfully!`);
    } catch (error) {
      console.error('Error sending voucher registration notification:', error);
    }
  }

  async sendAchievementNotification(userId: string, title: string, message: string): Promise<void> {
    if (!this.preferences.achievementNotifications) return;
    try {
      await instance.post('/api/v1/notifications/email/achievement', null, {
        params: { userId, title, message },
      });
      await this.sendLocalNotification(title, message);
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  async sendDailyStudyReminderNotification(userId: string): Promise<void> {
    if (!this.preferences.studyReminders) return;
    try {
      await instance.post('/api/v1/notifications/email/daily-reminder', null, {
        params: { userId },
      });
      await this.sendLocalNotification('Daily Study Reminder', 'Time to practice your language skills!');
    } catch (error) {
      console.error('Error sending daily study reminder:', error);
    }
  }

  async sendPasswordResetNotification(userId: string, resetLink: string): Promise<void> {
    try {
      await instance.post('/api/v1/notifications/email/password-reset', null, {
        params: { userId, resetLink },
      });
      await this.sendLocalNotification('Password Reset', 'A password reset link has been sent to your email.');
    } catch (error) {
      console.error('Error sending password reset notification:', error);
    }
  }

  async sendVerifyAccountNotification(userId: string, verifyLink: string): Promise<void> {
    try {
      await instance.post('/api/v1/notifications/email/verify-account', null, {
        params: { userId, verifyLink },
      });
      await this.sendLocalNotification('Account Verification', 'Please verify your account using the link sent to your email.');
    } catch (error) {
      console.error('Error sending account verification notification:', error);
    }
  }

  async sendInactivityWarningNotification(userId: string, days: number): Promise<void> {
    if (!this.preferences.streakReminders) return;
    try {
      await instance.post('/api/v1/notifications/email/inactivity-warning', null, {
        params: { userId, days },
      });
      await this.sendLocalNotification('Inactivity Warning', `You haven't practiced for ${days} days. Keep your streak alive!`);
    } catch (error) {
      console.error('Error sending inactivity warning:', error);
    }
  }

  async sendStreakRewardNotification(userId: string, streakDays: number): Promise<void> {
    if (!this.preferences.streakReminders) return;
    try {
      await instance.post('/api/v1/notifications/email/streak-reward', null, {
        params: { userId, streakDays },
      });
      await this.sendLocalNotification('Streak Reward', `Congratulations on your ${streakDays}-day streak!`);
    } catch (error) {
      console.error('Error sending streak reward notification:', error);
    }
  }
}

export default new NotificationService();
