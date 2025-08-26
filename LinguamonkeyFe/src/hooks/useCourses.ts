import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse } from "../types/api"

interface Course {
  courseId: string
  title: string
  description?: string
  thumbnailUrl?: string
  languageCode?: string
  difficultyLevel?: string
  creatorId?: string
  createdAt: string
  updatedAt: string
  creator?: {
    userId: string
    fullname: string
    avatarUrl?: string
  }
  lessons?: Lesson[]
  enrollmentsCount?: number
  reviewsCount?: number
  averageRating?: number
  isEnrolled?: boolean
  progress?: number
}

interface Lesson {
  lessonId: string
  lessonName: string
  title: string
  languageCode?: string
  expReward: number
  courseId?: string
  lessonSeriesId?: string
  lessonCategoryId?: string
  createdAt: string
  updatedAt: string
  questionsCount?: number
  isCompleted?: boolean
  progress?: number
}

// Nếu dùng bilingual video thì cần định nghĩa type
interface BilingualVideo {
  videoId: string
  title: string
  category?: string
  level?: string
  url: string
  createdAt: string
}

export const useCourses = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // ---------------- Queries ----------------
  const useAllCourses = (params?: {
    page?: number
    limit?: number
    title?: string
    languageCode?: string
    difficultyLevel?: string
    creatorId?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  }) => {
    const { page = 1, limit = 20, title, languageCode, difficultyLevel, creatorId, sortBy, sortOrder } = params || {}

    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["allCourses", page, limit, title, languageCode, difficultyLevel, creatorId, sortBy, sortOrder],
      queryFn: async () => {
        const queryParams = new URLSearchParams()
        queryParams.append("page", page.toString())
        queryParams.append("limit", limit.toString())
        if (title) queryParams.append("title", title)
        if (languageCode) queryParams.append("languageCode", languageCode)
        if (difficultyLevel) queryParams.append("difficultyLevel", difficultyLevel)
        if (creatorId) queryParams.append("creatorId", creatorId)
        if (sortBy) queryParams.append("sortBy", sortBy)
        if (sortOrder) queryParams.append("sortOrder", sortOrder)

        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(
          `/courses?${queryParams.toString()}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
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

  const useEnrolledCourses = (userId?: string) => {
    return useQuery<Course[]>({
      queryKey: ["enrolledCourses", userId],
      queryFn: async () => {
        const url = userId ? `/courses/enrolled/${userId}` : "/users/me/courses"
        const response = await instance.get<ApiResponse<Course[]>>(url)
        return response.data.result || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const useTeacherCourses = (teacherId?: string) => {
    return useQuery<Course[]>({
      queryKey: ["teacherCourses", teacherId],
      queryFn: async () => {
        const url = teacherId ? `/teachers/${teacherId}/courses` : "/teachers/me/courses"
        const response = await instance.get<ApiResponse<Course[]>>(url)
        return response.data.result || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const usePurchasedCourses = (page = 1, limit = 10) => {
    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["purchasedCourses", page, limit],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(
          `/courses/purchased?page=${page}&limit=${limit}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const useFreeCourses = (page = 1, limit = 10) => {
    return useQuery<PaginatedResponse<Course>>({
      queryKey: ["freeCourses", page, limit],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<PaginatedResponse<Course>>>(
          `/courses/free?page=${page}&limit=${limit}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const useRecommendedCourses = (limit = 5) => {
    return useQuery<Course[]>({
      queryKey: ["recommendedCourses", limit],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<Course[]>>(`/courses/recommended?limit=${limit}`)
        return response.data.result || []
      },
      staleTime: 10 * 60 * 1000,
    })
  }

  const useBilingualVideos = (params?: { page?: number; limit?: number; category?: string; level?: string }) => {
    const { page = 1, limit = 10, category, level } = params || {}

    return useQuery<PaginatedResponse<BilingualVideo>>({
      queryKey: ["bilingualVideos", page, limit, category, level],
      queryFn: async () => {
        const queryParams = new URLSearchParams()
        queryParams.append("page", page.toString())
        queryParams.append("limit", limit.toString())
        if (category && category !== "All") queryParams.append("category", category)
        if (level) queryParams.append("level", level)

        const response = await instance.get<ApiResponse<PaginatedResponse<BilingualVideo>>>(
          `/videos/bilingual?${queryParams.toString()}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
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
      createCourse: mutation.mutate,
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
      updateCourse: mutation.mutate,
      isUpdating: mutation.isPending,
      error: mutation.error,
    }
  }

  const useDeleteCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseId: string) => {
        const response = await instance.delete<ApiResponse<{ success: boolean }>>(`/courses/${courseId}`)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
        queryClient.invalidateQueries({ queryKey: ["teacherCourses"] })
      },
    })

    return {
      deleteCourse: mutation.mutate,
      isDeleting: mutation.isPending,
      error: mutation.error,
    }
  }

  const useEnrollCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseId: string) => {
        const response = await instance.post<ApiResponse<{ success: boolean }>>(`/courses/${courseId}/enroll`)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] })
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
      },
    })

    return {
      enrollCourse: mutation.mutate,
      isEnrolling: mutation.isPending,
      error: mutation.error,
    }
  }

  const usePurchaseCourse = () => {
    const mutation = useMutation({
      mutationFn: async (courseId: string) => {
        const response = await instance.post<ApiResponse<{ paymentUrl: string }>>(`/courses/${courseId}/purchase`)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["purchasedCourses"] })
        queryClient.invalidateQueries({ queryKey: ["allCourses"] })
      },
    })

    return {
      purchaseCourse: mutation.mutate,
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
      trackProgress: mutation.mutate,
      isTracking: mutation.isPending,
    }
  }

  // ---------------- Return all hooks ----------------
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
    useCreateCourse,
    useUpdateCourse,
    useDeleteCourse,
    useEnrollCourse,
    usePurchaseCourse,
    useTrackVideoProgress,
  }
}
