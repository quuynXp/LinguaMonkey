import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { useAppStore } from '../stores/appStore';
import instance from "../api/axiosClient";
import messaging, {
  requestPermission,
  getToken,
} from '@react-native-firebase/messaging';
import { useUserStore } from '../stores/UserStore';
import { handleNotificationNavigation } from '../utils/navigationRef';
import i18n from "../i18n";

// --- FIX: NativeEventEmitter Warnings ---
// Polyfill để tránh crash/warning khi thư viện native thiếu method addListener/removeListeners
const RNFB_Module = NativeModules.RNFBAppModule || NativeModules.RNFBMessagingModule;
if (RNFB_Module) {
  const eventEmitter = new NativeEventEmitter(RNFB_Module);
  // @ts-ignore
  if (!eventEmitter.addListener) {
    // @ts-ignore
    eventEmitter.addListener = () => { };
  }
  // @ts-ignore
  if (!eventEmitter.removeListeners) {
    // @ts-ignore
    eventEmitter.removeListeners = () => { };
  }
}

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
    await this.requestPermissions(); // Expo Permission
    this.isInitialized = true;
  }

  setupNotificationListeners() {
    // 1. Expo: User taps on local notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('User tapped notification (Expo Listener):', data);
      handleNotificationNavigation(data);
    });

    // 2. Firebase: Background State (App Open)
    const unsubscribeOnOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('User tapped notification (Firebase Background):', remoteMessage.data);
      if (remoteMessage.data) {
        handleNotificationNavigation(remoteMessage.data);
      }
    });

    // 3. Firebase: Quit State (Initial Launch)
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from Quit State (Firebase):', remoteMessage.data);
        // Delay slightly to ensure navigation container is ready
        setTimeout(() => {
          if (remoteMessage.data) {
            handleNotificationNavigation(remoteMessage.data);
          }
        }, 1200);
      }
    });

    // 4. Firebase: Foreground State (App Active) -> Convert to Local Notification
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground Notification (FCM):", remoteMessage);

      // Hiển thị thông báo local ngay cả khi đang mở app
      await this.sendLocalNotification(
        remoteMessage.notification?.title || i18n.t("notification.default_title"),
        remoteMessage.notification?.body || "",
        remoteMessage.data
      );
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

    // Skip if already registered same token/device
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
        sound: prefs.soundEnabled ? 'default_sound.wav' : undefined, // Check if sound file exists or use default
        vibrate: prefs.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      },
      trigger: null, // Show immediately
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
        sound: this.preferences.soundEnabled, // Boolean or custom sound string
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

  // --- API Notification Methods ---

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