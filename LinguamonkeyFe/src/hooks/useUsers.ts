import { mutate } from "swr"
import type { Friendship, User, UserLearningActivity, UserProfile } from "../types/api"
import { useApiGet, useApiPost, useApiPut } from "./useApi"

export const useUsers = () => {
  // Get current user profile
  const useCurrentUser = () => {
    return useApiGet<UserProfile>("/user/profile")
  }

  // Get user profile by ID
  const useUserProfile = (userId: string | null) => {
    return useApiGet<UserProfile>(userId ? `/users/${userId}` : null)
  }

  // Get user learning activities (effort map)
  const useUserLearningActivities = (
    userId: string | null,
    timeframe: "week" | "month" | "year" = "month",
  ) => {
    return useApiGet<UserLearningActivity[]>(
      userId ? `/users/${userId}/learning-activities?timeframe=${timeframe}` : null,
    )
  }

  // Get user friendships
  const useUserFriends = () => {
    return useApiGet<Friendship[]>("/user/friends")
  }

  // Get friend requests
  const useFriendRequests = () => {
    return useApiGet<Friendship[]>("/user/friend-requests")
  }

  // Send friend request
  const useSendFriendRequest = () => {
    const { trigger, isMutating } = useApiPost<{ success: boolean }>("/user/friend-requests")

    const sendRequest = async (userId: string) => {
      try {
        const result = await trigger({ user_id: userId })
        // Revalidate friend requests
        mutate("/user/friend-requests")
        mutate(`/users/${userId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { sendRequest, isSending: isMutating }
  }

  // Accept friend request
  const useAcceptFriendRequest = () => {
    const { trigger, isMutating } = useApiPut<{ success: boolean }>("/user/friend-requests/accept")

    const acceptRequest = async (user1Id: string, user2Id: string) => {
      try {
        const result = await trigger({ user1_id: user1Id, user2_id: user2Id })
        // Revalidate friends data
        mutate("/user/friends")
        mutate("/user/friend-requests")
        return result
      } catch (error) {
        throw error
      }
    }

    return { acceptRequest, isAccepting: isMutating }
  }

  // Reject friend request
  const useRejectFriendRequest = () => {
    const { trigger, isMutating } = useApiPut<{ success: boolean }>("/user/friend-requests/reject")

    const rejectRequest = async (user1Id: string, user2Id: string) => {
      try {
        const result = await trigger({ user1_id: user1Id, user2_id: user2Id })
        // Revalidate friend requests
        mutate("/user/friend-requests")
        return result
      } catch (error) {
        throw error
      }
    }

    return { rejectRequest, isRejecting: isMutating }
  }

  // Search users
  const useSearchUsers = (query: string | null) => {
    return useApiGet<User[]>(query ? `/users/search?q=${encodeURIComponent(query)}` : null)
  }

  // Update user profile
  const useUpdateProfile = () => {
    const { trigger, isMutating } = useApiPut<UserProfile>("/user/profile")

    const updateProfile = async (profileData: Partial<User>) => {
      try {
        const result = await trigger(profileData)
        // Revalidate profile data
        mutate("/user/profile")
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateProfile, isUpdating: isMutating }
  }

  return {
    useCurrentUser,
    useUserProfile,
    useUserLearningActivities,
    useUserFriends,
    useFriendRequests,
    useSendFriendRequest,
    useAcceptFriendRequest,
    useRejectFriendRequest,
    useSearchUsers,
    useUpdateProfile,
  }
}
