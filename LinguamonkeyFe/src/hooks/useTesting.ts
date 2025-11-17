import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
// Bỏ import useUserStore vì chúng ta sẽ lấy userId từ context/storage
import type {
  ApiResponse,
  TestConfig, // <- Đổi tên
  TestSessionStartData, // <- Dùng type mới
  TestResult
} from "../types/api";

const API_BASE = "/api/v1/tests";

export const useAvailableTests = (params?: { languageCode?: string | null }) => {
  const qs = new URLSearchParams();
  if (params?.languageCode) {
    qs.append("languageCode", params.languageCode);
  }

  const url = `${API_BASE}/available?${qs.toString()}`;

  return useQuery({
    queryKey: ["availableTests", params?.languageCode ?? ''],
    queryFn: async () => {
      if (!params?.languageCode) {
        return [];
      }
      const res = await instance.get<ApiResponse<TestConfig[]>>(url);
      return res.data.result ?? [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useStartTest = () => {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (testConfigId: string) => {
      const res = await instance.post<ApiResponse<TestSessionStartData>>(
        `${API_BASE}/start?testConfigId=${encodeURIComponent(testConfigId)}`
      );
      return res.data.result;
    },
    onSuccess: (data) => {
      if (data && data.sessionId) {
        qc.setQueryData(["testSession", data.sessionId], data);
      }
    }
  });

  return {
    // Sửa tên tham số
    startTest: (testConfigId: string) => mutation.mutateAsync(testConfigId),
    isStarting: mutation.isPending,
    error: mutation.error,
  };
};

// Hook này không dùng trong màn hình nhưng vẫn để lại cho đầy đủ
// export const useTestSession = (sessionId: string | null) => {
// ...
// };

export const useSubmitTest = () => {
  const qc = useQueryClient();

  const mutation = useMutation({
    // Giả định userId được đính kèm tự động
    mutationFn: async ({ sessionId, answers }: { sessionId: string; answers: Record<string, number> }) => {
      const res = await instance.post<ApiResponse<TestResult>>(`${API_BASE}/sessions/${sessionId}/submit`, { answers });
      return res.data.result!;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["testSession", vars.sessionId] });
      qc.invalidateQueries({ queryKey: ["currentUser"] }); // Cập nhật profile (exp/level)
    },
  });

  return {
    submitTest: (sessionId: string, answers: Record<string, number>) => mutation.mutateAsync({ sessionId, answers }),
    isSubmitting: mutation.isPending,
    error: mutation.error,
  };
};

export default {
  useAvailableTests,
  useStartTest,
  //   useTestSession,
  useSubmitTest,
};