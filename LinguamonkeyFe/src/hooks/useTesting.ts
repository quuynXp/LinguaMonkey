import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
  AppApiResponse,
  TestConfigResponse,
  TestSessionResponse,
  TestResultResponse,
  TestSubmissionRequest
} from "../types/dto";

// --- Keys Factory ---
export const testKeys = {
  all: ["tests"] as const,
  available: (lang?: string) => [...testKeys.all, "available", lang] as const,
  session: (id: string) => [...testKeys.all, "session", id] as const,
  result: (id: string) => [...testKeys.all, "result", id] as const,
};

export const useTests = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === QUERIES ===
  // ==========================================

  // GET /api/v1/tests/available
  const useAvailableTests = (params?: { languageCode?: string | null }) => {
    return useQuery({
      queryKey: testKeys.available(params?.languageCode || "all"),
      queryFn: async () => {
        if (!params?.languageCode) return [];

        const { data } = await instance.get<AppApiResponse<TestConfigResponse[]>>(
          "/api/v1/tests/available",
          { params: { languageCode: params.languageCode } }
        );
        return data.result ?? [];
      },
      staleTime: 5 * 60 * 1000, // Cache 5 mins
      enabled: !!params?.languageCode,
    });
  };

  // ==========================================
  // === MUTATIONS ===
  // ==========================================

  // POST /api/v1/tests/start
  const useStartTest = () => {
    return useMutation({
      mutationFn: async (testConfigId: string) => {
        const { data } = await instance.post<AppApiResponse<TestSessionResponse>>(
          "/api/v1/tests/start",
          null,
          { params: { testConfigId } } // Controller uses @RequestParam
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // FIX: Dùng 'sessionId' theo đúng TestSessionResponse trong dto.ts
        if (data?.sessionId) {
          queryClient.setQueryData(testKeys.session(data.sessionId), data);
        }
      },
    });
  };

  // POST /api/v1/tests/sessions/{sessionId}/submit
  const useSubmitTest = () => {
    return useMutation({
      mutationFn: async ({
        sessionId,
        answers
      }: {
        sessionId: string;
        answers: Record<string, number>;
      }) => {
        // Construct body based on TestSubmissionRequest DTO
        // TestSubmissionRequest trong dto.ts là: { answers: Record<string, number> }
        const payload: TestSubmissionRequest = { answers };

        const { data } = await instance.post<AppApiResponse<TestResultResponse>>(
          `/api/v1/tests/sessions/${sessionId}/submit`,
          payload
        );
        return data.result!;
      },
      onSuccess: (data, vars) => {
        // Invalidate session to prevent re-taking or show completed state
        queryClient.invalidateQueries({ queryKey: testKeys.session(vars.sessionId) });

        // Invalidate user profile/level info as EXP might have changed
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });

        // Cache result nếu cần (Optional)
        // if (data.sessionId) {
        //    queryClient.setQueryData(testKeys.result(data.sessionId), data);
        // }
      },
    });
  };

  return {
    useAvailableTests,
    useStartTest,
    useSubmitTest,
  };
};