import { mutate } from "swr"
import type { GrammarRule, GrammarTopic } from "../types/api"
import { useApiGet, useApiPost } from "./useApi"

export const useGrammar = () => {
  // Get all grammar topics
  const useGrammarTopics = () => {
    return useApiGet<GrammarTopic[]>("/grammar/topics")
  }

  // Get grammar topic by ID
  const useGrammarTopic = (topicId: string | null) => {
    return useApiGet<GrammarTopic>(topicId ? `/grammar/topics/${topicId}` : null)
  }

  // Get grammar rule by ID
  const useGrammarRule = (ruleId: string | null) => {
    return useApiGet<GrammarRule>(ruleId ? `/grammar/rules/${ruleId}` : null)
  }

  // Submit grammar exercise
  const useSubmitGrammarExercise = () => {
    const { trigger, isMutating } = useApiPost<{ score: number; results: any[] }>("/grammar/exercises/submit")

    const submitExercise = async (ruleId: string, answers: Record<string, string>) => {
      try {
        const result = await trigger({ ruleId, answers })
        // Revalidate grammar data
        mutate("/grammar/topics")
        mutate(`/grammar/rules/${ruleId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { submitExercise, isSubmitting: isMutating }
  }

  // Update grammar progress
  const useUpdateGrammarProgress = () => {
    const { trigger, isMutating } = useApiPost<{ success: boolean }>("/grammar/progress")

    const updateProgress = async (topicId: string, ruleId: string, score: number) => {
      try {
        const result = await trigger({ topicId, ruleId, score })
        // Revalidate grammar data
        mutate("/grammar/topics")
        mutate(`/grammar/topics/${topicId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateProgress, isUpdating: isMutating }
  }

  return {
    useGrammarTopics,
    useGrammarTopic,
    useGrammarRule,
    useSubmitGrammarExercise,
    useUpdateGrammarProgress,
  }
}
