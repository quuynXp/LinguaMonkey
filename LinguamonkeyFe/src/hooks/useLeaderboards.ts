import type { Leaderboard, LeaderboardEntry } from "../types/api"
import { useApiGet } from "./useApi"

export const useLeaderboards = () => {
  // Get leaderboards
  const useLeaderboards = (params?: {
    period?: string
    tab?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append("period", params.period)
    if (params?.tab) queryParams.append("tab", params.tab)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = `/leaderboards${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    return useApiGet<Leaderboard[]>(url)
  }

  // Get leaderboard by ID
  const useLeaderboard = (leaderboardId: string | null) => {
    return useApiGet<Leaderboard>(leaderboardId ? `/leaderboards/${leaderboardId}` : null)
  }

  // Get leaderboard entries
  const useLeaderboardEntries = (leaderboardId: string | null, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = leaderboardId
      ? `/leaderboards/${leaderboardId}/entries${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      : null

    return useApiGet<LeaderboardEntry[]>(url)
  }

  // Get user's leaderboard position
  const useUserLeaderboardPosition = (leaderboardId: string | null) => {
    return useApiGet<LeaderboardEntry>(
      leaderboardId ? `/leaderboards/${leaderboardId}/user-position` : null,
    )
  }

  return {
    useLeaderboards,
    useLeaderboard,
    useLeaderboardEntries,
    useUserLeaderboardPosition,
  }
}
