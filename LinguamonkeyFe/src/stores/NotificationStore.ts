import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification, UserReminder } from '../types/entity';

interface NotificationState {
  notifications: Notification[];
  reminders: UserReminder[];
  unreadNotifications: number;

  addNotification: (notification: Notification) => void;
  addReminder: (reminder: UserReminder) => void;
  markAsRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  removeReminder: (reminderId: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      reminders: [],
      unreadNotifications: 0,

      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
          unreadNotifications: !notification.read ? state.unreadNotifications + 1 : state.unreadNotifications,
        })),

      addReminder: (reminder) =>
        set((state) => ({ reminders: [...state.reminders, reminder] })),

      markAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, read: true } : n
          ),
          unreadNotifications: Math.max(0, state.unreadNotifications - 1),
        })),

      removeNotification: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.notificationId !== notificationId),
        })),

      removeReminder: (reminderId) =>
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== reminderId),
        })),

      clearNotifications: () =>
        set({ notifications: [], reminders: [], unreadNotifications: 0 }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        reminders: state.reminders,
        unreadNotifications: state.unreadNotifications,
      }),
    }
  )
);