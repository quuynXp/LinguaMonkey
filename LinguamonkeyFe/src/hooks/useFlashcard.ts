import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
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

  // 1. GET /api/v1/lessons/{lessonId}/flashcards (Search & Pagination)
  const useGetFlashcards = (
    lessonId: string | null,
    params: { page?: number; size?: number; query?: string }
  ) => {
    const { page = 0, size = 20, query = "" } = params;
    return useQuery({
      queryKey: flashcardKeys.list(lessonId!, { page, size, query }),
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID is required");
        const { data } = await instance.get<AppApiResponse<PageResponse<FlashcardResponse>>>(
          `/api/v1/lessons/${lessonId}/flashcards`,
          { params: { page, size, query } }
        );
        return data.result;
      },
      enabled: !!lessonId,
      placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
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
      staleTime: 0, // Due cards should be fresh
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
        queryClient.invalidateQueries({ queryKey: flashcardKeys.lists() }); // Invalidate all lists
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

  // 7. POST /api/v1/lessons/{lessonId}/flashcards/{id}/review (Anki Algorithm)
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
        // Remove from "Due" list optimistically
        queryClient.setQueryData(flashcardKeys.due(vars.lessonId), (old: FlashcardResponse[] | undefined) =>
          old ? old.filter((c) => c.flashcardId !== vars.flashcardId) : []
        );
        // Update detail cache if exists
        queryClient.setQueryData(flashcardKeys.detail(vars.flashcardId), updatedCard);
      },
    });
  };

  // 8. POST /api/v1/lessons/{lessonId}/flashcards/{id}/reset (Reset Progress)
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

  // 9. POST /api/v1/lessons/{lessonId}/flashcards/{id}/suspend (Toggle Suspend)
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

  // 10. POST /api/v1/lessons/{lessonId}/flashcards/{id}/tts (Generate Audio)
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

// ==========================================
// === 2. USER LEARNING ACTIVITIES ===
// ==========================================
// Note: Refactored to use DTOs based on assumptions from entity.ts/dto.ts
// since Controller was not provided in this turn.

// export const useUserLearningActivities = () => {
//   const queryClient = useQueryClient();
//   const BASE = "/api/v1/user-learning-activities"; // Standardized prefix

//   const useAllActivities = (params?: { userId?: string; page?: number; size?: number; sort?: string }) => {
//     const { userId, page = 0, size = 10, sort } = params || {};
//     return useQuery({
//       queryKey: activityKeys.lists({ userId, page, size, sort }),
//       queryFn: async () => {
//         const qp = new URLSearchParams();
//         if (userId) qp.append("userId", userId);
//         qp.append("page", page.toString());
//         qp.append("size", size.toString());
//         if (sort) qp.append("sort", sort);

//         const { data } = await instance.get<AppApiResponse<PageResponse<UserLearningActivityResponse>>>(
//           `${BASE}?${qp.toString()}`
//         );

//         // Map PageResponse
//         const pageResult = data.result;
//         return {
//           data: pageResult?.content || [],
//           pagination: {
//             pageNumber: pageResult?.pageNumber ?? page,
//             pageSize: pageResult?.pageSize ?? size,
//             totalElements: pageResult?.totalElements ?? 0,
//             totalPages: pageResult?.totalPages ?? 0,
//             isLast: pageResult?.isLast ?? true,
//             isFirst: pageResult?.isFirst ?? true,
//             hasNext: pageResult?.hasNext ?? false,
//             hasPrevious: pageResult?.hasPrevious ?? false,
//           }
//         };
//       },
//       staleTime: 60_000,
//     });
//   };

//   const useGetActivity = (id: string | null) => {
//     return useQuery({
//       queryKey: activityKeys.detail(id!),
//       queryFn: async () => {
//         if (!id) throw new Error("ID required");
//         const { data } = await instance.get<AppApiResponse<UserLearningActivityResponse>>(
//           `${BASE}/${id}`
//         );
//         return data.result!;
//       },
//       enabled: !!id,
//       staleTime: 60_000,
//     });
//   };

//   const useCreateActivity = () => {
//     return useMutation({
//       mutationFn: async (payload: UserLearningActivityRequest) => {
//         const { data } = await instance.post<AppApiResponse<UserLearningActivityResponse>>(
//           BASE,
//           payload
//         );
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
//     });
//   };

//   const useUpdateActivity = () => {
//     return useMutation({
//       mutationFn: async ({ id, payload }: { id: string; payload: UserLearningActivityRequest }) => {
//         const { data } = await instance.put<AppApiResponse<UserLearningActivityResponse>>(
//           `${BASE}/${id}`,
//           payload
//         );
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
//     });
//   };

//   const useDeleteActivity = () => {
//     return useMutation({
//       mutationFn: async (id: string) => {
//         await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
//     });
//   };
//
//   return {
//     useAllActivities,
//     useGetActivity,
//     useCreateActivity,
//     useUpdateActivity,
//     useDeleteActivity
//   };
// };