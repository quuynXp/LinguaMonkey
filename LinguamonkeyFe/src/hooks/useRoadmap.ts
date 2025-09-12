// hooks/useRoadmap.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type {
  Roadmap as LearningRoadmap,
  RoadmapItem as RoadmapItemDetail,
  UserGoal,
  ApiResponse as AppApiResponse,
} from "../types/api";
import { useUserStore } from "../stores/UserStore";

export const useRoadmap = () => {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const useUserRoadmap = (languageCode?: string) => {
    return useQuery({
      queryKey: ["userRoadmap", languageCode, user?.userId],
      queryFn: async () => {
        if (!user?.userId) throw new Error("User not logged in");
        let endpoint = `/roadmaps/user/${user.userId}`;
        if (languageCode) endpoint += `?language=${languageCode}`;
        const res = await instance.get<AppApiResponse<LearningRoadmap[]>>(endpoint);
        const list = res.data.result || [];
        return list.length > 0 ? list[0] : null; // return first assigned roadmap or null
      },
      enabled: !!user?.userId,
    });
  };

  const useDefaultRoadmaps = (languageCode?: string) => {
    return useQuery({
      queryKey: ["defaultRoadmaps", languageCode],
      queryFn: async () => {
        let endpoint = `/roadmaps`;
        if (languageCode) endpoint += `?language=${languageCode}`;
        const res = await instance.get<AppApiResponse<LearningRoadmap[]>>(endpoint);
        return res.data.result;
      },
    });
  };

  const useRoadmapItemDetail = (itemId: string | null) => {
    return useQuery({
      queryKey: ["roadmapItem", itemId],
      queryFn: async () => {
        if (!itemId) throw new Error("Item id missing");
        const res = await instance.get<AppApiResponse<RoadmapItemDetail>>(`/roadmaps/items/${itemId}`);
        return res.data.result;
      },
      enabled: !!itemId,
    });
  };

  const useUserGoals = () => {
    return useQuery({
      queryKey: ["userGoals"],
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<UserGoal[]>>("/user-goals");
        return res.data.result;
      },
    });
  };

  const useCreateGoal = () => {
    return useMutation({
      mutationFn: async (goalData: Partial<UserGoal>) => {
        const res = await instance.post<AppApiResponse<UserGoal>>("/user-goals", goalData);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userGoals"] });
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });
  };

  const useUpdateGoal = () => {
    return useMutation({
      mutationFn: async ({ goalId, goalData }: { goalId: string; goalData: Partial<UserGoal> }) => {
        const res = await instance.put<AppApiResponse<UserGoal>>(`/user-goals/${goalId}`, goalData);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userGoals"] });
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });
  };

  const useStartRoadmapItem = () => {
    return useMutation({
      mutationFn: async (itemId: string) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<AppApiResponse<{ success: boolean }>>("/roadmaps/items/start", {
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
  };

  const useCompleteRoadmapItem = () => {
    return useMutation({
      mutationFn: async ({ itemId, score }: { itemId: string; score?: number }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<AppApiResponse<{ success: boolean }>>("/roadmaps/items/complete", {
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
  };

  const useGenerateRoadmap = () => {
    return useMutation({
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
          languageCode: preferences.language_code.toLowerCase(), // <- fixed
          targetProficiency: preferences.target_proficiency,
          targetDate: preferences.target_date,
          focusAreas: preferences.focus_areas,
          studyTimePerDay: preferences.study_time_per_day,
          isCustom: preferences.is_custom ?? false,
          additionalPrompt: preferences.additional_prompt ?? "",
        };
        const res = await instance.post<AppApiResponse<LearningRoadmap>>("/roadmaps/generate", payload);
        return res.data.result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });
  };

  const useAssignDefaultRoadmap = () => { // FE action to assign default roadmap to user
    return useMutation({
      mutationFn: async ({ roadmapId }: { roadmapId: string }) => {
        if (!user?.userId) throw new Error("User not logged in");
        const res = await instance.post<AppApiResponse<Void>>("/roadmaps/assign", {
          userId: user.userId,
          roadmapId,
        });
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userRoadmap"] });
      },
    });
  };

  return {
    useUserRoadmap,
    useDefaultRoadmaps,
    useRoadmapItemDetail,
    useUserGoals,
    useCreateGoal,
    useUpdateGoal,
    useStartRoadmapItem,
    useCompleteRoadmapItem,
    useGenerateRoadmap,
    useAssignDefaultRoadmap,
  };
};
