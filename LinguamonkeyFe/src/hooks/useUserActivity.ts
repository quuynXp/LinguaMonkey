import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  UserLearningActivityResponse,
  UserLearningActivityRequest,
  StudyHistoryResponse,
  LearningActivityEventRequest,
  ActivityCompletionResponse,
  UserDailyChallengeResponse,
} from "../types/dto";
import { useUserStore } from "../stores/UserStore";
import { useToast } from "../utils/useToast";
import { AppState, AppStateStatus } from "react-native";
import { getStudyHistory } from "../services/statisticsApi";

// --- Keys Factory ---
export const activityKeys = {
  all: ["userLearningActivities"] as const,
  lists: (params: any) => [...activityKeys.all, "list", params] as const,
  detail: (id: string) => [...activityKeys.all, "detail", id] as const,
  history: (userId: string | undefined, period: string) =>
    [...activityKeys.all, "history", userId || "anonymous", period] as const,
};

export const dailyChallengeKeys = {
  all: ["dailyChallenges"] as const,
  today: (userId: string | undefined) => [...dailyChallengeKeys.all, "today", userId || "anonymous"] as const,
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

const BASE = "/api/v1/user-learning-activities";

// UPDATE: Thêm dailyActivity và điền đầy đủ giá trị mặc định cho stats
const DEFAULT_STUDY_HISTORY: StudyHistoryResponse = {
  sessions: [],
  // Map này quan trọng để tránh crash Heatmap khi chưa có dữ liệu
  dailyActivity: {},
  stats: {
    totalSessions: 0,
    totalTimeSeconds: 0,
    totalExperience: 0,
    totalCoins: 0,
    lessonsCompleted: 0,
    averageAccuracy: 0,
    averageScore: 0,
    timeGrowthPercent: 0,
    accuracyGrowthPercent: 0,
    coinsGrowthPercent: 0,
    weakestSkill: "NONE",
    improvementSuggestion: "",
    timeChartData: [],
    accuracyChartData: [],
  },
};

// ==========================================
// === 1. QUERIES ===
// ==========================================

export const useAllActivities = (params?: {
  userId?: string;
  page?: number;
  size?: number;
}) => {
  const { userId, page = 0, size = 10 } = params || {};
  return useQuery({
    queryKey: activityKeys.lists(params),
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (userId) qp.append("userId", userId);
      qp.append("page", String(page));
      qp.append("size", String(size));

      const { data } = await instance.get<
        AppApiResponse<PageResponse<UserLearningActivityResponse>>
      >(`${BASE}?${qp.toString()}`);
      return mapPageResponse(data.result, page, size);
    },
    staleTime: 60_000,
  });
};

export const useGetActivity = (id: string | null) => {
  return useQuery({
    queryKey: activityKeys.detail(id!),
    queryFn: async () => {
      if (!id) return Promise.reject(new Error("ID required"));
      const { data } = await instance.get<
        AppApiResponse<UserLearningActivityResponse>
      >(`${BASE}/${id}`);
      return data.result!;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
};

export const useGetStudyHistory = (
  userId: string | undefined,
  period: "day" | "week" | "month" | "year"
) => {
  return useQuery({
    queryKey: ["studyHistory", userId, period],
    queryFn: () => getStudyHistory(userId!, period),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ==========================================
// === 2. HEARTBEAT (Tracking Online Time) ===
// ==========================================

export const useHeartbeat = (enabled: boolean = true) => {
  const userId = useUserStore((state) => state.user?.userId);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId || !enabled) return;

    const sendHeartbeat = async () => {
      try {
        await instance.post(`${BASE}/heartbeat`, null, {
          params: { userId },
        });
      } catch (error) {
        // Silently fail for heartbeat to not disrupt UX
        console.warn("Heartbeat failed", error);
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Set interval for every 60 seconds
    const intervalId = setInterval(sendHeartbeat, 60000);

    // Handle App State (don't ping background, ping immediately on resume)
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        sendHeartbeat(); // Trigger immediately when coming back
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [userId, enabled]);
};

// ==========================================
// === 3. CRUD & LOGGING OPERATIONS ===
// ==========================================

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserLearningActivityRequest) => {
      const { data } = await instance.post<
        AppApiResponse<UserLearningActivityResponse>
      >(BASE, payload);
      return data.result!;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UserLearningActivityRequest;
    }) => {
      const { data } = await instance.put<
        AppApiResponse<UserLearningActivityResponse>
      >(`${BASE}/${id}`, payload);
      return data.result!;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
};

export const useLogActivityStart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LearningActivityEventRequest) => {
      const { data } = await instance.post<
        AppApiResponse<UserLearningActivityResponse>
      >(`${BASE}/start`, payload);
      return data.result!;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  });
};

export const useLogActivityEnd = () => {
  const queryClient = useQueryClient();
  const currentUserId = useUserStore((state) => state.user?.userId);
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: LearningActivityEventRequest) => {
      if (payload.durationInSeconds === undefined) {
        throw new Error("DurationInSeconds is required for END events.");
      }
      const { data } = await instance.post<
        AppApiResponse<ActivityCompletionResponse>
      >(`${BASE}/end`, payload);
      return data.result!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });

      const update = data.challengeUpdate;

      if (update && currentUserId) {
        queryClient.invalidateQueries({ queryKey: dailyChallengeKeys.today(currentUserId) });

        if (update.isCompleted) {
          showToast({
            type: "success",
            title: "Thử thách hoàn thành!",
            message: `Bạn đã hoàn thành "${update.title}" và nhận ${update.expReward} EXP!`,
          });
        } else if (update.progress > 0) {
          showToast({
            type: "info",
            title: "Cập nhật tiến độ",
            message: `${update.title}: ${update.progress}/${update.target}`,
          });
        }
      }
    },
  });
};

export const useTodayChallenges = (userId: string | undefined) => {
  return useQuery({
    queryKey: dailyChallengeKeys.today(userId),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is missing");
      const qp = new URLSearchParams();
      qp.append("userId", userId);

      const { data } = await instance.get<
        AppApiResponse<UserDailyChallengeResponse[]>
      >(`/api/v1/daily-challenges/today?${qp.toString()}`);

      return data.result!;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
};