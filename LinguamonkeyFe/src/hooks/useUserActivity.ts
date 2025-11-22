import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
  AppApiResponse,
  PageResponse,
  UserLearningActivityResponse,
  UserLearningActivityRequest,
  StudyHistoryResponse,
  LearningActivityEventRequest,
} from "../types/dto";

import { ActivityType } from "../types/enums";

// --- Keys Factory ---
export const activityKeys = {
  all: ["userLearningActivities"] as const,
  lists: (params: any) => [...activityKeys.all, "list", params] as const,
  detail: (id: string) => [...activityKeys.all, "detail", id] as const,
  history: (userId: string, period: string) => [...activityKeys.all, "history", userId, period] as const,
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
        if (!id) throw new Error("ID required");
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
      queryKey: activityKeys.history(userId!, period),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<StudyHistoryResponse>>(
          `${BASE}/history`,
          { params: { userId, period } }
        );
        return data.result!;
      },
      enabled: !!userId,
      staleTime: 300_000,
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
        // Validation logic is on the backend, only ensure correct DTO is sent
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
        // Ensure duration is present for END events (Backend handles validation)
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