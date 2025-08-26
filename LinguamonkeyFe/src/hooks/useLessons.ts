import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse } from "../types/api"

interface Lesson {
  lesson_id: string
  lesson_name: string
  title: string
  language_code?: string
  exp_reward: number
  course_id?: string
  lesson_series_id?: string
  lesson_category_id?: string
  lesson_sub_category_id?: string
  created_at: string
  updated_at: string
  questions?: LessonQuestion[]
  progress?: LessonProgress
  category?: LessonCategory
  series?: LessonSeries
  course?: Course
}

interface LessonQuestion {
  lesson_question_id: string
  lesson_id: string
  language_code?: string
  question: string
  optiona?: string
  optionb?: string
  optionc?: string
  optiond?: string
  correct_option?: string
  skill_type?: string
}

interface LessonProgress {
  lesson_id: string
  user_id: string
  score: number
  completed_at?: string
  created_at: string
}

interface LessonCategory {
  lesson_category_id: string
  lesson_category_name: string
  language_code?: string
  description?: string
}

interface LessonSeries {
  lesson_series_id: string
  lesson_series_name: string
  title: string
  language_code?: string
  description?: string
  lessons?: Lesson[]
}

interface Course {
  course_id: string
  title: string
  description?: string
}

export const useLessons = () => {
  const queryClient = useQueryClient()

  // Get all lessons
  const useAllLessons = (params?: {
    page?: number
    limit?: number
    search?: string
    language?: string
    category_id?: string
    series_id?: string
    course_id?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
  }) => {
    const {
      page = 1,
      limit = 20,
      search,
      language,
      category_id,
      series_id,
      course_id,
      sortBy,
      sortOrder,
    } = params || {}

    return useQuery<PaginatedResponse<Lesson>>({
      queryKey: ["allLessons", page, limit, search, language, category_id, series_id, course_id, sortBy, sortOrder],
      queryFn: async () => {
        const queryParams = new URLSearchParams()
        queryParams.append("page", page.toString())
        queryParams.append("limit", limit.toString())
        if (search) queryParams.append("search", search)
        if (language) queryParams.append("language", language)
        if (category_id) queryParams.append("category_id", category_id)
        if (series_id) queryParams.append("series_id", series_id)
        if (course_id) queryParams.append("course_id", course_id)
        if (sortBy) queryParams.append("sortBy", sortBy)
        if (sortOrder) queryParams.append("sortOrder", sortOrder)

        const response = await instance.get<ApiResponse<PaginatedResponse<Lesson>>>(
          `/lessons?${queryParams.toString()}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  // Get lesson by ID
  const useLesson = (lessonId: string | null) => {
    return useQuery<Lesson>({
      queryKey: ["lesson", lessonId],
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID is required")
        const response = await instance.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`)
        return response.data.result!
      },
      enabled: !!lessonId,
      staleTime: 5 * 60 * 1000,
    })
  }

  // Get lesson questions
  const useLessonQuestions = (lessonId: string | null) => {
    return useQuery<LessonQuestion[]>({
      queryKey: ["lessonQuestions", lessonId],
      queryFn: async () => {
        if (!lessonId) throw new Error("Lesson ID is required")
        const response = await instance.get<ApiResponse<LessonQuestion[]>>(`/lessons/${lessonId}/questions`)
        return response.data.result || []
      },
      enabled: !!lessonId,
      staleTime: 5 * 60 * 1000,
    })
  }

  // Get lesson categories
  const useLessonCategories = (languageCode?: string) => {
    return useQuery<LessonCategory[]>({
      queryKey: ["lessonCategories", languageCode],
      queryFn: async () => {
        const url = languageCode ? `/lessons/categories?language=${languageCode}` : "/lessons/categories"
        const response = await instance.get<ApiResponse<LessonCategory[]>>(url)
        return response.data.result || []
      },
      staleTime: 10 * 60 * 1000,
    })
  }

  // Get lesson series
  const useLessonSeries = (languageCode?: string) => {
    return useQuery<LessonSeries[]>({
      queryKey: ["lessonSeries", languageCode],
      queryFn: async () => {
        const url = languageCode ? `/lessons/series?language=${languageCode}` : "/lessons/series"
        const response = await instance.get<ApiResponse<LessonSeries[]>>(url)
        return response.data.result || []
      },
      staleTime: 10 * 60 * 1000,
    })
  }

  // Create lesson
  const useCreateLesson = () => {
    const mutation = useMutation({
      mutationFn: async (lessonData: Partial<Lesson>) => {
        const response = await instance.post<ApiResponse<Lesson>>("/lessons", lessonData)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allLessons"] })
      },
    })

    return {
      createLesson: mutation.mutate,
      isCreating: mutation.isPending,
      error: mutation.error,
    }
  }

  // Update lesson
  const useUpdateLesson = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, lessonData }: { lessonId: string; lessonData: Partial<Lesson> }) => {
        const response = await instance.put<ApiResponse<Lesson>>(`/lessons/${lessonId}`, lessonData)
        return response.data.result!
      },
      onSuccess: (data) => {
        queryClient.setQueryData(["lesson", data.lesson_id], data)
        queryClient.invalidateQueries({ queryKey: ["allLessons"] })
      },
    })

    return {
      updateLesson: mutation.mutate,
      isUpdating: mutation.isPending,
      error: mutation.error,
    }
  }

  // Delete lesson
  const useDeleteLesson = () => {
    const mutation = useMutation({
      mutationFn: async (lessonId: string) => {
        const response = await instance.delete<ApiResponse<{ success: boolean }>>(`/lessons/${lessonId}`)
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allLessons"] })
      },
    })

    return {
      deleteLesson: mutation.mutate,
      isDeleting: mutation.isPending,
      error: mutation.error,
    }
  }

  // Submit lesson answers
  const useSubmitLesson = () => {
    const mutation = useMutation({
      mutationFn: async ({ lessonId, answers }: { lessonId: string; answers: Record<string, string> }) => {
        const response = await instance.post<
          ApiResponse<{
            score: number
            correct: number
            total: number
            exp_gained: number
          }>
        >(`/lessons/${lessonId}/submit`, { answers })
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["lessonProgress"] })
        queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      },
    })

    return {
      submitLesson: mutation.mutate,
      isSubmitting: mutation.isPending,
      error: mutation.error,
    }
  }

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
  }
}
