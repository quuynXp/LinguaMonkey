import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Entities from '../types/entity';

export interface CallPreferences {
  interests: string[];
  gender: 'any' | 'male' | 'female';
  nativeLanguage: string;
  learningLanguage: string;
  ageRange: string;
}

export interface ChatSettings {
  autoTranslate: boolean;
  targetLanguage?: string;
}

export interface NotificationPreferences {
  studyReminders: boolean;
  streakReminders: boolean;
  dailyChallengeReminders: boolean;
  courseReminders: boolean;
  coupleReminders: boolean;
  vipReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PrivacySettings {
  profileVisibility: boolean;
  progressSharing: boolean;
  searchPrivacy: boolean;
}

export interface LoginInputState {
  email: string;
  password: string;
  phoneNumber: string;
  loginMethod: 'email' | 'phone';
  useOtpForEmail: boolean;
}

export interface RegisterInputState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface AppState {
  selectedGrammarTopic: Entities.GrammarTopic | null;
  selectedVideo: Entities.Video | null;
  selectedNoteTopic: string;
  selectedChapter: any;

  supportLanguage: string[];
  languages: string[];
  nativeLanguage: string;

  theme: 'light' | 'dark';
  callPreferences: CallPreferences;
  chatSettings: ChatSettings;
  notificationPreferences: NotificationPreferences;
  privacySettings: PrivacySettings;

  loginInput: LoginInputState;
  registerInput: RegisterInputState;
  forgotPasswordInput: string;

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
  toggleNotification: (field: keyof NotificationPreferences, value?: boolean) => void;

  setPrivacySettings: (settings: Partial<PrivacySettings>) => void;
  togglePrivacy: (field: keyof PrivacySettings, value?: boolean) => void;

  resetChatSettings: () => void;
  resetPrivacySettings: () => void;
  logout: () => void;

  setLoginInput: (input: Partial<LoginInputState>) => void;
  setRegisterInput: (input: Partial<RegisterInputState>) => void;
  setForgotPasswordInput: (input: string) => void;
  resetAuthInputs: () => void;
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
      },

      chatSettings: {
        autoTranslate: false,
        targetLanguage: 'vi',
      },

      notificationPreferences: {
        studyReminders: true,
        streakReminders: true,
        dailyChallengeReminders: true,
        courseReminders: true,
        coupleReminders: true,
        vipReminders: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },

      privacySettings: {
        profileVisibility: true,
        progressSharing: false,
        searchPrivacy: true,
      },

      loginInput: {
        email: '',
        password: '',
        phoneNumber: '',
        loginMethod: 'email',
        useOtpForEmail: false,
      },

      registerInput: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
      },

      forgotPasswordInput: '',

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

      toggleNotification: (field, value) =>
        set((state) => {
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
            autoTranslate: false,
            targetLanguage: 'vi',
          },
        }),

      resetPrivacySettings: () =>
        set({
          privacySettings: {
            profileVisibility: true,
            progressSharing: false,
            searchPrivacy: true,
          },
        }),

      setLoginInput: (input) => set((state) => ({ loginInput: { ...state.loginInput, ...input } })),
      setRegisterInput: (input) => set((state) => ({ registerInput: { ...state.registerInput, ...input } })),
      setForgotPasswordInput: (input) => set({ forgotPasswordInput: input }),

      resetAuthInputs: () => set({
        loginInput: { email: '', password: '', phoneNumber: '', loginMethod: 'email', useOtpForEmail: false },
        registerInput: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
        forgotPasswordInput: ''
      }),

      logout: () =>
        set({
          chatSettings: { autoTranslate: false, targetLanguage: 'vi' },
          notificationPreferences: {
            studyReminders: true,
            streakReminders: true,
            dailyChallengeReminders: true,
            courseReminders: true,
            coupleReminders: true,
            vipReminders: true,
            soundEnabled: true,
            vibrationEnabled: true,
          },
          privacySettings: {
            profileVisibility: true,
            progressSharing: false,
            searchPrivacy: true,
          },
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
        loginInput: { ...state.loginInput, password: '' },
        registerInput: { ...state.registerInput, password: '', confirmPassword: '' },
        forgotPasswordInput: state.forgotPasswordInput,
      }),
    },
  ),
);