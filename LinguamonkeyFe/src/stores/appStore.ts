import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { UserProfile, GrammarTopic, BilingualVideo } from '../types/api'

interface CallPreferences {
  interests: string[]
  gender: 'any' | 'male' | 'female'
  nativeLanguage: string
  learningLanguage: string
  ageRange: string
  callDuration: string
}

interface ChatSettings {
  autoTranslate: boolean
  showOriginalButton: boolean
  translateToVietnamese: boolean
  soundNotifications: boolean
  vibrationNotifications: boolean
  showTypingIndicator: boolean
  autoCorrect: boolean
  wordSuggestions: boolean
  saveTranslationHistory: boolean
  offlineTranslation: boolean
}

interface NotificationPreferences {
  studyReminders: boolean
  streakReminders: boolean
  messageNotifications: boolean
  coupleNotifications: boolean
  groupInvitations: boolean
  achievementNotifications: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  reminderFrequency: 'daily' | 'weekdays' | 'custom'
  customDays: number[]
  studyTime: string
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

interface PrivacySettings {
  profileVisibility: boolean
  progressSharing: boolean
  dataCollection: boolean
  personalization: boolean
  analytics: boolean
  crashReports: boolean
  locationTracking: boolean
  contactSync: boolean
}

interface AppState {
  user: UserProfile | null
  isAuthenticated: boolean
  selectedGrammarTopic: GrammarTopic | null
  selectedVideo: BilingualVideo | null
  currentLanguage: string
  theme: 'light' | 'dark'
  selectedNoteTopic: string
  callPreferences: CallPreferences
  chatSettings: ChatSettings
  notificationPreferences: NotificationPreferences | null
  privacySettings: PrivacySettings

  // Actions
  setUser: (user: UserProfile | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setSelectedGrammarTopic: (topic: GrammarTopic | null) => void
  setSelectedVideo: (video: BilingualVideo | null) => void
  setCurrentLanguage: (language: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedNoteTopic: (topicId: string) => void
  setCallPreferences: (preferences: CallPreferences) => void
  setChatSettings: (settings: Partial<ChatSettings>) => void
  setNotificationPreferences: (preferences: NotificationPreferences) => void
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void
  toggleNotification: (field: keyof NotificationPreferences, value?: boolean) => void
  togglePrivacy: (field: keyof PrivacySettings, value?: boolean) => void
  setPrivacySettings: (settings: Partial<PrivacySettings>) => void
  resetChatSettings: () => void
  resetPrivacySettings: () => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ==== state ====
      user: null,
      isAuthenticated: false,
      selectedChapter: null,
      selectedGrammarTopic: null,
      selectedVideo: null,
      currentLanguage: 'en',
      theme: 'light',
      selectedNoteTopic: 'all',
      callPreferences: {
        interests: [],
        gender: 'any',
        nativeLanguage: 'en',
        learningLanguage: 'vi',
        ageRange: '18-30',
        callDuration: '15',
      },
      chatSettings: {
        autoTranslate: true,
        showOriginalButton: true,
        translateToVietnamese: true,
        soundNotifications: true,
        vibrationNotifications: false,
        showTypingIndicator: true,
        autoCorrect: true,
        wordSuggestions: true,
        saveTranslationHistory: true,
        offlineTranslation: false,
      },
      notificationPreferences: {
        studyReminders: false,
        streakReminders: false,
        messageNotifications: false,
        coupleNotifications: false,
        groupInvitations: false,
        achievementNotifications: false,
        soundEnabled: true,
        vibrationEnabled: true,
        reminderFrequency: 'daily',
        customDays: [],
        studyTime: "20:00",
        quietHours: { enabled: false, start: "22:00", end: "07:00" },
      },
      privacySettings: {
        profileVisibility: true,
        progressSharing: false,
        dataCollection: true,
        personalization: true,
        analytics: true,
        crashReports: true,
        locationTracking: false,
        contactSync: false,
      },

      // ==== actions ====
      setUser: (user) => set({ user }),
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setSelectedGrammarTopic: (topic) => set({ selectedGrammarTopic: topic }),
      setSelectedVideo: (video) => set({ selectedVideo: video }),
      setCurrentLanguage: (lang) => set({ currentLanguage: lang }),
      setTheme: (theme) => set({ theme }),
      setSelectedNoteTopic: (topicId) => set({ selectedNoteTopic: topicId }),
      setCallPreferences: (prefs) => set({ callPreferences: prefs }),
      setChatSettings: (settings) =>
        set((state) => ({ chatSettings: { ...state.chatSettings, ...settings } })),

      // notification
      setNotificationPreferences: (prefs) => set({ notificationPreferences: prefs }),
      updateNotificationPreferences: (prefs) =>
        set((state) => ({
          notificationPreferences: { ...state.notificationPreferences!, ...prefs },
        })),
      toggleNotification: (field, value) =>
        set((state) => {
          if (!state.notificationPreferences) return {};
          const current = state.notificationPreferences[field];
          return {
            notificationPreferences: {
              ...state.notificationPreferences,
              [field]: value !== undefined ? value : !current,
            },
          };
        }),

      // privacy
      setPrivacySettings: (settings) =>
        set((state) => ({
          privacySettings: { ...state.privacySettings, ...settings },
        })),
      togglePrivacy: (field, value) =>
        set((state) => {
          const current = state.privacySettings[field];
          return {
            privacySettings: {
              ...state.privacySettings,
              [field]: value !== undefined ? value : !current,
            },
          };
        }),

      resetChatSettings: () =>
        set({
          chatSettings: {
            autoTranslate: true,
            showOriginalButton: true,
            translateToVietnamese: true,
            soundNotifications: true,
            vibrationNotifications: false,
            showTypingIndicator: true,
            autoCorrect: true,
            wordSuggestions: true,
            saveTranslationHistory: true,
            offlineTranslation: false,
          },
        }),

      resetPrivacySettings: () =>
        set({
          privacySettings: {
            profileVisibility: true,
            progressSharing: false,
            dataCollection: true,
            personalization: true,
            analytics: true,
            crashReports: true,
            locationTracking: false,
            contactSync: false,
          },
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          notificationPreferences: null,
        }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);