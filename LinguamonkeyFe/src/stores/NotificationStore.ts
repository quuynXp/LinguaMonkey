import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification, UserReminder } from '../types/api';

interface NotificationState {
  notifications: Notification[];
  reminders: UserReminder[];
  unreadNotifications: number;

  addNotification: (notification: Notification) => void;
  addReminder: (reminder: UserReminder) => void;
  markAsRead: (notificationId: string) => void;
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
          unreadNotifications: state.unreadNotifications + 1,
        })),
      addReminder: (reminder) => set((state) => ({ reminders: [...state.reminders, reminder] })),
      markAsRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, read: true } : n
          ),
          unreadNotifications: state.unreadNotifications - 1,
        })),
      clearNotifications: () => set({ notifications: [], reminders: [], unreadNotifications: 0 }),
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