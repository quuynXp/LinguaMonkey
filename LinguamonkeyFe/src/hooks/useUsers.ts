import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
  AppApiResponse,
  PageResponse,
  UserResponse,
  UserProfileResponse,
  UserStatsResponse,
  Character3dResponse,
  RegisterResponse,
  UserRequest,
  NotificationRequest,
} from "../types/dto";

import { Country } from "../types/enums";

// --- Keys Factory ---
export const userKeys = {
  all: ["users"] as const,
  lists: (params: any) => [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
  profile: (targetId: string, viewerId?: string) => [...userKeys.all, "profile", targetId, viewerId] as const,
  stats: (id: string) => [...userKeys.detail(id), "stats"] as const,
  character: (id: string) => [...userKeys.detail(id), "character3d"] as const,
  achievements: (id: string) => [...userKeys.detail(id), "achievements"] as const,
  friendship: {
    status: (user1Id: string, user2Id: string) => ["friendship", "request-status", user1Id, user2Id] as const,
    check: (user1Id: string, user2Id: string) => ["friendship", "check", user1Id, user2Id] as const,
  },
};

// --- Helper to standardize pagination return ---
const mapPageResponse = <T>(result: any, page: number, size: number) => ({
  data: (result?.content as T[]) || [],
  pagination: {
    pageNumber: result?.pageNumber ?? page,
    pageSize: result?.pageSize ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.isLast ?? true,
    isFirst: result?.isFirst ?? true,
    hasNext: result?.hasNext ?? false,
    hasPrevious: result?.hasPrevious ?? false,
  },
});

export const useUsers = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === 1. QUERIES & GETTERS ===
  // ==========================================

  // GET /api/v1/users (Admin only)
  const useAllUsers = (params?: { email?: string; fullname?: string; nickname?: string; page?: number; size?: number }) => {
    const { page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: userKeys.lists(params),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<UserResponse>>>(
          `/api/v1/users`,
          { params: { ...params, page, size } }
        );
        return mapPageResponse(data.result, page, size);
      },
    });
  };

  // GET /api/v1/users/{userId}
  const useUser = (id?: string) =>
    useQuery({
      queryKey: userKeys.detail(id!),
      queryFn: async () => {
        if (!id) throw new Error("User ID is required");
        const { data } = await instance.get<AppApiResponse<UserResponse>>(`/api/v1/users/${id}`);
        return data.result!;
      },
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });

  // GET /api/v1/users/{targetId}/profile
  const useUserProfile = (targetId?: string) =>
    useQuery({
      // Viewer ID is often implied by token, but we include it for key uniqueness if necessary.
      queryKey: userKeys.profile(targetId!),
      queryFn: async () => {
        if (!targetId) throw new Error("Target User ID is required");
        const { data } = await instance.get<AppApiResponse<UserProfileResponse>>(
          `/api/v1/users/${targetId}/profile`
        );
        return data.result!;
      },
      enabled: !!targetId,
      staleTime: 60 * 1000,
    });

  // GET /api/v1/users/{id}/stats
  const useUserStats = (id?: string) =>
    useQuery({
      queryKey: userKeys.stats(id!),
      queryFn: async () => {
        if (!id) throw new Error("User ID is required");
        const { data } = await instance.get<AppApiResponse<UserStatsResponse>>(`/api/v1/users/${id}/stats`);
        return data.result!;
      },
      enabled: !!id,
      staleTime: 60 * 1000,
    });

  // GET /api/v1/users/{userId}/character3d
  const useUserCharacter = (id?: string) =>
    useQuery({
      queryKey: userKeys.character(id!),
      queryFn: async () => {
        if (!id) throw new Error("User ID is required");
        const { data } = await instance.get<AppApiResponse<Character3dResponse>>(`/api/v1/users/${id}/character3d`);
        return data.result!;
      },
      enabled: !!id,
      staleTime: Infinity, // Character data rarely changes
    });

  // GET /api/v1/users/check-email
  const useCheckEmailAvailability = (email: string, enabled: boolean = true) =>
    useQuery({
      queryKey: ["user", "check-email", email],
      queryFn: async () => {
        if (!email) return false;
        const { data } = await instance.get<AppApiResponse<boolean>>(`/api/v1/users/check-email`, { params: { email } });
        return data.result!; // result is true if AVAILABLE (does not exist)
      },
      enabled: enabled && email.length > 5,
      staleTime: 30 * 1000,
    });

  // ==========================================
  // === 2. USER MUTATIONS (CRUD & Updates) ===
  // ==========================================

  // POST /api/v1/users (Registration)
  const useCreateUser = () => {
    return useMutation({
      mutationFn: async (req: UserRequest) => {
        const { data } = await instance.post<AppApiResponse<RegisterResponse>>("/api/v1/users", req);
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userKeys.all });
      },
    });
  };

  // PUT /api/v1/users/{id}
  const useUpdateUser = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: UserRequest }) => {
        const { data } = await instance.put<AppApiResponse<UserResponse>>(`/api/v1/users/${id}`, req);
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.all });
      },
    });
  };

  // DELETE /api/v1/users/{id}
  const useDeleteUser = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete<AppApiResponse<void>>(`/api/v1/users/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userKeys.all });
      },
    });
  };

  // PATCH /api/v1/users/{id}/avatar
  const useUpdateAvatar = () => {
    return useMutation({
      mutationFn: async ({ id, tempPath }: { id: string; tempPath: string }) => {
        // Controller expects tempPath as @RequestParam
        const { data } = await instance.patch<AppApiResponse<UserResponse>>(
          `/api/v1/users/${id}/avatar`,
          null,
          { params: { tempPath } }
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.userId) });
      },
    });
  };

  // PATCH /api/v1/users/{id}/exp
  const useUpdateExp = () => {
    return useMutation({
      mutationFn: async ({ id, exp }: { id: string; exp: number }) => {
        const { data } = await instance.patch<AppApiResponse<UserResponse>>(
          `/api/v1/users/${id}/exp`,
          null,
          { params: { exp } }
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.stats(data.userId) });
      },
    });
  };

  // PATCH /api/v1/users/{id}/streak
  const useUpdateStreak = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { data } = await instance.patch<AppApiResponse<UserResponse>>(
          `/api/v1/users/${id}/streak`
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) });
        queryClient.invalidateQueries({ queryKey: userKeys.stats(data.userId) });
      },
    });
  };

  // PATCH /api/v1/users/{id}/native-language
  const useUpdateNativeLanguage = () => {
    return useMutation({
      mutationFn: async ({ id, nativeLanguageCode }: { id: string; nativeLanguageCode: string }) => {
        const { data } = await instance.patch<AppApiResponse<UserResponse>>(
          `/api/v1/users/${id}/native-language`,
          null,
          { params: { nativeLanguageCode } }
        );
        return data.result!;
      },
      onSuccess: (data) => queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) }),
    });
  };

  // PATCH /api/v1/users/{id}/country
  const useUpdateCountry = () => {
    return useMutation({
      mutationFn: async ({ id, country }: { id: string; country: Country }) => {
        const { data } = await instance.patch<AppApiResponse<UserResponse>>(
          `/api/v1/users/${id}/country`,
          null,
          { params: { country } }
        );
        return data.result!;
      },
      onSuccess: (data) => queryClient.invalidateQueries({ queryKey: userKeys.detail(data.userId) }),
    });
  };

  // POST /api/v1/users/{targetId}/admire
  const useAdmireUser = () => {
    return useMutation({
      mutationFn: async (targetId: string) => {
        await instance.post<AppApiResponse<void>>(`/api/v1/users/${targetId}/admire`);
      },
      onSuccess: (_, targetId) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(targetId) });
      },
    });
  };

  // POST /api/v1/users/fcm-token
  const useRegisterFcmToken = () => {
    return useMutation({
      mutationFn: async (req: NotificationRequest) => {
        await instance.post<AppApiResponse<void>>(`/api/v1/users/fcm-token`, req);
      },
    });
  };

  // PATCH /api/v1/users/{userId}/last-active
  const useUpdateLastActive = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        await instance.patch<AppApiResponse<void>>(`/api/v1/users/${userId}/last-active`);
      },
    });
  };

  // ==========================================
  // === 3. FRIENDSHIP (Assuming separate Controller/Endpoints) ===
  // ==========================================

  // POST /api/v1/friendships
  const useSendFriendRequest = () => {
    return useMutation({
      mutationFn: async (targetUserId: string) => {
        // Assuming backend handles creating the request from current user to target
        await instance.post<AppApiResponse<void>>(`/api/v1/friendships`, { targetUserId });
      },
      onSuccess: (_, targetId) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(targetId) });
        queryClient.invalidateQueries({ queryKey: ["friendship"] });
      },
    });
  };

  // PUT /api/v1/friendships/{currentUserId}/{otherUserId} (Accept)
  const useAcceptFriendRequest = () => {
    return useMutation({
      mutationFn: async ({ currentUserId, otherUserId }: { currentUserId: string; otherUserId: string }) => {
        // Assuming status DTO is implicitly "ACCEPTED" or handled by BE service
        await instance.put<AppApiResponse<void>>(`/api/v1/friendships/${currentUserId}/${otherUserId}`, { status: "ACCEPTED" });
      },
      onSuccess: (_, payload) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(payload.currentUserId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(payload.otherUserId) });
        queryClient.invalidateQueries({ queryKey: ["friendship"] });
      },
    });
  };

  // GET /api/v1/friendships/request-status
  const useFriendRequestStatus = (currentUserId?: string, otherUserId?: string) =>
    useQuery<any | null>({
      queryKey: userKeys.friendship.status(currentUserId!, otherUserId!),
      queryFn: async () => {
        if (!currentUserId || !otherUserId) return null;
        const { data } = await instance.get<AppApiResponse<any>>(`/api/v1/friendships/request-status`, {
          params: { currentUserId, otherUserId },
        });
        return data.result ?? null;
      },
      enabled: !!currentUserId && !!otherUserId,
      staleTime: 30 * 1000,
    });

  // GET /api/v1/friendships/check
  const useCheckIfFriends = (user1Id?: string, user2Id?: string) =>
    useQuery<boolean>({
      queryKey: userKeys.friendship.check(user1Id!, user2Id!),
      queryFn: async () => {
        if (!user1Id || !user2Id) return false;
        const { data } = await instance.get<AppApiResponse<boolean>>(`/api/v1/friendships/check`, { params: { user1Id, user2Id } });
        return data.result || false;
      },
      enabled: !!user1Id && !!user2Id,
      staleTime: 30 * 1000,
    });

  return {
    // Queries
    useAllUsers,
    useUser,
    useUserProfile,
    useUserStats,
    useUserCharacter,
    useCheckEmailAvailability,

    // CRUD & Updates
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useUpdateAvatar,
    useUpdateExp,
    useUpdateStreak,
    useUpdateNativeLanguage,
    useUpdateCountry,
    useAdmireUser,
    useRegisterFcmToken,
    useUpdateLastActive,

    // Friendship
    useSendFriendRequest,
    useAcceptFriendRequest,
    useFriendRequestStatus,
    useCheckIfFriends,
  };
};