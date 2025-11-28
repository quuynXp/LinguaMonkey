import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAppStore } from '../stores/appStore';
import instance from "../api/axiosClient";
import messaging from '@react-native-firebase/messaging';
import { useUserStore } from '../stores/UserStore';
import { handleNotificationNavigation } from '../utils/navigationRef';
import i18n from "../i18n";

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
  private isInitialized: boolean = false;
  private messagingInstance: ReturnType<typeof messaging> | null = null;

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
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
    };
  }

  private getMessaging() {
    if (!this.messagingInstance) {
      this.messagingInstance = messaging();
    }
    return this.messagingInstance;
  }

  async initialize() {
    if (this.isInitialized) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default_channel_id', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'notification.mp3',
      });
    }

    await this.loadPreferences();
    await this.requestPermissions();
    await this.requestFirebasePermissions();

    this.isInitialized = true;
  }

  setupNotificationListeners() {
    const msg = this.getMessaging();

    // A. Expo Listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('🔔 Expo Local Interaction:', data);
      handleNotificationNavigation(data);
    });

    // B. Firebase Background - App opened from background
    const unsubscribeOnOpened = msg.onNotificationOpenedApp(remoteMessage => {
      console.log('🔔 Firebase Background Interaction:', remoteMessage?.data);
      if (remoteMessage?.data) {
        handleNotificationNavigation(remoteMessage.data);
      }
    });

    // C. Firebase Quit State - App opened from quit state
    msg.getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('🔔 Firebase Quit State Interaction:', remoteMessage.data);
        setTimeout(() => {
          if (remoteMessage.data) {
            handleNotificationNavigation(remoteMessage.data);
          }
        }, 1500);
      }
    }).catch(err => {
      console.error('getInitialNotification error:', err);
    });

    // D. Firebase Foreground - App is active
    const unsubscribeOnMessage = msg.onMessage(async remoteMessage => {
      console.log("🔔 Firebase Foreground:", remoteMessage);

      const title = remoteMessage.notification?.title || i18n.t("notification.default_title");
      const body = remoteMessage.notification?.body || "";

      await this.sendLocalNotification(title, body, remoteMessage.data);
    });

    return () => {
      responseSubscription.remove();
      unsubscribeOnOpened();
      unsubscribeOnMessage();
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
    try {
      const msg = this.getMessaging();
      const authStatus = await msg.requestPermission();

      // FIXED: Use messaging.AuthorizationStatus instead of firebase.messaging.AuthorizationStatus
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('🔥 Firebase Permission Status:', authStatus);
      return enabled;
    } catch (error) {
      console.error('❌ Request Firebase Permission Error:', error);
      return false;
    }
  }

  async getFcmToken(): Promise<string | null> {
    const enabled = await this.requestFirebasePermissions();
    if (!enabled) {
      console.warn('⚠️ Firebase permissions not granted');
      return null;
    }

    try {
      const msg = this.getMessaging();
      const fcmToken = await msg.getToken();
      console.log('🔥 FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  async registerTokenToBackend() {
    const store = useUserStore.getState();
    const userId = store.user?.userId;

    if (!userId) {
      console.warn('⚠️ No userId found, skipping token registration');
      return;
    }

    const fcmToken = await this.getFcmToken();
    const deviceId = await this.getDeviceId();

    if (!fcmToken || !deviceId) {
      console.warn('⚠️ Cannot register token: Missing Token or DeviceID');
      return;
    }

    if (store.setToken) store.setToken(fcmToken);
    if (store.setDeviceId) store.setDeviceId(deviceId);

    if (store.fcmToken === fcmToken && store.deviceId === deviceId && store.isTokenRegistered) {
      console.log('✅ FCM Token already synced.');
      return;
    }

    try {
      await instance.post('/api/v1/users/fcm-token', {
        fcmToken: fcmToken,
        userId: userId,
        deviceId: deviceId,
      });

      console.log('✅ FCM Token registered to backend.');
      if (store.setTokenRegistered) store.setTokenRegistered(true);

    } catch (error) {
      console.error('❌ Failed to register FCM token:', error);
      if (store.setTokenRegistered) store.setTokenRegistered(false);
    }
  }

  async deleteTokenFromBackend() {
    const { user, deviceId } = useUserStore.getState();
    if (!user?.userId || !deviceId) return;

    try {
      await instance.delete('/api/v1/users/fcm-token', {
        params: { userId: user.userId, deviceId: deviceId }
      });

      const msg = this.getMessaging();
      await msg.deleteToken();

      console.log('🗑️ FCM Token deleted.');
    } catch (error) {
      console.error('❌ Failed to delete FCM token:', error);
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
        sound: prefs.soundEnabled,
        vibrate: prefs.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: null,
    });
  }

  async loadPreferences(): Promise<void> {
    try {
      const savedPrefs = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPrefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPrefs) };
        useAppStore.getState().setNotificationPreferences(this.preferences);
      }
    } catch (error) {
      console.error('❌ Load prefs error:', error);
    }
  }

  async savePreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      useAppStore.getState().setNotificationPreferences(this.preferences);
    } catch (error) {
      console.error('❌ Save prefs error:', error);
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

  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferences();
  }

  getPreferences(): NotificationPreferences {
    return this.preferences;
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
    const title = 'Daily Study Reminder';
    const body = 'Time to practice your language skills!';

    if (this.preferences.reminderFrequency === 'daily') {
      return this.scheduleNotification(title, body, secondsUntilTrigger);
    } else if (this.preferences.reminderFrequency === 'weekdays' && [1, 2, 3, 4, 5].includes(now.getDay())) {
      return this.scheduleNotification(title, body, secondsUntilTrigger);
    } else if (this.preferences.reminderFrequency === 'custom' && this.preferences.customDays.includes(now.getDay())) {
      return this.scheduleNotification(title, body, secondsUntilTrigger);
    }

    return null;
  }

  async scheduleNotification(title: string, body: string, seconds: number): Promise<string | null> {
    if (!this.preferences.enablePush || !this.preferences.scheduled || this.isQuietHours()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: this.preferences.soundEnabled,
        vibrate: this.preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });

    return id;
  }

  async cancelAllScheduled(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) return false;

    const now = new Date();
    const [startHour, startMinute] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = this.preferences.quietHours.end.split(':').map(Number);

    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (startTimeInMinutes > endTimeInMinutes) {
      return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
    }

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  }

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