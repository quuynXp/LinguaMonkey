// src/hooks/useCertifications.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "../types/api";

export interface CertificationTest {
  id: string;
  language: string;
  level: string;
  name: string;
  description: string;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  icon: string;
  color: string;
  isAvailable: boolean;
  userProgress?: {
    attempts: number;
    bestScore?: number;
    lastAttempt?: string;
    status: "not_started" | "in_progress" | "completed" | "failed";
  };
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  skill: "reading" | "listening" | "grammar" | "vocabulary";
}

export interface TestResult {
  id: string;
  testId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  skillBreakdown: {
    reading: { correct: number; total: number };
    listening: { correct: number; total: number };
    grammar: { correct: number; total: number };
    vocabulary: { correct: number; total: number };
  };
  suggestions: string[];
  passed: boolean;
  completedAt: string;
}

export const useCertifications = () => {
  const queryClient = useQueryClient();

  const useAvailableCertifications = (languages?: string[]) =>
    useQuery<CertificationTest[]>({
      queryKey: ["availableCertifications", languages ?? []],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (languages && languages.length > 0) languages.forEach((l) => params.append("languages", l));
        const res = await instance.get<ApiResponse<CertificationTest[]>>(
          `/certifications/available?${params.toString()}`
        );
        return res.data.result ?? [];
      },
      staleTime: 10 * 60 * 1000,
    });

  const useCertificationTest = (testId: string | null) =>
    useQuery<CertificationTest>({
      queryKey: ["certificationTest", testId],
      queryFn: async () => {
        if (!testId) throw new Error("Test ID is required");
        const res = await instance.get<ApiResponse<CertificationTest>>(`/certifications/${testId}`);
        return res.data.result!;
      },
      enabled: !!testId,
      staleTime: 5 * 60 * 1000,
    });

  const useTestQuestions = (testId: string | null, mode: "practice" | "exam" = "practice") =>
    useQuery<TestQuestion[]>({
      queryKey: ["testQuestions", testId, mode],
      queryFn: async () => {
        if (!testId) throw new Error("Test ID is required");
        const res = await instance.get<ApiResponse<TestQuestion[]>>(
          `/certifications/${testId}/questions?mode=${mode}`
        );
        return res.data.result ?? [];
      },
      enabled: !!testId,
      staleTime: 0,
    });

  const useUserCertificationResults = (page = 1, limit = 10) =>
    useQuery<PaginatedResponse<TestResult>>({
      queryKey: ["userCertificationResults", page, limit],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<PaginatedResponse<TestResult>>>(
          `/certifications/results?page=${page}&limit=${limit}`
        );
        return res.data.result ?? { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      },
      staleTime: 5 * 60 * 1000,
    });

  // --- submitTest: return mutateAsync so caller receives TestResult
  const useSubmitTest = () => {
    const mutation = useMutation({
      mutationFn: async (payload: {
        testId: string;
        answers: { [questionId: string]: number };
        mode: "practice" | "exam";
        timeSpent: number;
      }) => {
        const res = await instance.post<ApiResponse<TestResult>>(`/certifications/${payload.testId}/submit`, {
          answers: payload.answers,
          mode: payload.mode,
          timeSpent: payload.timeSpent,
        });
        return res.data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userCertificationResults"] });
        queryClient.invalidateQueries({ queryKey: ["availableCertifications"] });
      },
    });

    return {
      submitTest: mutation.mutateAsync, // async fn returning TestResult
      isSubmitting: mutation.isPending,
      error: mutation.error,
    };
  };

  // --- startTest: return mutateAsync so caller receives { sessionId, startTime }
  const useStartTest = () => {
    const mutation = useMutation({
      mutationFn: async (payload: { testId: string; mode: "practice" | "exam" }) => {
        const res = await instance.post<ApiResponse<{ sessionId: string; startTime: string }>>(
          `/certifications/${payload.testId}/start`,
          { mode: payload.mode }
        );
        return res.data.result!;
      },
    });

    return {
      startTest: mutation.mutateAsync, // async fn returning { sessionId, startTime }
      isStarting: mutation.isPending,
      error: mutation.error,
    };
  };

  return {
    useAvailableCertifications,
    useCertificationTest,
    useTestQuestions,
    useUserCertificationResults,
    useSubmitTest,
    useStartTest,
  };
};
