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
  creatorName?: string // Added
  type?: "FREE" | "PURCHASED" | string
  price?: number
  originalPrice?: number // Added
  discount?: number // Added
  languageCode?: string // Added
  approvalStatus?: string // Added
  rating?: number // Added
  students?: number // Added
  duration?: string // Added
  totalLessons?: number // Added
  category?: string // Added
  tags?: string[] // Added
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
  course: Course // Added: Assume Enrollment DTO includes the course object
}

export interface CourseDiscount {
  discountId: string
  course: Course // Assume Discount DTO includes the course object
  discountPercentage: number
  startDate: string
  endDate: string
  isActive: boolean
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

  /**
   * NEW: Full-text search with Elasticsearch
   * Backend: GET /api/v1/courses/search?query=...
   */
  const useSearchCourses = (query: string, page = 0, size = 20, options?: { enabled?: boolean }) => {
    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["searchCourses", query, page, size],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("keyword", query) // Sửa: param là 'keyword'
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        
        // Sửa: endpoint là '/search/courses'
        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(`/search/courses?${qp.toString()}`)
        
        // BE trả về AppApiResponse, nên ta cần unwrap 'result'
        // (Giả sử BE trả về Page, nó sẽ có 'content' và 'totalPages', etc.)
        const pageResult = response.data.result as any
        
        return {
            data: pageResult.content,
            pagination: {
                page: pageResult.number,
                limit: pageResult.size,
                total: pageResult.totalElements,
                totalPages: pageResult.totalPages,
            }
        }
      },
      staleTime: 5 * 60 * 1000,
      enabled: options?.enabled ?? true,
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
   * THIS IS for "My Purchased Courses"
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
   * THIS IS for "My P2P Courses for Sale"
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
   * NEW: Get courses on sale
   * Backend: GET /api/v1/course-discounts
   */
  const useOnSaleCourses = (page = 0, size = 10) => {
    return useQuery<PaginatedResponse<CourseDiscount>>({
      queryKey: ["onSaleCourses", page, size],
      queryFn: async () => {
        const qp = new URLSearchParams()
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        // We might need a filter for active discounts
        // qp.append("isActive", "true")
        const response = await instance.get<ApiResponse<PaginatedResponse<CourseDiscount>>>(`/course-discounts?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      staleTime: 10 * 60 * 1000,
    })
  }

  /**
   * Recommended courses
   */
  const useRecommendedCourses = (userId?: string, limit = 5) => {
    return useQuery<Course[]>({
      queryKey: ["recommendedCourses", userId, limit],
      queryFn: async () => {
        if (!userId) return [] // Don't fail, just return empty
        const response = await instance.get<ApiResponse<Course[]>>(`/courses/recommended?userId=${userId}&limit=${limit}`)
        return response.data.result || []
      },
      enabled: !!userId,
      staleTime: 10 * 60 * 1000,
    })
  }

  /**
   * NEW: Get dynamic course categories
   * Backend: GET /api/v1/courses/categories
   */
  const useCourseCategories = () => {
    return useQuery<string[]>({
      queryKey: ["courseCategories"],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<string[]>>("/courses/categories")
        return response.data.result || []
      },
      staleTime: 60 * 60 * 1000, // 1 hour
    })
  }

  /**
   * NEW: Get dynamic course levels (from enum)
   * Backend: GET /api/v1/courses/levels
   */
  const useCourseLevels = () => {
    return useQuery<string[]>({
      queryKey: ["courseLevels"],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<string[]>>("/courses/levels")
        // Convert to title case e.g. "BEGINNER" -> "Beginner"
        return (response.data.result || []).map(
          (level) => level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
        )
      },
      staleTime: 60 * 60 * 1000, // 1 hour
    })
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

        const response = await instance.get<ApiResponse<PaginatedResponse<BilingualVideo>>>(`/api/videos/bilingual?${qp.toString()}`)
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
        const response = await instance.get<ApiResponse<VideoResponse>>(`/videos/${videoId}`)
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
        const response = await instance.put<ApiResponse<Course>>(`/courses/${courseId}`, courseData)
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
    useAllCourses,
    useSearchCourses, // Added
    useCourse,
    useEnrolledCourses, // Corrected usage for "My Courses"
    useTeacherCourses, // For P2P "My Courses for Sale"
    useOnSaleCourses, // Added
    useRecommendedCourses,
    useCourseCategories, // Added
    useCourseLevels, // Added
    // --- (Deprecated hooks, replaced by specific ones) ---
    // usePurchasedCourses, (Replaced by useEnrolledCourses)
    // useFreeCourses, (useAllCourses with type="FREE" is fine if needed)
    // --- Video Hooks ---
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
    // --- Course Mutations ---
    useCreateCourse,
    useUpdateCourse,
    useDeleteCourse,
    useEnrollCourse,
    usePurchaseCourse,
  }
}