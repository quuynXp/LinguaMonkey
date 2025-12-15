import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { useUserStore } from "../stores/UserStore";
import {
  AppApiResponse,
  RoadmapResponse,
  RoadmapUserResponse,
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
  reviews: (roadmapId: string) => [...roadmapKeys.all, "reviews", roadmapId] as const,
  community: (lang?: string, page?: number) => [...roadmapKeys.all, "community", { lang, page }] as const,
  official: (lang?: string, page?: number) => [...roadmapKeys.all, "official", { lang, page }] as const,
};

export type ExtendedPublicRoadmapDetail = RoadmapPublicResponse & {
  items: RoadmapItem[];
};

const mapItemResponseToRoadmapItem = (responseItem: any): RoadmapItem => {
  return {
    itemId: responseItem.id || responseItem.itemId,
    title: responseItem.title || responseItem.name,
    description: responseItem.description,
    type: responseItem.type,
    level: responseItem.level,
    estimatedTime: responseItem.estimatedTime,
    orderIndex: responseItem.orderIndex,
    category: responseItem.category,
    difficulty: responseItem.difficulty,
    expReward: responseItem.expReward,
    contentId: responseItem.contentId,
    skills: responseItem.skills,
    createdAt: responseItem.createdAt || new Date().toISOString(),
    updatedAt: responseItem.updatedAt,
    isDeleted: responseItem.isDeleted || false,
  } as RoadmapItem;
};

export const useRoadmap = () => {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const userId = user?.userId;

  const useUserRoadmaps = () =>
    useQuery({
      queryKey: roadmapKeys.userList(userId!),
      queryFn: async () => {
        if (!userId) return [];
        const res = await instance.get<AppApiResponse<RoadmapUserResponse[]>>(
          `/api/v1/roadmaps/user/${userId}`
        );
        return res.data.result || [];
      },
      enabled: !!userId,
    });

  // UPDATED: Added options parameter to control enabled state
  const useRoadmapWithProgress = (roadmapId: string | null, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: roadmapKeys.progressDetail(roadmapId!, userId!),
      queryFn: async () => {
        if (!roadmapId || !userId) throw new Error("Missing IDs");
        const res = await instance.get<AppApiResponse<RoadmapUserResponse>>(
          `/api/v1/roadmaps/${roadmapId}/user/${userId}`
        );
        return res.data.result;
      },
      enabled: !!(roadmapId && userId) && (options?.enabled ?? true),
    });

  const usePublicRoadmaps = () =>
    useQuery({
      queryKey: roadmapKeys.defaults(),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<RoadmapResponse[]>>("/api/v1/roadmaps/public");
        return res.data.result;
      },
    });

  const useToggleFavoriteRoadmap = () =>
    useMutation({
      mutationFn: async (roadmapId: string) => {
        if (!userId) throw new Error("User not logged in");
        await instance.post(`/api/v1/roadmaps/${roadmapId}/favorite`, null, {
          params: { userId }
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.community() });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.official() });
      }
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

  const usePublicRoadmapDetail = (roadmapId: string | null, options?: { enabled?: boolean }) =>
    useQuery({
      queryKey: roadmapKeys.detail(roadmapId || ''),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Missing roadmapId");

        const res = await instance.get<AppApiResponse<RoadmapResponse>>(
          `/api/v1/roadmaps/${roadmapId}`
        );
        const data = res.data.result;

        if (!data) throw new Error("Roadmap not found");

        const itemsMapped: RoadmapItem[] = (data.items || []).map(mapItemResponseToRoadmapItem);

        const mappedData: ExtendedPublicRoadmapDetail = {
          roadmapId: data.id,
          title: data.title,
          description: data.description,
          language: data.language,
          items: itemsMapped,
          isOfficial: false,
          creator: "",
          creatorAvatar: "",
          favoriteCount: 0,
          isFavorite: false,
          suggestionCount: 0,
          totalItems: data.items?.length || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          viewCount: 0
        };
        return mappedData;
      },
      enabled: !!roadmapId && (options?.enabled ?? true),
    });

  const useRoadmapDetail = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.detail(roadmapId || ''),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Missing roadmapId");
        const res = await instance.get<AppApiResponse<RoadmapResponse>>(`/api/v1/roadmaps/${roadmapId}`);
        return res.data.result;
      },
      enabled: !!roadmapId,
    });

  const useRoadmapItemDetail = (itemId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.itemDetail(itemId || ''),
      queryFn: async () => {
        if (!itemId) throw new Error("Item id missing");
        const res = await instance.get<AppApiResponse<RoadmapItem>>(`/api/v1/roadmaps/items/${itemId}`);
        return res.data.result;
      },
      enabled: !!itemId,
    });

  const useSuggestions = (roadmapId: string | null) =>
    useQuery({
      queryKey: roadmapKeys.suggestions(roadmapId || ''),
      queryFn: async () => {
        if (!roadmapId) throw new Error("Roadmap ID missing");
        const res = await instance.get<AppApiResponse<RoadmapSuggestionResponse[]>>(
          `/api/v1/roadmaps/${roadmapId}/suggestions/details`
        );
        return res.data.result || [];
      },
      enabled: !!roadmapId,
    });

  const useRoadmapReviews = (roadmapId: string) =>
    useQuery({
      queryKey: roadmapKeys.reviews(roadmapId),
      queryFn: async () => {
        const res = await instance.get<AppApiResponse<any[]>>(`/api/v1/roadmaps/${roadmapId}/reviews`);
        return res.data.result || [];
      },
      enabled: !!roadmapId,
    });

  const useAddRoadmapReview = () =>
    useMutation({
      mutationFn: async ({ roadmapId, comment, rating, parentId }: { roadmapId: string, comment: string, rating: number | null, parentId?: string }) => {
        if (!userId) throw new Error("User not logged in");
        const res = await instance.post<AppApiResponse<any>>(`/api/v1/roadmaps/${roadmapId}/reviews`, {
          userId,
          comment,
          rating,
          parentId
        });
        return res.data.result;
      },
      onSuccess: (_data, { roadmapId }) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.reviews(roadmapId) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.publicStats() });
      },
    });

  const useCreateRoadmap = () =>
    useMutation({
      mutationFn: async (req: CreateRoadmapRequest) => {
        const sanitizedReq = {
          ...req,
          currentLevel: Number(req.currentLevel) || 0,
          targetLevel: Number(req.targetLevel) || 0,
          estimatedCompletionTime: Number(req.estimatedCompletionTime) || 0,
          certification: req.certification,
          items: (req.items || []).map((item, index) => ({
            ...item,
            estimatedTime: Number(item.estimatedTime) || 0,
            orderIndex: Number(item.orderIndex) || index,
            resources: (item.resources || []).map(res => ({
              ...res,
              duration: Number(res.duration) || 0
            }))
          }))
        };

        const res = await instance.post<AppApiResponse<RoadmapResponse>>("/api/v1/roadmaps", sanitizedReq);
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
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all }),
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

  const useCommunityRoadmaps = (language: string = "en", page: number = 0, size: number = 10) =>
    useQuery({
      queryKey: roadmapKeys.community(language, page),
      queryFn: async () => {
        const params: any = { language, page, size };
        if (userId) params.userId = userId;
        const res = await instance.get<AppApiResponse<any>>("/api/v1/roadmaps/public/community", { params });
        if (res.data.result && res.data.result.content) {
          return res.data.result.content as RoadmapPublicResponse[];
        }
        return [] as RoadmapPublicResponse[];
      },
    });

  const useOfficialRoadmaps = (language: string = "en", page: number = 0, size: number = 10) =>
    useQuery({
      queryKey: roadmapKeys.official(language, page),
      queryFn: async () => {
        const params: any = { language, page, size };
        if (userId) params.userId = userId;
        const res = await instance.get<AppApiResponse<any>>("/api/v1/roadmaps/public/official", { params });
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
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
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
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
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
      onSuccess: () => queryClient.invalidateQueries({ queryKey: roadmapKeys.all })
    });

  const useEditRoadmap = () =>
    useMutation({
      mutationFn: async ({ id, req }: { id: string; req: CreateRoadmapRequest }) => {
        const sanitizedReq = {
          ...req,
          currentLevel: Number(req.currentLevel) || 0,
          targetLevel: Number(req.targetLevel) || 0,
          estimatedCompletionTime: Number(req.estimatedCompletionTime) || 0,
          certification: req.certification,
          items: (req.items || []).map((item, index) => ({
            ...item,
            estimatedTime: Number(item.estimatedTime) || 0,
            orderIndex: Number(item.orderIndex) || index,
            resources: (item.resources || []).map(res => ({
              ...res,
              duration: Number(res.duration) || 0
            }))
          }))
        };

        const res = await instance.put<AppApiResponse<RoadmapResponse>>(`/api/v1/roadmaps/${id}`, sanitizedReq);
        return res.data.result;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.detail(data!.id) });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
      },
    });

  const useDeleteRoadmap = () =>
    useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/roadmaps/${id}`);
      },
      onSuccess: () => {
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
    useToggleFavoriteRoadmap,
    usePublicRoadmapDetail,
    useCreateRoadmap,
    useAssignRoadmap,
    useAddSuggestion,
    useApplySuggestion,
    useStartRoadmapItem,
    useCompleteRoadmapItem,
    useGenerateRoadmap,
    useEditRoadmap,
    useDeleteRoadmap,
    useRoadmapReviews,
    useAddRoadmapReview
  };
};