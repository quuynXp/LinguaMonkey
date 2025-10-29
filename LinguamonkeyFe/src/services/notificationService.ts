import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import instance from '../api/axiosInstance';
import { useAppStore } from '../stores/appStore';
import * as navigationService from './navigationService';

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
const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID; 

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
    if (!Device.isDevice) {
      console.warn('Must run on a physical device to receive push notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getExpoPushToken(): Promise<string | null> {
    const granted = await this.requestPermissions();
    if (!granted) return null;

    try {
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: EXPO_PROJECT_ID,
        })
      ).data;
      return token;
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }

  async sendLocalNotification(title: string, body: string, chatId?: string): Promise<void> {
    if (!this.preferences.enablePush || (this.preferences.quietHours.enabled && this.isQuietHours())) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: chatId ? { chatId } : undefined,
        sound: "../assets/sounds/notification.mp3",
        vibrate: this.preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: null,
    });
  }

  async scheduleStudyReminder(): Promise<string | null> {
    if (!this.preferences.enablePush || !this.preferences.scheduled || !this.preferences.studyReminders) return null;

    const [hour, minute] = this.preferences.studyTime.split(':').map(Number);
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(hour, minute, 0, 0);

    // If the scheduled time has passed today, schedule for tomorrow
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

  async sendMessageNotification(sender: string, message: string, chatId: string): Promise<void> {
    if (!this.preferences.messageNotifications) return;
    await this.sendLocalNotification(`New Message from ${sender}`, message, chatId);
  }

  async sendPurchaseCourseNotification(userId: string, courseName: string): Promise<void> {
    if (!this.preferences.achievementNotifications) return;
    try {
      await instance.post('/notifications/email/purchase-course', null, {
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
      await instance.post('/notifications/email/voucher-registration', null, {
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
      await instance.post('/notifications/email/achievement', null, {
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
      await instance.post('/notifications/email/daily-reminder', null, {
        params: { userId },
      });
      await this.sendLocalNotification('Daily Study Reminder', 'Time to practice your language skills!');
    } catch (error) {
      console.error('Error sending daily study reminder:', error);
    }
  }

  async sendPasswordResetNotification(userId: string, resetLink: string): Promise<void> {
    try {
      await instance.post('/notifications/email/password-reset', null, {
        params: { userId, resetLink },
      });
      await this.sendLocalNotification('Password Reset', 'A password reset link has been sent to your email.');
    } catch (error) {
      console.error('Error sending password reset notification:', error);
    }
  }

  async sendVerifyAccountNotification(userId: string, verifyLink: string): Promise<void> {
    try {
      await instance.post('/notifications/email/verify-account', null, {
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
      await instance.post('/notifications/email/inactivity-warning', null, {
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
      await instance.post('/notifications/email/streak-reward', null, {
        params: { userId, streakDays },
      });
      await this.sendLocalNotification('Streak Reward', `Congratulations on your ${streakDays}-day streak!`);
    } catch (error) {
      console.error('Error sending streak reward notification:', error);
    }
  }
}

export default new NotificationService();
