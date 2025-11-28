import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  CourseResponse,
  CourseVersionResponse,
  CourseLessonResponse,
  LessonResponse,
  CourseEnrollmentResponse,
  CourseDiscountResponse,
  CourseReviewResponse,
  CreateCourseRequest,
  UpdateCourseDetailsRequest,
  UpdateCourseVersionRequest,
  PublishVersionRequest,
  CourseEnrollmentRequest,
  SwitchVersionRequest,
  CourseLessonRequest,
  CourseDiscountRequest,
  CourseReviewRequest,
} from "../types/dto";
import { CourseType } from "../types/enums";

// --- Query Keys Factory ---
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (params: any) => [...courseKeys.lists(), params] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  versions: () => [...courseKeys.all, "version"] as const,
  version: (id: string) => [...courseKeys.versions(), id] as const,
  recommended: (userId: string) => [...courseKeys.all, "recommended", userId] as const,
  levels: () => [...courseKeys.all, "levels"] as const,
  categories: () => [...courseKeys.all, "categories"] as const,

  // Sub-entities
  enrollments: (params: any) => [...courseKeys.all, "enrollments", params] as const,
  lessons: (params: any) => [...courseKeys.all, "lessons", params] as const,
  discounts: (params: any) => [...courseKeys.all, "discounts", params] as const,
  reviews: (params: any) => [...courseKeys.all, "reviews", params] as const,
};

export const useCourses = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === 1. COURSE (General, Creator & Admin) ===
  // ==========================================

  const useAllCourses = (params?: {
    page?: number;
    size?: number;
    title?: string;
    languageCode?: string;
    type?: CourseType;
    categoryCode?: string;
  }) => {
    const { page = 0, size = 10, title, languageCode, type, categoryCode } = params || {};
    return useQuery({
      queryKey: courseKeys.list({ page, size, title, languageCode, type, categoryCode }),
      queryFn: async () => {
        const qp = new URLSearchParams();
        qp.append("page", page.toString());
        qp.append("size", size.toString());
        if (title) qp.append("title", title);
        if (languageCode) qp.append("languageCode", languageCode);
        if (type) qp.append("type", type);
        if (categoryCode) qp.append("categoryCode", categoryCode);

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseResponse>>>(
          `/api/v1/courses?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const useCourse = (courseId: string | null) => {
    return useQuery({
      queryKey: courseKeys.detail(courseId!),
      queryFn: async () => {
        if (!courseId) throw new Error("Course ID required");
        const { data } = await instance.get<AppApiResponse<CourseResponse>>(
          `/api/v1/courses/${courseId}`
        );
        return data.result!;
      },
      enabled: !!courseId,
    });
  };

  // ADDED: Missing hook definition
  const useGetVersion = (versionId: string) => {
    return useQuery({
      queryKey: courseKeys.version(versionId),
      queryFn: async () => {
        if (!versionId) return null;
        const { data } = await instance.get<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/versions/${versionId}`
        );
        return data.result!;
      },
      enabled: !!versionId
    });
  };

  const useCreatorCourses = (creatorId?: string, page = 0, size = 20) => {
    return useQuery({
      queryKey: courseKeys.list({ type: "CREATOR", creatorId, page, size }),
      queryFn: async () => {
        if (!creatorId) throw new Error("Creator ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseResponse>>>(
          `/api/v1/courses/creator/${creatorId}?page=${page}&size=${size}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!creatorId,
    });
  };

  const useRecommendedCourses = (userId?: string, limit = 5) => {
    return useQuery({
      queryKey: courseKeys.recommended(userId!),
      queryFn: async () => {
        if (!userId) return [];
        const { data } = await instance.get<AppApiResponse<CourseResponse[]>>(
          `/api/v1/courses/recommended?userId=${userId}&limit=${limit}`
        );
        return data.result || [];
      },
      enabled: !!userId,
    });
  };

  const useCourseLevels = () => {
    return useQuery({
      queryKey: courseKeys.levels(),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<string[]>>("/api/v1/courses/levels");
        return data.result || [];
      },
      staleTime: 60 * 60 * 1000,
    });
  };

  const useCourseCategories = () => {
    return useQuery({
      queryKey: courseKeys.categories(),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<string[]>>("/api/v1/courses/categories");
        return data.result || [];
      },
      staleTime: 60 * 60 * 1000,
    });
  };

  const useCreateCourse = () => {
    return useMutation({
      mutationFn: async (req: CreateCourseRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseResponse>>("/api/v1/courses", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lists() }),
    });
  };

  const useUpdateCourseDetails = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: UpdateCourseDetailsRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseResponse>>(
          `/api/v1/courses/${id}/details`,
          req
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.setQueryData(courseKeys.detail(data.courseId), data);
        queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      },
    });
  };

  const useCreateDraftVersion = () => {
    return useMutation({
      mutationFn: async (courseId: string) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/${courseId}/versions`
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
    });
  };

  const useUpdateCourseVersion = () => {
    return useMutation({
      mutationFn: async ({ versionId, req }: { versionId: string; req: UpdateCourseVersionRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/versions/${versionId}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
    });
  };

  const usePublishVersion = () => {
    return useMutation({
      mutationFn: async ({ versionId, req }: { versionId: string; req: PublishVersionRequest }) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/versions/${versionId}/publish`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
    });
  };

  const useDeleteCourse = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/courses/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lists() }),
    });
  };

  const useApproveVersion = () => {
    return useMutation({
      mutationFn: async (versionId: string) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/versions/${versionId}/approve`
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lists() }),
    });
  };

  const useRejectVersion = () => {
    return useMutation({
      mutationFn: async ({ versionId, reason }: { versionId: string; reason: string }) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionResponse>>(
          `/api/v1/courses/versions/${versionId}/reject`,
          null,
          { params: { reason } }
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lists() }),
    });
  };

  // ==========================================
  // === 2. ENROLLMENTS (Full CRUD) ===
  // ==========================================

  const useEnrollments = (params?: { courseId?: string; userId?: string; page?: number; size?: number }) => {
    const { courseId, userId, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.enrollments({ courseId, userId, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (userId) qp.append("userId", userId);
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseEnrollmentResponse>>>(
          `/api/v1/course-enrollments?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!(courseId || userId),
    });
  };

  const useEnrollmentDetail = (courseId?: string, userId?: string) => {
    return useQuery({
      queryKey: courseKeys.enrollments({ courseId, userId, type: "detail" }),
      queryFn: async () => {
        if (!courseId || !userId) throw new Error("IDs required");
        const { data } = await instance.get<AppApiResponse<CourseEnrollmentResponse>>(
          `/api/v1/course-enrollments/${courseId}/${userId}`
        );
        return data.result!;
      },
      enabled: !!(courseId && userId),
    });
  };

  const useCreateEnrollment = () => {
    return useMutation({
      mutationFn: async (req: CourseEnrollmentRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseEnrollmentResponse>>(
          "/api/v1/course-enrollments",
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const useSwitchVersion = () => {
    return useMutation({
      mutationFn: async (req: SwitchVersionRequest) => {
        const { data } = await instance.put<AppApiResponse<CourseEnrollmentResponse>>(
          "/api/v1/course-enrollments/switch-version",
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const useUpdateEnrollment = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId, req }: { courseId: string; userId: string; req: CourseEnrollmentRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseEnrollmentResponse>>(
          `/api/v1/course-enrollments/${courseId}/${userId}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const useDeleteEnrollment = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId }: { courseId: string; userId: string }) => {
        await instance.delete(`/api/v1/course-enrollments/${courseId}/${userId}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  // ==========================================
  // === 3. LESSONS (Full CRUD + Upload) ===
  // ==========================================

  const useCourseLessons = (params?: { courseId?: string; lessonId?: string; page?: number; size?: number }) => {
    const { courseId, lessonId, page = 0, size = 50 } = params || {};
    return useQuery({
      queryKey: courseKeys.lessons({ courseId, lessonId, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (lessonId) qp.append("lessonId", lessonId);
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseLessonResponse>>>(
          `/api/v1/course-lessons?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!(courseId || lessonId),
    });
  };

  const useUploadLesson = () => {
    return useMutation({
      mutationFn: async ({
        courseId,
        versionId,
        lessonIndex,
        videoFile,
        thumbnailFile,
        lessonData
      }: {
        courseId: string;
        versionId: string;
        lessonIndex: number;
        videoFile?: File | any;
        thumbnailFile?: File | any;
        lessonData: { title: string; description?: string; duration: string; isFree: boolean };
      }) => {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("versionId", versionId);
        formData.append("lessonIndex", String(lessonIndex));
        if (videoFile) formData.append("videoFile", videoFile);
        if (thumbnailFile) formData.append("thumbnailFile", thumbnailFile);
        formData.append("lessonData", JSON.stringify(lessonData));

        const { data } = await instance.post<AppApiResponse<LessonResponse>>(
          "/api/v1/course-lessons/upload",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: courseKeys.lessons({}) });
        queryClient.invalidateQueries({ queryKey: courseKeys.all });
      },
    });
  };

  const useCreateCourseLesson = () => {
    return useMutation({
      mutationFn: async (req: CourseLessonRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseLessonResponse>>("/api/v1/course-lessons", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lessons({}) }),
    });
  };

  const useUpdateCourseLesson = () => {
    return useMutation({
      mutationFn: async ({ cId, lId, req }: { cId: string; lId: string; req: CourseLessonRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseLessonResponse>>(
          `/api/v1/course-lessons/${cId}/${lId}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lessons({}) }),
    });
  };

  const useDeleteCourseLesson = () => {
    return useMutation({
      mutationFn: async ({ cId, lId }: { cId: string; lId: string }) => {
        await instance.delete(`/api/v1/course-lessons/${cId}/${lId}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.lessons({}) }),
    });
  };

  // ==========================================
  // === 4. REVIEWS (Full CRUD) ===
  // ==========================================

  const useReviews = (params?: { courseId?: string; userId?: string; rating?: number; page?: number; size?: number }) => {
    const { courseId, userId, rating, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.reviews({ courseId, userId, rating, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (userId) qp.append("userId", userId);
        if (rating) qp.append("rating", String(rating));

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseReviewResponse>>>(
          `/api/v1/course-reviews?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!(courseId || userId),
    });
  };

  const useReviewDetail = (courseId?: string, userId?: string) => {
    return useQuery({
      queryKey: courseKeys.reviews({ courseId, userId, type: "detail" }),
      queryFn: async () => {
        if (!courseId || !userId) throw new Error("IDs required");
        const { data } = await instance.get<AppApiResponse<CourseReviewResponse>>(
          `/api/v1/course-reviews/${courseId}/${userId}`
        );
        return data.result!;
      },
      enabled: !!(courseId && userId),
    });
  };

  const useCreateReview = () => {
    return useMutation({
      mutationFn: async (req: CourseReviewRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseReviewResponse>>("/api/v1/course-reviews", req);
        return data.result!;
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: courseKeys.reviews({ courseId: vars.courseId }) }),
    });
  };

  const useUpdateReview = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId, req }: { courseId: string; userId: string; req: CourseReviewRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseReviewResponse>>(
          `/api/v1/course-reviews/${courseId}/${userId}`,
          req
        );
        return data.result!;
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: courseKeys.reviews({ courseId: vars.courseId }) }),
    });
  };

  const useDeleteReview = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId }: { courseId: string; userId: string }) => {
        await instance.delete(`/api/v1/course-reviews/${courseId}/${userId}`);
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: courseKeys.reviews({ courseId: vars.courseId }) }),
    });
  };

  // ==========================================
  // === 5. DISCOUNTS (Full CRUD) ===
  // ==========================================

  const useDiscounts = (params?: { courseId?: string; percentage?: number; page?: number; size?: number }) => {
    const { courseId, percentage, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.discounts({ courseId, percentage, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (percentage) qp.append("discountPercentage", String(percentage));

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseDiscountResponse>>>(
          `/api/v1/course-discounts?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
    });
  };

  const useDiscountDetail = (discountId?: string) => {
    return useQuery({
      queryKey: courseKeys.discounts({ discountId, type: "detail" }),
      queryFn: async () => {
        if (!discountId) throw new Error("Discount ID required");
        const { data } = await instance.get<AppApiResponse<CourseDiscountResponse>>(
          `/api/v1/course-discounts/${discountId}`
        );
        return data.result!;
      },
      enabled: !!discountId,
    });
  };

  const useCreateDiscount = () => {
    return useMutation({
      mutationFn: async (req: CourseDiscountRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseDiscountResponse>>("/api/v1/course-discounts", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.discounts({}) }),
    });
  };

  const useUpdateDiscount = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: CourseDiscountRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseDiscountResponse>>(
          `/api/v1/course-discounts/${id}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.discounts({}) }),
    });
  };

  const useDeleteDiscount = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete(`/api/v1/course-discounts/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.discounts({}) }),
    });
  };

  const useValidateDiscount = () => {
    return useMutation({
      mutationFn: async ({ code, courseId }: { code: string; courseId: string }) => {
        const { data } = await instance.get<AppApiResponse<CourseDiscountResponse>>("/api/v1/course-discounts/validate", {
          params: { code, courseId }
        });
        return data.result!;
      }
    });
  };

  return {
    useAllCourses,
    useCourse,
    useGetVersion, // EXPORTED NOW
    useCreatorCourses,
    useRecommendedCourses,
    useCourseLevels,
    useCourseCategories,
    useCreateCourse,
    useUpdateCourseDetails,
    useCreateDraftVersion,
    useUpdateCourseVersion,
    usePublishVersion,
    useDeleteCourse,
    useApproveVersion,
    useRejectVersion,
    useEnrollments,
    useEnrollmentDetail,
    useCreateEnrollment,
    useSwitchVersion,
    useUpdateEnrollment,
    useDeleteEnrollment,
    useCourseLessons,
    useUploadLesson,
    useCreateCourseLesson,
    useUpdateCourseLesson,
    useDeleteCourseLesson,
    useReviews,
    useReviewDetail,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useDiscounts,
    useDiscountDetail,
    useCreateDiscount,
    useUpdateDiscount,
    useDeleteDiscount,
    useValidateDiscount,
  };
};

// Helper to standardize pagination return
const mapPageResponse = <T>(result: any, page: number, size: number) => ({
  data: (result?.content as T[]) || [],
  pagination: {
    pageNumber: result?.pageNumber ?? page,
    pageSize: result?.pageSize ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.isLast ?? true,
    isFirst: result?.isFirst ?? true,
    hasNext: result?.hasNext ?? false,
    hasPrevious: result?.hasPrevious ?? false,
  },
});