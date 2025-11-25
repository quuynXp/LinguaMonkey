import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAppStore } from '../stores/appStore';
import instance from "../api/axiosClient";
import messaging, {
  requestPermission,
  getToken
} from '@react-native-firebase/messaging';
import { useUserStore } from '../stores/UserStore';
import { handleNotificationNavigation } from '../utils/navigationRef';

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

  /**
   * Quan trọng: Gọi hàm này ở App.tsx hoặc Root Component (useEffect)
   */
  setupNotificationListeners() {
    // 1. App đang mở hoặc chạy nền (Foreground/Background) - Xử lý interaction qua Expo
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('User tapped notification (Expo Listener):', data);
      handleNotificationNavigation(data);
    });

    // 2. App đang chạy nền (Background) - Click vào noti do Firebase sinh ra
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('User tapped notification (Firebase Background):', remoteMessage.data);
      handleNotificationNavigation(remoteMessage.data);
    });

    // 3. App đã tắt hoàn toàn (Quit State) - Mở app từ noti
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from Quit State (Firebase):', remoteMessage.data);
        // Delay nhẹ để Navigation container kịp mount
        setTimeout(() => {
          handleNotificationNavigation(remoteMessage.data);
        }, 1000);
      }
    });

    return () => {
      subscription.remove();
    };
  }

  async getDeviceId(): Promise<string> {
    const store = useUserStore.getState();
    let deviceId = store.deviceId;

    if (!deviceId) {
      deviceId = Device.osInternalBuildId || Device.osBuildId || 'unknown_device';

      if (store.setDeviceId) {
        store.setDeviceId(deviceId);
      }
    }
    return deviceId;
  }

  async requestFirebasePermissions(): Promise<boolean> {
    const authStatus = await requestPermission(messaging());
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
      const fcmToken = await getToken(messaging());
      console.log('Firebase FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerTokenToBackend() {
    const store = useUserStore.getState();
    const userId = store.user?.userId;

    if (!userId) {
      console.log('User not logged in, skipping token registration.');
      return;
    }

    const fcmToken = await this.getFcmToken();
    const deviceId = await this.getDeviceId();

    if (!fcmToken || !deviceId) {
      console.log('FCM token or Device ID is missing, skipping registration.');
      return;
    }

    if (store.setToken) store.setToken(fcmToken);
    if (store.setDeviceId) store.setDeviceId(deviceId);

    if (store.fcmToken === fcmToken && store.deviceId === deviceId && store.isTokenRegistered) {
      console.log('FCM Token already registered to backend for this device.');
      return;
    }

    try {
      await instance.post('/api/v1/users/fcm-token', {
        fcmToken: fcmToken,
        userId: userId,
        deviceId: deviceId,
      });

      console.log('FCM Token registered to backend successfully.');
      if (store.setTokenRegistered) store.setTokenRegistered(true);

    } catch (error) {
      console.error('Error registering FCM token to backend:', error);
      if (store.setTokenRegistered) store.setTokenRegistered(false);
    }
  }

  async deleteTokenFromBackend() {
    const { user, deviceId } = useUserStore.getState();

    if (!user?.userId || !deviceId) {
      console.log('Cannot delete FCM token: User not logged in or Device ID missing in store.');
      return;
    }

    try {
      await instance.delete('/api/v1/users/fcm-token', {
        params: {
          userId: user.userId,
          deviceId: deviceId
        }
      });
      console.log('FCM Token deleted from backend successfully for device:', deviceId);

    } catch (error) {
      console.error('Failed to delete FCM token on logout:', error);
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

  // --- Giữ nguyên các hàm gửi local notification từ backend logic ---
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