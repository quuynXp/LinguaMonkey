import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "../types/api";

/* ----------------- Types (client-side, đơn giản) ----------------- */
export interface Lesson { /* same as before */
  lessonId: string;
  lessonName: string;
  title: string;
  languageCode?: string;
  expReward: number;
  courseId?: string;
  lessonSeriesId?: string;
  lessonCategoryId?: string;
  lessonSubCategoryId?: string;
  createdAt?: string;
  updatedAt?: string;
  questions?: LessonQuestion[];
  progress?: LessonProgress;
  category?: LessonCategory;
  series?: LessonSeries;
  course?: Course;
  flashcardCount?: number;
  dueFlashcardsCount?: number;
  videoUrls?: string[];
  lessonType?: string;
  skillTypes?: string;
}

export interface LessonQuestion {
  lessonQuestionId: string;
  lessonId: string;
  languageCode?: string;
  question: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  skillType?: string;
}

export interface LessonProgress {
  lessonId: string;
  userId: string;
  score: number;
  completedAt?: string;
  createdAt?: string;
}

export interface LessonCategory {
  lessonCategoryId: string;
  lessonCategoryName: string;
  languageCode?: string;
  description?: string;
}

export interface LessonSeries {
  lessonSeriesId: string;
  lessonSeriesName: string;
  title?: string;
  languageCode?: string;
  description?: string;
  lessons?: Lesson[];
}

export interface Course {
  courseId: string;
  title: string;
  description?: string;
}

/* Skill response minimal types (expand nếu cần) */
export interface ListeningResponse { transcription: string; questions: any[] }
export interface PronunciationResponseBody { score: number; details?: any }
export interface ReadingResponse { passage: string; questions: any[] }
export interface WritingResponseBody { score: number; feedback?: any }

/* Request bodies for spelling/translation */
export interface SpellingRequestBody { text: string; language?: string }
export interface TranslationRequestBody { translatedText: string; targetLanguage: string }

/* ------------------- Hooks ------------------- */
export const useLessons = () => {
  const queryClient = useQueryClient();
  const API_BASE = "/lessons";
  const SKILL_BASE = "/skill-lessons";

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

  /* ---------- Lessons CRUD & queries ---------- */
  const useAllLessons = (params?: {
    page?: number; size?: number; sortBy?: string; sortOrder?: "asc" | "desc";
    lessonName?: string; languageCode?: string; minExpReward?: number;
    categoryId?: string; subCategoryId?: string; courseId?: string; seriesId?: string; skillType?: string;
  }) =>
    useQuery<PaginatedResponse<Lesson>>({
      queryKey: ["lessons", params || {}],
      queryFn: async () => {
        const qs = buildParams(params || {});
        const url = qs ? `${API_BASE}?${qs}` : API_BASE;
        const res = await instance.get<ApiResponse<PaginatedResponse<Lesson>>>(url);
        return res.data.result ?? { data: [], pagination: { page: params?.page ?? 0, size: params?.size ?? 20, total: 0, totalPages: 0 } };
      },
      keepPreviousData: true,
      staleTime: 5 * 60_000,
    });

  const useLesson = (lessonId: string | null) =>
    useQuery<Lesson>({
      queryKey: ["lesson", lessonId],
      queryFn: async () => {
        if (!lessonId) throw new Error("lessonId required");
        const res = await instance.get<ApiResponse<Lesson>>(`${API_BASE}/${lessonId}`);
        return res.data.result!;
      },
      enabled: !!lessonId,
      staleTime: 5 * 60_000,
    });

  const useLessonQuestions = (lessonId: string | null) =>
    useQuery<LessonQuestion[]>({
      queryKey: ["lessonQuestions", lessonId],
      queryFn: async () => {
        if (!lessonId) throw new Error("lessonId required");
        const res = await instance.get<ApiResponse<LessonQuestion[]>>(`${API_BASE}/${lessonId}/questions`);
        return res.data.result ?? [];
      },
      enabled: !!lessonId,
      staleTime: 5 * 60_000,
    });

  const useLessonCategories = (languageCode?: string) =>
    useQuery<LessonCategory[]>({
      queryKey: ["lessonCategories", languageCode || "all"],
      queryFn: async () => {
        const url = languageCode ? `${API_BASE}/categories?language=${languageCode}` : `${API_BASE}/categories`;
        const res = await instance.get<ApiResponse<LessonCategory[]>>(url);
        return res.data.result ?? [];
      },
      staleTime: 10 * 60_000,
    });

  const useLessonSeries = (languageCode?: string) =>
    useQuery<LessonSeries[]>({
      queryKey: ["lessonSeries", languageCode || "all"],
      queryFn: async () => {
        const url = languageCode ? `${API_BASE}/series?language=${languageCode}` : `${API_BASE}/series`;
        const res = await instance.get<ApiResponse<LessonSeries[]>>(url);
        return res.data.result ?? [];
      },
      staleTime: 10 * 60_000,
    });

  const useCreateLesson = () => {
    const mutation = useMutation({
      mutationFn: async (payload: Partial<Lesson>) => (await instance.post<ApiResponse<Lesson>>(`${API_BASE}`, payload)).data.result!,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] })
    });
    return { createLesson: mutation.mutateAsync, isCreating: mutation.isPending, error: mutation.error };
  };

  const useUpdateLesson = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, payload }: { lessonId: string; payload: Partial<Lesson> }) =>
        (await instance.put<ApiResponse<Lesson>>(`${API_BASE}/${lessonId}`, payload)).data.result!,
      onSuccess: (data) => {
        queryClient.setQueryData(["lesson", data.lessonId ?? data.lessonId], data);
        queryClient.invalidateQueries({ queryKey: ["lessons"] })
      },
    });
    return { updateLesson: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
  };

  const useDeleteLesson = () => {
    const mutation = useMutation({
      mutationFn: async (lessonId: string) => (await instance.delete<ApiResponse<void>>(`${API_BASE}/${lessonId}`)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
    });
    return { deleteLesson: mutation.mutateAsync, isDeleting: mutation.isPending, error: mutation.error };
  };

  const useSubmitLesson = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, userId, answers }: { lessonId: string; userId?: string; answers: Record<string, string> }) => {
        const url = userId ? `${API_BASE}/${lessonId}/complete?userId=${userId}` : `${API_BASE}/${lessonId}/complete`;
        const res = await instance.post<ApiResponse<any>>(url, { answers });
        return res.data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["lessonProgress"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      },
    });
    return { submitLesson: mutation.mutateAsync, isSubmitting: mutation.isPending, error: mutation.error };
  };

  /* ------------------- Skill endpoints (match controller) -------------------
     All these endpoints require Authorization header.
     We accept optional authToken param; if omitted we assume axios instance already adds it.
  ------------------------------------------------------------------------- */

  // Helper to build headers
  const buildAuthHeader = (authToken?: string) => (authToken ? { Authorization: `Bearer ${authToken}` } : {});

  // Listening -> POST /api/skill-lessons/listening/transcribe (multipart)
  const useProcessListening = () => {
    const mutation = useMutation({
      mutationFn: async ({ audioFile, lessonId, languageCode, authToken }: {
        audioFile: File; lessonId: string; languageCode: string; authToken?: string;
      }) => {
        const fd = new FormData();
        fd.append("audio", audioFile);
        // controller expects lessonId & languageCode as request params — but using FormData+query is fine.
        // To match controller exactly, send as query params and audio as FormData.
        const url = `${SKILL_BASE}/listening/transcribe?lessonId=${encodeURIComponent(lessonId)}&languageCode=${encodeURIComponent(languageCode)}`;
        const headers = buildAuthHeader(authToken);
        // Do NOT set Content-Type: browser will set boundary automatically
        const res = await instance.post<ApiResponse<ListeningResponse>>(url, fd, { headers });
        return res.data.result!;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson", "listening"] }); },
    });
    return { processListening: mutation.mutateAsync, isProcessingListening: mutation.isPending, error: mutation.error };
  };

  // Pronunciation -> POST /api/skill-lessons/speaking/pronunciation (multipart)
  const useProcessPronunciation = () => {
    const mutation = useMutation({
      mutationFn: async ({ audioFile, lessonId, languageCode, authToken }: {
        audioFile: File; lessonId: string; languageCode: string; authToken?: string;
      }) => {
        const fd = new FormData();
        fd.append("audio", audioFile);
        const url = `${SKILL_BASE}/speaking/pronunciation?lessonId=${encodeURIComponent(lessonId)}&languageCode=${encodeURIComponent(languageCode)}`;
        const headers = buildAuthHeader(authToken);
        const res = await instance.post<ApiResponse<PronunciationResponseBody>>(url, fd, { headers });
        return res.data.result!;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lessonProgress"] }); queryClient.invalidateQueries({ queryKey: ["currentUser"] }); },
    });
    return { processPronunciation: mutation.mutateAsync, isProcessingPronunciation: mutation.isPending, error: mutation.error };
  };

  // Spelling -> POST /api/skill-lessons/speaking/spelling (JSON body + lessonId query param)
  const useProcessSpelling = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, body, authToken }: { lessonId: string; body: SpellingRequestBody; authToken?: string }) => {
        const url = `${SKILL_BASE}/speaking/spelling?lessonId=${encodeURIComponent(lessonId)}`;
        const headers = { ...buildAuthHeader(authToken), "Content-Type": "application/json" };
        const res = await instance.post<ApiResponse<string[]>>(url, body, { headers });
        return res.data.result ?? [];
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lessonProgress"] }); },
    });
    return { processSpelling: mutation.mutateAsync, isProcessingSpelling: mutation.isPending, error: mutation.error };
  };

  // Reading -> POST /api/skill-lessons/reading (lessonId + languageCode as request params)
  const useProcessReading = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, languageCode, authToken }: { lessonId: string; languageCode: string; authToken?: string }) => {
        const url = `${SKILL_BASE}/reading?lessonId=${encodeURIComponent(lessonId)}&languageCode=${encodeURIComponent(languageCode)}`;
        const headers = buildAuthHeader(authToken);
        const res = await instance.post<ApiResponse<ReadingResponse>>(url, null, { headers });
        return res.data.result!;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lessonProgress"] }); },
    });
    return { processReading: mutation.mutateAsync, isProcessingReading: mutation.isPending, error: mutation.error };
  };

  // Writing -> POST /api/skill-lessons/writing (multipart: text, optional image, request params lessonId, languageCode, generateImage)
  const useProcessWriting = () => {
    const mutation = useMutation({
      mutationFn: async (opts: {
        lessonId: string; languageCode: string; text: string; imageFile?: File | null; generateImage?: boolean; authToken?: string;
      }) => {
        const fd = new FormData();
        fd.append("text", opts.text);
        if (opts.imageFile) fd.append("image", opts.imageFile);
        const qs = `lessonId=${encodeURIComponent(opts.lessonId)}&languageCode=${encodeURIComponent(opts.languageCode)}&generateImage=${Boolean(opts.generateImage)}`;
        const url = `${SKILL_BASE}/writing?${qs}`;
        const headers = buildAuthHeader(opts.authToken);
        const res = await instance.post<ApiResponse<WritingResponseBody>>(url, fd, { headers });
        return res.data.result!;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lessonProgress"] }); },
    });
    return { processWriting: mutation.mutateAsync, isProcessingWriting: mutation.isPending, error: mutation.error };
  };

  // Translation -> POST /api/skill-lessons/writing/translation (JSON body + lessonId param)
  const useProcessTranslation = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, body, authToken }: { lessonId: string; body: TranslationRequestBody; authToken?: string }) => {
        const url = `${SKILL_BASE}/writing/translation?lessonId=${encodeURIComponent(lessonId)}`;
        const headers = { ...buildAuthHeader(authToken), "Content-Type": "application/json" };
        const res = await instance.post<ApiResponse<WritingResponseBody>>(url, body, { headers });
        return res.data.result!;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lessonProgress"] }); },
    });
    return { processTranslation: mutation.mutateAsync, isProcessingTranslation: mutation.isPending, error: mutation.error };
  };

  /* ----------------- return all hooks ----------------- */
  return {
    useAllLessons,
    useLesson,
    useLessonQuestions,
    useLessonCategories,
    useLessonSeries,
    useCreateLesson,
    useUpdateLesson,
    useDeleteLesson,
    useSubmitLesson,
    useProcessListening,
    useProcessPronunciation,
    useProcessSpelling,
    useProcessReading,
    useProcessWriting,
    useProcessTranslation,
  };
};
