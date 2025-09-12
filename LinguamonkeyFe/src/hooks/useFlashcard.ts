
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "../types/api";


export const useFlashcards = () => {
  const queryClient = useQueryClient();
  const BASE = "/lessons"; // then /{lessonId}/flashcards

  const useGetDue = (lessonId: string | null, userId: string | null, limit = 20) => {
    return useQuery({
      queryKey: ["dueFlashcards", lessonId, userId, limit],
      queryFn: async () => {
        if (!lessonId || !userId) return [];
        const res = await instance.get<ApiResponse<any[]>>(`${BASE}/${lessonId}/flashcards/due?userId=${userId}&limit=${limit}`);
        return res.data.result ?? [];
      },
      enabled: !!lessonId && !!userId,
      staleTime: 60_000,
    });
  };

  const useCreateFlashcard = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, payload }: { lessonId: string; payload: any }) => {
        const res = await instance.post<ApiResponse<any>>(`${BASE}/${lessonId}/flashcards`, payload);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dueFlashcards"] }),
    });
    return { createFlashcard: mutation.mutateAsync, isCreating: mutation.isPending, error: mutation.error };
  };

  const useReviewFlashcard = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, flashcardId, quality }: { lessonId: string; flashcardId: string; quality: number }) => {
        const res = await instance.post<ApiResponse<any>>(`${BASE}/${lessonId}/flashcards/${flashcardId}/review?quality=${quality}`);
        return res.data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey :  ["dueFlashcards"]});
        queryClient.invalidateQueries({queryKey : ["currentUser"]});
      },
    });
    return { reviewFlashcard: mutation.mutateAsync, isReviewing: mutation.isPending, error: mutation.error };
  };

  const useGenerateTts = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, flashcardId, languageCode }: { lessonId: string; flashcardId: string; languageCode: string }) => {
        const res = await instance.post<ApiResponse<any>>(`${BASE}/${lessonId}/flashcards/${flashcardId}/tts?languageCode=${languageCode}`);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey : ["dueFlashcards"]}),
    });
    return { generateTts: mutation.mutateAsync, isGenerating: mutation.isPending, error: mutation.error };
  };

  return { useGetDue, useCreateFlashcard, useReviewFlashcard, useGenerateTts };
};

/* ------------------- New: User Learning Activities hooks ------------------- */
export const useUserLearningActivities = () => {
  const queryClient = useQueryClient();
  const BASE = "/user-learning-activities";

  const useAllActivities = (params?: { userId?: string; page?: number; size?: number; sort?: string }) => {
    return useQuery({
      queryKey: ["userLearningActivities", params || {}],
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.userId) qp.append("userId", params.userId);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));
        if (params?.sort) qp.append("sort", params.sort);
        const url = qp.toString() ? `${BASE}?${qp.toString()}` : BASE;
        const res = await instance.get<ApiResponse<any>>(url);
        return res.data.result;
      },
      staleTime: 60_000,
    });
  };

  const useGetActivity = (id: string | null) => {
    return useQuery({
      queryKey: ["userLearningActivity", id],
      queryFn: async () => {
        if (!id) throw new Error("id required");
        const res = await instance.get<ApiResponse<any>>(`${BASE}/${id}`);
        return res.data.result!;
      },
      enabled: !!id,
      staleTime: 60_000,
    });
  };

  const useCreateActivity = () => {
    const mutation = useMutation({
      mutationFn: async (payload: any) => {
        const res = await instance.post<ApiResponse<any>>(BASE, payload);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey : ["userLearningActivities"]}),
    });
    return { createActivity: mutation.mutateAsync, isCreating: mutation.isPending, error: mutation.error };
  };

  const useUpdateActivity = () => {
    const mutation = useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
        const res = await instance.put<ApiResponse<any>>(`${BASE}/${id}`, payload);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey :["userLearningActivities"] }),
    });
    return { updateActivity: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
  };

  const useDeleteActivity = () => {
    const mutation = useMutation({
      mutationFn: async (id: string) => {
        const res = await instance.delete<ApiResponse<void>>(`${BASE}/${id}`);
        return res.data;
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey :["userLearningActivities"] }),
    });
    return { deleteActivity: mutation.mutateAsync, isDeleting: mutation.isPending, error: mutation.error };
  };

  return { useAllActivities, useGetActivity, useCreateActivity, useUpdateActivity, useDeleteActivity };
};