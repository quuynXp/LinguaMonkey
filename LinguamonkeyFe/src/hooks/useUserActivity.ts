// FILE: hooks/useUserActivity.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  UserLearningActivityResponse,
  UserLearningActivityRequest,
  StudyHistoryResponse,
  LearningActivityEventRequest,
} from "../types/dto";

// --- Keys Factory ---
export const activityKeys = {
  all: ["userLearningActivities"] as const,
  lists: (params: any) => [...activityKeys.all, "list", params] as const,
  detail: (id: string) => [...activityKeys.all, "detail", id] as const,
  // Dùng userId || null để queryKey ổn định hơn và tránh undefined
  history: (userId: string | undefined, period: string) => [...activityKeys.all, "history", userId || null, period] as const,
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

export const useUserLearningActivities = () => {
  const queryClient = useQueryClient();
  const BASE = "/api/v1/user-learning-activities";

  // ==========================================
  // === 1. QUERIES ===
  // ==========================================

  // GET /api/v1/user-learning-activities
  const useAllActivities = (params?: { userId?: string; page?: number; size?: number }) => {
    const { userId, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: activityKeys.lists(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (userId) qp.append("userId", userId);
        qp.append("page", String(page));
        qp.append("size", String(size));

        const { data } = await instance.get<AppApiResponse<PageResponse<UserLearningActivityResponse>>>(
          `${BASE}?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      staleTime: 60_000,
    });
  };

  // GET /api/v1/user-learning-activities/{id}
  const useGetActivity = (id: string | null) => {
    return useQuery({
      queryKey: activityKeys.detail(id!),
      queryFn: async () => {
        // Đảm bảo không ném lỗi bên trong QueryFn nếu enabled là false
        if (!id) return Promise.reject(new Error("ID required"));
        const { data } = await instance.get<AppApiResponse<UserLearningActivityResponse>>(`${BASE}/${id}`);
        return data.result!;
      },
      enabled: !!id,
      staleTime: 60_000,
    });
  };

  // GET /api/v1/user-learning-activities/history
  const useGetStudyHistory = (userId?: string, period: string = "month") => {
    return useQuery({
      queryKey: activityKeys.history(userId, period),
      queryFn: async () => {
        // THAY ĐỔI: Không ném lỗi. Nếu userId là null/undefined, query này sẽ không chạy (enabled: !!userId)
        // Lời gọi này chỉ là biện pháp bảo vệ cuối, nhưng việc ném lỗi làm crash app.
        // React Query nên xử lý trường hợp này bằng cách return một Promise.reject nhẹ nhàng hơn hoặc dựa vào enabled.
        if (!userId) return Promise.reject(new Error("User ID is temporarily unavailable."));

        const { data } = await instance.get<AppApiResponse<StudyHistoryResponse>>(
          `${BASE}/history`,
          { params: { userId, period } }
        );
        return data.result!;
      },
      enabled: !!userId,
      staleTime: 300_000,
      initialData: undefined,
      initialDataUpdatedAt: 0,
    });
  };

  // ==========================================
  // === 2. CRUD OPERATIONS (Standard) ===
  // ==========================================

  // POST /api/v1/user-learning-activities
  const useCreateActivity = () => {
    return useMutation({
      mutationFn: async (payload: UserLearningActivityRequest) => {
        const { data } = await instance.post<AppApiResponse<UserLearningActivityResponse>>(BASE, payload);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    });
  };

  // PUT /api/v1/user-learning-activities/{id}
  const useUpdateActivity = () => {
    return useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: UserLearningActivityRequest }) => {
        const { data } = await instance.put<AppApiResponse<UserLearningActivityResponse>>(`${BASE}/${id}`, payload);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    });
  };

  // DELETE /api/v1/user-learning-activities/{id}
  const useDeleteActivity = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    });
  };

  // ==========================================
  // === 3. LOGGING OPERATIONS (Start/End) ===
  // ==========================================

  // POST /api/v1/user-learning-activities/start
  const useLogActivityStart = () => {
    return useMutation({
      mutationFn: async (payload: LearningActivityEventRequest) => {
        const { data } = await instance.post<AppApiResponse<UserLearningActivityResponse>>(
          `${BASE}/start`,
          payload
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    });
  };

  // POST /api/v1/user-learning-activities/end
  const useLogActivityEnd = () => {
    return useMutation({
      mutationFn: async (payload: LearningActivityEventRequest) => {
        if (payload.durationInSeconds === undefined) {
          throw new Error("DurationInSeconds is required for END events.");
        }
        const { data } = await instance.post<AppApiResponse<UserLearningActivityResponse>>(
          `${BASE}/end`,
          payload
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
    });
  };


  return {
    useAllActivities,
    useGetActivity,
    useGetStudyHistory,

    // CRUD
    useCreateActivity,
    useUpdateActivity,
    useDeleteActivity,

    // Logging
    useLogActivityStart,
    useLogActivityEnd,
  };
};