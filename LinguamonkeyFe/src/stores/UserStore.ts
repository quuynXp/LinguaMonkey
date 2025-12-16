import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import type { UserResponse, Character3dResponse } from '../types/dto';
import { privateClient, mediaClient } from '../api/axiosClient';
import i18n from '../i18n';

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
  coins: number;
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
  dayOfBirth?: string;
  hasDonePlacementTest?: boolean;
  hasFinishedSetup?: boolean;
  lastDailyWelcomeAt?: string;
  isDailyGoalAchieved: boolean;
  vip: boolean;
  vipDaysRemaining: number;

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
  registerVip: () => Promise<string | null>;
  refreshUserProfile: () => Promise<void>;

  initOnlineStatusTracker: () => void;
  sendHeartbeat: () => Promise<void>;
}

const defaultUserState: any = {
  user: null,
  isAuthenticated: false,
  fcmToken: null,
  deviceId: null,
  isTokenRegistered: false,
  name: '',
  streak: 0,
  coins: 0,
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
  dayOfBirth: undefined,
  hasDonePlacementTest: undefined,
  hasFinishedSetup: undefined,
  lastDailyWelcomeAt: undefined,
  isDailyGoalAchieved: false,
  vip: false,
  vipDaysRemaining: 0,
};

let heartbeatInterval: number | null = null;
let lastHeartbeatTime = 0;
const HEARTBEAT_DELAY = 5 * 60 * 1000; // 5 minutes

// Helper để sync ngôn ngữ giữa Zustand, i18next và AsyncStorage
const syncLanguage = async (langCode: string) => {
  if (!langCode) return;
  try {
    // 1. Đổi ngôn ngữ runtime ngay lập tức
    if (i18n.language !== langCode) {
      await i18n.changeLanguage(langCode);
    }
    // 2. Lưu vào key riêng mà detector của i18n.ts đang đọc ('user-language')
    // Lưu ý: user-storage-v2 của zustand là key khác, i18n detector đọc key 'user-language'
    await AsyncStorage.setItem('user-language', langCode);
  } catch (error) {
    console.error('Error syncing language:', error);
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...defaultUserState,

      setToken: (token) => set({ fcmToken: token, isTokenRegistered: false }),
      setDeviceId: (id) => set({ deviceId: id }),
      setTokenRegistered: (isRegistered) => set({ isTokenRegistered: isRegistered }),

      setUser: (user, detectedLanguage) => {
        if (!user) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          lastHeartbeatTime = 0;
          set({ ...defaultUserState });
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
          coins: rawUser.coins ?? 0,
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
          dayOfBirth: rawUser.dayOfBirth,
          hasDonePlacementTest: rawUser.hasDonePlacementTest,
          hasFinishedSetup: rawUser.hasFinishedSetup,
          lastDailyWelcomeAt: rawUser.lastDailyWelcomeAt,
          isDailyGoalAchieved: !!lastStreakCheckDate && lastStreakCheckDate === todayDate,
          vip: (rawUser.vip === true || rawUser.vip === 'true'),
          vipDaysRemaining: rawUser.vipDaysRemaining || 0,
        });

        // Ưu tiên nativeLanguageCode từ DB user trả về
        if (user.nativeLanguageCode) {
          set({ nativeLanguageId: user.nativeLanguageCode });
          syncLanguage(user.nativeLanguageCode);
        } else if (detectedLanguage) {
          // Nếu user chưa có, dùng ngôn ngữ detect được
          get().updateNativeLanguageOnServer(detectedLanguage);
          set({ nativeLanguageId: detectedLanguage });
          syncLanguage(detectedLanguage);
        }

        lastHeartbeatTime = 0;
        get().initOnlineStatusTracker();
      },

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setProfileData: (data) => set((state) => ({ ...state, ...data })),
      logout: () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        lastHeartbeatTime = 0;
        set({ ...defaultUserState });
        // Tùy chọn: Có reset ngôn ngữ về EN hay giữ nguyên ngôn ngữ hiện tại?
        // Thường UX tốt là giữ nguyên ngôn ngữ user đã chọn.
      },

      setLocalNativeLanguage: (languageId: string) => {
        set({ nativeLanguageId: languageId });
        syncLanguage(languageId);
      },

      updateNativeLanguageOnServer: async (languageId: string) => {
        set({ nativeLanguageId: languageId });
        syncLanguage(languageId);

        const user = get().user;
        if (!user?.userId) return;

        try {
          await privateClient.patch(`/api/v1/users/${user.userId}/native-language`, null, {
            params: { nativeLanguageCode: languageId },
          });
        } catch (err) {
          console.error('Failed to update native language on server:', err);
        }
      },

      saveProfileToServer: async (userId, payload) => {
        try {
          const res = await privateClient.put<any>(`/api/v1/users/${userId}`, payload);
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
          const res = await privateClient.get<any>(`/api/v1/users/${user.userId}/character3d`);
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
        const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '');
        const filename = file.name || uri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = file.type || (match ? `image/${match[1]}` : 'image/jpeg');

        form.append('file', {
          uri: uri,
          name: filename,
          type: type,
        } as any);

        try {
          const res = await mediaClient.post('/api/v1/files/upload-temp', form);
          return res.data as string;
        } catch (error) {
          console.error("Upload error details:", error);
          throw error;
        }
      },

      deleteTempFile: async (path: string) => {
        try {
          await privateClient.delete('/api/v1/files/temp', { params: { path } });
        } catch (error) {
          console.error('Delete temp file failed:', error);
        }
      },

      updateUserAvatar: async (tempPath: string) => {
        const { user } = get();
        if (!user || !user.userId) throw new Error('User not authenticated');

        try {
          const res = await privateClient.patch<any>(`/api/v1/users/${user.userId}/avatar`, null, {
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
        if (!user?.userId) {
          console.warn("finishSetup: User ID not found in store");
          throw new Error("User ID missing");
        }

        const res = await privateClient.patch(`/api/v1/users/${user.userId}/setup-status`, null, {
          params: { isFinished: true },
        });

        if (res.data.code === 200) {
          get().setUser(res.data.result);
        } else {
          throw new Error("Backend returned error: " + res.data.message);
        }
      },

      finishPlacementTest: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await privateClient.patch(`/api/v1/users/${user.userId}/placement-test-status`, null, {
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
          const res = await privateClient.patch(`/api/v1/users/${user.userId}/daily-welcome`);
          if (res.data.code === 200) {
            get().setUser(res.data.result);
          }
        } catch (e) {
          console.error("Failed to track daily welcome", e);
        }
      },

      updateStreakAndDailyGoal: async (id: string) => {
        try {
          const res = await privateClient.patch<any>(`/api/v1/users/${id}/streak`);
          if (res.data && res.data.code === 200 && res.data.result) {
            const updatedUser = res.data.result;
            get().setUser(updatedUser);
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
          const payload = {
            userId: user.userId,
            amount: 1.00,
            currency: 'USD',
            description: 'VIP 14-Day Trial Activation',
            returnUrl: 'yourapp://vip-result'
          };
          const res = await privateClient.post('/api/v1/transactions/payment-url', payload);
          if (res.data && res.data.result) {
            return res.data.result;
          }
          return null;
        } catch (e) {
          console.error("VIP registration failed", e);
          throw e;
        }
      },

      refreshUserProfile: async () => {
        const { user } = get();
        if (!user?.userId) return;
        try {
          const res = await privateClient.get<any>(`/api/v1/users/${user.userId}`);
          if (res.data && res.data.code === 200 && res.data.result) {
            get().setUser(res.data.result);
          }
        } catch (e) {
          console.error("Failed to refresh user profile", e);
        }
      },

      sendHeartbeat: async () => {
        const { user } = get();
        if (!user?.userId) return;

        const now = Date.now();
        if (now - lastHeartbeatTime < HEARTBEAT_DELAY) {
          return;
        }

        try {
          lastHeartbeatTime = now;
          await privateClient.patch(`/api/v1/users/${user.userId}/last-active`);
        } catch (e) {
          // Silent fail
        }
      },

      initOnlineStatusTracker: () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        get().sendHeartbeat();

        heartbeatInterval = setInterval(() => {
          if (AppState.currentState === 'active') {
            get().sendHeartbeat();
          }
        }, HEARTBEAT_DELAY);

        AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            get().sendHeartbeat();
          }
        });
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
        coins: state.coins,
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
        dayOfBirth: state.dayOfBirth,
        hasDonePlacementTest: state.hasDonePlacementTest,
        hasFinishedSetup: state.hasFinishedSetup,
        lastDailyWelcomeAt: state.lastDailyWelcomeAt,
        isDailyGoalAchieved: state.isDailyGoalAchieved,
        vip: state.vip,
        vipDaysRemaining: state.vipDaysRemaining,
      }),
    },
  ),
);