import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  FlashcardResponse,
  CreateFlashcardRequest,
} from "../types/dto";

export const flashcardKeys = {
  all: ["flashcards"] as const,
  lists: () => [...flashcardKeys.all, "list"] as const,
  // Differentiate My vs Community keys
  myList: (lessonId: string, params: any) => [...flashcardKeys.lists(), "my", lessonId, params] as const,
  communityList: (lessonId: string, params: any) => [...flashcardKeys.lists(), "community", lessonId, params] as const,
  due: (lessonId: string) => [...flashcardKeys.lists(), "due", lessonId] as const,
  details: () => [...flashcardKeys.all, "detail"] as const,
  detail: (id: string) => [...flashcardKeys.details(), id] as const,
};

export const useFlashcards = () => {
  const queryClient = useQueryClient();

  // 1. GET /api/v1/lessons/{lessonId}/flashcards/my
  const useGetMyFlashcards = (
    lessonId: string | null,
    params: { page?: number; size?: number; query?: string }
  ) => {
    const { page = 0, size = 20, query = "" } = params;
    return useQuery({
      queryKey: flashcardKeys.myList(lessonId!, { page, size, query }),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<FlashcardResponse>>>(
          `/api/v1/lessons/${lessonId}/flashcards/my`,
          { params: { page, size, query } }
        );
        return data.result;
      },
      enabled: !!lessonId,
    });
  };

  // 2. GET /api/v1/lessons/{lessonId}/flashcards/community
  const useGetCommunityFlashcards = (
    lessonId: string | null,
    params: { page?: number; size?: number; query?: string; sort?: string }
  ) => {
    const { page = 0, size = 20, query = "", sort = "popular" } = params;
    return useQuery({
      queryKey: flashcardKeys.communityList(lessonId!, { page, size, query, sort }),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<FlashcardResponse>>>(
          `/api/v1/lessons/${lessonId}/flashcards/community`,
          { params: { page, size, query, sort } }
        );
        return data.result;
      },
      enabled: !!lessonId,
    });
  };

  // 3. GET Due
  const useGetDue = (lessonId: string | null, limit = 20) => {
    return useQuery({
      queryKey: flashcardKeys.due(lessonId!),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID required");
        const { data } = await instance.get<AppApiResponse<FlashcardResponse[]>>(
          `/api/v1/lessons/${lessonId}/flashcards/due`,
          { params: { limit } }
        );
        return data.result || [];
      },
      enabled: !!lessonId,
      staleTime: 0,
    });
  };

  // 4. Create
  const useCreateFlashcard = () => {
    return useMutation({
      mutationFn: async ({ lessonId, payload }: { lessonId: string; payload: CreateFlashcardRequest }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards`,
          payload
        );
        return data.result;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: flashcardKeys.lists() }); // invalidates both my and community
        queryClient.invalidateQueries({ queryKey: flashcardKeys.due(vars.lessonId) });
      },
    });
  };

  // 5. CLAIM
  const useClaimFlashcard = () => {
    return useMutation({
      mutationFn: async ({ lessonId, flashcardId }: { lessonId: string; flashcardId: string }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}/claim`
        );
        return data.result;
      },
      onSuccess: (_, vars) => {
        // Refresh My List to show the new card
        queryClient.invalidateQueries({ queryKey: flashcardKeys.myList(vars.lessonId, {}) });
        // Refresh Community List to update claim count
        queryClient.invalidateQueries({ queryKey: flashcardKeys.communityList(vars.lessonId, {}) });
      }
    });
  };

  // 6. Review
  const useReviewFlashcard = () => {
    return useMutation({
      mutationFn: async ({
        lessonId,
        flashcardId,
        quality,
      }: {
        lessonId: string;
        flashcardId: string;
        quality: number;
      }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}/review`,
          null,
          { params: { quality } }
        );
        return data.result;
      },
      onSuccess: (updatedCard, vars) => {
        queryClient.setQueryData(flashcardKeys.due(vars.lessonId), (old: FlashcardResponse[] | undefined) =>
          old ? old.filter((c) => c.flashcardId !== vars.flashcardId) : []
        );
      },
    });
  };

  return {
    useGetMyFlashcards,
    useGetCommunityFlashcards,
    useGetDue,
    useCreateFlashcard,
    useClaimFlashcard,
    useReviewFlashcard,
  };
};