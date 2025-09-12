// stores/UserStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Language, Lesson } from '../types/api';
import instance from '../api/axiosInstance';

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
  expToNextLevel?: number,

  name: string;
  streak: number;
  languages: string[];
  dailyGoal: DailyGoal;
  recentLessons: Lesson[];
  statusMessage: string;
  hasDonePlacementTest?: boolean;

  // actions
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
      name: '',
      streak: 0,
      languages: [],
      dailyGoal: { completedLessons: 0, totalLessons: 0 },
      recentLessons: [],
      statusMessage: '',

      setUser: (user) =>
        set((state) => {
          if (!user) {
            return {
              user: null,
              name: '',
              streak: 0,
              languages: [],
            }
          }
          return {
            user,
            name: user.fullname ?? user.nickname ?? state.name,
            streak: user.streak ?? 0,
            nativeLanguage: user.nativeLanguageCode ?? user.nativeLanguageId ?? state.nativeLanguage,
            level: user.level ?? state.level,
            expToNextLevel: user.expToNextLevel ?? state.expToNextLevel,
            languages: user.languages ?? state.languages,
            badges: user.badgeId ? [...state.badges, user.badgeId] : state.badges,
            hasDonePlacementTest: user.hasDonePlacementTest ?? state.hasDonePlacementTest,
            statusMessage: user.bio ?? state.statusMessage,
          }
        }),

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      addBadge: (badgeId) => set((state) => ({ badges: [...state.badges, badgeId] })),
      setUserId: (userId) =>
        set((state) => ({ user: state.user ? { ...state.user, userId } : state.user as any })),
      setNativeLanguage: (language) => set({ nativeLanguage: language }),
      setProfileData: (data) => set((state) => ({ ...state, ...data })),

      saveProfileToServer: async (userId, payload) => {
        try {
          const res = await instance.put(`/users/${userId}`, payload);
          if (res?.data?.result) {
            set((state) => ({ user: res.data.result, name: res.data.result.fullname ?? state.name }));
            return res.data.result;
          }
          throw new Error(res?.data?.message || 'Save failed');
        } catch (err) {
          throw err;
        }
      },

      setHasDonePlacementTest: (value) => set({ hasDonePlacementTest: value }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          badges: [],
          nativeLanguage: null,
          name: '',
          streak: 0,
          languages: [],
          dailyGoal: { completedLessons: 0, totalLessons: 0 },
          recentLessons: [],
          statusMessage: '',
          hasDonePlacementTest: false,
        }),
    }),
    {
      name: 'user-storage-v2',
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
        level: state.level,
        expToNextLevel: state.expToNextLevel,
        exp: state.user?.exp,
        progress: state.user?.progress,
        avatarUrl: state.user?.avatarUrl,
        bio: state.user?.bio,
        phone: state.user?.phone,
        character3dId: state.user?.character3dId,
        badgeId: state.user?.badgeId,
        nativeLanguageId: state.user?.nativeLanguageId,
        authProvider: state.user?.authProvider,
        country: state.user?.country,
        ageRange: state.user?.ageRange,
        proficiency: state.user?.proficiency,
        certificationIds: state.user?.certificationIds,
        interestestIds: state.user?.interestestIds,
        goalIds: state.user?.goalIds,
        learningPace: state.user?.learningPace,
        isDeleted: state.user?.isDeleted,
        createdAt: state.user?.createdAt,
        updatedAt: state.user?.updatedAt,
      }),
    }
  )
);
