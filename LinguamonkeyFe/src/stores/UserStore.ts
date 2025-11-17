import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  UserProfile,
  Language,
  Lesson,
  Character3D,
  ApiResponse,
} from '../types/api';
import instance from '../api/axiosInstance';
import { UserResponse } from '../types/api';

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
  recentLessons: Lesson[];
  statusMessage: string;
  hasDonePlacementTest?: boolean;

  // ACTIONS CƠ BẢN
  setUser: (user: UserResponse | null, detectedLanguage?: string) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setProfileData: (data: Partial<UserState>) => void;
  logout: () => void;
  setHasDonePlacementTest: (value: boolean) => void;

  // ACTIONS TỪ API
  saveProfileToServer: (
    userId: string,
    payload: any,
  ) => Promise<UserResponse | any>;
  fetchCharacter3d: () => Promise<Character3D | null>;

  // ACTIONS MỚI CHO FILE UPLOAD
  uploadTemp: (file: UploadFile) => Promise<string>;
  deleteTempFile: (path: string) => Promise<void>;
  updateUserAvatar: (tempPath: string) => Promise<UserResponse>;

  setLocalNativeLanguage: (languageId: string) => void; // <-- MỚI
  updateNativeLanguageOnServer: (languageId: string) => Promise<void>;
}

// --- TRẠNG THÁI MẶC ĐỊNH ---
const defaultUserState: Omit<
  UserState,
  | 'setUser'
  | 'setAuthenticated'
  | 'setProfileData'
  | 'logout'
  | 'setHasDonePlacementTest'
  | 'saveProfileToServer'
  | 'fetchCharacter3d'
  | 'setNativeLanguage'
  | 'uploadTemp'
  | 'deleteTempFile'
  | 'updateUserAvatar'
  | 'setLocalNativeLanguage'
  | 'updateNativeLanguageOnServer'
> = {
  user: null,
  isAuthenticated: false,
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
  recentLessons: [],
  statusMessage: '',
  hasDonePlacementTest: undefined,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...defaultUserState,

      setUser: (user, detectedLanguage) => {
        if (!user) {
          set(defaultUserState);
          return;
        }

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
          badges: (user as any).badges ?? [],
          character3dId: user.character3dId,
          authProvider: user.authProvider,

          statusMessage: user.bio ?? '',

          languages: user.languages ?? [],

          hasDonePlacementTest: (user as any).hasDonePlacementTest,
        });
        if (user.nativeLanguageCode) {
          set({ nativeLanguageId: user.nativeLanguageCode });
        } else if (detectedLanguage) {
          console.log(
            'User has no native language. Syncing detected language to server:',
            detectedLanguage
          );
          get().updateNativeLanguageOnServer(detectedLanguage);
          set({ nativeLanguageId: detectedLanguage }); // Cập nhật local state ngay
        }
      },

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      setProfileData: (data) => set((state) => ({ ...state, ...data })),

      setHasDonePlacementTest: (value) => set({ hasDonePlacementTest: value }),

      logout: () => set(defaultUserState),


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
          const res = await instance.put<ApiResponse<UserResponse>>(
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
          const res = await instance.get<ApiResponse<Character3D>>(
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
          const res = await instance.patch<ApiResponse<UserResponse>>(
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
    }),
    {
      name: 'user-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,

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
        recentLessons: state.recentLessons,
        statusMessage: state.statusMessage,
        hasDonePlacementTest: state.hasDonePlacementTest,
      }),
    },
  ),
);