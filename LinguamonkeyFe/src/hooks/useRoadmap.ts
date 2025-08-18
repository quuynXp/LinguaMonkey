import { mutate } from "swr"
import type { LearningRoadmap, RoadmapItemDetail, UserGoal } from "../types/api"
import { useApiGet, useApiPost, useApiPut } from "./useApi"

export const useRoadmap = () => {
  // Get user's learning roadmap
  const useUserRoadmap = (languageCode?: string) => {
    const endpoint = languageCode 
      ? `/user/roadmap?language=${languageCode}` 
      : "/user/roadmap"
    return useApiGet<LearningRoadmap>(endpoint)
  }

  // Get roadmap item details
  const useRoadmapItemDetail = (itemId: string | null) => {
    return useApiGet<RoadmapItemDetail>(
      itemId ? `/roadmap/items/${itemId}` : null
    )
  }

  // Get user goals
  const useUserGoals = () => {
    return useApiGet<UserGoal[]>("/user/goals")
  }

  // Create new user goal
  const useCreateGoal = () => {
    const { trigger, isMutating } = useApiPost<UserGoal>("/user/goals")

    const createGoal = async (goalData: Partial<UserGoal>) => {
      try {
        const result = await trigger(goalData)
        // Revalidate goals and roadmap
        mutate("/user/goals")
        mutate("/user/roadmap")
        return result
      } catch (error) {
        throw error
      }
    }

    return { createGoal, isCreating: isMutating }
  }

  // Update user goal
  const useUpdateGoal = () => {
    const { trigger, isMutating } = useApiPut<UserGoal>("/user/goals")

    const updateGoal = async (goalId: string, goalData: Partial<UserGoal>) => {
      try {
        const result = await trigger({ goal_id: goalId, ...goalData })
        // Revalidate goals and roadmap
        mutate("/user/goals")
        mutate("/user/roadmap")
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateGoal, isUpdating: isMutating }
  }

  // Start roadmap item
  const useStartRoadmapItem = () => {
    const { trigger, isMutating } = useApiPost<{ success: boolean }>("/roadmap/items/start")

    const startItem = async (itemId: string) => {
      try {
        const result = await trigger({ item_id: itemId })
        // Revalidate roadmap
        mutate("/user/roadmap")
        mutate(`/roadmap/items/${itemId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { startItem, isStarting: isMutating }
  }

  // Complete roadmap item
  const useCompleteRoadmapItem = () => {
    const { trigger, isMutating } = useApiPost<{ success: boolean }>("/roadmap/items/complete")

    const completeItem = async (itemId: string, score?: number) => {
      try {
        const result = await trigger({ item_id: itemId, score })
        // Revalidate roadmap
        mutate("/user/roadmap")
        mutate(`/roadmap/items/${itemId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { completeItem, isCompleting: isMutating }
  }

  // Generate personalized roadmap
  const useGenerateRoadmap = () => {
    const { trigger, isMutating } = useApiPost<LearningRoadmap>("/roadmap/generate")

    const generateRoadmap = async (preferences: {
      language_code: string
      target_proficiency: string
      target_date?: string
      focus_areas?: string[]
      study_time_per_day?: number
    }) => {
      try {
        const result = await trigger(preferences)
        // Revalidate roadmap
        mutate("/user/roadmap")
        return result
      } catch (error) {
        throw error
      }
    }

    return { generateRoadmap, isGenerating: isMutating }
  }

  return {
    useUserRoadmap,
    useRoadmapItemDetail,
    useUserGoals,
    useCreateGoal,
    useUpdateGoal,
    useStartRoadmapItem,
    useCompleteRoadmapItem,
    useGenerateRoadmap,
  }
}
