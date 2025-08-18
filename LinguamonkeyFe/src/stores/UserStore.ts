import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '../types/api';

interface LanguageInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  quickLessonTime: number;
}

interface DailyGoal {
  completedLessons: number;
  totalLessons: number;
}

interface Lesson {
  id: string;
  title: string;
  language: string;
  lessonNumber: number;
}

interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  badges: string[];
  nativeLanguage: string | null;

  // 🔥 Các field thêm để khớp với HomeScreen
  name: string;
  streak: number;
  languages: LanguageInfo[];
  dailyGoal: DailyGoal;
  recentLessons: Lesson[];
  statusMessage: string;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  addBadge: (badgeId: string) => void;
  setNativeLanguage: (language: string | null) => void;
  setProfileData: (data: Partial<UserState>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      badges: [],
      nativeLanguage: null,

      // default values
      name: "",
      streak: 0,
      languages: [],
      dailyGoal: { completedLessons: 0, totalLessons: 0 },
      recentLessons: [],
      statusMessage: "",

      setUser: (user) => set({ user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      addBadge: (badgeId) =>
        set((state) => ({ badges: [...state.badges, badgeId] })),
      setNativeLanguage: (language) => set({ nativeLanguage: language }),
      setProfileData: (data) => set((state) => ({ ...state, ...data })),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          badges: [],
          nativeLanguage: null,
          name: "",
          streak: 0,
          languages: [],
          dailyGoal: { completedLessons: 0, totalLessons: 0 },
          recentLessons: [],
          statusMessage: "",
        }),
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        badges: state.badges,
        nativeLanguage: state.nativeLanguage,
        name: state.name,
        streak: state.streak,
        languages: state.languages,
        dailyGoal: state.dailyGoal,
        recentLessons: state.recentLessons,
        statusMessage: state.statusMessage,
      }),
    }
  )
);
