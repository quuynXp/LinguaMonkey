import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse } from "../types/api"

interface UserProfile {
  id: string
  name: string
  email: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
  country: string
  bio: string
  character: {
    id: string
    name: string
    type: string
    emoji: string
    level: number
    experience: number
    maxExperience: number
    totalExperience: number
  }
  couple: {
    isInCouple: boolean
    partnerName?: string
    partnerCharacter?: any
    coupleLevel?: number
    coupleExperience?: number
    relationshipStartDate?: Date
  }
  stats: {
    totalLessons: number
    totalTime: number
    currentStreak: number
    maxStreak: number
    totalPoints: number
  }
  achievements: Array<{
    id: string
    name: string
    description: string
    icon: string
    color: string
    unlockedAt: Date
  }>
  preferences: {
    notifications: boolean
    soundEffects: boolean
    darkMode: boolean
  }
}

export const useProfile = (userId?: string) => {
  const queryClient = useQueryClient()

  const query = useQuery<UserProfile>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const response = await instance.get<ApiResponse<UserProfile>>(`/api/v1/users/${userId}/profile`)
      return response.data.result!
    },
    enabled: !!userId,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      const response = await instance.put<ApiResponse<UserProfile>>(`/api/v1/users/${userId}/profile`, profileData)
      return response.data.result!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] })
    },
  })

  return {
    ...query,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  }
}
