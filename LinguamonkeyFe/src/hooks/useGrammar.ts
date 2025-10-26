import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { GrammarRule, GrammarTopic, SubmitExerciseResponse } from "../types/api";

export const useGrammar = () => {
  const queryClient = useQueryClient();

  const useGrammarTopics = () =>
    useQuery<GrammarTopic[]>({
      queryKey: ["grammarTopics"],
      queryFn: async () => {
        const res = await instance.get("/grammar/topics");
        return res.data?.result ?? [];
      },
      staleTime: 60_000,
    });

  const useGrammarTopic = (topicId: string | null) =>
    useQuery<GrammarTopic | null>({
      queryKey: ["grammarTopic", topicId],
      queryFn: async () => {
        if (!topicId) return null;
        const res = await instance.get(`/grammar/topics/${topicId}`);
        return res.data?.result ?? null;
      },
      enabled: !!topicId,
      staleTime: 60_000,
    });

  const useGrammarRule = (ruleId: string | null) =>
    useQuery<GrammarRule | null>({
      queryKey: ["grammarRule", ruleId],
      queryFn: async () => {
        if (!ruleId) return null;
        const res = await instance.get(`/grammar/rules/${ruleId}`);
        return res.data?.result ?? null;
      },
      enabled: !!ruleId,
      staleTime: 60_000,
    });

  // submit exercise: expects body { ruleId, userId, answers }
  const useSubmitGrammarExercise = () =>
    useMutation({
      mutationFn: async (payload: { ruleId: string; userId: string; answers: Record<string, string> }) => {
        const res = await instance.post("/grammar/exercises/submit", payload);
        return res.data?.result as SubmitExerciseResponse;
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["grammarTopics"] });
        queryClient.invalidateQueries({ queryKey: ["grammarRule", variables.ruleId] });
        queryClient.invalidateQueries({ queryKey: ["grammarTopic", variables.ruleId] });
      },
    });

  const useUpdateGrammarProgress = () =>
    useMutation({
      mutationFn: async (payload: { topicId: string; ruleId: string; userId: string; score: number }) => {
        const res = await instance.post("/grammar/progress", payload);
        return res.data?.result;
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["grammarTopics"] });
        queryClient.invalidateQueries({ queryKey: ["grammarTopic", variables.topicId] });
      },
    });

  return {
    useGrammarTopics,
    useGrammarTopic,
    useGrammarRule,
    useSubmitGrammarExercise,
    useUpdateGrammarProgress,
  };
};

export default useGrammar;
