import { useQuery } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { Leaderboard, LeaderboardEntry } from "../types/api"

export const useLeaderboards = () => {
  // Get leaderboards
  const useLeaderboards = (params?: { period?: string; tab?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append("period", params.period)
    if (params?.tab) queryParams.append("tab", params.tab)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = `/leaderboards${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    return useQuery<Leaderboard[]>({
      queryKey: ["leaderboards", params],
      queryFn: async () => {
        const res = await instance.get(url)
        return res.data
      },
    })
  }

  // Get leaderboard by ID
  const useLeaderboard = (leaderboardId: string | null) =>
    useQuery<Leaderboard>({
      queryKey: ["leaderboard", leaderboardId],
      queryFn: async () => {
        if (!leaderboardId) throw new Error("Invalid leaderboardId")
        const res = await instance.get(`/leaderboards/${leaderboardId}`)
        return res.data
      },
      enabled: !!leaderboardId,
    })

  // Get leaderboard entries
  const useLeaderboardEntries = (leaderboardId: string | null, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = leaderboardId
      ? `/leaderboards/${leaderboardId}/entries${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      : null

    return useQuery<LeaderboardEntry[]>({
      queryKey: ["leaderboardEntries", leaderboardId, params],
      queryFn: async () => {
        if (!url) throw new Error("Invalid leaderboardId")
        const res = await instance.get(url)
        return res.data
      },
      enabled: !!leaderboardId,
    })
  }

  // Get user's leaderboard position
  const useUserLeaderboardPosition = (leaderboardId: string | null) =>
    useQuery<LeaderboardEntry>({
      queryKey: ["userLeaderboardPosition", leaderboardId],
      queryFn: async () => {
        if (!leaderboardId) throw new Error("Invalid leaderboardId")
        const res = await instance.get(`/leaderboards/${leaderboardId}/user-position`)
        return res.data
      },
      enabled: !!leaderboardId,
    })

  return { useLeaderboards, useLeaderboard, useLeaderboardEntries, useUserLeaderboardPosition }
}
