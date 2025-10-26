// src/hooks/useLessons.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type {
  ApiResponse,
  PaginatedResponse,
  Lesson as LessonType,
  LessonQuestion as LessonQuestionType,
  LessonProgress as LessonProgressType,
} from "../types/api";

/**
 * Hooks for lessons.
 * Each exported hook returns the friendly functions/data the UI expects.
 * Endpoints assume base '/api/v1/lessons' (adjust API_BASE if different).
 */

const API_BASE = "/api/v1/lessons";

const buildParams = (params: Record<string, any>) => {
  const qp = new URLSearchParams();
  if (params.page !== undefined) qp.append("page", String(params.page));
  if (params.size !== undefined) qp.append("size", String(params.size));
  if (params.sortBy) {
    const order = params.sortOrder && params.sortOrder.toLowerCase() === "desc" ? "desc" : "asc";
    qp.append("sort", `${params.sortBy},${order}`);
  }
  if (params.lessonName) qp.append("lessonName", params.lessonName);
  if (params.languageCode) qp.append("languageCode", params.languageCode);
  if (params.minExpReward !== undefined) qp.append("minExpReward", String(params.minExpReward));
  if (params.categoryId) qp.append("categoryId", params.categoryId);
  if (params.subCategoryId) qp.append("subCategoryId", params.subCategoryId);
  if (params.courseId) qp.append("courseId", params.courseId);
  if (params.seriesId) qp.append("seriesId", params.seriesId);
  if (params.skillType) qp.append("skillType", params.skillType);
  return qp.toString();
};

/* ------------------ useAllLessons ------------------ */
export const useAllLessons = (params?: {
  page?: number; size?: number; sortBy?: string; sortOrder?: "asc" | "desc";
  lessonName?: string; languageCode?: string; minExpReward?: number;
  categoryId?: string; subCategoryId?: string; courseId?: string; seriesId?: string; skillType?: string;
}) => {
  return useQuery({
    queryKey: ["lessons", params || {}],
    queryFn: async () => {
      const qs = buildParams(params || {});
      const url = qs ? `${API_BASE}?${qs}` : API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonType>>>(url);
      return res.data.result ?? { data: [], pagination: { page: params?.page ?? 0, size: params?.size ?? 20, total: 0, totalPages: 0 } };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLesson ------------------ */
export const useLesson = (lessonId: string | null) => {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId required");
      const res = await instance.get<ApiResponse<LessonType>>(`${API_BASE}/${lessonId}`);
      return res.data.result!;
    },
    enabled: !!lessonId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonQuestions ------------------ */
export const useLessonQuestions = (lessonId: string | null) => {
  return useQuery({
    queryKey: ["lessonQuestions", lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId required");
      const res = await instance.get<ApiResponse<LessonQuestionType[]>>(`${API_BASE}/${lessonId}/questions`);
      return res.data.result ?? [];
    },
    enabled: !!lessonId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonProgress ------------------ */
export const useLessonProgress = (lessonId: string | null, userId?: string | null) => {
  return useQuery({
    queryKey: ["lessonProgress", lessonId, userId ?? "me"],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId required");
      const url = userId ? `${API_BASE}/${lessonId}/progress?userId=${encodeURIComponent(userId)}` : `${API_BASE}/${lessonId}/progress`;
      const res = await instance.get<ApiResponse<LessonProgressType | null>>(url);
      return res.data.result ?? null;
    },
    enabled: !!lessonId,
    staleTime: 60_000,
  });
};

/* ------------------ useSubmitLesson ------------------
   expected usage in UI: const { submitLesson, isSubmitting } = useSubmitLesson();
   await submitLesson(lessonId, answers)
   returns result object from backend (score, correct count, total, exp_gained, etc.)
--------------------------------------------------------------------- */
export const useSubmitLesson = () => {
  const qc = useQueryClient();
  const user = useUserStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async ({ lessonId, answers, userId }: { lessonId: string; answers: Record<string, string>; userId?: string }) => {
      // backend: POST /lessons/{lessonId}/complete (optionally ?userId=)
      const url = userId ? `${API_BASE}/${lessonId}/complete?userId=${encodeURIComponent(userId)}` : `${API_BASE}/${lessonId}/complete`;
      const res = await instance.post<ApiResponse<any>>(url, { answers });
      return res.data.result!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["lessonProgress", vars.lessonId] });
      qc.invalidateQueries({ queryKey: ["lesson", vars.lessonId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  return {
    submitLesson: async (lessonId: string, answers: Record<string, string>) => {
      const uid = user?.userId;
      return mutation.mutateAsync({ lessonId, answers, userId: uid }) as Promise<any>;
    },
    isSubmitting: mutation.isPending,
    error: mutation.error,
  };
};

/* ------------------ useCompleteLesson ------------------
   UI: await completeLesson(lessonId, score)
   backend: POST /lessons/{lessonId}/complete/manual (or use same endpoint depending backend)
   We'll post to /lessons/{lessonId}/complete/manual with { score, userId }
--------------------------------------------------------------------- */
export const useCompleteLesson = () => {
  const qc = useQueryClient();
  const user = useUserStore((s) => s.user);

  const mutation = useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score: number }) => {
      const url = `${API_BASE}/${lessonId}/complete/manual`;
      const payload: any = { score };
      if (user?.userId) payload.userId = user.userId;
      const res = await instance.post<ApiResponse<any>>(url, payload);
      return res.data.result!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["lessonProgress", vars.lessonId] });
      qc.invalidateQueries({ queryKey: ["lesson", vars.lessonId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  return {
    completeLesson: async (lessonId: string, score: number) => {
      return mutation.mutateAsync({ lessonId, score }) as Promise<any>;
    },
    isCompleting: mutation.isPending,
    error: mutation.error,
  };
};

/* ------------------ other CRUD hooks (optional) ------------------ */
/* If you need create/update/delete wrappers similar to the previous message, add them here. */

export default {
  useAllLessons,
  useLesson,
  useLessonQuestions,
  useLessonProgress,
  useSubmitLesson,
  useCompleteLesson,
};
