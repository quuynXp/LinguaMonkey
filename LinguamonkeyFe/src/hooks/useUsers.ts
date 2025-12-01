import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  UserResponse,
  UserProfileResponse,
  UserStatsResponse,
  Character3dResponse,
  RegisterResponse,
  UserRequest,
} from "../types/dto";

import { Country } from "../types/enums";

export const userKeys = {
  all: ["users"] as const,
  lists: (params: any) => [...userKeys.all, "list", params] as const,
  publicSearch: (params: any) => [...userKeys.all, "publicSearch", params] as const, // New Key for public search
  suggestions: (userId: string) => ["users", "suggestions", userId] as const,
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

  // Renamed to useSearchPublicUsers to clearly indicate it returns UserProfileResponse via safe endpoint
  const useSearchPublicUsers = (params?: { keyword?: string; country?: Country; page?: number; size?: number }) => {
    const { page = 0, size = 20, ...rest } = params || {};
    return useQuery({
      queryKey: userKeys.publicSearch({ ...rest, page, size }),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<UserProfileResponse>>>(
          `/api/v1/users/search`,
          { params: { ...rest, page, size } }
        );
        return mapPageResponse(data.result, page, size);
      },
    });
  };

  const useAllUsers = (params?: { email?: string; fullname?: string; nickname?: string; page?: number; size?: number }) => {
    // KEEPING OLD ONE FOR ADMIN IF NEEDED, BUT FRONTEND SHOULD PREFER PUBLIC SEARCH
    const { page = 0, size = 20, ...rest } = params || {};
    return useQuery({
      queryKey: userKeys.lists({ ...rest, page, size }),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<UserResponse>>>(
          `/api/v1/users`,
          { params: { ...rest, page, size } }
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: false, // Disabled by default to prevent accidental calls by non-admins
    });
  };

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

  const useUserProfile = (targetId?: string) =>
    useQuery({
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

  const useUserCharacter = (id?: string) =>
    useQuery({
      queryKey: userKeys.character(id!),
      queryFn: async () => {
        if (!id) throw new Error("User ID is required");
        const { data } = await instance.get<AppApiResponse<Character3dResponse>>(`/api/v1/users/${id}/character3d`);
        return data.result!;
      },
      enabled: !!id,
      staleTime: Infinity,
    });

  const useCheckEmailAvailability = (email: string, enabled: boolean = true) =>
    useQuery({
      queryKey: ["user", "check-email", email],
      queryFn: async () => {
        if (!email) return false;
        const { data } = await instance.get<AppApiResponse<boolean>>(`/api/v1/users/check-email`, { params: { email } });
        return data.result!;
      },
      enabled: enabled && email.length > 5,
      staleTime: 30 * 1000,
    });

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

  const useUpdateAvatar = () => {
    return useMutation({
      mutationFn: async ({ id, tempPath }: { id: string; tempPath: string }) => {
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

  const useUpdateLastActive = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        await instance.patch<AppApiResponse<void>>(`/api/v1/users/${userId}/last-active`);
      },
    });
  };

  const useSendFriendRequest = () => {
    return useMutation({
      mutationFn: async ({ requesterId, receiverId }: { requesterId: string, receiverId: string }) => {
        await instance.post<AppApiResponse<void>>(`/api/v1/friendships`, { requesterId, receiverId });
      },
      onSuccess: (_, payload) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(payload.receiverId) });
        queryClient.invalidateQueries({ queryKey: userKeys.friendship.status(payload.requesterId, payload.receiverId) });
      },
    });
  };

  const useAcceptFriendRequest = () => {
    return useMutation({
      mutationFn: async ({ currentUserId, otherUserId }: { currentUserId: string; otherUserId: string }) => {
        await instance.put<AppApiResponse<void>>(`/api/v1/friendships/${currentUserId}/${otherUserId}`, { status: "ACCEPTED" });
      },
      onSuccess: (_, payload) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(payload.currentUserId) });
        queryClient.invalidateQueries({ queryKey: userKeys.profile(payload.otherUserId) });
        queryClient.invalidateQueries({ queryKey: userKeys.friendship.status(payload.currentUserId, payload.otherUserId) });
      },
    });
  };

  const useDeleteFriendship = () => {
    return useMutation({
      mutationFn: async ({ user1Id, user2Id }: { user1Id: string; user2Id: string }) => {
        await instance.delete<AppApiResponse<void>>(`/api/v1/friendships/${user1Id}/${user2Id}`);
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(vars.user2Id) });
        queryClient.invalidateQueries({ queryKey: userKeys.friendship.status(vars.user1Id, vars.user2Id) });
        queryClient.invalidateQueries({ queryKey: userKeys.friendship.check(vars.user1Id, vars.user2Id) });
      },
    });
  };

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

  const useSuggestedUsers = (userId: string, page = 0, size = 10) => {
    return useQuery<PageResponse<UserResponse>>({
      queryKey: userKeys.suggestions(userId),
      queryFn: async () => {
        if (!userId) return { content: [], totalElements: 0 } as any;
        const { data } = await instance.get<AppApiResponse<PageResponse<UserResponse>>>(
          `/api/v1/users/${userId}/suggestions`,
          { params: { page, size } }
        );
        return data.result!;
      },
      enabled: !!userId,
    });
  };

  return {
    useSearchPublicUsers, // Expose the new hook
    useAllUsers,
    useUser,
    useUserProfile,
    useUserStats,
    useUserCharacter,
    useCheckEmailAvailability,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useUpdateAvatar,
    useUpdateExp,
    useUpdateStreak,
    useUpdateNativeLanguage,
    useUpdateCountry,
    useAdmireUser,
    useUpdateLastActive,
    useSendFriendRequest,
    useAcceptFriendRequest,
    useDeleteFriendship,
    useFriendRequestStatus,
    useCheckIfFriends,
    useSuggestedUsers,
  };
};