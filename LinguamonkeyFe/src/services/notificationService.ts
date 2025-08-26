import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Kiểu dữ liệu cho cấu hình notification của user
 */
export type NotificationPreferences = {
  enablePush: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  scheduled?: boolean; // cho phép hẹn giờ notification
};

/**
 * Service quản lý thông báo
 */
class NotificationService {
  private preferences: NotificationPreferences = {
    enablePush: true,
    enableSound: true,
    enableVibration: true,
    scheduled: false,
  };

  /**
   * Request quyền gửi thông báo từ user
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn("Phải chạy trên thiết bị thật để nhận thông báo push");
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }

  /**
   * Lấy Expo push token (dùng để gửi từ backend)
   */
  async getExpoPushToken(): Promise<string | null> {
    const granted = await this.requestPermissions();
    if (!granted) return null;

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "<YOUR_EXPO_PROJECT_ID>", // thay bằng projectId từ app.json/app.config.js
      })
    ).data;

    return token;
  }

  /**
   * Gửi thông báo local ngay lập tức
   */
  async sendLocalNotification(title: string, body: string) {
    if (!this.preferences.enablePush) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: this.preferences.enableSound ? "default" : undefined,
        vibrate: this.preferences.enableVibration ? [0, 250, 250, 250] : undefined,
      },
      trigger: null, // null = gửi ngay
    });
  }

  /**
   * Hẹn giờ gửi thông báo
   */
  async scheduleNotification(
    title: string,
    body: string,
    seconds: number
  ): Promise<string | null> {
    if (!this.preferences.enablePush) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: this.preferences.enableSound ? "default" : undefined,
        vibrate: this.preferences.enableVibration ? [0, 250, 250, 250] : undefined,
      },
      trigger: { seconds },
    });

    return id;
  }

  /**
   * Huỷ tất cả thông báo đã lên lịch
   */
  async cancelAllScheduled() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Lưu/cập nhật preferences
   */
  setPreferences(prefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
  }

  getPreferences(): NotificationPreferences {
    return this.preferences;
  }
}

export default new NotificationService();
