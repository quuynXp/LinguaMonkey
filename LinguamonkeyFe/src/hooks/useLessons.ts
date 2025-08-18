// import { mutate } from "swr"
// import type { Lesson, LessonCategory, LessonProgress, LessonQuestion, LessonSeries } from "../types/api"
// import { useApiGet, useApiPost } from "./useApi"

// export const useLessons = () => {
//   // Get lessons with filters
//   const useLessons = (params?: {
//     category_id?: string
//     series_id?: string
//     course_id?: string
//     language_code?: string
//     page?: number
//     limit?: number
//   }) => {
//     const queryParams = new URLSearchParams()
//     if (params?.category_id) queryParams.append("category_id", params.category_id)
//     if (params?.series_id) queryParams.append("series_id", params.series_id)
//     if (params?.course_id) queryParams.append("course_id", params.course_id)
//     if (params?.language_code) queryParams.append("language_code", params.language_code)
//     if (params?.page) queryParams.append("page", params.page.toString())
//     if (params?.limit) queryParams.append("limit", params.limit.toString())

//     const url = `/lessons${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
//     return useApiGet<Lesson[]>(url)
//   }

//   // Get lesson by ID
//   const useLesson = (lessonId: string | null) => {
//     return useApiGet<Lesson>(lessonId ? `/lessons/${lessonId}` : null)
//   }

//   // Get lesson questions
//   const useLessonQuestions = (lessonId: string | null) => {
//     return useApiGet<LessonQuestion[]>(lessonId ? `/lessons/${lessonId}/questions` : null)
//   }

//   // Get lesson categories
//   const useLessonCategories = (languageCode?: string) => {
//     const url = `/lessons/categories${languageCode ? `?language_code=${languageCode}` : ""}`
//     return useApiGet<LessonCategory[]>(url)
//   }

//   // Get lesson series
//   const useLessonSeries = (languageCode?: string) => {
//     const url = `/lessons/series${languageCode ? `?language_code=${languageCode}` : ""}`
//     return useApiGet<LessonSeries[]>(url)
//   }

//   // Get user's lesson progress
//   const useLessonProgress = (lessonId: string | null) => {
//     return useApiGet<LessonProgress>(lessonId ? `/lessons/${lessonId}/progress` : null)
//   }

//   // Submit lesson answers
//   const useSubmitLesson = () => {
//     const { trigger, isMutating } = useApiPost<{
//       score: number
//       correct: number
//       total: number
//       exp_gained: number
//     }>("/lessons/submit")

//     const submitLesson = async (lessonId: string, answers: Record<string, string>) => {
//       try {
//         const result = await trigger({ lesson_id: lessonId, answers })
//         // Revalidate related data
//         mutate(`/lessons/${lessonId}/progress`)
//         mutate("/user/stats")
//         mutate("/user/profile")
//         return result
//       } catch (error) {
//         throw error
//       }
//     }

//     return { submitLesson, isSubmitting: isMutating }
//   }

//   // Complete lesson
//   const useCompleteLesson = () => {
//     const { trigger, isMutating } = useApiPost<{ success: boolean; exp_gained: number }>("/lessons/complete")

//     const completeLesson = async (lessonId: string, score: number) => {
//       try {
//         const result = await trigger({ lesson_id: lessonId, score })
//         // Revalidate related data
//         mutate(`/lessons/${lessonId}/progress`)
//         mutate("/user/stats")
//         mutate("/user/profile")
//         return result
//       } catch (error) {
//         throw error
//       }
//     }

//     return { completeLesson, isCompleting: isMutating }
//   }

//   return {
//     useLessons,
//     useLesson,
//     useLessonQuestions,
//     useLessonCategories,
//     useLessonSeries,
//     useLessonProgress,
//     useSubmitLesson,
//     useCompleteLesson,
//   }
// }
