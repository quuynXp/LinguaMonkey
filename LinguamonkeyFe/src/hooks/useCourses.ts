import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance" // (Đảm bảo đường dẫn này đúng)
import type { ApiResponse, PaginatedResponse } from "../types/api" // (Đảm bảo đường dẫn này đúng)

// ==========================================================
// === INTERFACES (Cần khớp với DTOs của BE) ===
// ==========================================================

export interface Lesson {
  lessonId: string
  lessonName: string
  title: string
  description?: string
  lessonType?: "VIDEO" | "TEXT" | "QUIZ"
  isFree: boolean // RẤT QUAN TRỌNG
  duration?: string // (ví dụ: "10:30")
  orderIndex: number
}

export interface CourseVersion {
  versionId: string
  courseId: string
  versionNumber: number
  status: "DRAFT" | "PENDING_APPROVAL" | "PUBLIC" | "ARCHIVED"
  reasonForChange?: string
  description?: string
  thumbnailUrl?: string
  publishedAt?: string
  lessons?: Lesson[]
}

export interface Course {
  courseId: string
  title: string
  creatorId?: string
  creatorName?: string // (Cần BE cung cấp qua Mapper)
  price?: number
  approvalStatus?: string
  languageCode?: string
  difficultyLevel?: string

  // DỮ LIỆU TỪ PHIÊN BẢN MỚI NHẤT
  latestPublicVersion: CourseVersion | null // Nơi chứa nội dung

  // Dữ liệu tổng hợp (cần BE cung cấp qua Mapper/Repo)
  rating?: number
  students?: number // (Đếm từ CourseEnrollment)
}

export interface CourseEnrollment {
  enrollmentId?: string
  courseId: string
  userId: string
  courseVersionId: string // Biết user đang học version nào
  status?: "ACTIVE" | "COMPLETED"
  enrolledAt?: string
  course: Course // BE nên trả về kèm course object (với eager loading)
  progressPercent?: number // Cần cho logic review
  completedLessons?: number
}

export interface CourseDiscount {
  discountId: string
  course: Course
  discountPercentage: number
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Review { // Dùng chung cho CourseReview và LessonReview
  reviewId?: string
  courseId?: string
  lessonId?: string
  userId: string
  userFullName?: string // (BE nên cung cấp qua Mapper)
  userAvatarUrl?: string // (BE nên cung cấp qua Mapper)
  rating: number
  comment?: string
  reviewedAt?: string
  isVerified?: boolean // Từ AI gRPC
}

// === REQUEST PAYLOADS (Cho Mutations) ===

interface CreateCourseRequest {
  creatorId: string
  title: string
  price: number
}

interface UpdateCourseDetailsRequest {
  title?: string
  price?: number
  languageCode?: string
  difficultyLevel?: string
}

interface UpdateCourseVersionRequest {
  description?: string
  thumbnailUrl?: string
  lessonIds: string[] // Danh sách UUID của bài học
}

interface PublishVersionRequest {
  reasonForChange: string
}

interface CreateReviewRequest {
  userId: string
  courseId?: string // Dùng cho course review
  lessonId?: string // Dùng cho lesson review
  rating: number
  comment?: string
}

interface SwitchVersionRequest {
  enrollmentId: string
  newVersionId: string
}

interface PurchaseRequest {
  courseId: string;
  userId: string; 
  // paymentInfo?: any // (Không cần thiết nếu dùng Wallet/Redirect)
}

/**
 * ==========================================================
 * === HOOK LIBRARY
 * ==========================================================
 */
export const useCourses = () => {
  const queryClient = useQueryClient()

  // ---------------------------------------------
  // === QUERIES (LẤY DỮ LIỆU) ===
  // ---------------------------------------------

  /**
   * Lấy tất cả khóa học PUBLIC (cho Learner)
   */
  const useAllCourses = (params?: {
    page?: number
    size?: number
    title?: string
    languageCode?: string
    type?: "FREE" | "PURCHASED" | string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  }) => {
    const { page = 0, size = 20, title, languageCode, type, sortBy, sortOrder } = params || {}
    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["allCourses", page, size, title, languageCode, type, sortBy, sortOrder],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        if (title) qp.append("title", title)
        if (languageCode) qp.append("languageCode", languageCode)
        if (type) qp.append("type", type)
        if (sortBy) qp.append("sort", `${sortBy},${sortOrder ?? "asc"}`)

        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/api/v1/courses?${qp.toString()}`)
        const pageResult = response.data.result as any // BE trả về Page
        return {
            data: pageResult.content,
            pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
        }
      },
    })
  }
  
  /**
   * Tìm kiếm khóa học (Elasticsearch)
   */
  const useSearchCourses = (query: string, page = 0, size = 20, options?: { enabled?: boolean }) => {
    return useQuery<PaginatedResponse<Course>>({
        queryKey: ["searchCourses", query, page, size],
        queryFn: async () => {
            const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/api/v1/search/courses?keyword=${query}&page=${page}&size=${size}`)
            const pageResult = response.data.result as any
            return {
                data: pageResult.content,
                pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
            }
        },
        enabled: options?.enabled ?? true,
    })
  }

  /**
   * Lấy chi tiết 1 khóa học (và version PUBLIC mới nhất)
   */
  const useCourse = (courseId: string | null) => {
    return useQuery<Course>({
      queryKey: ["course", courseId],
      queryFn: async () => {
        if (!courseId) throw new Error("Course ID is required")
        const response = await instance.get<ApiResponse<Course>>(`/api/v1/courses/${courseId}`)
        return response.data.result!
      },
      enabled: !!courseId,
    })
  }

  /**
   * Lấy các khóa học ĐÃ MUA (cho Learner)
   */
  const useEnrolledCourses = (params?: { userId?: string; page?: number; size?: number }) => {
     const { userId, page = 0, size = 20 } = params || {}
     return useQuery<PaginatedResponse<CourseEnrollment>>({
        queryKey: ["enrolledCourses", userId, page, size],
        queryFn: async () => {
            const qp = new URLSearchParams()
            if (userId) qp.append("userId", userId)
            qp.append("page", page.toString())
            qp.append("size", size.toString())
            const url = `/api/v1/course-enrollments?${qp.toString()}`
            const response = await instance.get<ApiResponse<PaginatedResponse<CourseEnrollment>>>(url)
            const pageResult = response.data.result as any
            return {
                data: pageResult.content,
                pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
            }
        },
        enabled: !!userId,
     })
  }

  /**
   * Lấy các khóa học CỦA TÔI (cho Creator P2P)
   */
  const useTeacherCourses = (creatorId?: string, page = 0, size = 20) => {
     return useQuery<PaginatedResponse<Course>>({
        queryKey: ["teacherCourses", creatorId, page, size],
        queryFn: async () => {
            if (!creatorId) throw new Error("creatorId is required")
            const qp = new URLSearchParams()
            qp.append("page", page.toString())
            qp.append("size", size.toString())
            // TODO: BE cần thêm filter status (DRAFT, PENDING, PUBLIC)
            const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/api/v1/courses/creator/${creatorId}?${qp.toString()}`)
            const pageResult = response.data.result as any
            return {
                data: pageResult.content,
                pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
            }
        },
        enabled: !!creatorId,
     })
  }
  
  /**
   * Lấy các khóa học đang GIẢM GIÁ
   */
  const useOnSaleCourses = (page = 0, size = 10) => {
    return useQuery<PaginatedResponse<CourseDiscount>>({
      queryKey: ["onSaleCourses", page, size],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        const response = await instance.get<ApiResponse<PaginatedResponse<CourseDiscount>>>(`/api/v1/course-discounts?${qp.toString()}`)
        const pageResult = response.data.result as any
        return {
            data: pageResult.content,
            pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
        }
      },
    })
  }
  
  // (useRecommendedCourses, useCourseCategories, useCourseLevels giữ nguyên)
  // ...
  const useRecommendedCourses = (userId?: string, limit = 5) => {
    return useQuery<Course[]>({
      queryKey: ["recommendedCourses", userId, limit],
      queryFn: async () => {
        if (!userId) return []
        const response = await instance.get<ApiResponse<Course[]>>(`/api/v1/courses/recommended?userId=${userId}&limit=${limit}`)
        return response.data.result || []
      },
      enabled: !!userId,
    })
  }

  const useCourseCategories = () => { /* ... (giữ nguyên) ... */ }
  const useCourseLevels = () => { /* ... (giữ nguyên) ... */ }

  /**
   * Lấy review của 1 khóa học
   */
  const useCourseReviews = (courseId?: string, page = 0, size = 10) => {
    return useQuery<PaginatedResponse<Review>>({
      queryKey: ["courseReviews", courseId, page, size],
      queryFn: async () => {
        const qp = new URLSearchParams()
        if (courseId) qp.append("courseId", courseId)
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        const response = await instance.get<ApiResponse<PaginatedResponse<Review>>>(`/api/v1/course-reviews?${qp.toString()}`)
        const pageResult = response.data.result as any
        return {
            data: pageResult.content,
            pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
        }
      },
      enabled: !!courseId,
    })
  }

  /**
   * Lấy review của 1 bài học
   */
  const useLessonReviews = (lessonId?: string, page = 0, size = 10) => {
    return useQuery<PaginatedResponse<Review>>({
      queryKey: ["lessonReviews", lessonId, page, size],
      queryFn: async () => {
        const qp = new URLSearchParams()
        if (lessonId) qp.append("lessonId", lessonId)
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        const response = await instance.get<ApiResponse<PaginatedResponse<Review>>>(`/api/v1/lesson-reviews?${qp.toString()}`)
        const pageResult = response.data.result as any
        return {
            data: pageResult.content,
            pagination: { page: pageResult.number, limit: pageResult.size, total: pageResult.totalElements, totalPages: pageResult.totalPages }
        }
      },
      enabled: !!lessonId,
    })
  }


  // ---------------------------------------------
  // === MUTATIONS (THAY ĐỔI DỮ LIỆU) ===
  // ---------------------------------------------

  /**
   * [Creator] Tạo 1 khóa học mới
   */
  const useCreateCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseData: CreateCourseRequest) => {
        const response = await instance.post<ApiResponse<Course>>("/api/v1/courses", courseData)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })
    return {
      createCourse: mutation.mutateAsync,
      isCreating: mutation.isPending,
      error: mutation.error,
    }
  }

  /**
   * [Creator] Cập nhật chi tiết chung (Title, Price)
   */
  const useUpdateCourseDetails = () => {
    const mutation = useMutation({
      mutationFn: async ({ courseId, courseData }: { courseId: string; courseData: UpdateCourseDetailsRequest }) => {
        const response = await instance.put<ApiResponse<Course>>(`/api/v1/courses/${courseId}/details`, courseData)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.setQueryData(["course", data.courseId], data)
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
      },
    })
    return {
      updateCourseDetails: mutation.mutateAsync,
      isUpdating: mutation.isPending,
      error: mutation.error,
    }
  }

  /**
   * [Creator] Lưu tạm (update) một bản DRAFT
   */
  const useUpdateCourseVersion = () => {
    const mutation = useMutation({
      mutationFn: async ({ versionId, versionData }: { versionId: string; versionData: UpdateCourseVersionRequest }) => {
        const response = await instance.put<ApiResponse<CourseVersion>>(`/api/v1/courses/versions/${versionId}`, versionData)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["course", data.courseId] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })
    return {
      updateCourseVersion: mutation.mutateAsync,
      isUpdatingVersion: mutation.isPending,
      error: mutation.error,
    }
  }
  
  /**
   * [Creator] Yêu cầu PUBLISH một bản DRAFT
   */
  const usePublishCourseVersion = () => {
    const mutation = useMutation({
      mutationFn: async ({ versionId, publishData }: { versionId: string; publishData: PublishVersionRequest }) => {
        const response = await instance.post<ApiResponse<CourseVersion>>(`/api/v1/courses/versions/${versionId}/publish`, publishData)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["course", data.courseId] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })
    return {
      publishCourseVersion: mutation.mutateAsync,
      isPublishing: mutation.isPending,
      error: mutation.error,
    }
  }
  
  /**
   * [Creator] Tạo một bản DRAFT mới (để edit)
   */
  const useCreateNewDraftVersion = () => {
    const mutation = useMutation({
      mutationFn: async (courseId: string) => {
        const response = await instance.post<ApiResponse<CourseVersion>>(`/api/v1/courses/${courseId}/versions`)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["course", data.courseId] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })
    return {
      createNewDraftVersion: mutation.mutateAsync,
      isCreatingDraft: mutation.isPending,
      error: mutation.error,
    }
  }

  /**
   * [Creator] Xóa khóa học
   */
  const useDeleteCourse = () => {
    const mutation = useMutation({
        mutationFn: async (courseId: string) => {
            const response = await instance.delete<ApiResponse<void>>(`/api/v1/courses/${courseId}`)
            return response.data.result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allCourses"] })
            queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
        },
    })
    return {
        deleteCourse: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        error: mutation.error,
    }
  }
  
  /**
   * [Learner] Mua / Đăng ký khóa học
   */
  const usePurchaseCourse = () => {
    const mutation = useMutation({
      mutationFn: async (payload: PurchaseRequest) => {
        const response = await instance.post<ApiResponse<CourseEnrollment>>("/api/v1/course-enrollments", payload)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] })
      },
    })
    return {
      purchaseCourse: mutation.mutateAsync,
      isPurchasing: mutation.isPending,
      error: mutation.error,
    }
  }
  
  /**
   * [Learner] Đổi version đang học
   */
  const useSwitchCourseVersion = () => {
    const mutation = useMutation({
      mutationFn: async (payload: SwitchVersionRequest) => {
        const response = await instance.put<ApiResponse<CourseEnrollment>>("/api/v1/course-enrollments/switch-version", payload)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] })
        queryClient.invalidateQueries({ queryKey: ["enrollment", data.courseId, data.userId] })
      },
    })
    return {
      switchCourseVersion: mutation.mutateAsync,
      isSwitching: mutation.isPending,
      error: mutation.error,
    }
  }
  
  /**
   * [Learner] Tạo review cho khóa học
   */
  const useCreateCourseReview = () => {
    const mutation = useMutation({
      mutationFn: async (payload: CreateReviewRequest) => {
        const response = await instance.post<ApiResponse<Review>>("/api/v1/course-reviews", payload)
        return response.data.result!
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["courseReviews", variables.courseId] })
        queryClient.invalidateQueries({ queryKey: ["course", variables.courseId] })
      },
    })
    return {
      createCourseReview: mutation.mutateAsync,
      isCreatingReview: mutation.isPending,
      error: mutation.error,
    }
  }
  
  /**
   * [Learner] Tạo review cho bài học
   */
  const useCreateLessonReview = () => {
    const mutation = useMutation({
      mutationFn: async (payload: CreateReviewRequest) => {
        const response = await instance.post<ApiResponse<Review>>("/api/v1/lesson-reviews", payload)
        return response.data.result!
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["lessonReviews", variables.lessonId] })
      },
    })
    return {
      createLessonReview: mutation.mutateAsync,
      isCreatingReview: mutation.isPending,
      error: mutation.error,
    }
  }

  // ... (Video hooks remain the same) ...
  const useBilingualVideos = (params?: { page?: number; size?: number; category?: string; level?: string }) => {
    const { page = 0, size = 10, category, level } = params || {}

    return useQuery<PaginatedResponse<BilingualVideo>>({
      queryKey: ["bilingualVideos", page, size, category, level],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        if (category && category !== "All") qp.append("category", category)
        if (level) qp.append("level", level)

        const response = await instance.get<ApiResponse<PaginatedResponse<BilingualVideo>>>(`/api/v1/api/videos/bilingual?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }
  const useVideoCategories = () => {
    return useQuery<string[]>({
      queryKey: ["videoCategories"],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<string[]>>("/videos/categories")
        return response.data.result || []
      },
      staleTime: 30 * 60 * 1000,
    })
  }
  const useVideo = (videoId: string | null) => {
    return useQuery<VideoResponse>({
      queryKey: ["video", videoId],
      queryFn: async () => {
        if (!videoId) throw new Error("videoId is required")
        const response = await instance.get<ApiResponse<VideoResponse>>(`/api/v1/videos/${videoId}`)
        return response.data.result!
      },
      enabled: !!videoId,
      staleTime: 5 * 60 * 1000,
    })
  }
  const useCreateVideo = () => {
    const mutation = useMutation({
      mutationFn: async (payload: Partial<VideoResponse>) => {
        const response = await instance.post<ApiResponse<VideoResponse>>("/videos", payload)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["bilingualVideos"] })
        queryClient.invalidateQueries({ queryKey: ["videoCategories"] })
      },
    })

    return {
      createVideo: mutation.mutateAsync,
      isCreating: mutation.isPending,
      error: mutation.error,
    }
  }
  const useUpdateVideo = () => {
    const mutation = useMutation({
      mutationFn: async ({ videoId, payload }: { videoId: string; payload: Partial<VideoResponse> }) => {
        const response = await instance.put<ApiResponse<VideoResponse>>(`/api/v1/videos/${videoId}`, payload)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.setQueryData(["video", data.videoId], data)
        queryClient.invalidateQueries({ queryKey: ["bilingualVideos"] })
      },
    })

    return {
      updateVideo: mutation.mutateAsync,
      isUpdating: mutation.isPending,
      error: mutation.error,
    }
  }
  const useDeleteVideo = () => {
    const mutation = useMutation({
      mutationFn: async (videoId: string) => {
        const response = await instance.delete<ApiResponse<void>>(`/api/v1/videos/${videoId}`)
        return response.data.result
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["bilingualVideos"] })
        queryClient.invalidateQueries({ queryKey: ["videoCategories"] })
      },
    })

    return {
      deleteVideo: mutation.mutateAsync,
      isDeleting: mutation.isPending,
      error: mutation.error,
    }
  }
  const useVideoSubtitles = (videoId: string | null) => {
    return useQuery<VideoSubtitle[]>({
      queryKey: ["videoSubtitles", videoId],
      queryFn: async () => {
        if (!videoId) throw new Error("videoId is required")
        const response = await instance.get<ApiResponse<VideoSubtitle[]>>(`/api/v1/videos/${videoId}/subtitles`)
        return response.data.result || []
      },
      enabled: !!videoId,
      staleTime: 10 * 60 * 1000,
    })
  }
  const useAddSubtitle = () => {
    const mutation = useMutation({
      mutationFn: async ({ videoId, payload }: { videoId: string; payload: Partial<VideoSubtitle> }) => {
        const response = await instance.post<ApiResponse<VideoSubtitle>>(`/api/v1/videos/${videoId}/subtitles`, payload)
        return response.data.result!
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["videoSubtitles", variables.videoId] })
      },
    })

    return {
      addSubtitle: mutation.mutateAsync,
      isAdding: mutation.isPending,
      error: mutation.error,
    }
  }
  const useDeleteSubtitle = () => {
    const mutation = useMutation({
      mutationFn: async ({ videoId, subtitleId }: { videoId: string; subtitleId: string }) => {
        const response = await instance.delete<ApiResponse<void>>(`/api/v1/videos/${videoId}/subtitles/${subtitleId}`)
        return response.data.result
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["videoSubtitles", variables.videoId] })
      },
    })

    return {
      deleteSubtitle: mutation.mutateAsync,
      isDeleting: mutation.isPending,
      error: mutation.error,
    }
  }
  const useTrackVideoProgress = () => {
    const mutation = useMutation({
      mutationFn: async ({
        videoId,
        currentTime,
        duration,
      }: {
        videoId: string
        currentTime: number
        duration: number
      }) => {
        const response = await instance.post<ApiResponse<{ success: boolean }>>(`/api/v1/videos/${videoId}/progress`, {
          currentTime,
          duration,
        })
        return response.data.result!
      },
    })

    return {
      trackProgress: mutation.mutateAsync,
      isTracking: mutation.isPending,
    }
  }
  // ... (Course Mutations remain the same) ...
  const useCreateCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseData: Partial<Course>) => {
        const response = await instance.post<ApiResponse<Course>>("/courses", courseData)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })

    return {
      createCourse: mutation.mutateAsync,
      isCreating: mutation.isPending,
      error: mutation.error,
    }
  }
  const useUpdateCourse = () => {
    const mutation = useMutation({
      mutationFn: async ({ courseId, courseData }: { courseId: string; courseData: Partial<Course> }) => {
        const response = await instance.put<ApiResponse<Course>>(`/api/v1/courses/${courseId}`, courseData)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.setQueryData(["course", data.courseId], data)
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })

    return {
      updateCourse: mutation.mutateAsync,
      isUpdating: mutation.isPending,
      error: mutation.error,
    }
  }
  const useDeleteCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseId: string) => {
        const response = await instance.delete<ApiResponse<void>>(`/api/v1/courses/${courseId}`)
        return response.data.result
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })

    return {
      deleteCourse: mutation.mutateAsync,
      isDeleting: mutation.isPending,
      error: mutation.error,
    }
  }
  const useEnrollCourse = () => {
    const mutation = useMutation({
      mutationFn: async (enrollmentPayload: Partial<CourseEnrollment>) => {
        const response = await instance.post<ApiResponse<CourseEnrollment>>("/course-enrollments", enrollmentPayload)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] })
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
      },
    })

    return {
      enrollCourse: mutation.mutateAsync,
      isEnrolling: mutation.isPending,
      error: mutation.error,
    }
  }
  const usePurchaseCourse = () => {
    const mutation = useMutation({
      mutationFn: async (payload: Partial<CourseEnrollment> & { paymentInfo?: any }) => {
        const response = await instance.post<ApiResponse<CourseEnrollment>>("/course-enrollments", payload)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] })
      },
    })

    return {
      purchaseCourse: mutation.mutateAsync,
      isPurchasing: mutation.isPending,
      error: mutation.error,
    }
  }
return {
    // Queries
    useAllCourses,
    useSearchCourses,
    useCourse,
    useEnrolledCourses,
    useTeacherCourses,
    useOnSaleCourses,
    useRecommendedCourses,
    useCourseCategories,
    useCourseLevels,
    useCourseReviews,
    useLessonReviews,
    
    // Mutations (P2P Creator)
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    usePublishCourseVersion,
    useCreateNewDraftVersion,
    useDeleteCourse,
    
    // Mutations (Learner)
    usePurchaseCourse,
    useSwitchCourseVersion,
    
    // Mutations (Reviews)
    useCreateCourseReview,
    useCreateLessonReview,

    useBilingualVideos,
    useVideoCategories,
    useVideo,
    useCreateVideo,
    useUpdateVideo,
    useDeleteVideo,
    useVideoSubtitles,
    useAddSubtitle,
    useDeleteSubtitle,
    useTrackVideoProgress,
  }
}