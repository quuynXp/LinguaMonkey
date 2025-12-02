import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  FlashcardResponse,
  CreateFlashcardRequest,
} from "../types/dto";

// --- Keys Factory ---
export const flashcardKeys = {
  all: ["flashcards"] as const,
  lists: () => [...flashcardKeys.all, "list"] as const,
  // Params includes page, size, query, isPublic, and userId
  list: (lessonId: string, params: any) => [...flashcardKeys.lists(), lessonId, params] as const,
  due: (lessonId: string) => [...flashcardKeys.lists(), "due", lessonId] as const,
  details: () => [...flashcardKeys.all, "detail"] as const,
  detail: (id: string) => [...flashcardKeys.details(), id] as const,
};

// ==========================================
// === FLASHCARDS HOOKS ===
// ==========================================

export const useFlashcards = () => {
  const queryClient = useQueryClient();

  // 1. GET /api/v1/lessons/{lessonId}/flashcards
  const useGetFlashcards = (
    lessonId: string | null,
    params: {
      page?: number;
      size?: number;
      query?: string;
      isPublic?: boolean;
      userId?: string; // Added userId to params
    }
  ) => {
    const { page = 0, size = 20, query = "", isPublic, userId } = params;

    return useQuery({
      // Include userId in queryKey to differentiate cache if user changes
      queryKey: flashcardKeys.list(lessonId!, { page, size, query, isPublic, userId }),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID is required");

        // Send userId explicitly in params as requested
        const { data } = await instance.get<AppApiResponse<PageResponse<FlashcardResponse>>>(
          `/api/v1/lessons/${lessonId}/flashcards`,
          { params: { page, size, query, isPublic, userId } }
        );
        return data.result;
      },
      enabled: !!lessonId,
      placeholderData: (previousData) => previousData,
    });
  };

  // 2. GET /api/v1/lessons/{lessonId}/flashcards/{id} (Detail)
  const useGetFlashcard = (lessonId: string | null, flashcardId: string | null) => {
    return useQuery({
      queryKey: flashcardKeys.detail(flashcardId!),
      queryFn: async () => {
        if (!lessonId || !flashcardId) throw new Error("IDs are required");
        const { data } = await instance.get<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}`
        );
        return data.result;
      },
      enabled: !!lessonId && !!flashcardId,
    });
  };

  // 3. GET /api/v1/lessons/{lessonId}/flashcards/due (Due for review)
  const useGetDue = (lessonId: string | null, limit = 20) => {
    return useQuery({
      queryKey: flashcardKeys.due(lessonId!),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID is required");
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

  // 4. POST /api/v1/lessons/{lessonId}/flashcards (Create)
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
        queryClient.invalidateQueries({ queryKey: flashcardKeys.lists() });
        queryClient.invalidateQueries({ queryKey: flashcardKeys.due(vars.lessonId) });
      },
    });
  };

  // 5. PUT /api/v1/lessons/{lessonId}/flashcards/{id} (Update)
  const useUpdateFlashcard = () => {
    return useMutation({
      mutationFn: async ({
        lessonId,
        flashcardId,
        payload,
      }: {
        lessonId: string;
        flashcardId: string;
        payload: CreateFlashcardRequest;
      }) => {
        const { data } = await instance.put<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}`,
          payload
        );
        return data.result;
      },
      onSuccess: (data, vars) => {
        queryClient.invalidateQueries({ queryKey: flashcardKeys.detail(vars.flashcardId) });
        queryClient.invalidateQueries({ queryKey: flashcardKeys.lists() });
      },
    });
  };

  // 6. DELETE /api/v1/lessons/{lessonId}/flashcards/{id} (Delete)
  const useDeleteFlashcard = () => {
    return useMutation({
      mutationFn: async ({ lessonId, flashcardId }: { lessonId: string; flashcardId: string }) => {
        await instance.delete<AppApiResponse<void>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}`
        );
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: flashcardKeys.lists() });
        queryClient.invalidateQueries({ queryKey: flashcardKeys.due(vars.lessonId) });
        queryClient.removeQueries({ queryKey: flashcardKeys.detail(vars.flashcardId) });
      },
    });
  };

  // 7. POST /api/v1/lessons/{lessonId}/flashcards/{id}/review
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
        queryClient.setQueryData(flashcardKeys.detail(vars.flashcardId), updatedCard);
      },
    });
  };

  // 8. POST /api/v1/lessons/{lessonId}/flashcards/{id}/reset
  const useResetProgress = () => {
    return useMutation({
      mutationFn: async ({ lessonId, flashcardId }: { lessonId: string; flashcardId: string }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}/reset`
        );
        return data.result;
      },
      onSuccess: (data, vars) => {
        queryClient.invalidateQueries({ queryKey: flashcardKeys.detail(vars.flashcardId) });
        queryClient.invalidateQueries({ queryKey: flashcardKeys.due(vars.lessonId) });
      },
    });
  };

  // 9. POST /api/v1/lessons/{lessonId}/flashcards/{id}/suspend
  const useToggleSuspend = () => {
    return useMutation({
      mutationFn: async ({ lessonId, flashcardId }: { lessonId: string; flashcardId: string }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}/suspend`
        );
        return data.result;
      },
      onSuccess: (data, vars) => {
        queryClient.invalidateQueries({ queryKey: flashcardKeys.detail(vars.flashcardId) });
        queryClient.invalidateQueries({ queryKey: flashcardKeys.due(vars.lessonId) });
      },
    });
  };

  // 10. POST /api/v1/lessons/{lessonId}/flashcards/{id}/tts
  const useGenerateTts = () => {
    return useMutation({
      mutationFn: async ({
        lessonId,
        flashcardId,
        languageCode,
      }: {
        lessonId: string;
        flashcardId: string;
        languageCode: string;
      }) => {
        const { data } = await instance.post<AppApiResponse<FlashcardResponse>>(
          `/api/v1/lessons/${lessonId}/flashcards/${flashcardId}/tts`,
          null,
          { params: { languageCode } }
        );
        return data.result;
      },
      onSuccess: (data, vars) => {
        queryClient.setQueryData(flashcardKeys.detail(vars.flashcardId), data);
      },
    });
  };

  return {
    useGetFlashcards,
    useGetFlashcard,
    useGetDue,
    useCreateFlashcard,
    useUpdateFlashcard,
    useDeleteFlashcard,
    useReviewFlashcard,
    useResetProgress,
    useToggleSuspend,
    useGenerateTts,
  };
};