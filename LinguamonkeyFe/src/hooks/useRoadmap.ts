import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { useUserStore } from "../stores/UserStore";
import {
  AppApiResponse,
  RoadmapResponse,
  RoadmapUserResponse,
  UserGoalResponse,
  UserGoalRequest,
  CreateRoadmapRequest,
  GenerateRoadmapRequest,
  StartCompleteRoadmapItemRequest,
  AssignRoadmapRequest,
  AddSuggestionRequest,
  RoadmapPublicResponse,
  RoadmapSuggestionResponse,
} from "../types/dto";

import { RoadmapItem, RoadmapSuggestion } from "../types/entity";

export const roadmapKeys = {
  all: ["roadmaps"] as const,
  lists: () => [...roadmapKeys.all, "list"] as const,
  defaults: (lang?: string) => [...roadmapKeys.all, "defaults", { lang }] as const,
  publicStats: (lang?: string, page?: number) => [...roadmapKeys.all, "publicStats", { lang, page }] as const,
  detail: (id: string) => [...roadmapKeys.all, "detail", id] as const,
  userList: (userId: string) => [...roadmapKeys.all, "userList", userId] as const,
  progressDetail: (roadmapId: string, userId: string) => [...roadmapKeys.all, "progressDetail", roadmapId, userId] as const,
  itemDetail: (itemId: string) => [...roadmapKeys.all, "itemDetail", itemId] as const,
  goals: (userId: string) => [...roadmapKeys.all, "goals", userId] as const,
  suggestions: (roadmapId: string) => [...roadmapKeys.all, "suggestions", roadmapId] as const,
  community: (lang?: string, page?: number) => [...roadmapKeys.all, "community", { lang, page }] as const,
  official: (lang?: string, page?: number) => [...roadmapKeys.all, "official", { lang, page }] as const,

};

export const useRoadmap = () => {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const userId = user?.userId;

  // --- 1. USER ROADMAPS (My Learning) ---
  const useUserRoadmaps = (languageCode?: string) =>
    useQuery({
      queryKey: roadmapKeys.userList(userId!),
      queryFn: async () => {
        if (!userId) return [];
        const qp = languageCode ? `?language=${languageCode}` : "";
        const res = await instance.get<AppApiResponse<RoadmapUserResponse[]>>(
          `/api/v1/roadmaps/user/${userId}${qp}`
        );
        return res.data.result || [];
      },
      enabled: !!userId,
    });

  const useRoadmapWithProgress = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.progressDetail(roadmapId!, userId!),
      queryFn: async () => {
        if (!roadmapId || !userId) throw new Error("Missing IDs");
        const res = await instance.get<AppApiResponse<RoadmapUserResponse>>(
          `/api/v1/roadmaps/${roadmapId}/user/${userId}`
        );
        return res.data.result;
      },
      enabled: !!(roadmapId && userId),
    });

  const usePublicRoadmaps = () =>
    useQuery({
      queryKey: roadmapKeys.defaults(),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<RoadmapResponse[]>>("/api/v1/roadmaps/public");
        return res.data.result;
      },
    });

  const usePublicRoadmapsWithStats = (language: string = "en", page: number = 0, size: number = 10) =>
    useQuery({
      queryKey: roadmapKeys.publicStats(language, page),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<any>>("/api/v1/roadmaps/public/stats", {
          params: { language, page, size }
        });

        if (res.data.result && res.data.result.content) {
          return res.data.result.content as RoadmapPublicResponse[];
        }

        return [] as RoadmapPublicResponse[];
      },
    });

  const useRoadmapDetail = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.detail(roadmapId!),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Missing roadmapId");
        const res = await instance.get<AppApiResponse<RoadmapResponse>>(`/api/v1/roadmaps/${roadmapId}`);
        return res.data.result;
      },
      enabled: !!roadmapId,
    });

  // --- 3. ITEMS & SUGGESTIONS ---
  const useRoadmapItemDetail = (itemId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.itemDetail(itemId!),
      queryFn: async () => {
        if (!itemId) throw new Error("Item id missing");
        const res = await instance.get<AppApiResponse<RoadmapItem>>(`/api/v1/roadmaps/items/${itemId}`);
        return res.data.result;
      },
      enabled: !!itemId,
    });

  const useSuggestions = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.suggestions(roadmapId!),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Roadmap ID missing");
        // Gọi endpoint details mới
        const res = await instance.get<AppApiResponse<RoadmapSuggestionResponse[]>>(
          `/api/v1/roadmaps/${roadmapId}/suggestions/details`
        );
        return res.data.result || []; // 🐛 FIX: Trả về [] thay vì undefined
      },
      enabled: !!roadmapId,
    });

  // --- 4. MUTATIONS ---

  const useCreateRoadmap = () =>
    useMutation({
      mutationFn: async (req: CreateRoadmapRequest) => {
        const res = await instance.post<AppApiResponse<RoadmapResponse>>("/api/v1/roadmaps", req);
        return res.data.result;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
    });

  const useAssignRoadmap = () =>
    useMutation({
      mutationFn: async ({ roadmapId }: { roadmapId: string }) => {
        if (!userId) throw new Error("User not logged in");
        const payload: AssignRoadmapRequest = { userId, roadmapId };
        const res = await instance.post<AppApiResponse<void>>("/api/v1/roadmaps/assign", payload);
        return res.data.result;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) }),
    });

  const useAddSuggestion = () =>
    useMutation({
      mutationFn: async ({ roadmapId, itemId, suggestedOrderIndex, reason }: Omit<AddSuggestionRequest, 'userId'> & { roadmapId: string }) => {
        if (!userId) throw new Error("User not logged in");
        const payload: AddSuggestionRequest = { userId, itemId, suggestedOrderIndex, reason };
        const res = await instance.post<AppApiResponse<RoadmapSuggestion>>(
          `/api/v1/roadmaps/${roadmapId}/suggestions`,
          payload
        );
        return res.data.result;
      },
      onSuccess: (_data, { roadmapId }) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.suggestions(roadmapId) });
      },
    });

  const useApplySuggestion = () =>
    useMutation({
      mutationFn: async ({ suggestionId }: { suggestionId: string }) => {
        if (!userId) throw new Error("User not logged in");
        await instance.put<AppApiResponse<void>>(
          `/api/v1/roadmaps/suggestions/${suggestionId}/apply`,
          null,
          { params: { userId } }
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
      },
    });

  // --- 2. COMMUNITY ROADMAPS (User Shared) ---
  const useCommunityRoadmaps = (language: string = "en", page: number = 0, size: number = 10) =>
    useQuery({
      queryKey: roadmapKeys.community(language, page),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<any>>("/api/v1/roadmaps/public/community", {
          params: { language, page, size }
        });
        if (res.data.result && res.data.result.content) {
          return res.data.result.content as RoadmapPublicResponse[];
        }
        return [] as RoadmapPublicResponse[];
      },
    });

  // --- 3. OFFICIAL ROADMAPS (System Templates) ---
  const useOfficialRoadmaps = (language: string = "en", page: number = 0, size: number = 10) =>
    useQuery({
      queryKey: roadmapKeys.official(language, page),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<any>>("/api/v1/roadmaps/public/official", {
          params: { language, page, size }
        });
        if (res.data.result && res.data.result.content) {
          return res.data.result.content as RoadmapPublicResponse[];
        }
        return [] as RoadmapPublicResponse[];
      },
    });
  const useStartRoadmapItem = () =>
    useMutation({
      mutationFn: async (itemId: string) => {
        if (!userId) throw new Error("User not logged in");
        const payload: StartCompleteRoadmapItemRequest = { userId, itemId, score: 0 };
        const res = await instance.post<AppApiResponse<void>>("/api/v1/roadmaps/items/start", payload);
        return res.data.result;
      },
      onSuccess: (_data, itemId) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.itemDetail(itemId) });
      },
    });

  const useCompleteRoadmapItem = () =>
    useMutation({
      mutationFn: async ({ itemId, score }: { itemId: string; score?: number }) => {
        if (!userId) throw new Error("User not logged in");
        const payload: StartCompleteRoadmapItemRequest = { userId, itemId, score };
        const res = await instance.post<AppApiResponse<void>>("/api/v1/roadmaps/items/complete", payload);
        return res.data.result;
      },
      onSuccess: (_data, { itemId }) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.itemDetail(itemId) });
      },
    });



  const useGenerateRoadmap = () =>
    useMutation({
      mutationFn: async (req: GenerateRoadmapRequest) => {
        if (!userId) throw new Error("User not logged in");
        const payload: GenerateRoadmapRequest = { ...req, userId };
        const res = await instance.post<AppApiResponse<RoadmapResponse>>("/api/v1/roadmaps/generate", payload);
        return res.data.result;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) }),
    });

  // Edit and Delete handlers...
  const useEditRoadmap = () =>
    useMutation({
      mutationFn: async ({ id, req }: { id: string; req: CreateRoadmapRequest }) => {
        const res = await instance.put<AppApiResponse<RoadmapResponse>>(`/api/v1/roadmaps/${id}`, req);
        return res.data.result;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.detail(data!.id) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
      },
    });

  return {
    useUserRoadmaps,
    usePublicRoadmaps,
    usePublicRoadmapsWithStats,
    useRoadmapDetail,
    useRoadmapWithProgress,
    useRoadmapItemDetail,
    useSuggestions,
    useCommunityRoadmaps,
    useOfficialRoadmaps,
    useCreateRoadmap,
    useAssignRoadmap,
    useAddSuggestion,
    useApplySuggestion,
    useStartRoadmapItem,
    useCompleteRoadmapItem,
    useGenerateRoadmap,
    useEditRoadmap
  };
};