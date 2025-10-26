// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
// import instance from "../api/axiosInstance"
// import type { GrammarRule, GrammarTopic } from "../types/api"

// export const useGrammar = () => {
//   const queryClient = useQueryClient()

//   // Get all topics
//   const useGrammarTopics = () =>
//     useQuery<GrammarTopic[]>({
//       queryKey: ["grammarTopics"],
//       queryFn: async () => {
//         const res = await instance.get("/grammar/topics")
//         return res.data
//       },
//     })

//   // Get topic by ID
//   const useGrammarTopic = (topicId: string | null) =>
//     useQuery<GrammarTopic>({
//       queryKey: ["grammarTopic", topicId],
//       queryFn: async () => {
//         if (!topicId) throw new Error("Invalid topicId")
//         const res = await instance.get(`/grammar/topics/${topicId}`)
//         return res.data
//       },
//       enabled: !!topicId,
//     })

//   // Get rule by ID
//   const useGrammarRule = (ruleId: string | null) =>
//     useQuery<GrammarRule>({
//       queryKey: ["grammarRule", ruleId],
//       queryFn: async () => {
//         if (!ruleId) throw new Error("Invalid ruleId")
//         const res = await instance.get(`/grammar/rules/${ruleId}`)
//         return res.data
//       },
//       enabled: !!ruleId,
//     })

//   // Submit grammar exercise
//   const useSubmitGrammarExercise = () =>
//     useMutation({
//       mutationFn: async ({ ruleId, answers }: { ruleId: string; answers: Record<string, string> }) => {
//         const res = await instance.post("/grammar/exercises/submit", { ruleId, answers })
//         return res.data
//       },
//       onSuccess: (data, variables) => {
//         queryClient.invalidateQueries({ queryKey: ["grammarTopics"] })
//         queryClient.invalidateQueries({ queryKey: ["grammarRule", variables.ruleId] })
//       },
//     })

//   // Update progress
//   const useUpdateGrammarProgress = () =>
//     useMutation({
//       mutationFn: async ({ topicId, ruleId, score }: { topicId: string; ruleId: string; score: number }) => {
//         const res = await instance.post("/grammar/progress", { topicId, ruleId, score })
//         return res.data
//       },
//       onSuccess: (data, variables) => {
//         queryClient.invalidateQueries({ queryKey: ["grammarTopics"] })
//         queryClient.invalidateQueries({ queryKey: ["grammarTopic", variables.topicId] })
//       },
//     })

//   return {
//     useGrammarTopics,
//     useGrammarTopic,
//     useGrammarRule,
//     useSubmitGrammarExercise,
//     useUpdateGrammarProgress,
//   }
// }
