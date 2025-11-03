import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type {
  ApiResponse,
  PaginatedResponse,
  Lesson as LessonType,
  LessonCategoryRequest,
  LessonCategoryResponse,
  LessonOrderInSeriesRequest,
  LessonOrderInSeriesResponse,
  LessonProgress as LessonProgressType,
  LessonProgressRequest,
  LessonProgressResponse,
  LessonProgressWrongItemRequest,
  LessonProgressWrongItemResponse,
  LessonQuestion as LessonQuestionType,
  LessonQuestionRequest,
  LessonQuestionResponse,
  LessonRequest,
  LessonResponse,
  LessonReviewRequest,
  LessonReviewResponse,
  LessonSeriesRequest,
  LessonSeriesResponse,
  LessonSubCategoryRequest,
  LessonSubCategoryResponse,
  QuizApiResponse,
  RoomResponse,
} from "../types/api";

// Lesson API Base
const LESSON_API_BASE = "/lessons";

// Lesson Category API Base
const LESSON_CATEGORY_API_BASE = "/lesson-categories";

// Lesson Order In Series API Base
const LESSON_ORDER_IN_SERIES_API_BASE = "/lesson-order-in-series";

// Lesson Progress API Base
const LESSON_PROGRESS_API_BASE = "/lesson-progress";

// Lesson Progress Wrong Item API Base
const LESSON_PROGRESS_WRONG_ITEM_API_BASE = "/lesson-progress-wrong-items";

// Lesson Question API Base
const LESSON_QUESTION_API_BASE = "/lesson-questions";

// Lesson Review API Base
const LESSON_REVIEW_API_BASE = "/lesson-reviews";

// Lesson Series API Base
const LESSON_SERIES_API_BASE = "/lesson-series";

// Lesson Sub Category API Base
const LESSON_SUB_CATEGORY_API_BASE = "/lesson-sub-categories";

/* ------------------ Generic Build Query Params ------------------ */
const buildQueryParams = (params: Record<string, any>) => {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      qp.append(key, String(value));
    }
  });
  return qp.toString();
};

/* ------------------ LESSON HOOKS ------------------ */

/* ------------------ useAllLessons (GET /lessons) ------------------ */
export const useAllLessons = (params?: {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  lessonName?: string;
  languageCode?: string;
  minExpReward?: number;
  categoryId?: string;
  subCategoryId?: string;
  courseId?: string;
  seriesId?: string;
  skillType?: "LISTENING" | "SPEAKING" | "READING" | "WRITING";
}) => {
  return useQuery({
    queryKey: ["lessons", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_API_BASE}?${qs}` : LESSON_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLesson (GET /lessons/:id) ------------------ */
export const useLesson = (lessonId: string | null) => {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId is required");
      const res = await instance.get<ApiResponse<LessonResponse>>(`${LESSON_API_BASE}/${lessonId}`);
      return res.data.result!;
    },
    enabled: !!lessonId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLesson (POST /lessons) ------------------ */
export const useCreateLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonRequest) => {
      const res = await instance.post<ApiResponse<LessonResponse>>(LESSON_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
    },
  });
};

/* ------------------ useUpdateLesson (PUT /lessons/:id) ------------------ */
export const useUpdateLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, request }: { lessonId: string; request: LessonRequest }) => {
      const res = await instance.put<ApiResponse<LessonResponse>>(`${LESSON_API_BASE}/${lessonId}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { lessonId }) => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.setQueryData(["lesson", lessonId], data);
    },
  });
};

/* ------------------ useDeleteLesson (DELETE /lessons/:id) ------------------ */
export const useDeleteLesson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_API_BASE}/${lessonId}`);
    },
    onSuccess: (_, lessonId) => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.removeQueries({ queryKey: ["lesson", lessonId] });
    },
  });
};

/* ------------------ useLessonsByCreator (GET /lessons/creator/:creatorId) ------------------ */
export const useLessonsByCreator = (creatorId: string | null, params?: { page?: number; size?: number }) => {
  return useQuery({
    queryKey: ["lessonsByCreator", creatorId, params],
    queryFn: async () => {
      if (!creatorId) throw new Error("creatorId is required");
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_API_BASE}/creator/${creatorId}?${qs}` : `${LESSON_API_BASE}/creator/${creatorId}`;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonType>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    enabled: !!creatorId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonQuestions (GET /lessons/:lessonId/questions) ------------------ */
export const useLessonQuestions = (lessonId: string | null) => {
  return useQuery({
    queryKey: ["lessonQuestions", lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId is required");
      const res = await instance.get<ApiResponse<LessonQuestionType[]>>(`${LESSON_API_BASE}/${lessonId}/questions`);
      return res.data.result ?? [];
    },
    enabled: !!lessonId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonProgress (GET /lessons/:lessonId/progress) ------------------ */
export const useLessonProgress = (lessonId: string | null, userId?: string | null) => {
  return useQuery({
    queryKey: ["lessonProgress", lessonId, userId ?? "me"],
    queryFn: async () => {
      if (!lessonId) throw new Error("lessonId is required");
      const params = userId ? { userId } : {};
      const qs = buildQueryParams(params);
      const url = qs ? `${LESSON_API_BASE}/${lessonId}/progress?${qs}` : `${LESSON_API_BASE}/${lessonId}/progress`;
      const res = await instance.get<ApiResponse<LessonProgressType | null>>(url);
      return res.data.result ?? null;
    },
    enabled: !!lessonId,
    staleTime: 60_000,
  });
};

/* ------------------ useStartLesson (POST /lessons/:lessonId/start-test) ------------------ */
export const useStartLesson = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, userId: overrideUserId }: { lessonId: string; userId?: string }) => {
      const url = `${LESSON_API_BASE}/${lessonId}/start-test`;
      const params = overrideUserId || user?.userId ? { userId: overrideUserId || user?.userId } : {};
      const qs = buildQueryParams(params);
      const finalUrl = qs ? `${url}?${qs}` : url;
      const res = await instance.post<ApiResponse<{ attemptNumber: number }>>(finalUrl);
      return res.data.result!;
    },
    onSuccess: (data, { lessonId, userId: overrideUserId }) => {
      const effectiveUserId = overrideUserId || user?.userId || "me";
      qc.invalidateQueries({ queryKey: ["lessonProgress", lessonId] });
      qc.setQueryData(["lessonProgress", lessonId, effectiveUserId], (old: any) => ({
        ...old,
        attemptNumber: data.attemptNumber,
        startedAt: new Date().toISOString(),
      }));
    },
  });
};

/* ------------------ useSubmitLesson (POST /lessons/:lessonId/submit-test) ------------------ */
export const useSubmitLesson = () => {
  const qc = useQueryClient();
  const user = useUserStore((s) => s.user);

  // Lấy kết quả từ useMutation
  const mutation = useMutation({
    mutationFn: async ({
      lessonId,
      body,
      userId: overrideUserId,
    }: {
      lessonId: string;
      body: Record<string, any>;
      userId?: string;
    }) => {
      const url = `${LESSON_API_BASE}/${lessonId}/submit-test`;
      const params = overrideUserId || user?.userId ? { userId: overrideUserId || user?.userId } : {};
      const qs = buildQueryParams(params);
      const finalUrl = qs ? `${url}?${qs}` : url;
      const res = await instance.post<ApiResponse<any>>(finalUrl, body);
      return res.data.result!;
    },
    onSuccess: (_, { lessonId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgress", lessonId] });
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  return {
    submitLesson: mutation.mutateAsync, // UI của bạn dùng await nên dùng mutateAsync
    isSubmitting: mutation.isPending, // Trạng thái loading là isPending (trong TanStack Query v5)
    ...mutation, // Trả về các thuộc tính khác nếu cần
  };
};

/* ------------------ useCompleteLesson (POST /lessons/:lessonId/complete) ------------------ */
export const useCompleteLesson = () => {
  const qc = useQueryClient();

  // Lấy kết quả từ useMutation
  const mutation = useMutation({
    mutationFn: async ({
      lessonId,
      userId,
      score,
    }: {
      lessonId: string;
      userId: string;
      score?: number;
    }) => {
      const params = { userId };
      if (score !== undefined) (params as any).score = score;
      const qs = buildQueryParams(params);
      const url = qs ? `${LESSON_API_BASE}/${lessonId}/complete?${qs}` : `${LESSON_API_BASE}/${lessonId}/complete`;
      const res = await instance.post<ApiResponse<void>>(url);
      return res.data.result;
    },
    onSuccess: (_, { lessonId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgress", lessonId] });
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  // Trả về object mà UI mong đợi
  return {
    completeLesson: mutation.mutateAsync,
    isCompleting: mutation.isPending,
    ...mutation,
  };
};

/* ------------------ useGetLessonsBySkillType (GET /lessons/by-skill) ------------------ */
export const useGetLessonsBySkillType = (
  skillType: "LISTENING" | "SPEAKING" | "READING" | "WRITING" | null,
  params?: { page?: number; size?: number }
) => {
  return useQuery({
    queryKey: ["lessonsBySkillType", skillType, params],
    queryFn: async () => {
      if (!skillType) throw new Error("skillType is required");
      const qp = buildQueryParams({ ...params, skillType });
      const url = `${LESSON_API_BASE}/by-skill?${qp}`;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    enabled: !!skillType,
    staleTime: 10 * 60_000,
  });
};

/* ------------------ useGetLessonsByCertificateOrTopic (GET /lessons/by-certificate-or-topic) ------------------ */
export const useGetLessonsByCertificateOrTopic = (params?: {
  categoryId?: string;
  subCategoryId?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonsByCertificateOrTopic", params],
    queryFn: async () => {
      const qp = buildQueryParams(params || {});
      const url = qp ? `${LESSON_API_BASE}/by-certificate-or-topic?${qp}` : `${LESSON_API_BASE}/by-certificate-or-topic`;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 10 * 60_000,
  });
};

/* ------------------ LESSON CATEGORY HOOKS ------------------ */

/* ------------------ useAllLessonCategories (GET /lesson-categories) ------------------ */
export const useAllLessonCategories = (params?: {
  lessonCategoryName?: string;
  languageCode?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonCategories", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_CATEGORY_API_BASE}?${qs}` : LESSON_CATEGORY_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonCategoryResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonCategory (GET /lesson-categories/:id) ------------------ */
export const useLessonCategory = (id: string | null) => {
  return useQuery({
    queryKey: ["lessonCategory", id],
    queryFn: async () => {
      if (!id) throw new Error("id is required");
      const res = await instance.get<ApiResponse<LessonCategoryResponse>>(`${LESSON_CATEGORY_API_BASE}/${id}`);
      return res.data.result!;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonCategory (POST /lesson-categories) ------------------ */
export const useCreateLessonCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonCategoryRequest) => {
      const res = await instance.post<ApiResponse<LessonCategoryResponse>>(LESSON_CATEGORY_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonCategories"] });
    },
  });
};

/* ------------------ useUpdateLessonCategory (PUT /lesson-categories/:id) ------------------ */
export const useUpdateLessonCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: LessonCategoryRequest }) => {
      const res = await instance.put<ApiResponse<LessonCategoryResponse>>(`${LESSON_CATEGORY_API_BASE}/${id}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["lessonCategories"] });
      qc.setQueryData(["lessonCategory", id], data);
    },
  });
};

/* ------------------ useDeleteLessonCategory (DELETE /lesson-categories/:id) ------------------ */
export const useDeleteLessonCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_CATEGORY_API_BASE}/${id}`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["lessonCategories"] });
      qc.removeQueries({ queryKey: ["lessonCategory", id] });
    },
  });
};

/* ------------------ LESSON ORDER IN SERIES HOOKS ------------------ */

/* ------------------ useAllLessonOrderInSeries (GET /lesson-order-in-series) ------------------ */
export const useAllLessonOrderInSeries = (params?: {
  lessonId?: string;
  lessonSeriesId?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonOrderInSeries", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_ORDER_IN_SERIES_API_BASE}?${qs}` : LESSON_ORDER_IN_SERIES_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonOrderInSeriesResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonOrderInSeries (GET /lesson-order-in-series/:lessonId/:lessonSeriesId) ------------------ */
export const useLessonOrderInSeries = (lessonId: string | null, lessonSeriesId: string | null) => {
  return useQuery({
    queryKey: ["lessonOrderInSeries", lessonId, lessonSeriesId],
    queryFn: async () => {
      if (!lessonId || !lessonSeriesId) throw new Error("lessonId and lessonSeriesId are required");
      const res = await instance.get<ApiResponse<LessonOrderInSeriesResponse>>(`${LESSON_ORDER_IN_SERIES_API_BASE}/${lessonId}/${lessonSeriesId}`);
      return res.data.result!;
    },
    enabled: !!lessonId && !!lessonSeriesId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonOrderInSeries (POST /lesson-order-in-series) ------------------ */
export const useCreateLessonOrderInSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonOrderInSeriesRequest) => {
      const res = await instance.post<ApiResponse<LessonOrderInSeriesResponse>>(LESSON_ORDER_IN_SERIES_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonOrderInSeries"] });
    },
  });
};

/* ------------------ useUpdateLessonOrderInSeries (PUT /lesson-order-in-series/:lessonId/:lessonSeriesId) ------------------ */
export const useUpdateLessonOrderInSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, lessonSeriesId, request }: { lessonId: string; lessonSeriesId: string; request: LessonOrderInSeriesRequest }) => {
      const res = await instance.put<ApiResponse<LessonOrderInSeriesResponse>>(`${LESSON_ORDER_IN_SERIES_API_BASE}/${lessonId}/${lessonSeriesId}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { lessonId, lessonSeriesId }) => {
      qc.invalidateQueries({ queryKey: ["lessonOrderInSeries"] });
      qc.setQueryData(["lessonOrderInSeries", lessonId, lessonSeriesId], data);
    },
  });
};

/* ------------------ useDeleteLessonOrderInSeries (DELETE /lesson-order-in-series/:lessonId/:lessonSeriesId) ------------------ */
export const useDeleteLessonOrderInSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, lessonSeriesId }: { lessonId: string; lessonSeriesId: string }) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_ORDER_IN_SERIES_API_BASE}/${lessonId}/${lessonSeriesId}`);
    },
    onSuccess: (_, { lessonId, lessonSeriesId }) => {
      qc.invalidateQueries({ queryKey: ["lessonOrderInSeries"] });
      qc.removeQueries({ queryKey: ["lessonOrderInSeries", lessonId, lessonSeriesId] });
    },
  });
};

/* ------------------ LESSON PROGRESS HOOKS ------------------ */

/* ------------------ useAllLessonProgress (GET /lesson-progress) ------------------ */
export const useAllLessonProgress = (params?: {
  lessonId?: string;
  userId?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonProgresses", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_PROGRESS_API_BASE}?${qs}` : LESSON_PROGRESS_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonProgressResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonProgressByIds (GET /lesson-progress/:lessonId/:userId) ------------------ */
export const useLessonProgressByIds = (lessonId: string | null, userId: string | null) => {
  return useQuery({
    queryKey: ["lessonProgress", lessonId, userId],
    queryFn: async () => {
      if (!lessonId || !userId) throw new Error("lessonId and userId are required");
      const res = await instance.get<ApiResponse<LessonProgressResponse>>(`${LESSON_PROGRESS_API_BASE}/${lessonId}/${userId}`);
      return res.data.result!;
    },
    enabled: !!lessonId && !!userId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonProgress (POST /lesson-progress) ------------------ */
export const useCreateLessonProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonProgressRequest) => {
      const res = await instance.post<ApiResponse<LessonProgressResponse>>(LESSON_PROGRESS_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lessonProgresses"] });
      qc.setQueryData(["lessonProgress", data.lessonId, data.userId], data);
    },
  });
};

/* ------------------ useUpdateLessonProgress (PUT /lesson-progress/:lessonId/:userId) ------------------ */
export const useUpdateLessonProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, userId, request }: { lessonId: string; userId: string; request: LessonProgressRequest }) => {
      const res = await instance.put<ApiResponse<LessonProgressResponse>>(`${LESSON_PROGRESS_API_BASE}/${lessonId}/${userId}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { lessonId, userId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgresses"] });
      qc.setQueryData(["lessonProgress", lessonId, userId], data);
    },
  });
};

/* ------------------ useDeleteLessonProgress (DELETE /lesson-progress/:lessonId/:userId) ------------------ */
export const useDeleteLessonProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, userId }: { lessonId: string; userId: string }) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_PROGRESS_API_BASE}/${lessonId}/${userId}`);
    },
    onSuccess: (_, { lessonId, userId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgresses"] });
      qc.removeQueries({ queryKey: ["lessonProgress", lessonId, userId] });
    },
  });
};

/* ------------------ LESSON PROGRESS WRONG ITEM HOOKS ------------------ */

/* ------------------ useAllLessonProgressWrongItems (GET /lesson-progress-wrong-items) ------------------ */
export const useAllLessonProgressWrongItems = (params?: {
  lessonId?: string;
  userId?: string;
  lessonQuestionId?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonProgressWrongItems", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_PROGRESS_WRONG_ITEM_API_BASE}?${qs}` : LESSON_PROGRESS_WRONG_ITEM_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonProgressWrongItemResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonProgressWrongItemByIds (GET /lesson-progress-wrong-items/:lessonId/:userId/:lessonQuestionId) ------------------ */
export const useLessonProgressWrongItemByIds = (lessonId: string | null, userId: string | null, lessonQuestionId: string | null) => {
  return useQuery({
    queryKey: ["lessonProgressWrongItem", lessonId, userId, lessonQuestionId],
    queryFn: async () => {
      if (!lessonId || !userId || !lessonQuestionId) throw new Error("lessonId, userId, and lessonQuestionId are required");
      const res = await instance.get<ApiResponse<LessonProgressWrongItemResponse>>(`${LESSON_PROGRESS_WRONG_ITEM_API_BASE}/${lessonId}/${userId}/${lessonQuestionId}`);
      return res.data.result!;
    },
    enabled: !!lessonId && !!userId && !!lessonQuestionId,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonProgressWrongItem (POST /lesson-progress-wrong-items) ------------------ */
export const useCreateLessonProgressWrongItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonProgressWrongItemRequest) => {
      const res = await instance.post<ApiResponse<LessonProgressWrongItemResponse>>(LESSON_PROGRESS_WRONG_ITEM_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lessonProgressWrongItems"] });
      qc.setQueryData(["lessonProgressWrongItem", data.lessonId, data.userId, data.lessonQuestionId], data);
    },
  });
};

/* ------------------ useUpdateLessonProgressWrongItem (PUT /lesson-progress-wrong-items/:lessonId/:userId/:lessonQuestionId) ------------------ */
export const useUpdateLessonProgressWrongItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, userId, lessonQuestionId, request }: { lessonId: string; userId: string; lessonQuestionId: string; request: LessonProgressWrongItemRequest }) => {
      const res = await instance.put<ApiResponse<LessonProgressWrongItemResponse>>(`${LESSON_PROGRESS_WRONG_ITEM_API_BASE}/${lessonId}/${userId}/${lessonQuestionId}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { lessonId, userId, lessonQuestionId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgressWrongItems"] });
      qc.setQueryData(["lessonProgressWrongItem", lessonId, userId, lessonQuestionId], data);
    },
  });
};

/* ------------------ useDeleteLessonProgressWrongItem (DELETE /lesson-progress-wrong-items/:lessonId/:userId/:lessonQuestionId) ------------------ */
export const useDeleteLessonProgressWrongItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, userId, lessonQuestionId }: { lessonId: string; userId: string; lessonQuestionId: string }) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_PROGRESS_WRONG_ITEM_API_BASE}/${lessonId}/${userId}/${lessonQuestionId}`);
    },
    onSuccess: (_, { lessonId, userId, lessonQuestionId }) => {
      qc.invalidateQueries({ queryKey: ["lessonProgressWrongItems"] });
      qc.removeQueries({ queryKey: ["lessonProgressWrongItem", lessonId, userId, lessonQuestionId] });
    },
  });
};

/* ------------------ LESSON QUESTION HOOKS ------------------ */

/* ------------------ useAllLessonQuestions (GET /lesson-questions) ------------------ */
export const useAllLessonQuestions = (params?: {
  lessonId?: string;
  languageCode?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonQuestions", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_QUESTION_API_BASE}?${qs}` : LESSON_QUESTION_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonQuestionResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonQuestion (GET /lesson-questions/:id) ------------------ */
export const useLessonQuestion = (id: string | null) => {
  return useQuery({
    queryKey: ["lessonQuestion", id],
    queryFn: async () => {
      if (!id) throw new Error("id is required");
      const res = await instance.get<ApiResponse<LessonQuestionResponse>>(`${LESSON_QUESTION_API_BASE}/${id}`);
      return res.data.result!;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonQuestion (POST /lesson-questions) ------------------ */
export const useCreateLessonQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonQuestionRequest) => {
      const res = await instance.post<ApiResponse<LessonQuestionResponse>>(LESSON_QUESTION_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonQuestions"] });
    },
  });
};

/* ------------------ useUpdateLessonQuestion (PUT /lesson-questions/:id) ------------------ */
export const useUpdateLessonQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: LessonQuestionRequest }) => {
      const res = await instance.put<ApiResponse<LessonQuestionResponse>>(`${LESSON_QUESTION_API_BASE}/${id}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["lessonQuestions"] });
      qc.setQueryData(["lessonQuestion", id], data);
    },
  });
};

/* ------------------ useDeleteLessonQuestion (DELETE /lesson-questions/:id) ------------------ */
export const useDeleteLessonQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_QUESTION_API_BASE}/${id}`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["lessonQuestions"] });
      qc.removeQueries({ queryKey: ["lessonQuestion", id] });
    },
  });
};

/* ------------------ LESSON REVIEW HOOKS ------------------ */

/* ------------------ useAllLessonReviews (GET /lesson-reviews) ------------------ */
export const useAllLessonReviews = (params?: { page?: number; size?: number }) => {
  return useQuery({
    queryKey: ["lessonReviews", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_REVIEW_API_BASE}?${qs}` : LESSON_REVIEW_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonReviewResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonReview (GET /lesson-reviews/:id) ------------------ */
export const useLessonReview = (id: string | null) => {
  return useQuery({
    queryKey: ["lessonReview", id],
    queryFn: async () => {
      if (!id) throw new Error("id is required");
      const res = await instance.get<ApiResponse<LessonReviewResponse>>(`${LESSON_REVIEW_API_BASE}/${id}`);
      return res.data.result!;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonReview (POST /lesson-reviews) ------------------ */
export const useCreateLessonReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonReviewRequest) => {
      const res = await instance.post<ApiResponse<LessonReviewResponse>>(LESSON_REVIEW_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonReviews"] });
    },
  });
};

/* ------------------ useUpdateLessonReview (PUT /lesson-reviews/:id) ------------------ */
export const useUpdateLessonReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: LessonReviewRequest }) => {
      const res = await instance.put<ApiResponse<LessonReviewResponse>>(`${LESSON_REVIEW_API_BASE}/${id}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["lessonReviews"] });
      qc.setQueryData(["lessonReview", id], data);
    },
  });
};

/* ------------------ useDeleteLessonReview (DELETE /lesson-reviews/:id) ------------------ */
export const useDeleteLessonReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_REVIEW_API_BASE}/${id}`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["lessonReviews"] });
      qc.removeQueries({ queryKey: ["lessonReview", id] });
    },
  });
};

/* ------------------ LESSON SERIES HOOKS ------------------ */

/* ------------------ useAllLessonSeries (GET /lesson-series) ------------------ */
export const useAllLessonSeries = (params?: {
  lessonSeriesName?: string;
  languageCode?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonSeries", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_SERIES_API_BASE}?${qs}` : LESSON_SERIES_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonSeriesResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonSeries (GET /lesson-series/:id) ------------------ */
export const useLessonSeries = (id: string | null) => {
  return useQuery({
    queryKey: ["lessonSeries", id],
    queryFn: async () => {
      if (!id) throw new Error("id is required");
      const res = await instance.get<ApiResponse<LessonSeriesResponse>>(`${LESSON_SERIES_API_BASE}/${id}`);
      return res.data.result!;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonSeries (POST /lesson-series) ------------------ */
export const useCreateLessonSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonSeriesRequest) => {
      const res = await instance.post<ApiResponse<LessonSeriesResponse>>(LESSON_SERIES_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonSeries"] });
    },
  });
};

/* ------------------ useUpdateLessonSeries (PUT /lesson-series/:id) ------------------ */
export const useUpdateLessonSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: LessonSeriesRequest }) => {
      const res = await instance.put<ApiResponse<LessonSeriesResponse>>(`${LESSON_SERIES_API_BASE}/${id}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["lessonSeries"] });
      qc.setQueryData(["lessonSeries", id], data);
    },
  });
};

/* ------------------ useDeleteLessonSeries (DELETE /lesson-series/:id) ------------------ */
export const useDeleteLessonSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_SERIES_API_BASE}/${id}`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["lessonSeries"] });
      qc.removeQueries({ queryKey: ["lessonSeries", id] });
    },
  });
};

/* ------------------ LESSON SUB CATEGORY HOOKS ------------------ */

/* ------------------ useAllLessonSubCategories (GET /lesson-sub-categories) ------------------ */
export const useAllLessonSubCategories = (params?: {
  lessonCategoryId?: string;
  languageCode?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: ["lessonSubCategories", params || {}],
    queryFn: async () => {
      const qs = buildQueryParams(params || {});
      const url = qs ? `${LESSON_SUB_CATEGORY_API_BASE}?${qs}` : LESSON_SUB_CATEGORY_API_BASE;
      const res = await instance.get<ApiResponse<PaginatedResponse<LessonSubCategoryResponse>>>(url);
      return res.data.result ?? { data: [], pagination: { page: 0, size: 20, total: 0, totalPages: 0 } };
    },
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useLessonSubCategory (GET /lesson-sub-categories/:id) ------------------ */
export const useLessonSubCategory = (id: string | null) => {
  return useQuery({
    queryKey: ["lessonSubCategory", id],
    queryFn: async () => {
      if (!id) throw new Error("id is required");
      const res = await instance.get<ApiResponse<LessonSubCategoryResponse>>(`${LESSON_SUB_CATEGORY_API_BASE}/${id}`);
      return res.data.result!;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

/* ------------------ useCreateLessonSubCategory (POST /lesson-sub-categories) ------------------ */
export const useCreateLessonSubCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request: LessonSubCategoryRequest) => {
      const res = await instance.post<ApiResponse<LessonSubCategoryResponse>>(LESSON_SUB_CATEGORY_API_BASE, request);
      return res.data.result!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessonSubCategories"] });
    },
  });
};

/* ------------------ useUpdateLessonSubCategory (PUT /lesson-sub-categories/:id) ------------------ */
export const useUpdateLessonSubCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: LessonSubCategoryRequest }) => {
      const res = await instance.put<ApiResponse<LessonSubCategoryResponse>>(`${LESSON_SUB_CATEGORY_API_BASE}/${id}`, request);
      return res.data.result!;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["lessonSubCategories"] });
      qc.setQueryData(["lessonSubCategory", id], data);
    },
  });
};

/* ------------------ useDeleteLessonSubCategory (DELETE /lesson-sub-categories/:id) ------------------ */
export const useDeleteLessonSubCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await instance.delete<ApiResponse<void>>(`${LESSON_SUB_CATEGORY_API_BASE}/${id}`);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["lessonSubCategories"] });
      qc.removeQueries({ queryKey: ["lessonSubCategory", id] });
    },
  });
};
/**
 * (Query) Lấy bộ câu hỏi cho Solo Quiz.
 * Mặc định là disabled, gọi bằng .refetch()
 */
export const useGenerateSoloQuiz = (userId: string | undefined | null) => {
  return useQuery({
    queryKey: ["generateSoloQuiz", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const res = await instance.get<ApiResponse<QuizApiResponse>>(
        `${LESSON_API_BASE}/quiz/generate-solo?userId=${userId}`
      );
      return res.data.result!;
    },
    enabled: false, // Chỉ chạy khi gọi refetch()
    retry: 1,
    staleTime: Infinity, // Không tự động fetch lại
    gcTime: 300_000, // Giữ cache 5 phút
  });
};

/**
 * (Mutation) Host gọi để lấy bộ câu hỏi cho Team Quiz
 */
export const useGenerateTeamQuiz = () => {
  const user = useUserStore((s) => s.user);
  return useMutation({
    mutationFn: async ({ roomId, topic }: { roomId: string; topic?: string }) => {
      if (!user?.userId) throw new Error("User not authenticated");
      
      const params = {
        roomId,
        userId: user.userId, // Validate user
        topic,
      };
      const qs = buildQueryParams(params);
      const res = await instance.get<ApiResponse<QuizApiResponse>>(
        `${LESSON_API_BASE}/quiz/generate-team?${qs}`
      );
      return res.data.result!;
    },
    // Không cần invalidate query gì ở đây vì đây là action
  });
};

/**
 * (Mutation) Tìm hoặc tạo một phòng Team Quiz
 */
export const useFindOrCreateQuizRoom = () => {
  const user = useUserStore((s) => s.user);
  return useMutation({
    mutationFn: async () => {
      if (!user?.userId) throw new Error("User not authenticated");
      const res = await instance.post<ApiResponse<RoomResponse>>(
        `${LESSON_API_BASE}/quiz/find-or-create-room?userId=${user.userId}`
      );
      return res.data.result!;
    },
  });
};

/* ------------------ Export All Hooks ------------------ */
export default {
  // Lesson
  useAllLessons,
  useLesson,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useLessonsByCreator,
  useLessonQuestions,
  useLessonProgress,
  useStartLesson,
  useSubmitLesson,
  useCompleteLesson,
  useGetLessonsBySkillType,
  useGetLessonsByCertificateOrTopic,
  // Lesson Category
  useAllLessonCategories,
  useLessonCategory,
  useCreateLessonCategory,
  useUpdateLessonCategory,
  useDeleteLessonCategory,
  // Lesson Order In Series
  useAllLessonOrderInSeries,
  useLessonOrderInSeries,
  useCreateLessonOrderInSeries,
  useUpdateLessonOrderInSeries,
  useDeleteLessonOrderInSeries,
  // Lesson Progress
  useAllLessonProgress,
  useLessonProgressByIds,
  useCreateLessonProgress,
  useUpdateLessonProgress,
  useDeleteLessonProgress,
  // Lesson Progress Wrong Item
  useAllLessonProgressWrongItems,
  useLessonProgressWrongItemByIds,
  useCreateLessonProgressWrongItem,
  useUpdateLessonProgressWrongItem,
  useDeleteLessonProgressWrongItem,
  // Lesson Question
  useAllLessonQuestions,
  useLessonQuestion,
  useCreateLessonQuestion,
  useUpdateLessonQuestion,
  useDeleteLessonQuestion,
  // Lesson Review
  useAllLessonReviews,
  useLessonReview,
  useCreateLessonReview,
  useUpdateLessonReview,
  useDeleteLessonReview,
  // Lesson Series
  useAllLessonSeries,
  useLessonSeries,
  useCreateLessonSeries,
  useUpdateLessonSeries,
  useDeleteLessonSeries,
  // Lesson Sub Category
  useAllLessonSubCategories,
  useLessonSubCategory,
  useCreateLessonSubCategory,
  useUpdateLessonSubCategory,
  useDeleteLessonSubCategory,
  // Quiz
  useGenerateSoloQuiz,
  useGenerateTeamQuiz,
  useFindOrCreateQuizRoom
};