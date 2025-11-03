// stores/UserStore.ts
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
// Giả định 'UserResponse' trong 'types/api.ts' ĐÃ ĐƯỢC CẬP NHẬT
// để bao gồm: languages: string[]
import { UserResponse } from '../types/api';

// ===== HELPER TYPES =====
interface DailyGoal {
  completedLessons: number;
  totalLessons: number;
}

interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

// ===== STORE DEFINITION =====

// Định nghĩa tất cả các thuộc tính phẳng (flattened) từ UserResponse DTO
interface UserState {
  // STATE
  user: UserResponse | null;
  isAuthenticated: boolean;
  setNativeLanguage: (languageId: string) => void;

  // --- Thuộc tính phẳng từ UserResponse DTO ---
  name: string; // (từ fullname hoặc nickname)
  streak: number;
  level?: number;
  exp?: number;
  expToNextLevel?: number;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  country?: string;
  progress?: number; // (Từ backend, % tổng thể)
  nativeLanguageId?: string; // (Mã ngôn ngữ)
  badgeId?: string; // (UUID badge)
  character3dId?: string; // (UUID 3D)
  authProvider?: string; // (VD: 'google', 'facebook', 'email')
  // --- HẾT ---

  // State gốc của UserStore (không có trong DTO)
  languages: string[]; // (Danh sách mã ngôn ngữ user học)
  dailyGoal: DailyGoal;
  recentLessons: Lesson[];
  statusMessage: string; // (Logic cũ dùng 'bio' làm 'statusMessage')
  hasDonePlacementTest?: boolean;

  // ACTIONS CƠ BẢN
  setUser: (user: UserResponse | null) => void;
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
}

// --- TRẠNG THÁI MẶC ĐỊNH ---
// Dùng để khởi tạo và reset khi logout, đảm bảo tính nhất quán
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
  languages: [],
  dailyGoal: { completedLessons: 0, totalLessons: 0 },
  recentLessons: [],
  statusMessage: '',
  hasDonePlacementTest: undefined,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // ===== STATE IMPLEMENTATION =====
      ...defaultUserState,

      // ===== ACTIONS IMPLEMENTATION =====

      /**
       * Action quan trọng nhất: Đặt thông tin user.
       * Tự động đồng bộ hóa object 'user' và các thuộc tính phẳng.
       */
      setUser: (user) => {
        if (!user) {
          // Nếu user là null (logout), reset về trạng thái mặc định
          set(defaultUserState);
          return;
        }

        // Nếu có user, cập nhật 'user' và tất cả thuộc tính phẳng
        set({
          user: user,
          isAuthenticated: true,

          // --- Trích xuất thuộc tính phẳng từ UserResponse DTO ---
          name: user.fullname ?? user.nickname ?? '',
          streak: user.streak ?? 0,
          level: user.level,
          exp: user.exp,
          expToNextLevel: user.expToNextLevel,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          phone: user.phone,
          country: user.country,
          // DTO trả về BigDecimal/Double, chuyển sang number
          progress: user.progress ? Number(user.progress) : undefined,
          nativeLanguageId: user.nativeLanguageId,
          badgeId: user.badgeId,
          character3dId: user.character3dId,
          authProvider: user.authProvider,
          // --- HẾT ---

          // Logic cũ
          statusMessage: user.bio ?? '',

          // ===== SỬA ĐỔI QUAN TRỌNG =====
          // Lấy 'languages' trực tiếp từ UserResponse DTO đã được cập nhật
          languages: user.languages ?? [],
          // ===============================

          // (Giữ 'as any' nếu trường này không có trong UserResponse đã định nghĩa)
          hasDonePlacementTest: (user as any).hasDonePlacementTest,
        });
      },

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      // Action này có thể gây mất đồng bộ state, cân nhắc khi sử dụng
      setProfileData: (data) => set((state) => ({ ...state, ...data })),

      setHasDonePlacementTest: (value) => set({ hasDonePlacementTest: value }),

      setNativeLanguage: (languageId: string) => {
        set({ nativeLanguageId: languageId });

        // Nếu muốn đồng bộ với backend luôn
        const user = get().user;
        if (user?.userId) {
          instance
            .patch(`/users/${user.userId}/native-language`, null, {
              params: { nativeLanguageCode: languageId },
            })
            .then(res => {
              console.log('Native language updated');
              // (Lưu ý: Backend trả về UserResponse mới, ta nên setUser
              // nếu muốn đồng bộ ngay)
              // if (res.data?.result) {
              //   get().setUser(res.data.result);
              // }
            })
            .catch(err => {
              console.error('Failed to update native language:', err);
            });
        }
      },
      /**
       * Logout: Reset store về trạng thái mặc định.
       */
      logout: () => set(defaultUserState),

      saveProfileToServer: async (userId, payload) => {
        try {
          const res = await instance.put<ApiResponse<UserResponse>>(
            `/api/v1/users/${userId}`,
            payload,
          );
          if (res?.data?.result) {
            // SỬA: Gọi setUser để cập nhật toàn bộ state một cách đồng bộ
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
            // SỬA: Gọi setUser để cập nhật toàn bộ state một cách đồng bộ
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
      // ===== PERSIST CONFIG (Đã cập nhật) =====
      name: 'user-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // Chỉ persist các thuộc tính phẳng.
      // `user` object cũng được persist để làm "source" khi hydrate.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,

        // Persist các thuộc tính phẳng
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
        character3dId: state.character3dId,
        authProvider: state.authProvider,

        // State gốc của UserStore
        languages: state.languages,
        dailyGoal: state.dailyGoal,
        recentLessons: state.recentLessons,
        statusMessage: state.statusMessage,
        hasDonePlacementTest: state.hasDonePlacementTest,
      }),
    },
  ),
);