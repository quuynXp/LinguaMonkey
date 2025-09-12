import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse } from "../types/api"

/**
 * Types aligned with backend DTOs you provided
 */
export interface Course {
  courseId: string
  title: string
  description?: string
  difficultyLevel?: string
  thumbnailUrl?: string
  isDeleted?: boolean
  creatorId?: string
  type?: "FREE" | "PURCHASED" | string
  price?: number
  createdAt?: string 
  updatedAt?: string
}

export interface CourseEnrollment {
  enrollmentId?: string
  courseId: string
  userId: string
  status?: "COMPLETED" | "PAUSE" | "ACTIVE" | string
  paymentStatus?: "UNPAIR" | "PAIR" | string
  enrolledAt?: string
  completedAt?: string
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

interface Lesson {
  lessonId: string
  lessonName: string
  title: string
  languageCode?: string
  expReward?: number
  courseId?: string
  lessonSeriesId?: string
  lessonCategoryId?: string
  createdAt?: string
  updatedAt?: string
  questionsCount?: number
  isCompleted?: boolean
  progress?: number
}

/** video types returned by backend */
interface BilingualVideo {
  videoId: string
  title: string
  category?: string
  level?: string
  url: string
  createdAt: string
}

interface VideoResponse {
  videoId: string
  videoUrl: string
  title?: string
  type?: string
  level?: string
  originalSubtitleUrl?: string
  lessonId?: string
  createdAt?: string
  updatedAt?: string
  subtitles?: VideoSubtitle[]
}

interface VideoSubtitle {
  videoSubtitleId: string
  videoId: string
  languageCode: string
  subtitleUrl: string
  createdAt?: string
}

/**
 * Hook library
 */
export const useCourses = () => {
  const queryClient = useQueryClient()

  // ---------------- Queries ----------------

  /**
   * Get courses with Spring Pageable support.
   * Maps sortBy + sortOrder -> Spring style sort param "field,asc"
   */
  const useAllCourses = (params?: {
    page?: number
    size?: number
    title?: string
    languageCode?: string
    type?: "FREE" | "PURCHASED" | string
    creatorId?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  }) => {
    const { page = 0, size = 20, title, languageCode, type, creatorId, sortBy, sortOrder } = params || {}

    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["allCourses", page, size, title, languageCode, type, creatorId, sortBy, sortOrder],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        if (title) qp.append("title", title)
        if (languageCode) qp.append("languageCode", languageCode)
        if (type) qp.append("type", type)
        if (creatorId) qp.append("creatorId", creatorId)
        if (sortBy) qp.append("sort", `${sortBy},${sortOrder ?? "asc"}`)

        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/courses?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const useCourse = (courseId: string | null) => {
    return useQuery<Course>({
      queryKey: ["course", courseId],
      queryFn: async () => {
        if (!courseId) throw new Error("Course ID is required")
        const response = await instance.get<ApiResponse<Course>>(`/courses/${courseId}`)
        return response.data.result!
      },
      enabled: !!courseId,
      staleTime: 5 * 60 * 1000,
    })
  }

  /**
   * Get enrollments for a user (pageable).
   * Backend: GET /api/course-enrollments?userId=...
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
        const url = `/course-enrollments?${qp.toString()}`
        const response = await instance.get<ApiResponse<PaginatedResponse<CourseEnrollment>>>(url)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    })
  }

  /**
   * Courses by creator (pageable)
   * Backend: GET /api/courses/creator/{creatorId}
   */
  const useTeacherCourses = (creatorId?: string, page = 0, size = 20) => {
    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["teacherCourses", creatorId, page, size],
      queryFn: async () => {
        if (!creatorId) throw new Error("creatorId is required")
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/courses/creator/${creatorId}?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      enabled: !!creatorId,
      staleTime: 5 * 60 * 1000,
    })
  }

  /**
   * Purchased / Free are simply filters by type on /api/courses
   */
  const usePurchasedCourses = (page = 0, size = 10) => {
    return useAllCourses({ page, size, type: "PURCHASED" })
  }

  const useFreeCourses = (page = 0, size = 10) => {
    return useAllCourses({ page, size, type: "FREE" })
  }

  /**
   * Recommended courses require userId according to backend.
   * GET /api/courses/recommended?userId={userId}&limit={limit}
   */
  const useRecommendedCourses = (userId: string, limit = 5) => {
    return useQuery<Course[]>({
      queryKey: ["recommendedCourses", userId, limit],
      queryFn: async () => {
        if (!userId) throw new Error("userId is required for recommended courses")
        const response = await instance.get<ApiResponse<Course[]>>(`/courses/recommended?userId=${userId}&limit=${limit}`)
        return response.data.result || []
      },
      enabled: !!userId,
      staleTime: 10 * 60 * 1000,
    })
  }

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

        const response = await instance.get<ApiResponse<PaginatedResponse<BilingualVideo>>>(`/api/videos/bilingual?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  /**
   * GET /api/videos/categories
   */
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

  /**
   * GET /api/videos/{id}
   */
  const useVideo = (videoId: string | null) => {
    return useQuery<VideoResponse>({
      queryKey: ["video", videoId],
      queryFn: async () => {
        if (!videoId) throw new Error("videoId is required")
        const response = await instance.get<ApiResponse<VideoResponse>>(`/videos/${videoId}`)
        return response.data.result!
      },
      enabled: !!videoId,
      staleTime: 5 * 60 * 1000,
    })
  }

  /**
   * Create / Update / Delete video (admin)
   * POST /api/videos
   * PUT /api/videos/{id}
   * DELETE /api/videos/{id}
   */
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
        const response = await instance.put<ApiResponse<VideoResponse>>(`/videos/${videoId}`, payload)
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
        const response = await instance.delete<ApiResponse<void>>(`/videos/${videoId}`)
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

  // ---------- Subtitles ----------
  /**
   * GET /api/videos/{videoId}/subtitles
   */
  const useVideoSubtitles = (videoId: string | null) => {
    return useQuery<VideoSubtitle[]>({
      queryKey: ["videoSubtitles", videoId],
      queryFn: async () => {
        if (!videoId) throw new Error("videoId is required")
        const response = await instance.get<ApiResponse<VideoSubtitle[]>>(`/videos/${videoId}/subtitles`)
        return response.data.result || []
      },
      enabled: !!videoId,
      staleTime: 10 * 60 * 1000,
    })
  }

  /**
   * POST /api/videos/{videoId}/subtitles
   */
  const useAddSubtitle = () => {
    const mutation = useMutation({
      mutationFn: async ({ videoId, payload }: { videoId: string; payload: Partial<VideoSubtitle> }) => {
        const response = await instance.post<ApiResponse<VideoSubtitle>>(`/videos/${videoId}/subtitles`, payload)
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

  /**
   * DELETE /api/videos/{videoId}/subtitles/{subtitleId}
   */
  const useDeleteSubtitle = () => {
    const mutation = useMutation({
      mutationFn: async ({ videoId, subtitleId }: { videoId: string; subtitleId: string }) => {
        const response = await instance.delete<ApiResponse<void>>(`/videos/${videoId}/subtitles/${subtitleId}`)
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

  // ---------------- Mutations ----------------

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
        const response = await instance.put<ApiResponse<Course>>(`/courses/${courseId}`, courseData)
        return response.data.result!
      },
      onSuccess: (data) => {
        // backend returns CourseResponse with courseId
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
        const response = await instance.delete<ApiResponse<void>>(`/courses/${courseId}`)
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
   * Enroll -> backend expects POST /api/course-enrollments with CourseEnrollmentRequest body.
   * We'll accept a flexible payload since DTO fields not fully specified here.
   */
  const useEnrollCourse = () => {
    const mutation = useMutation({
      mutationFn: async (enrollmentPayload: Partial<CourseEnrollment>) => {
        const response = await instance.post<ApiResponse<CourseEnrollment>>("/course-enrollments", enrollmentPayload)
        return response.data.result!
      },
      onSuccess: () => {
        // invalidate enrollments and courses list so UI updates enrollment state
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

  /**
   * Purchase flow: backend sample didn't expose a purchase endpoint.
   * If you actually have one use /api/payments or use enroll + paymentStatus.
   * Here we provide a generic create enrollment with payment info.
   */
  const usePurchaseCourse = () => {
    const mutation = useMutation({
      mutationFn: async (payload: Partial<CourseEnrollment> & { paymentInfo?: any }) => {
        // Re-use course-enrollments creation; backend may handle payment status inside service
        const response = await instance.post<ApiResponse<CourseEnrollment>>("/course-enrollments", payload)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["purchasedCourses"] })
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
      },
    })

    return {
      purchaseCourse: mutation.mutateAsync,
      isPurchasing: mutation.isPending,
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
        const response = await instance.post<ApiResponse<{ success: boolean }>>(`/videos/${videoId}/progress`, {
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

  return {
    useAllCourses,
    useCourse,
    useEnrolledCourses,
    useTeacherCourses,
    usePurchasedCourses,
    useFreeCourses,
    useRecommendedCourses,
    useBilingualVideos,
    useVideoCategories,
    useVideo,
    useCreateVideo,
    useUpdateVideo,
    useDeleteVideo,
    useVideoSubtitles,
    useAddSubtitle,
    useDeleteSubtitle,
    useCreateCourse,
    useUpdateCourse,
    useDeleteCourse,
    useEnrollCourse,
    usePurchaseCourse,
    useTrackVideoProgress,
  }
}
