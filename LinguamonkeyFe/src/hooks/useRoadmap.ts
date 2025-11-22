import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
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
} from "../types/dto";

import { RoadmapItem, RoadmapSuggestion } from "../types/entity";

// --- Keys Factory ---
export const roadmapKeys = {
  all: ["roadmaps"] as const,
  lists: () => [...roadmapKeys.all, "list"] as const,
  defaults: (lang?: string) => [...roadmapKeys.all, "defaults", { lang }] as const,
  detail: (id: string) => [...roadmapKeys.all, "detail", id] as const,
  userList: (userId: string) => [...roadmapKeys.all, "userList", userId] as const,
  progressDetail: (roadmapId: string, userId: string) => [...roadmapKeys.all, "progressDetail", roadmapId, userId] as const,
  itemDetail: (itemId: string) => [...roadmapKeys.all, "itemDetail", itemId] as const,
  goals: (userId: string) => [...roadmapKeys.all, "goals", userId] as const,
  suggestions: (roadmapId: string) => [...roadmapKeys.all, "suggestions", roadmapId] as const,
};

export const useRoadmap = () => {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const userId = user?.userId;

  // ==========================================
  // === 1. ROADMAP QUERIES ===
  // ==========================================

  // GET /api/v1/roadmaps/user/{userId} (List user's roadmaps)
  const useUserRoadmaps = (languageCode?: string) =>
    useQuery({
      queryKey: roadmapKeys.userList(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User not logged in");
        const qp = languageCode ? `?language=${languageCode}` : "";
        const res = await instance.get<AppApiResponse<RoadmapUserResponse[]>>(
          `/api/v1/roadmaps/user/${userId}${qp}`
        );
        return res.data.result || [];
      },
      enabled: !!userId,
    });

  // GET /api/v1/roadmaps (Default/All public roadmaps)
  const useDefaultRoadmaps = (languageCode?: string) =>
    useQuery({
      queryKey: roadmapKeys.defaults(languageCode),
      queryFn: async () => {
        const qp = languageCode ? `?language=${languageCode}` : "";
        const res = await instance.get<AppApiResponse<RoadmapResponse[]>>(`/api/v1/roadmaps${qp}`);
        return res.data.result;
      },
    });

  // GET /api/v1/roadmaps/public
  const usePublicRoadmaps = () =>
    useQuery({
      queryKey: roadmapKeys.defaults(),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<RoadmapResponse[]>>("/api/v1/roadmaps/public");
        return res.data.result;
      },
    });

  // GET /api/v1/roadmaps/{roadmapId} (Roadmap structure only, no user progress)
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

  // GET /api/v1/roadmaps/{roadmapId}/user/{userId} (Roadmap structure WITH user progress)
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

  // GET /api/v1/roadmaps/items/{itemId}
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

  // GET /api/v1/roadmaps/{roadmapId}/suggestions
  const useSuggestions = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.suggestions(roadmapId!),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Roadmap ID missing");
        const res = await instance.get<AppApiResponse<RoadmapSuggestion[]>>(
          `/api/v1/roadmaps/${roadmapId}/suggestions`
        );
        return res.data.result;
      },
      enabled: !!roadmapId,
    });

  // ==========================================
  // === 2. GOALS (Assuming separate Controller) ===
  // ==========================================

  // GET /api/v1/user-goals
  const useUserGoals = () =>
    useQuery({
      queryKey: roadmapKeys.goals(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User not logged in");
        const res = await instance.get<AppApiResponse<UserGoalResponse[]>>("/api/v1/user-goals");
        return res.data.result;
      },
      enabled: !!userId,
    });

  // POST /api/v1/user-goals
  const useCreateGoal = () =>
    useMutation({
      mutationFn: async (goalData: UserGoalRequest) => {
        const res = await instance.post<AppApiResponse<UserGoalResponse>>("/api/v1/user-goals", goalData);
        return res.data.result;
      },
      onSuccess: () => {
        // FIX: Truyền userId! vào goals()
        queryClient.invalidateQueries({ queryKey: roadmapKeys.goals(userId!) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) });
      },
    });

  // PUT /api/v1/user-goals/{goalId}
  const useUpdateGoal = () =>
    useMutation({
      mutationFn: async ({ goalId, goalData }: { goalId: string; goalData: UserGoalRequest }) => {
        const res = await instance.put<AppApiResponse<UserGoalResponse>>(`/api/v1/user-goals/${goalId}`, goalData);
        return res.data.result;
      },
      onSuccess: () => {
        // FIX: Truyền userId! vào goals()
        queryClient.invalidateQueries({ queryKey: roadmapKeys.goals(userId!) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) });
      },
    });

  // ==========================================
  // === 3. ROADMAP MUTATIONS ===
  // ==========================================

  // POST /api/v1/roadmaps
  const useCreateRoadmap = () =>
    useMutation({
      mutationFn: async (req: CreateRoadmapRequest) => {
        const res = await instance.post<AppApiResponse<RoadmapResponse>>("/api/v1/roadmaps", req);
        return res.data.result;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
    });

  // PUT /api/v1/roadmaps/{id} (Edit)
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

  // DELETE /api/v1/roadmaps/{id}
  const useDeleteRoadmap = () =>
    useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/roadmaps/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
    });

  // POST /api/v1/roadmaps/generate
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

  // POST /api/v1/roadmaps/assign
  const useAssignDefaultRoadmap = () =>
    useMutation({
      mutationFn: async ({ roadmapId }: { roadmapId: string }) => {
        if (!userId) throw new Error("User not logged in");
        const payload: AssignRoadmapRequest = { userId, roadmapId };
        const res = await instance.post<AppApiResponse<void>>("/api/v1/roadmaps/assign", payload);
        return res.data.result;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.userList(userId!) }),
    });

  // PUT /api/v1/roadmaps/{roadmapId}/public
  const useSetRoadmapPublic = () =>
    useMutation({
      mutationFn: async ({ roadmapId, isPublic }: { roadmapId: string; isPublic: boolean }) => {
        if (!userId) throw new Error("User not logged in");
        await instance.put<AppApiResponse<void>>(
          `/api/v1/roadmaps/${roadmapId}/public`,
          null,
          { params: { userId, isPublic } }
        );
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
    });


  // ==========================================
  // === 4. ITEM & SUGGESTION MUTATIONS ===
  // ==========================================

  // POST /api/v1/roadmaps/items/start
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

  // POST /api/v1/roadmaps/items/complete
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

  // POST /api/v1/roadmaps/{roadmapId}/suggestions
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

  // PUT /api/v1/roadmaps/suggestions/{suggestionId}/apply
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

  return {
    useUserRoadmaps,
    useDefaultRoadmaps,
    useRoadmapItemDetail,
    useUserGoals,
    useRoadmapDetail,
    useRoadmapWithProgress,
    useSuggestions,

    // Mutations (General CRUD)
    useCreateRoadmap,
    useEditRoadmap,
    useDeleteRoadmap,
    useSetRoadmapPublic,
    useGenerateRoadmap,
    useAssignDefaultRoadmap,

    // Mutations (Goals)
    useCreateGoal,
    useUpdateGoal,

    // Mutations (Items)
    useStartRoadmapItem,
    useCompleteRoadmapItem,

    // Mutations (Suggestions)
    useAddSuggestion,
    useApplySuggestion,
  };
};