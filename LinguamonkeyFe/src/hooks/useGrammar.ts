import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  GrammarTopicResponse,
  GrammarRuleResponse,
  // GrammarLessonResponse, // Controller does NOT have getLessonById currently exposed properly or DTO usage is tricky, using generic if needed or skipping
  SubmitExerciseResponse,
  MindMapNode,
  SubmitExerciseRequest,
  UpdateGrammarProgressRequest
} from "../types/dto";

// --- Keys Factory ---
export const grammarKeys = {
  all: ["grammar"] as const,
  topics: () => [...grammarKeys.all, "topics"] as const,
  // key cho chi tiết cá nhân (bao gồm progress)
  topicDetails: (id: string, userId: string | undefined) => [...grammarKeys.topics(), id, "details", { userId }] as const,
  rules: () => [...grammarKeys.all, "rules"] as const,
  // key cho chi tiết rule (bao gồm exercises)
  ruleDetails: (id: string) => [...grammarKeys.rules(), id, "details"] as const,
  mindmap: () => [...grammarKeys.all, "mindmap"] as const,
};

export const useGrammar = () => {
  const queryClient = useQueryClient();

  // 1. GET /api/v1/grammar/topics
  const useGrammarTopics = () => useQuery({
    queryKey: grammarKeys.topics(),
    queryFn: async () => {
      const { data } = await instance.get<AppApiResponse<GrammarTopicResponse[]>>(
        "/api/v1/grammar/topics"
      );
      return data.result ?? [];
    },
    staleTime: 60_000,
  });

  // 2. GET /api/v1/grammar/topics/{topicId}/details?userId=...
  // Hook này bây giờ chỉ gọi endpoint chi tiết (có progress)
  const useGrammarTopic = (topicId: string | null, userId?: string) => useQuery({
    queryKey: grammarKeys.topicDetails(topicId!, userId),
    queryFn: async () => {
      if (!topicId) throw new Error("Topic ID required");
      // Dùng endpoint mới /topics/{topicId}/details để lấy progress cá nhân
      const url = `/api/v1/grammar/topics/${topicId}/details`;
      const params = userId ? { userId } : {};

      const { data } = await instance.get<AppApiResponse<GrammarTopicResponse>>(
        url,
        { params }
      );
      return data.result!;
    },
    enabled: !!topicId,
    staleTime: 60_000,
  });

  // 3. GET /api/v1/grammar/rules/{ruleId}/details
  // Hook này gọi endpoint chi tiết (có exercises)
  const useGrammarRule = (ruleId: string | null) => useQuery({
    queryKey: grammarKeys.ruleDetails(ruleId!),
    queryFn: async () => {
      if (!ruleId) throw new Error("Rule ID required");
      // Dùng endpoint mới /rules/{ruleId}/details
      const { data } = await instance.get<AppApiResponse<GrammarRuleResponse>>(
        `/api/v1/grammar/rules/${ruleId}/details`
      );
      return data.result!;
    },
    enabled: !!ruleId,
    staleTime: 60_000,
  });

  // 4. GET /api/v1/grammar/mindmap
  const useGrammarMindmap = () => useQuery({
    queryKey: grammarKeys.mindmap(),
    queryFn: async () => {
      const { data } = await instance.get<AppApiResponse<MindMapNode[]>>(
        "/api/v1/grammar/mindmap"
      );
      return data.result ?? [];
    },
    staleTime: 5 * 60_000, // Cache 5 mins
  });

  // 5. POST /api/v1/grammar/exercises/submit
  const useSubmitGrammarExercise = () => {
    const mutation = useMutation({
      mutationFn: async (payload: SubmitExerciseRequest) => {
        const { data } = await instance.post<AppApiResponse<SubmitExerciseResponse>>(
          "/api/v1/grammar/exercises/submit",
          payload
        );
        return data.result!;
      },
      onSuccess: (_, variables) => {
        // Refresh Rule details (để hiển thị điểm số/progress mới)
        if (variables.ruleId) {
          queryClient.invalidateQueries({ queryKey: grammarKeys.ruleDetails(variables.ruleId) });
        }
        // Refresh Topic (để hiển thị danh sách rules với status mới)
        // Cần biết Topic ID của Rule này để invalidate chính xác,
        // nhưng hiện tại chỉ invalidate tất cả topics.
        queryClient.invalidateQueries({ queryKey: grammarKeys.topics() });
      },
    });

    return {
      submitExercise: mutation.mutateAsync,
      isSubmitting: mutation.isPending,
      error: mutation.error
    };
  };

  // 6. POST /api/v1/grammar/progress
  const useUpdateGrammarProgress = () => {
    const mutation = useMutation({
      mutationFn: async (payload: UpdateGrammarProgressRequest) => {
        const { data } = await instance.post<AppApiResponse<void>>(
          "/api/v1/grammar/progress",
          payload
        );
        return data.result;
      },
      onSuccess: (_, variables) => {
        // Invalidate key Topic Details sau khi update progress
        queryClient.invalidateQueries({ queryKey: grammarKeys.topicDetails(variables.topicId, variables.userId) });
        queryClient.invalidateQueries({ queryKey: grammarKeys.topics() });
      },
    });

    return {
      updateProgress: mutation.mutateAsync,
      isUpdating: mutation.isPending,
      error: mutation.error
    };
  };

  return {
    useGrammarTopics,
    useGrammarTopic,
    useGrammarRule,
    useGrammarMindmap,
    useSubmitGrammarExercise,
    useUpdateGrammarProgress,
  };
};

export default useGrammar;