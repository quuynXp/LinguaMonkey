import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  TestConfigResponse,
  TestSessionResponse,
  TestResultResponse,
  TestSubmissionRequest
} from "../types/dto";

export const testKeys = {
  all: ["tests"] as const,
  available: (lang?: string) => [...testKeys.all, "available", lang] as const,
  session: (id: string) => [...testKeys.all, "session", id] as const,
  result: (id: string) => [...testKeys.all, "result", id] as const,
};

export const useAvailableTests = (params?: { languageCode?: string | null }) => {
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
    staleTime: 5 * 60 * 1000,
    enabled: !!params?.languageCode,
  });
};

export const useStartTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testConfigId: string) => {
      const { data } = await instance.post<AppApiResponse<TestSessionResponse>>(
        "/api/v1/tests/start",
        null,
        { params: { testConfigId } }
      );
      return data.result!;
    },
    onSuccess: (data) => {
      if (data?.sessionId) {
        queryClient.setQueryData(testKeys.session(data.sessionId), data);
      }
    },
  });
};

export const useSubmitTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      answers
    }: {
      sessionId: string;
      answers: Record<string, number>;
    }) => {
      const payload: TestSubmissionRequest = { answers };

      const { data } = await instance.post<AppApiResponse<TestResultResponse>>(
        `/api/v1/tests/sessions/${sessionId}/submit`,
        payload
      );
      return data.result!;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: testKeys.session(vars.sessionId) });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};