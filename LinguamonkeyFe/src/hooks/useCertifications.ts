import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse } from "../types/api"

interface CertificationTest {
  id: string
  language: string
  level: string
  name: string
  description: string
  duration: number // in minutes
  totalQuestions: number
  passingScore: number
  icon: string
  color: string
  isAvailable: boolean
  userProgress?: {
    attempts: number
    bestScore?: number
    lastAttempt?: string
    status: "not_started" | "in_progress" | "completed" | "failed"
  }
}

interface TestQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  skill: "reading" | "listening" | "grammar" | "vocabulary"
}

interface TestResult {
  id: string
  testId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  skillBreakdown: {
    reading: { correct: number; total: number }
    listening: { correct: number; total: number }
    grammar: { correct: number; total: number }
    vocabulary: { correct: number; total: number }
  }
  suggestions: string[]
  passed: boolean
  completedAt: string
}

export const useCertifications = () => {
  const queryClient = useQueryClient()

  // Get available certification tests for user's learning languages
  const useAvailableCertifications = (languages?: string[]) => {
    return useQuery<CertificationTest[]>({
      queryKey: ["availableCertifications", languages],
      queryFn: async () => {
        const params = new URLSearchParams()
        if (languages && languages.length > 0) {
          languages.forEach((lang) => params.append("languages", lang))
        }

        const response = await instance.get<ApiResponse<CertificationTest[]>>(
          `/certifications/available?${params.toString()}`,
        )
        return response.data.result || []
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
  }

  // Get certification test by ID
  const useCertificationTest = (testId: string | null) => {
    return useQuery<CertificationTest>({
      queryKey: ["certificationTest", testId],
      queryFn: async () => {
        if (!testId) throw new Error("Test ID is required")
        const response = await instance.get<ApiResponse<CertificationTest>>(`/certifications/${testId}`)
        return response.data.result!
      },
      enabled: !!testId,
      staleTime: 5 * 60 * 1000,
    })
  }

  // Get test questions for practice/exam
  const useTestQuestions = (testId: string | null, mode: "practice" | "exam" = "practice") => {
    return useQuery<TestQuestion[]>({
      queryKey: ["testQuestions", testId, mode],
      queryFn: async () => {
        if (!testId) throw new Error("Test ID is required")
        const response = await instance.get<ApiResponse<TestQuestion[]>>(
          `/certifications/${testId}/questions?mode=${mode}`,
        )
        return response.data.result || []
      },
      enabled: !!testId,
      staleTime: 0, // Don't cache questions
    })
  }

  // Get user's certification results
  const useUserCertificationResults = (page = 1, limit = 10) => {
    return useQuery<PaginatedResponse<TestResult>>({
      queryKey: ["userCertificationResults", page, limit],
      queryFn: async () => {
        const response = await instance.get<ApiResponse<PaginatedResponse<TestResult>>>(
          `/certifications/results?page=${page}&limit=${limit}`,
        )
        return response.data.result || { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  // Submit test answers
  const useSubmitTest = () => {
    const mutation = useMutation({
      mutationFn: async ({
        testId,
        answers,
        mode,
        timeSpent,
      }: {
        testId: string
        answers: { [questionId: string]: number }
        mode: "practice" | "exam"
        timeSpent: number
      }) => {
        const response = await instance.post<ApiResponse<TestResult>>(`/certifications/${testId}/submit`, {
          answers,
          mode,
          timeSpent,
        })
        return response.data.result!
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userCertificationResults"] })
        queryClient.invalidateQueries({ queryKey: ["availableCertifications"] })
      },
    })

    return {
      submitTest: mutation.mutate,
      isSubmitting: mutation.isPending,
      error: mutation.error,
    }
  }

  // Start test session
  const useStartTest = () => {
    const mutation = useMutation({
      mutationFn: async ({ testId, mode }: { testId: string; mode: "practice" | "exam" }) => {
        const response = await instance.post<ApiResponse<{ sessionId: string; startTime: string }>>(
          `/certifications/${testId}/start`,
          { mode },
        )
        return response.data.result!
      },
    })

    return {
      startTest: mutation.mutate,
      isStarting: mutation.isPending,
      error: mutation.error,
    }
  }

  return {
    useAvailableCertifications,
    useCertificationTest,
    useTestQuestions,
    useUserCertificationResults,
    useSubmitTest,
    useStartTest,
  }
}
