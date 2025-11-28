import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserResponse, Character3dResponse } from '../types/dto';
import instance from '../api/axiosClient';

interface DailyGoal {
  completedLessons: number;
  totalLessons: number;
}

interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

interface UserState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  fcmToken: string | null;
  deviceId: string | null;
  isTokenRegistered: boolean;
  name: string;
  streak: number;
  level?: number;
  exp?: number;
  expToNextLevel?: number;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  country?: string;
  progress?: number;
  nativeLanguageId?: string;
  badgeId?: string;
  badges: string[];
  character3dId?: string;
  authProvider?: string;
  languages: string[];
  dailyGoal: DailyGoal;
  statusMessage: string;
  gender?: string;
  hasDonePlacementTest?: boolean;
  hasFinishedSetup?: boolean;
  lastDailyWelcomeAt?: string;
  isDailyGoalAchieved: boolean;
  isVip: boolean;

  setToken: (token: string) => void;
  setDeviceId: (id: string) => void;
  setTokenRegistered: (isRegistered: boolean) => void;
  setUser: (user: UserResponse | null, detectedLanguage?: string) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setProfileData: (data: Partial<UserState>) => void;
  logout: () => void;

  saveProfileToServer: (userId: string, payload: any) => Promise<UserResponse | any>;
  fetchCharacter3d: () => Promise<Character3dResponse | null>;
  uploadTemp: (file: UploadFile) => Promise<string>;
  deleteTempFile: (path: string) => Promise<void>;
  updateUserAvatar: (tempPath: string) => Promise<UserResponse>;
  setLocalNativeLanguage: (languageId: string) => void;
  updateNativeLanguageOnServer: (languageId: string) => Promise<void>;
  finishSetup: () => Promise<void>;
  finishPlacementTest: () => Promise<void>;
  trackDailyWelcome: () => Promise<void>;
  updateStreakAndDailyGoal: (id: string) => Promise<UserResponse | null>;
  registerVip: () => Promise<string | null>; // Returns Payment URL
}

const defaultUserState: Omit<UserState, keyof {
  setUser: any;
  setAuthenticated: any;
  setProfileData: any;
  logout: any;
  saveProfileToServer: any;
  fetchCharacter3d: any;
  uploadTemp: any;
  deleteTempFile: any;
  updateUserAvatar: any;
  setLocalNativeLanguage: any;
  updateNativeLanguageOnServer: any;
  setToken: any;
  setDeviceId: any;
  setTokenRegistered: any;
  finishSetup: any;
  finishPlacementTest: any;
  trackDailyWelcome: any;
  updateStreakAndDailyGoal: any;
  registerVip: any;
}> = {
  user: null,
  isAuthenticated: false,
  fcmToken: null,
  deviceId: null,
  isTokenRegistered: false,
  name: '',
  streak: 0,
  level: undefined,
  exp: undefined,
  expToNextLevel: undefined,
  avatarUrl: undefined,
  bio: undefined,
  phone: undefined,
  country: undefined,
  progress: undefined,
  nativeLanguageId: undefined,
  badgeId: undefined,
  character3dId: undefined,
  authProvider: undefined,
  badges: [],
  languages: [],
  dailyGoal: { completedLessons: 0, totalLessons: 0 },
  statusMessage: '',
  gender: undefined,
  hasDonePlacementTest: undefined,
  hasFinishedSetup: undefined,
  lastDailyWelcomeAt: undefined,
  isDailyGoalAchieved: false,
  isVip: false,
};

const getInitialState = (): Partial<UserState> => ({
  ...defaultUserState
});

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...defaultUserState,

      setToken: (token) => set({ fcmToken: token, isTokenRegistered: false }),
      setDeviceId: (id) => set({ deviceId: id }),
      setTokenRegistered: (isRegistered) => set({ isTokenRegistered: isRegistered }),

      setUser: (user, detectedLanguage) => {
        if (!user) {
          set(getInitialState() as UserState);
          return;
        }

        const rawUser = user as any;
        const todayDate = new Date().toISOString().split('T')[0];
        const lastStreakCheckDate = rawUser.lastStreakCheckDate;

        set({
          user: user,
          isAuthenticated: true,
          name: user.fullname ?? user.nickname ?? '',
          streak: user.streak ?? 0,
          level: user.level,
          exp: user.exp,
          expToNextLevel: user.expToNextLevel,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          phone: user.phone,
          country: user.country,
          progress: user.progress ? Number(user.progress) : undefined,
          nativeLanguageId: user.nativeLanguageCode,
          badgeId: user.badgeId,
          character3dId: user.character3dId,
          authProvider: user.authProvider,
          statusMessage: user.bio ?? '',
          languages: user.languages ?? [],
          gender: user.gender,
          hasDonePlacementTest: rawUser.hasDonePlacementTest,
          hasFinishedSetup: rawUser.hasFinishedSetup,
          lastDailyWelcomeAt: rawUser.lastDailyWelcomeAt,
          isDailyGoalAchieved: !!lastStreakCheckDate && lastStreakCheckDate === todayDate,
          isVip: rawUser.isVip ?? false,
        });

        if (user.nativeLanguageCode) {
          set({ nativeLanguageId: user.nativeLanguageCode });
        } else if (detectedLanguage) {
          get().updateNativeLanguageOnServer(detectedLanguage);
          set({ nativeLanguageId: detectedLanguage });
        }
      },

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setProfileData: (data) => set((state) => ({ ...state, ...data })),
      logout: () => set(getInitialState() as UserState),

      setLocalNativeLanguage: (languageId: string) => {
        set({ nativeLanguageId: languageId });
      },

      updateNativeLanguageOnServer: async (languageId: string) => {
        set({ nativeLanguageId: languageId });
        const user = get().user;
        if (!user?.userId) return;

        try {
          await instance.patch(`/api/v1/users/${user.userId}/native-language`, null, {
            params: { nativeLanguageCode: languageId },
          });
        } catch (err) {
          console.error('Failed to update native language on server:', err);
        }
      },

      saveProfileToServer: async (userId, payload) => {
        try {
          const res = await instance.put<any>(`/api/v1/users/${userId}`, payload);
          if (res?.data?.result) {
            get().setUser(res.data.result);
            return res.data.result;
          }
          throw new Error(res?.data?.message || 'Save failed');
        } catch (err) {
          throw err;
        }
      },

      fetchCharacter3d: async () => {
        const { user } = get();
        if (!user?.userId) return null;
        try {
          const res = await instance.get<any>(`/api/v1/users/${user.userId}/character3d`);
          if (res.data.code === 200 && res.data.result) {
            return res.data.result;
          }
          return null;
        } catch (error) {
          return null;
        }
      },

      uploadTemp: async (file: UploadFile) => {
        const form = new FormData();
        form.append('file', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);

        try {
          const res = await instance.post('/api/v1/files/upload-temp', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return res.data as string;
        } catch (error) {
          throw error;
        }
      },

      deleteTempFile: async (path: string) => {
        try {
          await instance.delete('/api/v1/files/temp', { params: { path } });
        } catch (error) {
          console.error('Delete temp file failed:', error);
        }
      },

      updateUserAvatar: async (tempPath: string) => {
        const { user } = get();
        if (!user || !user.userId) throw new Error('User not authenticated');

        try {
          const res = await instance.patch<any>(`/api/v1/users/${user.userId}/avatar`, null, {
            params: { tempPath },
          });

          if (res.data && res.data.code === 200 && res.data.result) {
            get().setUser(res.data.result);
            return res.data.result;
          } else {
            throw new Error(res.data.message || 'Avatar update failed');
          }
        } catch (error) {
          throw error;
        }
      },

      finishSetup: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await instance.patch(`/api/v1/users/${user.userId}/setup-status`, null, {
            params: { isFinished: true },
          });
          if (res.data.code === 200) {
            get().setUser(res.data.result);
          }
        } catch (e) {
          console.error("Failed to update setup status", e);
        }
      },

      finishPlacementTest: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await instance.patch(`/api/v1/users/${user.userId}/placement-test-status`, null, {
            params: { isDone: true },
          });
          if (res.data.code === 200) {
            get().setUser(res.data.result);
          }
        } catch (e) {
          console.error("Failed to update placement test status", e);
        }
      },

      trackDailyWelcome: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await instance.patch(`/api/v1/users/${user.userId}/daily-welcome`);
          if (res.data.code === 200) {
            get().setUser(res.data.result);
          }
        } catch (e) {
          console.error("Failed to track daily welcome", e);
        }
      },

      updateStreakAndDailyGoal: async (id: string) => {
        try {
          const res = await instance.patch<any>(`/api/v1/users/${id}/streak`);
          if (res.data && res.data.code === 200 && res.data.result) {
            const updatedUser = res.data.result;
            get().setUser(updatedUser);

            const rawUser = updatedUser as any;
            const todayDate = new Date().toISOString().split('T')[0];

            if (rawUser.lastStreakCheckDate === todayDate) {
              set({ isDailyGoalAchieved: true });
            }

            return updatedUser as UserResponse;
          } else {
            throw new Error(res.data.message || 'Streak update failed');
          }
        } catch (error) {
          console.error('Update streak failed:', error);
          throw error;
        }
      },

      registerVip: async () => {
        const { user } = get();
        if (!user?.userId) return null;
        try {
          // Call Transaction Service to create payment session for $1 trial
          const payload = {
            userId: user.userId,
            amount: 1.00,
            currency: 'USD',
            description: 'VIP 14-Day Trial Activation',
            returnUrl: 'yourapp://vip-result' // Deep link back to app
          };

          const res = await instance.post('/api/v1/transactions/payment-url', payload);
          if (res.data && res.data.result) {
            return res.data.result; // Returns Stripe URL
          }
          return null;
        } catch (e) {
          console.error("VIP registration failed", e);
          throw e;
        }
      }
    }),
    {
      name: 'user-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        fcmToken: state.fcmToken,
        deviceId: state.deviceId,
        name: state.name,
        streak: state.streak,
        level: state.level,
        exp: state.exp,
        expToNextLevel: state.expToNextLevel,
        avatarUrl: state.avatarUrl,
        bio: state.bio,
        phone: state.phone,
        country: state.country,
        progress: state.progress,
        nativeLanguageId: state.nativeLanguageId,
        badgeId: state.badgeId,
        badges: state.badges,
        character3dId: state.character3dId,
        authProvider: state.authProvider,
        languages: state.languages,
        dailyGoal: state.dailyGoal,
        statusMessage: state.statusMessage,
        gender: state.gender,
        hasDonePlacementTest: state.hasDonePlacementTest,
        hasFinishedSetup: state.hasFinishedSetup,
        lastDailyWelcomeAt: state.lastDailyWelcomeAt,
        isDailyGoalAchieved: state.isDailyGoalAchieved,
        isVip: state.isVip,
      }),
    },
  ),
);