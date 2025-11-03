import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type {
  ApiResponse, TestLesson, TestQuestion, TestSession, TestResult
} from "../types/api";

const API_BASE = "/api/v1/tests";

export const useAvailableTestLessons = (params?: { languageCode?: string; certificate?: string; skill?: string }) => {
  const qs = new URLSearchParams();
  if (params?.languageCode) qs.append("languageCode", params.languageCode);
  if (params?.certificate) qs.append("certificate", params.certificate);
  if (params?.skill) qs.append("skill", params.skill);
  const url = qs.toString() ? `${API_BASE}/lessons?${qs.toString()}` : `${API_BASE}/lessons`;
  return useQuery({
    queryKey: ["testLessons", params || {}],
    queryFn: async () => {
      const res = await instance.get<ApiResponse<TestLesson[]>>(url);
      return res.data.result ?? [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useStartTest = () => {
  const qc = useQueryClient();
  const user = useUserStore(s => s.user);

  const mutation = useMutation({
    mutationFn: async ({ lessonId }: { lessonId: string }) => {
      const res = await instance.post<ApiResponse<{ sessionId: string; questions: TestQuestion[] }>>(
        `${API_BASE}/start?lessonId=${encodeURIComponent(lessonId)}`
      );
      return res.data.result!;
    },
    onSuccess: (data) => {
      qc.setQueryData(["testSession", data.sessionId], data);
    }
  });

  return {
    startTest: (lessonId: string) => mutation.mutateAsync({ lessonId }),
    isStarting: mutation.isPending,
    error: mutation.error,
  };
};

export const useTestSession = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["testSession", sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error("sessionId required");
      const res = await instance.get<ApiResponse<TestSession>>(`${API_BASE}/sessions/${sessionId}`);
      return res.data.result!;
    },
    enabled: !!sessionId,
    staleTime: 30_000,
  });
};

export const useSubmitTest = () => {
  const qc = useQueryClient();
  const user = useUserStore(s => s.user);

  const mutation = useMutation({
    mutationFn: async ({ sessionId, answers }: { sessionId: string; answers: Record<string, any> }) => {
      const res = await instance.post<ApiResponse<TestResult>>(`${API_BASE}/sessions/${sessionId}/submit`, { answers });
      return res.data.result!;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["testSession", vars.sessionId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  return {
    submitTest: (sessionId: string, answers: Record<string, any>) => mutation.mutateAsync({ sessionId, answers }),
    isSubmitting: mutation.isPending,
    error: mutation.error,
  };
};

export default {
  useAvailableTestLessons,
  useStartTest,
  useTestSession,
  useSubmitTest,
};
