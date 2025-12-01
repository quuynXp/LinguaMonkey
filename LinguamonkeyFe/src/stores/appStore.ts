import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Enums from '../types/enums';
import * as Entities from '../types/entity';

export interface CallPreferences {
  interests: string[];
  gender: 'any' | 'male' | 'female';
  nativeLanguage: string;
  learningLanguage: string;
  ageRange: string;
  callDuration: string;
}

export interface ChatSettings {
  autoTranslate: boolean;
  showOriginalButton: boolean;
  translateToVietnamese: boolean;
  soundNotifications: boolean;
  vibrationNotifications: boolean;
  showTypingIndicator: boolean;
  autoCorrect: boolean;
  wordSuggestions: boolean;
  saveTranslationHistory: boolean;
  offlineTranslation: boolean;
}

export interface NotificationPreferences {
  studyReminders: boolean;
  streakReminders: boolean;
  messageNotifications: boolean;
  coupleNotifications: boolean;
  groupInvitations: boolean;
  achievementNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderFrequency: 'daily' | 'weekdays' | 'custom';
  customDays: number[];
  studyTime: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface PrivacySettings {
  profileVisibility: boolean;
  progressSharing: boolean;
  dataCollection: boolean;
  personalization: boolean;
  analytics: boolean;
  crashReports: boolean;
  locationTracking: boolean;
  contactSync: boolean;
  searchPrivacy: boolean;
}

interface AppState {
  // Navigation state
  selectedGrammarTopic: Entities.GrammarTopic | null;
  selectedVideo: Entities.Video | null;
  selectedNoteTopic: string;
  selectedChapter: any;

  // Language settings
  supportLanguage: string[];
  languages: string[];
  nativeLanguage: string;

  // App settings
  theme: 'light' | 'dark';
  callPreferences: CallPreferences;
  chatSettings: ChatSettings;
  notificationPreferences: NotificationPreferences | null;
  privacySettings: PrivacySettings;

  // Actions
  setSelectedGrammarTopic: (topic: Entities.GrammarTopic | null) => void;
  setSelectedVideo: (video: Entities.Video | null) => void;
  setSupportLanguage: (languages: string[]) => void;
  setNativeLanguage: (language: string) => void;
  setLanguages: (languages: string[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedNoteTopic: (topicId: string) => void;
  setCallPreferences: (preferences: CallPreferences) => void;
  setChatSettings: (settings: Partial<ChatSettings>) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  toggleNotification: (field: keyof NotificationPreferences, value?: boolean) => void;
  togglePrivacy: (field: keyof PrivacySettings, value?: boolean) => void;
  setPrivacySettings: (settings: Partial<PrivacySettings>) => void;
  resetChatSettings: () => void;
  resetPrivacySettings: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedChapter: null,
      selectedGrammarTopic: null,
      selectedVideo: null,
      supportLanguage: ['en', 'vi', 'zh'],
      nativeLanguage: 'vi',
      languages: ['en', 'vi'],
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
        studyTime: '20:00',
        quietHours: { enabled: false, start: '22:00', end: '07:00' },
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
        searchPrivacy: false,
      },

      setSelectedGrammarTopic: (topic) => set({ selectedGrammarTopic: topic }),
      setSupportLanguage: (langs) => set({ supportLanguage: langs }),
      setSelectedVideo: (video) => set({ selectedVideo: video }),
      setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
      setLanguages: (langs) => set({ languages: langs }),
      setTheme: (theme) => set({ theme }),
      setSelectedNoteTopic: (topicId) => set({ selectedNoteTopic: topicId }),
      setCallPreferences: (prefs) => set({ callPreferences: prefs }),
      setChatSettings: (settings) =>
        set((state) => ({ chatSettings: { ...state.chatSettings, ...settings } })),

      setNotificationPreferences: (prefs) => set({ notificationPreferences: prefs }),
      updateNotificationPreferences: (prefs) =>
        set((state) => ({
          notificationPreferences: state.notificationPreferences
            ? { ...state.notificationPreferences, ...prefs }
            : prefs as NotificationPreferences,
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
            searchPrivacy: false,
          },
        }),

      logout: () =>
        set({
          notificationPreferences: null,
          selectedGrammarTopic: null,
          selectedVideo: null,
          selectedNoteTopic: 'all',
        }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        supportLanguage: state.supportLanguage,
        nativeLanguage: state.nativeLanguage,
        languages: state.languages,
        theme: state.theme,
        callPreferences: state.callPreferences,
        chatSettings: state.chatSettings,
        notificationPreferences: state.notificationPreferences,
        privacySettings: state.privacySettings,
        selectedNoteTopic: state.selectedNoteTopic,
      }),
    },
  ),
);