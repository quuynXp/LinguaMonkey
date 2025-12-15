import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  BadgeResponse,
  BadgeProgressResponse,
  BadgeRequest
} from "../types/dto";

// --- Query Keys Factory (Quản lý key tập trung để dễ invalidation) ---
export const badgeKeys = {
  all: ["badges"] as const,
  lists: () => [...badgeKeys.all, "list"] as const,
  list: (params: { page: number; size: number; badgeName?: string }) =>
    [...badgeKeys.lists(), params] as const,
  details: () => [...badgeKeys.all, "detail"] as const,
  detail: (id: string) => [...badgeKeys.details(), id] as const,
  progresses: () => [...badgeKeys.all, "progress"] as const,
  progress: (userId: string) => [...badgeKeys.progresses(), userId] as const,
};

// ==========================================
// === QUERIES (Read Operations) ===
// ==========================================

// 1. GET /api/v1/badges (Get all badges with pagination & search)
export const useBadges = (
  page = 0,
  size = 10,
  badgeName?: string
) => {
  return useQuery({
    queryKey: badgeKeys.list({ page, size, badgeName }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("size", size.toString());
      if (badgeName) params.append("badgeName", badgeName);

      const { data } = await axiosInstance.get<AppApiResponse<PageResponse<BadgeResponse>>>(
        `/api/v1/badges?${params.toString()}`
      );

      return {
        data: data.result?.content || [],
        pagination: {
          pageNumber: data.result?.pageNumber || page,
          pageSize: data.result?.pageSize || size,
          totalElements: data.result?.totalElements || 0,
          totalPages: data.result?.totalPages || 0,
          isLast: data.result?.isLast || true,
          isFirst: data.result?.isFirst || true,
          hasNext: data.result?.hasNext || false,
          hasPrevious: data.result?.hasPrevious || false,
        }
      };
    },
    placeholderData: (prev) => prev, // Keep previous data while fetching new page
    staleTime: 5 * 60 * 1000, // Cache 5 mins
  });
};

// 2. GET /api/v1/badges/{id} (Get badge detail)
export const useBadge = (badgeId?: string) => {
  return useQuery({
    queryKey: badgeKeys.detail(badgeId!),
    queryFn: async () => {
      if (!badgeId) throw new Error("Badge ID is required");
      const { data } = await axiosInstance.get<AppApiResponse<BadgeResponse>>(
        `/api/v1/badges/${badgeId}`
      );
      return data.result;
    },
    enabled: !!badgeId,
  });
};

// 3. GET /api/v1/badges/user/{userId}/progress (Get user badge progress)
export const useBadgeProgress = (userId?: string) => {
  return useQuery({
    queryKey: badgeKeys.progress(userId!),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data } = await axiosInstance.get<AppApiResponse<BadgeProgressResponse[]>>(
        `/api/v1/badges/user/${userId}/progress`
      );
      return data.result || [];
    },
    enabled: !!userId,
  });
};

// --- NEW: Claim Badge Mutation ---
export const useClaimBadge = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { data } = await axiosInstance.post<AppApiResponse<void>>(
        `/api/v1/badges/claim/${badgeId}`,
        null,
        { params: { userId } }
      );
      return data.result;
    },
    onSuccess: (_, vars) => {
      // 1. Tối ưu: Cập nhật cache ngay lập tức (Instant UI Update)
      queryClient.setQueryData(badgeKeys.progress(vars.userId), (oldData: BadgeProgressResponse[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(badge =>
          badge.badgeId === vars.badgeId
            ? { ...badge, isAchieved: true, currentUserProgress: badge.criteriaThreshold }
            : badge
        );
      });

      // 2. Invalidate Queries để fetch data chính xác (Consistency)
      queryClient.invalidateQueries({ queryKey: badgeKeys.progress(vars.userId) });
      // Refresh User Profile (để cộng Coin)
      queryClient.invalidateQueries({ queryKey: ['userProfile', vars.userId] });
    },
  });


  // // ==========================================
  // // === MUTATIONS (Write Operations) ===
  // // ==========================================

  // // 4. POST /api/v1/badges (Create Badge - Admin only)
  // export const useCreateBadge = () => {
  //   const queryClient = useQueryClient();

  //   const mutation = useMutation({
  //     mutationFn: async (payload: BadgeRequest) => {
  //       const { data } = await axiosInstance.post<AppApiResponse<BadgeResponse>>(
  //         "/api/v1/badges",
  //         payload
  //       );
  //       return data.result!;
  //     },
  //     onSuccess: () => {
  //       // Refresh list after create
  //       queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
  //     },
  //   });

  //   return {
  //     createBadge: mutation.mutateAsync,
  //     isCreating: mutation.isPending,
  //     error: mutation.error,
  //   };
  // };

  // // 5. PUT /api/v1/badges/{id} (Update Badge - Admin only)
  // export const useUpdateBadge = () => {
  //   const queryClient = useQueryClient();

  //   const mutation = useMutation({
  //     mutationFn: async ({ id, payload }: { id: string; payload: BadgeRequest }) => {
  //       const { data } = await axiosInstance.put<AppApiResponse<BadgeResponse>>(
  //         `/api/v1/badges/${id}`,
  //         payload
  //       );
  //       return data.result!;
  //     },
  //     onSuccess: (data) => {
  //       // Refresh specific detail and lists
  //       queryClient.invalidateQueries({ queryKey: badgeKeys.detail(data.badgeId) });
  //       queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
  //     },
  //   });

  //   return {
  //     updateBadge: mutation.mutateAsync,
  //     isUpdating: mutation.isPending,
  //     error: mutation.error,
  //   };
  // };

  // // 6. DELETE /api/v1/badges/{id} (Delete Badge - Admin only)
  // export const useDeleteBadge = () => {
  //   const queryClient = useQueryClient();

  //   const mutation = useMutation({
  //     mutationFn: async (id: string) => {
  //       const { data } = await axiosInstance.delete<AppApiResponse<void>>(
  //         `/api/v1/badges/${id}`
  //       );
  //       return data;
  //     },
  //     onSuccess: () => {
  //       // Refresh lists after delete
  //       queryClient.invalidateQueries({ queryKey: badgeKeys.lists() });
  //     },
  //   });

  return {
    claimBadge: mutation.mutateAsync,
    isClaiming: mutation.isPending,
    error: mutation.error,
  };
};