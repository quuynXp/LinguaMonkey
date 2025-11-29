import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  TestConfigResponse,
  TestSessionResponse,
  TestResultResponse,
  TestSubmissionRequest,
  PageResponse,
} from "../types/dto";
import { TestStatus } from "../types/enums";

export interface ExternalTestConfig {
  id: string;
  title: string;
  description: string;
  url: string;
  iconName: string;
  color: string;
}

export const EXTERNAL_RESOURCES: ExternalTestConfig[] = [
  {
    id: "ext-1",
    title: "IELTS Online",
    description: "Free reading & listening practice",
    url: "https://ieltsonlinetests.com",
    iconName: "language",
    color: "#E11D48",
  },
  {
    id: "ext-2",
    title: "HSK Official",
    description: "Mock tests for all levels",
    url: "https://www.chinesetest.cn",
    iconName: "translate",
    color: "#D97706",
  },
  {
    id: "ext-3",
    title: "TOEFL Practice",
    description: "ETS official resources",
    url: "https://www.ets.org/toefl",
    iconName: "school",
    color: "#2563EB",
  },
];

export const testKeys = {
  all: ["tests"] as const,
  available: (lang?: string, page?: number) => [...testKeys.all, "available", lang, page] as const,
  history: () => [...testKeys.all, "history"] as const,
  session: (id: string) => [...testKeys.all, "session", id] as const,
  result: (id: string) => [...testKeys.all, "result", id] as const,
};

export const useAvailableTests = (params: { languageCode: string | null; page: number; size: number }) => {
  return useQuery({
    queryKey: testKeys.available(params.languageCode || "all", params.page),
    queryFn: async () => {
      if (!params.languageCode) return null;

      const { data } = await instance.get<AppApiResponse<PageResponse<TestConfigResponse>>>(
        "/api/v1/tests/available",
        {
          params: {
            languageCode: params.languageCode,
            page: params.page,
            size: params.size,
          },
        }
      );
      return data.result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!params.languageCode,
  });
};

export const useTestHistory = () => {
  return useQuery({
    queryKey: testKeys.history(),
    queryFn: async () => {
      const { data } = await instance.get<AppApiResponse<TestResultResponse[]>>(
        "/api/v1/tests/history"
      );
      return data.result ?? [];
    },
    staleTime: 30 * 1000,
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
      answers,
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
      queryClient.setQueryData(testKeys.result(vars.sessionId), data);
      queryClient.invalidateQueries({ queryKey: testKeys.history() });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

export const useTestResult = (sessionId: string | null) => {
  return useQuery({
    queryKey: testKeys.result(sessionId!),
    queryFn: async () => {
      const { data } = await instance.get<AppApiResponse<TestResultResponse>>(
        `/api/v1/tests/sessions/${sessionId}/result`
      );
      return data.result!;
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === TestStatus.REVIEW_PENDING) {
        return 3000;
      }
      return false;
    },
    refetchIntervalInBackground: true,
  });
};