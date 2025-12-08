// import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
// import instance from "../api/axiosClient";
// import { useUserStore } from "../stores/UserStore";
// import {
//   AppApiResponse,
//   PageResponse,
//   LessonResponse,
//   LessonRequest,
//   LessonQuestionResponse,
//   LessonQuestionRequest,
//   QuizResponse,
//   RoomResponse,
//   LessonProgressResponse,
//   LessonProgressRequest,
//   LessonProgressWrongItemResponse,
//   LessonProgressWrongItemRequest,
//   LessonHierarchicalResponse
// } from "../types/dto";

// import { SkillType } from "../types/enums";

// // --- Keys Factory ---
// export const lessonKeys = {
//   all: ["lessons"] as const,
//   lists: () => [...lessonKeys.all, "list"] as const,
//   list: (params: any) => [...lessonKeys.lists(), params] as const,
//   infinite: (params: any) => [...lessonKeys.all, "infinite", params] as const, // Added for infinite scroll
//   details: () => [...lessonKeys.all, "detail"] as const,
//   detail: (id: string) => [...lessonKeys.details(), id] as const,
//   questions: {
//     all: ["lessonQuestions"] as const,
//     list: (params: any) => [...lessonKeys.questions.all, params] as const,
//     detail: (id: string) => [...lessonKeys.questions.all, id] as const,
//   },
//   quiz: {
//     solo: (userId: string) => [...lessonKeys.all, "quiz", "solo", userId] as const,
//     team: (roomId: string) => [...lessonKeys.all, "quiz", "team", roomId] as const,
//   },
//   test: {
//     start: (lessonId: string, userId: string) => [...lessonKeys.all, "test", "start", lessonId, userId] as const,
//   },
//   progress: {
//     all: ["lessonProgress"] as const,
//     list: (params: any) => [...lessonKeys.progress.all, params] as const,
//     detail: (lessonId: string, userId: string) => [...lessonKeys.progress.all, lessonId, userId] as const,
//   },
//   wrongItems: {
//     all: ["lessonWrongItems"] as const,
//     list: (params: any) => [...lessonKeys.wrongItems.all, params] as const,
//     detail: (lessonId: string, userId: string, questionId: string) => [...lessonKeys.wrongItems.all, lessonId, userId, questionId] as const,
//   }
// };

// export const useLessons = () => {
//   const queryClient = useQueryClient();

//   // ==========================================
//   // === 1. LESSON CRUD (LessonController) ===
//   // ==========================================

//   const useAllLessons = (params?: {
//     lessonName?: string;
//     languageCode?: string;
//     minExpReward?: number;
//     categoryId?: string;
//     subCategoryId?: string;
//     courseId?: string;
//     seriesId?: string;
//     skillType?: SkillType;
//     page?: number;
//     size?: number;
//   }) => {
//     return useQuery({
//       queryKey: lessonKeys.list(params),
//       queryFn: async () => {
//         const qp = new URLSearchParams();
//         if (params?.lessonName) qp.append("lessonName", params.lessonName);
//         if (params?.languageCode) qp.append("languageCode", params.languageCode);
//         if (params?.minExpReward) qp.append("minExpReward", String(params.minExpReward));
//         if (params?.categoryId) qp.append("categoryId", params.categoryId);
//         if (params?.subCategoryId) qp.append("subCategoryId", params.subCategoryId);
//         if (params?.courseId) qp.append("courseId", params.courseId);
//         if (params?.seriesId) qp.append("seriesId", params.seriesId);
//         if (params?.skillType) qp.append("skillType", params.skillType);
//         if (params?.page !== undefined) qp.append("page", String(params.page));
//         if (params?.size !== undefined) qp.append("size", String(params.size));

//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
//           `/api/v1/lessons?${qp.toString()}`
//         );
//         return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
//       },
//       staleTime: 5 * 60 * 1000,
//     });
//   };

//   // --- NEW: Infinite Query for Lessons (Standardized) ---
//   const useInfiniteLessons = (params?: {
//     lessonName?: string;
//     languageCode?: string;
//     minExpReward?: number;
//     categoryId?: string;
//     subCategoryId?: string;
//     courseId?: string;
//     seriesId?: string;
//     skillType?: SkillType;
//     size?: number;
//   }) => {
//     const size = params?.size || 10;
//     return useInfiniteQuery({
//       queryKey: lessonKeys.infinite(params),
//       queryFn: async ({ pageParam = 0 }) => {
//         const qp = new URLSearchParams();
//         if (params?.lessonName) qp.append("lessonName", params.lessonName);
//         if (params?.languageCode) qp.append("languageCode", params.languageCode);
//         if (params?.minExpReward) qp.append("minExpReward", String(params.minExpReward));
//         if (params?.categoryId) qp.append("categoryId", params.categoryId);
//         if (params?.subCategoryId) qp.append("subCategoryId", params.subCategoryId);
//         if (params?.courseId) qp.append("courseId", params.courseId);
//         if (params?.seriesId) qp.append("seriesId", params.seriesId);
//         if (params?.skillType) qp.append("skillType", params.skillType);
//         qp.append("page", String(pageParam));
//         qp.append("size", String(size));

//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
//           `/api/v1/lessons?${qp.toString()}`
//         );
//         return mapPageResponse(data.result, pageParam, size);
//       },
//       getNextPageParam: (lastPage) => {
//         if (lastPage.pagination.isLast) return undefined;
//         return lastPage.pagination.pageNumber + 1;
//       },
//       initialPageParam: 0,
//     });
//   };

//   const useLesson = (id: string | null) => {
//     return useQuery({
//       queryKey: lessonKeys.detail(id!),
//       queryFn: async () => {
//         if (!id) throw new Error("Lesson ID required");
//         const { data } = await instance.get<AppApiResponse<LessonResponse>>(
//           `/api/v1/lessons/${id}`
//         );
//         return data.result!;
//       },
//       enabled: !!id,
//     });
//   };

//   const useCreatorLessons = (creatorId: string | null, page = 0, size = 20) => {
//     return useQuery({
//       queryKey: lessonKeys.list({ type: "creator", creatorId, page, size }),
//       queryFn: async () => {
//         if (!creatorId) throw new Error("Creator ID required");
//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
//           `/api/v1/lessons/creator/${creatorId}?page=${page}&size=${size}`
//         );
//         return mapPageResponse(data.result, page, size);
//       },
//       enabled: !!creatorId,
//     });
//   };

//   const useCreateLesson = () => {
//     return useMutation({
//       mutationFn: async (req: LessonRequest) => {
//         const { data } = await instance.post<AppApiResponse<LessonResponse>>("/api/v1/lessons", req);
//         return data.result!;
//       },
//       onSuccess: () => {
//         queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
//         queryClient.invalidateQueries({ queryKey: lessonKeys.all });
//       },
//     });
//   };

//   const useSkillLessonTree = (skillType: SkillType, languageCode: string) => {
//     return useQuery({
//       queryKey: ['lessons', 'tree', skillType, languageCode],
//       queryFn: async () => {
//         const { data } = await instance.get<AppApiResponse<LessonHierarchicalResponse[]>>(
//           `/api/v1/lessons/tree?skillType=${skillType}&languageCode=${languageCode}`
//         );
//         return data.result;
//       }
//     });
//   };

//   const useLessonWrongItems = (lessonId: string, userId: string) => {
//     return useQuery<LessonProgressWrongItemResponse[], unknown>({
//       queryKey: lessonKeys.wrongItems.list({ lessonId, userId }),
//       queryFn: async () => {
//         if (!lessonId || !userId) return [];
//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressWrongItemResponse>>>(
//           `/api/v1/lessons/${lessonId}/wrong-items`,
//           { params: { userId, size: 50 } }
//         );
//         return data.result?.content || [];
//       },
//       enabled: !!lessonId && !!userId
//     });
//   };

//   const useSubmitTest = () => {
//     interface SubmitTestPayload {
//       lessonId: string;
//       userId: string;
//       body: {
//         answers: Record<string, any>;
//         attemptNumber: number;
//       };
//     }

//     return useMutation<any, unknown, SubmitTestPayload>({
//       mutationFn: async ({ lessonId, userId, body }) => {
//         const qp = userId ? `?userId=${userId}` : "";
//         const { data } = await instance.post<AppApiResponse<any>>(
//           `/api/v1/lessons/${lessonId}/submit-test${qp}`,
//           body
//         );
//         return data.result;
//       },
//       onSuccess: (_, variables) => {
//         queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all });
//         queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all });
//         queryClient.invalidateQueries({ queryKey: ['courses', 'enrollments'] });
//       }
//     });
//   };

//   const useUpdateLesson = () => {
//     return useMutation({
//       mutationFn: async ({ id, req }: { id: string; req: LessonRequest }) => {
//         const { data } = await instance.put<AppApiResponse<LessonResponse>>(`/api/v1/lessons/${id}`, req);
//         return data.result!;
//       },
//       onSuccess: (data) => {
//         queryClient.setQueryData(lessonKeys.detail(data.lessonId), data);
//         queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
//       },
//     });
//   };

//   const useDeleteLesson = () => {
//     return useMutation({
//       mutationFn: async (id: string) => {
//         await instance.delete(`/api/v1/lessons/${id}`);
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.lists() }),
//     });
//   };

//   // ==========================================
//   // === 2. QUESTIONS (LessonQuestionController) ===
//   // ==========================================

//   const useAllQuestions = (params?: { lessonId?: string; languageCode?: string; page?: number; size?: number }) => {
//     return useQuery({
//       queryKey: lessonKeys.questions.list(params),
//       queryFn: async () => {
//         const qp = new URLSearchParams();
//         if (params?.lessonId) qp.append("lessonId", params.lessonId);
//         if (params?.languageCode) qp.append("languageCode", params.languageCode);
//         if (params?.page !== undefined) qp.append("page", String(params.page));
//         if (params?.size !== undefined) qp.append("size", String(params.size));

//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonQuestionResponse>>>(
//           `/api/v1/lesson-questions?${qp.toString()}`
//         );
//         return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
//       },
//     });
//   };

//   const useCreateQuestion = () => {
//     return useMutation({
//       mutationFn: async (req: LessonQuestionRequest) => {
//         const { data } = await instance.post<AppApiResponse<LessonQuestionResponse>>("/api/v1/lesson-questions", req);
//         return data.result!;
//       },
//       onSuccess: (_, vars) => {
//         if (vars.lessonId) queryClient.invalidateQueries({ queryKey: lessonKeys.detail(vars.lessonId) });
//         queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) });
//       },
//     });
//   };

//   const useUpdateQuestion = () => {
//     return useMutation({
//       mutationFn: async ({ id, req }: { id: string; req: LessonQuestionRequest }) => {
//         const { data } = await instance.put<AppApiResponse<LessonQuestionResponse>>(`/api/v1/lesson-questions/${id}`, req);
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) }),
//     });
//   };

//   const useDeleteQuestion = () => {
//     return useMutation({
//       mutationFn: async (id: string) => {
//         await instance.delete(`/api/v1/lesson-questions/${id}`);
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) }),
//     });
//   };

//   // ==========================================
//   // === 3. LESSON PROGRESS (Full CRUD) ===
//   // ==========================================

//   const useLessonProgresses = (params?: { lessonId?: string; userId?: string; page?: number; size?: number }) => {
//     return useQuery({
//       queryKey: lessonKeys.progress.list(params),
//       queryFn: async () => {
//         const qp = new URLSearchParams();
//         if (params?.lessonId) qp.append("lessonId", params.lessonId);
//         if (params?.userId) qp.append("userId", params.userId);
//         if (params?.page !== undefined) qp.append("page", String(params.page));
//         if (params?.size !== undefined) qp.append("size", String(params.size));

//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressResponse>>>(
//           `/api/v1/lesson-progress?${qp.toString()}`
//         );
//         return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
//       },
//     });
//   };

//   const useLessonProgressDetail = (lessonId?: string, userId?: string) => {
//     return useQuery({
//       queryKey: lessonKeys.progress.detail(lessonId!, userId!),
//       queryFn: async () => {
//         if (!lessonId || !userId) throw new Error("IDs required");
//         const { data } = await instance.get<AppApiResponse<LessonProgressResponse>>(
//           `/api/v1/lesson-progress/${lessonId}/${userId}`
//         );
//         return data.result!;
//       },
//       enabled: !!(lessonId && userId),
//     });
//   };

//   const useCreateProgress = () => {
//     return useMutation({
//       mutationFn: async (req: LessonProgressRequest) => {
//         const { data } = await instance.post<AppApiResponse<LessonProgressResponse>>("/api/v1/lesson-progress", req);
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all }),
//     });
//   };

//   const useUpdateProgress = () => {
//     return useMutation({
//       mutationFn: async ({ lessonId, userId, req }: { lessonId: string; userId: string; req: LessonProgressRequest }) => {
//         const { data } = await instance.put<AppApiResponse<LessonProgressResponse>>(
//           `/api/v1/lesson-progress/${lessonId}/${userId}`,
//           req
//         );
//         return data.result!;
//       },
//       onSuccess: (_, vars) => {
//         queryClient.invalidateQueries({ queryKey: lessonKeys.progress.detail(vars.lessonId, vars.userId) });
//         queryClient.invalidateQueries({ queryKey: lessonKeys.progress.list({}) });
//       },
//     });
//   };

//   const useDeleteProgress = () => {
//     return useMutation({
//       mutationFn: async ({ lessonId, userId }: { lessonId: string; userId: string }) => {
//         await instance.delete(`/api/v1/lesson-progress/${lessonId}/${userId}`);
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all }),
//     });
//   };

//   // ==========================================
//   // === 4. WRONG ITEMS (Full CRUD) ===
//   // ==========================================

//   const useWrongItems = (params?: { lessonId?: string; userId?: string; questionId?: string; page?: number; size?: number }) => {
//     return useQuery({
//       queryKey: lessonKeys.wrongItems.list(params),
//       queryFn: async () => {
//         const qp = new URLSearchParams();
//         if (params?.lessonId) qp.append("lessonId", params.lessonId);
//         if (params?.userId) qp.append("userId", params.userId);
//         if (params?.questionId) qp.append("lessonQuestionId", params.questionId);
//         if (params?.page !== undefined) qp.append("page", String(params.page));
//         if (params?.size !== undefined) qp.append("size", String(params.size));

//         const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressWrongItemResponse>>>(
//           `/api/v1/lesson-progress-wrong-items?${qp.toString()}`
//         );
//         return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
//       },
//     });
//   };

//   const useWrongItemDetail = (lessonId?: string, userId?: string, questionId?: string) => {
//     return useQuery({
//       queryKey: lessonKeys.wrongItems.detail(lessonId!, userId!, questionId!),
//       queryFn: async () => {
//         if (!lessonId || !userId || !questionId) throw new Error("IDs required");
//         const { data } = await instance.get<AppApiResponse<LessonProgressWrongItemResponse>>(
//           `/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`
//         );
//         return data.result!;
//       },
//       enabled: !!(lessonId && userId && questionId),
//     });
//   };

//   const useCreateWrongItem = () => {
//     return useMutation({
//       mutationFn: async (req: LessonProgressWrongItemRequest) => {
//         const { data } = await instance.post<AppApiResponse<LessonProgressWrongItemResponse>>("/api/v1/lesson-progress-wrong-items", req);
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
//     });
//   };

//   const useUpdateWrongItem = () => {
//     return useMutation({
//       mutationFn: async ({ lessonId, userId, questionId, req }: { lessonId: string; userId: string; questionId: string; req: LessonProgressWrongItemRequest }) => {
//         const { data } = await instance.put<AppApiResponse<LessonProgressWrongItemResponse>>(
//           `/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`,
//           req
//         );
//         return data.result!;
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
//     });
//   };

//   const useDeleteWrongItem = () => {
//     return useMutation({
//       mutationFn: async ({ lessonId, userId, questionId }: { lessonId: string; userId: string; questionId: string }) => {
//         await instance.delete(`/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`);
//       },
//       onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
//     });
//   };

//   // ==========================================
//   // === 5. QUIZ & TEST (LessonController) ===
//   // ==========================================

//   const useGenerateSoloQuiz = (userId?: string) => {
//     return useQuery({
//       queryKey: lessonKeys.quiz.solo(userId!),
//       queryFn: async () => {
//         if (!userId) throw new Error("User ID required");
//         const { data } = await instance.get<AppApiResponse<QuizResponse>>(
//           `/api/v1/lessons/quiz/generate-solo?userId=${userId}`
//         );
//         return data.result!;
//       },
//       enabled: false,
//       staleTime: Infinity,
//     });
//   };

//   const useGenerateTeamQuiz = () => {
//     const user = useUserStore((s) => s.user);
//     return useMutation({
//       mutationFn: async ({ roomId, topic }: { roomId: string; topic?: string }) => {
//         if (!user?.userId) throw new Error("User not authenticated");
//         const qp = new URLSearchParams({ roomId, userId: user.userId });
//         if (topic) qp.append("topic", topic);

//         const { data } = await instance.get<AppApiResponse<QuizResponse>>(
//           `/api/v1/lessons/quiz/generate-team?${qp.toString()}`
//         );
//         return data.result!;
//       },
//     });
//   };

//   const useFindOrCreateQuizRoom = () => {
//     const user = useUserStore((s) => s.user);
//     return useMutation({
//       mutationFn: async () => {
//         if (!user?.userId) throw new Error("User not authenticated");
//         const { data } = await instance.post<AppApiResponse<RoomResponse>>(
//           `/api/v1/lessons/quiz/find-or-create-room?userId=${user.userId}`
//         );
//         return data.result!;
//       },
//     });
//   };

//   const useLessonTest = (lessonId: string, userId: string, enabled: boolean) => {
//     return useQuery({
//       queryKey: lessonKeys.test.start(lessonId, userId),
//       queryFn: async () => {
//         const { data } = await instance.post<AppApiResponse<{
//           lessonId: string;
//           questions: LessonQuestionResponse[];
//           durationSeconds: number;
//           allowedRetakeCount: number;
//           attemptNumber: number;
//           latestScore?: number;
//           wrongQuestionIds?: string[];
//         }>>(
//           `/api/v1/lessons/${lessonId}/start-test?userId=${userId}`
//         );
//         return data.result!;
//       },
//       enabled: enabled && !!lessonId && !!userId,
//       staleTime: 0,
//       gcTime: 0,
//     });
//   };

//   const useStartTest = () => {
//     return useMutation<any, unknown, { lessonId: string; userId: string }>({
//       mutationFn: async ({ lessonId, userId }) => {
//         const { data } = await instance.post<AppApiResponse<any>>(
//           `/api/v1/lessons/${lessonId}/start-test?userId=${userId}`
//         );
//         return data.result;
//       },
//     });
//   };

//   const useCompleteLesson = () => {
//     return useMutation({
//       mutationFn: async ({ lessonId, userId, score }: { lessonId: string; userId: string; score?: number }) => {
//         const qp = new URLSearchParams({ userId });
//         if (score !== undefined) qp.append("score", String(score));

//         const { data } = await instance.post<AppApiResponse<void>>(
//           `/api/v1/lessons/${lessonId}/complete?${qp.toString()}`
//         );
//         return data.result;
//       },
//       onSuccess: (_, { lessonId }) => {
//         queryClient.invalidateQueries({ queryKey: lessonKeys.detail(lessonId) });
//         queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all });
//       }
//     });
//   };

//   return {
//     // Lessons
//     useAllLessons,
//     useInfiniteLessons, // Export new hook
//     useLesson,
//     useCreatorLessons,
//     useCreateLesson,
//     useUpdateLesson,
//     useDeleteLesson,

//     // Questions
//     useAllQuestions,
//     useCreateQuestion,
//     useUpdateQuestion,
//     useDeleteQuestion,

//     // Progress
//     useLessonProgresses,
//     useLessonProgressDetail,
//     useCreateProgress,
//     useUpdateProgress,
//     useDeleteProgress,

//     useSkillLessonTree,
//     useSubmitTest,

//     useLessonWrongItems,
//     // Wrong Items
//     useWrongItems,
//     useWrongItemDetail,
//     useCreateWrongItem,
//     useUpdateWrongItem,
//     useDeleteWrongItem,

//     // Quiz & Test
//     useGenerateSoloQuiz,
//     useGenerateTeamQuiz,
//     useFindOrCreateQuizRoom,
//     useStartTest,
//     useLessonTest,
//     useCompleteLesson,
//   };
// };

// // FIXED: Robust mapping handling Spring Page defaults (last, number) vs DTO (isLast, pageNumber)
// const mapPageResponse = <T>(result: any, page: number, size: number) => {
//   if (!result) {
//     return {
//       data: [] as T[],
//       pagination: {
//         pageNumber: page,
//         pageSize: size,
//         totalElements: 0,
//         totalPages: 0,
//         isLast: true,
//         isFirst: true,
//         hasNext: false,
//         hasPrevious: false,
//       }
//     };
//   }

//   // Handle both "isLast" (DTO) and "last" (Spring default)
//   const isLast = result.isLast ?? result.last ?? true;
//   const isFirst = result.isFirst ?? result.first ?? true;
//   const pageNumber = result.pageNumber ?? result.number ?? page;
//   const pageSize = result.pageSize ?? result.size ?? size;

//   return {
//     data: (result.content as T[]) || [],
//     pagination: {
//       pageNumber,
//       pageSize,
//       totalElements: result.totalElements ?? 0,
//       totalPages: result.totalPages ?? 0,
//       isLast,
//       isFirst,
//       hasNext: result.hasNext ?? !isLast,
//       hasPrevious: result.hasPrevious ?? !isFirst,
//     },
//   };
// };
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { useUserStore } from "../stores/UserStore";
import {
  AppApiResponse,
  PageResponse,
  LessonResponse,
  LessonRequest,
  LessonQuestionResponse,
  LessonQuestionRequest,
  QuizResponse,
  RoomResponse,
  LessonProgressResponse,
  LessonProgressRequest,
  LessonProgressWrongItemResponse,
  LessonProgressWrongItemRequest,
  LessonHierarchicalResponse
} from "../types/dto";

import { SkillType } from "../types/enums";

// --- Keys Factory ---
export const lessonKeys = {
  all: ["lessons"] as const,
  lists: () => [...lessonKeys.all, "list"] as const,
  list: (params: any) => [...lessonKeys.lists(), params] as const,
  infinite: (params: any) => [...lessonKeys.all, "infinite", params] as const,
  details: () => [...lessonKeys.all, "detail"] as const,
  detail: (id: string) => [...lessonKeys.details(), id] as const,
  questions: {
    all: ["lessonQuestions"] as const,
    list: (params: any) => [...lessonKeys.questions.all, params] as const,
    detail: (id: string) => [...lessonKeys.questions.all, id] as const,
  },
  quiz: {
    solo: (userId: string) => [...lessonKeys.all, "quiz", "solo", userId] as const,
    team: (roomId: string) => [...lessonKeys.all, "quiz", "team", roomId] as const,
  },
  test: {
    start: (lessonId: string, userId: string) => [...lessonKeys.all, "test", "start", lessonId, userId] as const,
  },
  progress: {
    all: ["lessonProgress"] as const,
    list: (params: any) => [...lessonKeys.progress.all, params] as const,
    detail: (lessonId: string, userId: string) => [...lessonKeys.progress.all, lessonId, userId] as const,
  },
  wrongItems: {
    all: ["lessonWrongItems"] as const,
    list: (params: any) => [...lessonKeys.wrongItems.all, params] as const,
    detail: (lessonId: string, userId: string, questionId: string) => [...lessonKeys.wrongItems.all, lessonId, userId, questionId] as const,
  }
};

export const useLessons = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === 1. LESSON CRUD (LessonController) ===
  // ==========================================

  const useAllLessons = (params?: {
    lessonName?: string;
    languageCode?: string;
    minExpReward?: number;
    categoryId?: string;
    subCategoryId?: string;
    courseId?: string;
    seriesId?: string;
    skillType?: SkillType;
    page?: number;
    size?: number;
  }) => {
    return useQuery({
      queryKey: lessonKeys.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.lessonName) qp.append("lessonName", params.lessonName);
        if (params?.languageCode) qp.append("languageCode", params.languageCode);
        if (params?.minExpReward) qp.append("minExpReward", String(params.minExpReward));
        if (params?.categoryId) qp.append("categoryId", params.categoryId);
        if (params?.subCategoryId) qp.append("subCategoryId", params.subCategoryId);
        if (params?.courseId) qp.append("courseId", params.courseId);
        if (params?.seriesId) qp.append("seriesId", params.seriesId);
        if (params?.skillType) qp.append("skillType", params.skillType);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
          `/api/v1/lessons?${qp.toString()}`
        );
        return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const useInfiniteLessons = (params?: {
    lessonName?: string;
    languageCode?: string;
    minExpReward?: number;
    categoryId?: string;
    subCategoryId?: string;
    courseId?: string;
    seriesId?: string;
    skillType?: SkillType;
    size?: number;
  }) => {
    const size = params?.size || 10;
    return useInfiniteQuery({
      queryKey: lessonKeys.infinite(params),
      queryFn: async ({ pageParam = 0 }) => {
        const qp = new URLSearchParams();
        if (params?.lessonName) qp.append("lessonName", params.lessonName);
        if (params?.languageCode) qp.append("languageCode", params.languageCode);
        if (params?.minExpReward) qp.append("minExpReward", String(params.minExpReward));
        if (params?.categoryId) qp.append("categoryId", params.categoryId);
        if (params?.subCategoryId) qp.append("subCategoryId", params.subCategoryId);
        if (params?.courseId) qp.append("courseId", params.courseId);
        if (params?.seriesId) qp.append("seriesId", params.seriesId);
        if (params?.skillType) qp.append("skillType", params.skillType);
        qp.append("page", String(pageParam));
        qp.append("size", String(size));

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
          `/api/v1/lessons?${qp.toString()}`
        );
        return mapPageResponse(data.result, pageParam, size);
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.pagination.isLast) return undefined;
        return lastPage.pagination.pageNumber + 1;
      },
      initialPageParam: 0,
    });
  };

  const useLesson = (id: string | null) => {
    return useQuery({
      queryKey: lessonKeys.detail(id!),
      queryFn: async () => {
        if (!id) throw new Error("Lesson ID required");
        const { data } = await instance.get<AppApiResponse<LessonResponse>>(
          `/api/v1/lessons/${id}`
        );
        return data.result!;
      },
      enabled: !!id,
    });
  };

  const useCreatorLessons = (creatorId: string | null, page = 0, size = 20) => {
    return useQuery({
      queryKey: lessonKeys.list({ type: "creator", creatorId, page, size }),
      queryFn: async () => {
        if (!creatorId) throw new Error("Creator ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
          `/api/v1/lessons/creator/${creatorId}?page=${page}&size=${size}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!creatorId,
    });
  };

  const useCreateLesson = () => {
    return useMutation({
      mutationFn: async (req: LessonRequest) => {
        const { data } = await instance.post<AppApiResponse<LessonResponse>>("/api/v1/lessons", req);
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
        queryClient.invalidateQueries({ queryKey: lessonKeys.all });
      },
    });
  };

  const useSkillLessonTree = (skillType: SkillType, languageCode: string) => {
    return useQuery({
      queryKey: ['lessons', 'tree', skillType, languageCode],
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<LessonHierarchicalResponse[]>>(
          `/api/v1/lessons/tree?skillType=${skillType}&languageCode=${languageCode}`
        );
        return data.result;
      }
    });
  };

  const useLessonWrongItems = (lessonId: string, userId: string) => {
    return useQuery<LessonProgressWrongItemResponse[], unknown>({
      queryKey: lessonKeys.wrongItems.list({ lessonId, userId }),
      queryFn: async () => {
        if (!lessonId || !userId) return [];
        const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressWrongItemResponse>>>(
          `/api/v1/lessons/${lessonId}/wrong-items`,
          { params: { userId, size: 50 } }
        );
        return data.result?.content || [];
      },
      enabled: !!lessonId && !!userId
    });
  };

  const useSubmitTest = () => {
    interface SubmitTestPayload {
      lessonId: string;
      userId: string;
      body: {
        answers: Record<string, any>;
        attemptNumber: number;
      };
    }

    return useMutation<any, unknown, SubmitTestPayload>({
      mutationFn: async ({ lessonId, userId, body }) => {
        const qp = userId ? `?userId=${userId}` : "";
        const { data } = await instance.post<AppApiResponse<any>>(
          `/api/v1/lessons/${lessonId}/submit-test${qp}`,
          body
        );
        return data.result;
      },
      onSuccess: (_, variables) => {
        // IMPORTANT: Invalidate specific test query so next 'useLessonTest' call fetches fresh score/progress
        queryClient.invalidateQueries({ queryKey: lessonKeys.test.start(variables.lessonId, variables.userId) });
        queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all });
        queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all });
        queryClient.invalidateQueries({ queryKey: ['courses', 'enrollments'] });
      }
    });
  };

  const useUpdateLesson = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: LessonRequest }) => {
        const { data } = await instance.put<AppApiResponse<LessonResponse>>(`/api/v1/lessons/${id}`, req);
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.setQueryData(lessonKeys.detail(data.lessonId), data);
        queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });
      },
    });
  };

  const useDeleteLesson = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/lessons/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.lists() }),
    });
  };

  // ==========================================
  // === 2. QUESTIONS (LessonQuestionController) ===
  // ==========================================

  const useAllQuestions = (params?: { lessonId?: string; languageCode?: string; page?: number; size?: number }) => {
    return useQuery({
      queryKey: lessonKeys.questions.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.lessonId) qp.append("lessonId", params.lessonId);
        if (params?.languageCode) qp.append("languageCode", params.languageCode);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonQuestionResponse>>>(
          `/api/v1/lesson-questions?${qp.toString()}`
        );
        return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
      },
    });
  };

  const useCreateQuestion = () => {
    return useMutation({
      mutationFn: async (req: LessonQuestionRequest) => {
        const { data } = await instance.post<AppApiResponse<LessonQuestionResponse>>("/api/v1/lesson-questions", req);
        return data.result!;
      },
      onSuccess: (_, vars) => {
        if (vars.lessonId) queryClient.invalidateQueries({ queryKey: lessonKeys.detail(vars.lessonId) });
        queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) });
      },
    });
  };

  const useUpdateQuestion = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: LessonQuestionRequest }) => {
        const { data } = await instance.put<AppApiResponse<LessonQuestionResponse>>(`/api/v1/lesson-questions/${id}`, req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) }),
    });
  };

  const useDeleteQuestion = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/lesson-questions/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.questions.list({}) }),
    });
  };

  // ==========================================
  // === 3. LESSON PROGRESS (Full CRUD) ===
  // ==========================================

  const useLessonProgresses = (params?: { lessonId?: string; userId?: string; page?: number; size?: number }) => {
    return useQuery({
      queryKey: lessonKeys.progress.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.lessonId) qp.append("lessonId", params.lessonId);
        if (params?.userId) qp.append("userId", params.userId);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        // Default to a larger size if not specified to ensure lists (like course details) get mostly everything
        const size = params?.size !== undefined ? params.size : 1000;
        qp.append("size", String(size));

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressResponse>>>(
          `/api/v1/lesson-progress?${qp.toString()}`
        );
        return mapPageResponse(data.result, params?.page || 0, size);
      },
    });
  };

  const useLessonProgressDetail = (lessonId?: string, userId?: string) => {
    return useQuery({
      queryKey: lessonKeys.progress.detail(lessonId!, userId!),
      queryFn: async () => {
        if (!lessonId || !userId) throw new Error("IDs required");
        const { data } = await instance.get<AppApiResponse<LessonProgressResponse>>(
          `/api/v1/lesson-progress/${lessonId}/${userId}`
        );
        return data.result!;
      },
      enabled: !!(lessonId && userId),
    });
  };

  const useCreateProgress = () => {
    return useMutation({
      mutationFn: async (req: LessonProgressRequest) => {
        const { data } = await instance.post<AppApiResponse<LessonProgressResponse>>("/api/v1/lesson-progress", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all }),
    });
  };

  const useUpdateProgress = () => {
    return useMutation({
      mutationFn: async ({ lessonId, userId, req }: { lessonId: string; userId: string; req: LessonProgressRequest }) => {
        const { data } = await instance.put<AppApiResponse<LessonProgressResponse>>(
          `/api/v1/lesson-progress/${lessonId}/${userId}`,
          req
        );
        return data.result!;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: lessonKeys.progress.detail(vars.lessonId, vars.userId) });
        queryClient.invalidateQueries({ queryKey: lessonKeys.progress.list({}) });
      },
    });
  };

  const useDeleteProgress = () => {
    return useMutation({
      mutationFn: async ({ lessonId, userId }: { lessonId: string; userId: string }) => {
        await instance.delete(`/api/v1/lesson-progress/${lessonId}/${userId}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all }),
    });
  };

  // ==========================================
  // === 4. WRONG ITEMS (Full CRUD) ===
  // ==========================================

  const useWrongItems = (params?: { lessonId?: string; userId?: string; questionId?: string; page?: number; size?: number }) => {
    return useQuery({
      queryKey: lessonKeys.wrongItems.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.lessonId) qp.append("lessonId", params.lessonId);
        if (params?.userId) qp.append("userId", params.userId);
        if (params?.questionId) qp.append("lessonQuestionId", params.questionId);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonProgressWrongItemResponse>>>(
          `/api/v1/lesson-progress-wrong-items?${qp.toString()}`
        );
        return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
      },
    });
  };

  const useWrongItemDetail = (lessonId?: string, userId?: string, questionId?: string) => {
    return useQuery({
      queryKey: lessonKeys.wrongItems.detail(lessonId!, userId!, questionId!),
      queryFn: async () => {
        if (!lessonId || !userId || !questionId) throw new Error("IDs required");
        const { data } = await instance.get<AppApiResponse<LessonProgressWrongItemResponse>>(
          `/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`
        );
        return data.result!;
      },
      enabled: !!(lessonId && userId && questionId),
    });
  };

  const useCreateWrongItem = () => {
    return useMutation({
      mutationFn: async (req: LessonProgressWrongItemRequest) => {
        const { data } = await instance.post<AppApiResponse<LessonProgressWrongItemResponse>>("/api/v1/lesson-progress-wrong-items", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
    });
  };

  const useUpdateWrongItem = () => {
    return useMutation({
      mutationFn: async ({ lessonId, userId, questionId, req }: { lessonId: string; userId: string; questionId: string; req: LessonProgressWrongItemRequest }) => {
        const { data } = await instance.put<AppApiResponse<LessonProgressWrongItemResponse>>(
          `/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
    });
  };

  const useDeleteWrongItem = () => {
    return useMutation({
      mutationFn: async ({ lessonId, userId, questionId }: { lessonId: string; userId: string; questionId: string }) => {
        await instance.delete(`/api/v1/lesson-progress-wrong-items/${lessonId}/${userId}/${questionId}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: lessonKeys.wrongItems.all }),
    });
  };

  // ==========================================
  // === 5. QUIZ & TEST (LessonController) ===
  // ==========================================

  const useGenerateSoloQuiz = (userId?: string) => {
    return useQuery({
      queryKey: lessonKeys.quiz.solo(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<QuizResponse>>(
          `/api/v1/lessons/quiz/generate-solo?userId=${userId}`
        );
        return data.result!;
      },
      enabled: false,
      staleTime: Infinity,
    });
  };

  const useGenerateTeamQuiz = () => {
    const user = useUserStore((s) => s.user);
    return useMutation({
      mutationFn: async ({ roomId, topic }: { roomId: string; topic?: string }) => {
        if (!user?.userId) throw new Error("User not authenticated");
        const qp = new URLSearchParams({ roomId, userId: user.userId });
        if (topic) qp.append("topic", topic);

        const { data } = await instance.get<AppApiResponse<QuizResponse>>(
          `/api/v1/lessons/quiz/generate-team?${qp.toString()}`
        );
        return data.result!;
      },
    });
  };

  const useFindOrCreateQuizRoom = () => {
    const user = useUserStore((s) => s.user);
    return useMutation({
      mutationFn: async () => {
        if (!user?.userId) throw new Error("User not authenticated");
        const { data } = await instance.post<AppApiResponse<RoomResponse>>(
          `/api/v1/lessons/quiz/find-or-create-room?userId=${user.userId}`
        );
        return data.result!;
      },
    });
  };

  const useLessonTest = (lessonId: string, userId: string, enabled: boolean) => {
    return useQuery({
      queryKey: lessonKeys.test.start(lessonId, userId),
      queryFn: async () => {
        const { data } = await instance.post<AppApiResponse<{
          lessonId: string;
          questions: LessonQuestionResponse[];
          durationSeconds: number;
          allowedRetakeCount: number;
          attemptNumber: number;
          latestScore?: number;
          wrongQuestionIds?: string[];
        }>>(
          `/api/v1/lessons/${lessonId}/start-test?userId=${userId}`
        );
        return data.result!;
      },
      enabled: enabled && !!lessonId && !!userId,
      staleTime: 0,
      gcTime: 0,
    });
  };

  const useStartTest = () => {
    return useMutation<any, unknown, { lessonId: string; userId: string }>({
      mutationFn: async ({ lessonId, userId }) => {
        const { data } = await instance.post<AppApiResponse<any>>(
          `/api/v1/lessons/${lessonId}/start-test?userId=${userId}`
        );
        return data.result;
      },
    });
  };

  const useCompleteLesson = () => {
    return useMutation({
      mutationFn: async ({ lessonId, userId, score }: { lessonId: string; userId: string; score?: number }) => {
        const qp = new URLSearchParams({ userId });
        if (score !== undefined) qp.append("score", String(score));

        const { data } = await instance.post<AppApiResponse<void>>(
          `/api/v1/lessons/${lessonId}/complete?${qp.toString()}`
        );
        return data.result;
      },
      onSuccess: (_, { lessonId }) => {
        queryClient.invalidateQueries({ queryKey: lessonKeys.detail(lessonId) });
        queryClient.invalidateQueries({ queryKey: lessonKeys.progress.all });
      }
    });
  };

  return {
    // Lessons
    useAllLessons,
    useInfiniteLessons,
    useLesson,
    useCreatorLessons,
    useCreateLesson,
    useUpdateLesson,
    useDeleteLesson,

    // Questions
    useAllQuestions,
    useCreateQuestion,
    useUpdateQuestion,
    useDeleteQuestion,

    // Progress
    useLessonProgresses,
    useLessonProgressDetail,
    useCreateProgress,
    useUpdateProgress,
    useDeleteProgress,

    useSkillLessonTree,
    useSubmitTest,

    useLessonWrongItems,
    // Wrong Items
    useWrongItems,
    useWrongItemDetail,
    useCreateWrongItem,
    useUpdateWrongItem,
    useDeleteWrongItem,

    // Quiz & Test
    useGenerateSoloQuiz,
    useGenerateTeamQuiz,
    useFindOrCreateQuizRoom,
    useStartTest,
    useLessonTest,
    useCompleteLesson,
  };
};

// FIXED: Robust mapping handling Spring Page defaults (last, number) vs DTO (isLast, pageNumber)
const mapPageResponse = <T>(result: any, page: number, size: number) => {
  if (!result) {
    return {
      data: [] as T[],
      pagination: {
        pageNumber: page,
        pageSize: size,
        totalElements: 0,
        totalPages: 0,
        isLast: true,
        isFirst: true,
        hasNext: false,
        hasPrevious: false,
      }
    };
  }

  // Handle both "isLast" (DTO) and "last" (Spring default)
  const isLast = result.isLast ?? result.last ?? true;
  const isFirst = result.isFirst ?? result.first ?? true;
  const pageNumber = result.pageNumber ?? result.number ?? page;
  const pageSize = result.pageSize ?? result.size ?? size;

  return {
    data: (result.content as T[]) || [],
    pagination: {
      pageNumber,
      pageSize,
      totalElements: result.totalElements ?? 0,
      totalPages: result.totalPages ?? 0,
      isLast,
      isFirst,
      hasNext: result.hasNext ?? !isLast,
      hasPrevious: result.hasPrevious ?? !isFirst,
    },
  };
};