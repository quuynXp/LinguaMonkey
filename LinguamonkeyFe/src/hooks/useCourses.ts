import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  CourseResponse,
  CourseVersionResponse,
  CourseLessonResponse,
  LessonResponse,
  CourseVersionEnrollmentResponse,
  CourseVersionDiscountResponse,
  CourseVersionReviewResponse,
  CreateCourseRequest,
  UpdateCourseDetailsRequest,
  UpdateCourseVersionRequest,
  PublishVersionRequest,
  CourseVersionEnrollmentRequest,
  SwitchVersionRequest,
  CourseLessonRequest,
  CourseVersionDiscountRequest,
  CourseVersionReviewRequest,
  CreatorDashboardResponse,
} from "../types/dto";
import { CourseType } from "../types/enums";

export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (params: any) => [...courseKeys.lists(), params] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  versions: () => [...courseKeys.all, "version"] as const,
  version: (id: string) => [...courseKeys.versions(), id] as const,
  courseVersions: (courseId: string) => [...courseKeys.all, "versions_list", courseId] as const,
  recommended: (userId: string) => [...courseKeys.all, "recommended", userId] as const,
  levels: () => [...courseKeys.all, "levels"] as const,
  categories: () => [...courseKeys.all, "categories"] as const,
  enrollments: (params: any) => [...courseKeys.all, "enrollments", params] as const,
  lessons: (params: any) => [...courseKeys.all, "lessons", params] as const,
  discounts: (params: any) => [...courseKeys.all, "discounts", params] as const,
  reviews: (params: any) => [...courseKeys.all, "reviews", params] as const,
  creatorStats: (creatorId: string) => [...courseKeys.all, "creatorStats", creatorId] as const,
  courseStats: (courseId: string) => [...courseKeys.all, "courseStats", courseId] as const,
  specialOffers: (params: any) => [...courseKeys.all, "specialOffers", params] as const, // New Key
};

export const useCourses = () => {
  const queryClient = useQueryClient();

  const useAllCourses = (params?: {
    page?: number;
    size?: number;
    title?: string;
    languageCode?: string;
    type?: CourseType;
    categoryCode?: string;
    isAdminCreated?: boolean;
  }) => {
    const { page = 0, size = 10, title, languageCode, type, categoryCode, isAdminCreated } = params || {};
    return useQuery({
      queryKey: courseKeys.list({ page, size, title, languageCode, type, categoryCode, isAdminCreated }),
      queryFn: async () => {
        const qp = new URLSearchParams();
        qp.append("page", page.toString());
        qp.append("size", size.toString());
        if (title) qp.append("title", title);
        if (languageCode) qp.append("languageCode", languageCode);
        if (type) qp.append("type", type);
        if (categoryCode) qp.append("categoryCode", categoryCode);
        if (isAdminCreated !== undefined) qp.append("isAdminCreated", String(isAdminCreated));

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseResponse>>>(
          `/api/v1/courses?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  // --- New Hook for Special Offers ---
  const useSpecialOffers = (params?: {
    keyword?: string;
    languageCode?: string;
    minRating?: number;
    page?: number;
    size?: number;
  }) => {
    const { keyword, languageCode, minRating, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.specialOffers({ keyword, languageCode, minRating, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams();
        qp.append("page", page.toString());
        qp.append("size", size.toString());
        if (keyword) qp.append("keyword", keyword);
        if (languageCode) qp.append("languageCode", languageCode);
        if (minRating) qp.append("minRating", minRating.toString());

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseResponse>>>(
          `/api/v1/courses/special-offers?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      }
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

  const useCourseVersions = (courseId: string | null) => {
    return useQuery({
      queryKey: courseKeys.courseVersions(courseId!),
      queryFn: async () => {
        if (!courseId) throw new Error("Course ID required");
        const { data } = await instance.get<AppApiResponse<CourseVersionResponse[]>>(
          `/api/v1/courses/${courseId}/versions`
        );
        return data.result || [];
      },
      enabled: !!courseId
    });
  };

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

  const useReviews = (params?: { courseId?: string; versionId?: string; userId?: string; rating?: number; page?: number; size?: number }) => {
    const { courseId, versionId, userId, rating, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.reviews({ courseId, versionId, userId, rating, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (versionId) qp.append("versionId", versionId);
        if (rating) qp.append("rating", String(rating));
        if (userId) qp.append("userId", userId);
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseVersionReviewResponse>>>(`/api/v1/course-version-reviews?${qp.toString()}`);
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!(courseId || userId),
    });
  };

  const useLoadReplies = () => {
    return useMutation({
      mutationFn: async ({ reviewId, page, size }: { reviewId: string; page: number; size: number }) => {
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseVersionReviewResponse>>>(
          `/api/v1/course-version-reviews/${reviewId}/replies`,
          { params: { page, size } }
        );
        return mapPageResponse(data.result, page, size);
      }
    });
  };

  const useCreateReview = () => {
    return useMutation({
      mutationFn: async (req: CourseVersionReviewRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionReviewResponse>>("/api/v1/course-version-reviews", req);
        return data.result!;
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: courseKeys.reviews({ courseId: vars.courseId }) }),
    });
  };

  const useLikeReview = () => {
    return useMutation({
      mutationFn: async ({ reviewId, userId }: { reviewId: string; userId: string }) => {
        await instance.post(`/api/v1/course-version-reviews/${reviewId}/like?userId=${userId}`);
      },
    });
  };

  const useUnlikeReview = () => {
    return useMutation({
      mutationFn: async ({ reviewId, userId }: { reviewId: string; userId: string }) => {
        await instance.post(`/api/v1/course-version-reviews/${reviewId}/unlike?userId=${userId}`);
      },
    });
  };

  const useDislikeReview = () => {
    return useMutation({
      mutationFn: async ({ reviewId, userId }: { reviewId: string; userId: string }) => {
        await instance.post(`/api/v1/course-version-reviews/${reviewId}/dislike?userId=${userId}`);
      },
    });
  };

  const useUndislikeReview = () => {
    return useMutation({
      mutationFn: async ({ reviewId, userId }: { reviewId: string; userId: string }) => {
        await instance.post(`/api/v1/course-version-reviews/${reviewId}/undislike?userId=${userId}`);
      },
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

  const useCreatorStats = (creatorId?: string) => {
    return useQuery({
      queryKey: courseKeys.creatorStats(creatorId!),
      queryFn: async () => {
        if (!creatorId) throw new Error("Creator ID required");
        const { data } = await instance.get<AppApiResponse<CreatorDashboardResponse>>(
          `/api/v1/courses/creator/${creatorId}/stats`
        );
        return data.result!;
      },
      enabled: !!creatorId,
    });
  };

  const useCourseStats = (courseId?: string) => {
    return useQuery({
      queryKey: courseKeys.courseStats(courseId!),
      queryFn: async () => {
        if (!courseId) throw new Error("Course ID required");
        const { data } = await instance.get<AppApiResponse<CreatorDashboardResponse>>(
          `/api/v1/courses/${courseId}/stats`
        );
        return data.result!;
      },
      enabled: !!courseId,
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
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: courseKeys.courseVersions(data.courseId) });
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(data.courseId) });
      },
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
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: courseKeys.version(data.versionId) });
        queryClient.invalidateQueries({ queryKey: courseKeys.courseVersions(data.courseId) });
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(data.courseId) });
      },
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
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: courseKeys.version(data.versionId) });
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(data.courseId) });
        queryClient.invalidateQueries({ queryKey: courseKeys.courseVersions(data.courseId) });
      },
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

  const useEnrollments = (params?: { courseId?: string; userId?: string; page?: number; size?: number }) => {
    const { courseId, userId, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.enrollments({ courseId, userId, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (courseId) qp.append("courseId", courseId);
        if (userId) qp.append("userId", userId);
        const { data } = await instance.get<AppApiResponse<PageResponse<CourseVersionEnrollmentResponse>>>(
          `/api/v1/course-version-enrollments?${qp.toString()}`
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
        const { data } = await instance.get<AppApiResponse<CourseVersionEnrollmentResponse>>(
          `/api/v1/course-version-enrollments/${courseId}/${userId}`
        );
        return data.result!;
      },
      enabled: !!(courseId && userId),
    });
  };

  const useCreateEnrollment = () => {
    return useMutation({
      mutationFn: async (req: CourseVersionEnrollmentRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionEnrollmentResponse>>(
          "/api/v1/course-version-enrollments",
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const usePurchaseCourse = () => {
    return useMutation({
      mutationFn: async ({ userId, courseVersionId }: { userId: string, courseVersionId: string }) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionEnrollmentResponse>>(
          "/api/v1/course-version-enrollments/purchase",
          { userId, courseVersionId, paymentMethod: 'WALLET' }
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    });
  };

  const useSwitchVersion = () => {
    return useMutation({
      mutationFn: async (req: SwitchVersionRequest) => {
        const { data } = await instance.put<AppApiResponse<CourseVersionEnrollmentResponse>>(
          "/api/v1/course-version-enrollments/switch-version",
          req
        );
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const useUpdateEnrollment = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId, req }: { courseId: string; userId: string; req: CourseVersionEnrollmentRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseVersionEnrollmentResponse>>(
          `/api/v1/course-version-enrollments/${courseId}/${userId}`,
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
        await instance.delete(`/api/v1/course-version-enrollments/${courseId}/${userId}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.enrollments({}) }),
    });
  };

  const useCourseLessons = (params?: { courseId?: string; lessonId?: string; page?: number; size?: number }) => {
    const { courseId, lessonId, page = 0, size = 20 } = params || {};
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
      enabled: !!courseId && !lessonId,
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

  const useReviewDetail = (courseId?: string, userId?: string) => {
    return useQuery({
      queryKey: courseKeys.reviews({ courseId, userId, type: "detail" }),
      queryFn: async () => {
        if (!courseId || !userId) throw new Error("IDs required");
        const { data } = await instance.get<AppApiResponse<CourseVersionReviewResponse>>(
          `/api/v1/course-version-reviews/${courseId}/${userId}`
        );
        return data.result!;
      },
      enabled: !!(courseId && userId),
    });
  };

  const useUpdateReview = () => {
    return useMutation({
      mutationFn: async ({ courseId, userId, req }: { courseId: string; userId: string; req: CourseVersionReviewRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseVersionReviewResponse>>(
          `/api/v1/course-version-reviews/${courseId}/${userId}`,
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
        await instance.delete(`/api/v1/course-version-reviews/${courseId}/${userId}`);
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: courseKeys.reviews({ courseId: vars.courseId }) }),
    });
  };

  const useDiscounts = (params?: { versionId?: string; percentage?: number; page?: number; size?: number }) => {
    const { versionId, percentage, page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: courseKeys.discounts({ versionId, percentage, page, size }),
      queryFn: async () => {
        const qp = new URLSearchParams({ page: String(page), size: String(size) });
        if (versionId) qp.append("versionId", versionId);
        if (percentage) qp.append("discountPercentage", String(percentage));

        const { data } = await instance.get<AppApiResponse<PageResponse<CourseVersionDiscountResponse>>>(
          `/api/v1/course-version-discounts?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!versionId,
    });
  };

  const useDiscountDetail = (discountId?: string) => {
    return useQuery({
      queryKey: courseKeys.discounts({ discountId, type: "detail" }),
      queryFn: async () => {
        if (!discountId) throw new Error("Discount ID required");
        const { data } = await instance.get<AppApiResponse<CourseVersionDiscountResponse>>(
          `/api/v1/course-version-discounts/${discountId}`
        );
        return data.result!;
      },
      enabled: !!discountId,
    });
  };

  const useCreateDiscount = () => {
    return useMutation({
      mutationFn: async (req: CourseVersionDiscountRequest) => {
        const { data } = await instance.post<AppApiResponse<CourseVersionDiscountResponse>>("/api/v1/course-version-discounts", req);
        return data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.discounts({}) }),
    });
  };

  const useUpdateDiscount = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: CourseVersionDiscountRequest }) => {
        const { data } = await instance.put<AppApiResponse<CourseVersionDiscountResponse>>(
          `/api/v1/course-version-discounts/${id}`,
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
        await instance.delete(`/api/v1/course-version-discounts/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.discounts({}) }),
    });
  };

  const useLessonsByVersion = (params: { versionId?: string; page?: number; size?: number }) => {
    const { versionId, page = 0, size = 20 } = params;
    return useQuery({
      queryKey: courseKeys.lessons({ versionId, page, size }),
      queryFn: async () => {
        if (!versionId) return mapPageResponse(null, page, size);
        const qp = new URLSearchParams();
        qp.append("versionId", versionId);
        qp.append("page", page.toString());
        qp.append("size", size.toString());

        const { data } = await instance.get<AppApiResponse<PageResponse<LessonResponse>>>(
          `/api/v1/lessons?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      },
      enabled: !!versionId
    });
  };

  const useValidateDiscount = () => {
    return useMutation({
      mutationFn: async ({ code, versionId }: { code: string; versionId: string }) => {
        const { data } = await instance.get<AppApiResponse<CourseVersionDiscountResponse>>("/api/v1/course-version-discounts/validate", {
          params: { code, versionId }
        });
        return data.result!;
      }
    });
  };

  return {
    useAllCourses,
    useSpecialOffers, // Export new hook
    useCourse,
    useCourseVersions,
    useGetVersion,
    useCreatorCourses,
    useCreatorStats,
    useCourseStats,
    useLoadReplies,
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
    usePurchaseCourse,
    useSwitchVersion,
    useUpdateEnrollment,
    useDeleteEnrollment,
    useCourseLessons,
    useUploadLesson,
    useCreateCourseLesson,
    useUpdateCourseLesson,
    useDeleteCourseLesson,
    useLessonsByVersion,
    useReviews,
    useReviewDetail,
    useCreateReview,
    useLikeReview,
    useUnlikeReview,
    useDislikeReview,
    useUndislikeReview,
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