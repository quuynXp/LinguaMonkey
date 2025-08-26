import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Language, Lesson } from '../types/api';


interface DailyGoal {
  completedLessons: number;
  totalLessons: number;
}


interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  badges: string[];
  nativeLanguage: string | null;
  level?: number;

  // 🔥 Các field thêm để khớp với HomeScreen
  name: string;
  streak: number;
  languages: Language[];
  dailyGoal: DailyGoal;
  recentLessons: Lesson[];
  statusMessage: string;
  hasDonePlacementTest?: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setUserId: (userId: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  addBadge: (badgeId: string) => void;
  setNativeLanguage: (language: string | null) => void;
  setProfileData: (data: Partial<UserState>) => void;
  logout: () => void;
  setHasDonePlacementTest: (value: boolean) => void;
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
      setUserId: (userId) => set((state) => ({ user: { ...state.user, userId } as UserProfile })),
      setNativeLanguage: (language) => set({ nativeLanguage: language }),
      setProfileData: (data) => set((state) => ({ ...state, ...data })),
      setHasDonePlacementTest: (value) => set({ hasDonePlacementTest: value }),
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
        hasDonePlacementTest: state.hasDonePlacementTest,
      }),
    }
  )
);
