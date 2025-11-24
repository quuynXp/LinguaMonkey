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

  // Status flags synced with backend
  hasDonePlacementTest?: boolean;
  hasFinishedSetup?: boolean;
  lastDailyWelcomeAt?: string;

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

  // New Actions for Status Tracking
  finishSetup: () => Promise<void>;
  finishPlacementTest: () => Promise<void>;
  trackDailyWelcome: () => Promise<void>;
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
  hasDonePlacementTest: undefined,
  hasFinishedSetup: undefined,
  lastDailyWelcomeAt: undefined,
};

const getInitialState = (): Partial<UserState> => ({
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
  hasDonePlacementTest: undefined,
  hasFinishedSetup: undefined,
  lastDailyWelcomeAt: undefined,
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

        // Map backend fields, even if not strictly in TS interface yet
        const rawUser = user as any;

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

          // Map dynamic status fields from backend user object
          hasDonePlacementTest: rawUser.hasDonePlacementTest,
          hasFinishedSetup: rawUser.hasFinishedSetup,
          lastDailyWelcomeAt: rawUser.lastDailyWelcomeAt,
        });

        if (user.nativeLanguageCode) {
          set({ nativeLanguageId: user.nativeLanguageCode });
        } else if (detectedLanguage) {
          console.log(
            'User has no native language. Syncing detected language to server:',
            detectedLanguage
          );
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
        if (!user?.userId) {
          console.error('Cannot update native language, user not logged in.');
          return;
        }

        try {
          await instance.patch(`/api/v1/users/${user.userId}/native-language`, null, {
            params: { nativeLanguageCode: languageId },
          });
          console.log('Native language updated on server');
        } catch (err) {
          console.error('Failed to update native language on server:', err);
        }
      },

      saveProfileToServer: async (userId, payload) => {
        try {
          const res = await instance.put<any>(
            `/api/v1/users/${userId}`,
            payload,
          );
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
        if (!user?.userId) {
          console.warn('fetchCharacter3d: User not found');
          return null;
        }
        try {
          const res = await instance.get<any>(
            `/api/v1/users/${user.userId}/character3d`,
          );
          if (res.data.code === 200 && res.data.result) {
            return res.data.result;
          }
          return null;
        } catch (error) {
          console.error('Fetch character 3D failed:', error);
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
          console.error('Upload temp failed:', error);
          throw error;
        }
      },

      deleteTempFile: async (path: string) => {
        try {
          await instance.delete('/api/v1/files/temp', {
            params: { path },
          });
        } catch (error) {
          console.error('Delete temp file failed:', error);
        }
      },

      updateUserAvatar: async (tempPath: string) => {
        const { user } = get();
        if (!user || !user.userId) {
          throw new Error('User not authenticated');
        }

        try {
          const res = await instance.patch<any>(
            `/api/v1/users/${user.userId}/avatar`,
            null,
            {
              params: { tempPath },
            },
          );

          if (res.data && res.data.code === 200 && res.data.result) {
            get().setUser(res.data.result);
            return res.data.result;
          } else {
            throw new Error(res.data.message || 'Avatar update failed');
          }
        } catch (error) {
          console.error('Update user avatar failed:', error);
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
        hasDonePlacementTest: state.hasDonePlacementTest,
        hasFinishedSetup: state.hasFinishedSetup,
        lastDailyWelcomeAt: state.lastDailyWelcomeAt,
      }),
    },
  ),
);