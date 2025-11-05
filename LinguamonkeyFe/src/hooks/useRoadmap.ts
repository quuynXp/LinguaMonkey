import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type {
  Roadmap as LearningRoadmap,
  RoadmapItem as RoadmapItemDetail,
  UserGoal,
  ApiResponse,
} from "../types/api";
import { useUserStore } from "../stores/UserStore";

export const useRoadmap = () => {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  // === USER ROADMAP ===
  const useUserRoadmap = (languageCode?: string) =>
    useQuery({
      queryKey: ["userRoadmap", languageCode, user?.userId],
      queryFn: async () => {
        if (!user?.userId) throw new Error("User not logged in");
        let endpoint = `/api/v1/roadmaps/user/${user.userId}`;
        if (languageCode) endpoint += `?language=${languageCode}`;
        const res = await instance.get<ApiResponse<LearningRoadmap[]>>(endpoint);
        const list = res.data.result || [];
        return list.length > 0 ? list[0] : null;
      },
      enabled: !!user?.userId,
    });

  // === DEFAULT ROADMAPS ===
  const useDefaultRoadmaps = (languageCode?: string) =>
    useQuery({
      queryKey: ["defaultRoadmaps", languageCode],
      queryFn: async () => {
        let endpoint = `/api/v1/roadmaps`;
        if (languageCode) endpoint += `?language=${languageCode}`;
        const res = await instance.get<ApiResponse<LearningRoadmap[]>>(endpoint);
        return res.data.result;
      },
    });

  // === ROADMAP ITEM DETAIL ===
  const useRoadmapItemDetail = (itemId: string | null) =>
    useQuery({
      queryKey: ["roadmapItem", itemId],
      queryFn: async () => {
        if (!itemId) throw new Error("Item id missing");
        const res = await instance.get<ApiResponse<RoadmapItemDetail>>(`/api/v1/roadmaps/items/${itemId}`);
        return res.data.result;
      },
      enabled: !!itemId,
    });

  // === USER GOALS ===
  const useUserGoals = () =>
    useQuery({
      queryKey: ["userGoals"],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<UserGoal[]>>("/api/v1/user-goals");
        return res.data.result;
      },
    });

  // === CREATE GOAL ===
  const useCreateGoal = () =>
    useMutation({
      mutationFn: async (goalData: Partial<UserGoal>) => {
        const res = await instance.post<ApiResponse<UserGoal>>("/api/v1/user-goals", goalData);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userGoals"] });
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });


  const useRoadmapDetail = (roadmapId: string, userId?: string) =>
    useQuery({
      queryKey: ["roadmapDetail", roadmapId],
      queryFn: async () => {
        if (!roadmapId) throw new Error("Missing roadmapId");
        const res = await instance.get<ApiResponse<LearningRoadmap>>(`/api/v1/roadmaps/${roadmapId}${userId ? `?userId=${userId}` : ""}`);
        return res.data.result;
      },
      enabled: !!roadmapId,
    });

  // === UPDATE GOAL ===
  const useUpdateGoal = () =>
    useMutation({
      mutationFn: async ({ goalId, goalData }: { goalId: string; goalData: Partial<UserGoal> }) => {
        const res = await instance.put<ApiResponse<UserGoal>>(`/api/v1/user-goals/${goalId}`, goalData);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userGoals"] });
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });

  // === START ITEM ===
  const useStartRoadmapItem = () =>
    useMutation({
      mutationFn: async (itemId: string) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<ApiResponse<{ success: boolean }>>("/api/v1/roadmaps/items/start", {
          userId: user.userId,
          itemId,
        });
        return res.data.result;
      },
      onSuccess: (_data, itemId) => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
        queryClient.invalidateQueries({ queryKey: ["roadmapItem", itemId] });
      },
    });

  // === COMPLETE ITEM ===
  const useCompleteRoadmapItem = () =>
    useMutation({
      mutationFn: async ({ itemId, score }: { itemId: string; score?: number }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<ApiResponse<{ success: boolean }>>("/api/v1/roadmaps/items/complete", {
          userId: user.userId,
          itemId,
          score,
        });
        return res.data.result;
      },
      onSuccess: (_data, { itemId }) => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
        queryClient.invalidateQueries({ queryKey: ["roadmapItem", itemId] });
      },
    });

  // === GENERATE ROADMAP ===
  const useGenerateRoadmap = () =>
    useMutation({
      mutationFn: async (preferences: {
        language_code: string;
        target_proficiency: string;
        target_date?: string;
        focus_areas?: string[];
        study_time_per_day?: number;
        is_custom?: boolean;
        additional_prompt?: string;
      }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const payload = {
          userId: user.userId,
          languageCode: preferences.language_code.toLowerCase(),
          targetProficiency: preferences.target_proficiency,
          targetDate: preferences.target_date,
          focusAreas: preferences.focus_areas,
          studyTimePerDay: preferences.study_time_per_day,
          isCustom: preferences.is_custom ?? false,
          additionalPrompt: preferences.additional_prompt ?? "",
        };
        const res = await instance.post<ApiResponse<LearningRoadmap>>("/api/v1/roadmaps/generate", payload);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });

  // === ASSIGN DEFAULT ROADMAP ===
  const useAssignDefaultRoadmap = () =>
    useMutation({
      mutationFn: async ({ roadmapId }: { roadmapId: string }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<ApiResponse<void>>("/api/v1/roadmaps/assign", {
          userId: user.userId,
          roadmapId,
        });
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });

  // === EDIT ROADMAP ===
  const useEditRoadmap = () =>
    useMutation({
      mutationFn: async ({
        roadmapId,
        title,
        description,
      }: {
        roadmapId: string;
        title: string;
        description: string;
      }) => {
        const res = await instance.put<ApiResponse<LearningRoadmap>>(`/api/v1/roadmaps/${roadmapId}`, {
          title,
          description,
        });
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["roadmapDetail"] });
      },
    });

  // === PUBLIC ROADMAPS ===
  const usePublicRoadmaps = () =>
    useQuery({
      queryKey: ["publicRoadmaps"],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<LearningRoadmap[]>>("/api/v1/roadmaps/public");
        return res.data.result;
      },
    });

  // === SUGGESTIONS ===
  const useSuggestions = (roadmapId: string) =>
    useQuery({
      queryKey: ["suggestions", roadmapId],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<any>>(`/api/v1/roadmaps/${roadmapId}/suggestions`);
        return res.data.result;
      },
    });

  const useAddSuggestion = () =>
    useMutation({
      mutationFn: async ({
        roadmapId,
        itemId,
        suggestedOrderIndex,
        reason,
      }: {
        roadmapId: string;
        itemId: string;
        suggestedOrderIndex: number;
        reason: string;
      }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<ApiResponse<any>>(
          `/api/v1/roadmaps/${roadmapId}/suggestions`,
          { itemId, suggestedOrderIndex, reason, userId: user.userId }
        );
        return res.data.result;
      },
      onSuccess: (_data, { roadmapId }) => {
        queryClient.invalidateQueries({ queryKey: ["suggestions", roadmapId] });
      },
    });

  const useApplySuggestion = () =>
    useMutation({
      mutationFn: async ({
        suggestionId,
        userId,
      }: {
        suggestionId: string;
        userId: string;
      }) => {
        const res = await instance.put<ApiResponse<any>>(
          `/api/v1/roadmaps/suggestions/${suggestionId}/apply?userId=${userId}`
        );
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["roadmapDetail"] });
      },
    });

  return {
    useUserRoadmap,
    useDefaultRoadmaps,
    useRoadmapItemDetail,
    useUserGoals,
    useRoadmapDetail,
    useCreateGoal,
    useUpdateGoal,
    useStartRoadmapItem,
    useCompleteRoadmapItem,
    useGenerateRoadmap,
    useAssignDefaultRoadmap,
    useEditRoadmap,
    usePublicRoadmaps,
    useSuggestions,
    useAddSuggestion,
    useApplySuggestion,
  };
};
