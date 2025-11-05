import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { GrammarRule, GrammarTopic, SubmitExerciseResponse, MindMapNode } from "../types/api";

export const useGrammar = () => {
  const queryClient = useQueryClient();

  const useGrammarTopics = () =>
    useQuery<GrammarTopic[]>({
      queryKey: ["grammarTopics"],
      queryFn: async () => {
        const res = await instance.get("/api/v1/grammar/topics");
        return res.data?.result ?? [];
      },
      staleTime: 60_000,
    });

  const useGrammarTopic = (topicId: string | null) =>
    useQuery<GrammarTopic | null>({
      queryKey: ["grammarTopic", topicId],
      queryFn: async () => {
        if (!topicId) return null;
        const res = await instance.get(`/api/v1/grammar/topics/${topicId}`);
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
        const res = await instance.get(`/api/v1/grammar/rules/${ruleId}`);
        return res.data?.result ?? null;
      },
      enabled: !!ruleId,
      staleTime: 60_000,
    });

  // New: Fetch grammar mindmap (hierarchical structure like roadmap)
  const useGrammarMindmap = () =>
    useQuery<MindMapNode[]>({
      queryKey: ["grammarMindmap"],
      queryFn: async () => {
        const res = await instance.get("/api/v1/grammar/mindmap");
        return res.data?.result ?? [];
      },
      staleTime: 300_000, // Longer stale time for static-like structure
    });

  const useSubmitGrammarExercise = () =>
    useMutation({
      mutationFn: async (payload: { ruleId: string; userId: string; answers: Record<string, string> }) => {
        const res = await instance.post("/api/v1/grammar/exercises/submit", payload);
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
        const res = await instance.post("/api/v1/grammar/progress", payload);
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
    useGrammarMindmap, 
    useSubmitGrammarExercise,
    useUpdateGrammarProgress,
  };
};

export default useGrammar;