// hooks/useLeaderboards.ts
import { useQuery } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { Leaderboard, LeaderboardEntry } from "../types/api";

export const useLeaderboards = () => {
  const useLeaderboards = (params?: { period?: string; tab?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append("period", params.period);
    if (params?.tab) queryParams.append("tab", params.tab);
    if (params?.page !== undefined) queryParams.append("page", String(params.page));
    if (params?.limit !== undefined) queryParams.append("limit", String(params.limit));

    const url = `/api/v1/leaderboards${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    return useQuery<Leaderboard[]>({
      queryKey: ["leaderboards", params],
      queryFn: async () => {
        const res = await instance.get(url);
        return res.data.result;
      },
    });
  };

  const useLeaderboard = (leaderboardId: string | null) =>
    useQuery<Leaderboard>({
      queryKey: ["leaderboard", leaderboardId],
      queryFn: async () => {
        if (!leaderboardId) throw new Error("Invalid leaderboardId");
        const res = await instance.get(`/api/v1/leaderboards/${leaderboardId}`);
        return res.data.result;
      },
      enabled: !!leaderboardId,
    });

  // IMPORTANT: only fetch entries when leaderboardId exists
  const useLeaderboardEntries = (
    leaderboardId: string | null,
    params?: { page?: number; limit?: number; sort?: string | string[] }
  ) => {
    const queryParams = new URLSearchParams();
    // leaderboardId MUST be provided
    if (leaderboardId) queryParams.append("leaderboardId", leaderboardId);
    if (params?.page !== undefined) queryParams.append("page", String(params.page));
    if (params?.limit !== undefined) queryParams.append("size", String(params.limit));

    if (params?.sort) {
      if (Array.isArray(params.sort)) {
        params.sort.forEach((s) => queryParams.append("sort", s));
      } else {
        queryParams.append("sort", params.sort);
      }
    }

    const url = `/api/v1/leaderboard-entries?${queryParams.toString()}`;

    return useQuery<LeaderboardEntry[]>({
      queryKey: ["leaderboardEntries", leaderboardId, params],
      queryFn: async () => {
        if (!leaderboardId) return []; // defensive, but enabled will be false anyway
        const res = await instance.get(url);
        return res.data.result;
      },
      enabled: !!leaderboardId, // <-- CRITICAL: only run when we have an id
    });
  };

  const useUserLeaderboardPosition = (leaderboardId: string | null) =>
    useQuery<LeaderboardEntry>({
      queryKey: ["userLeaderboardPosition", leaderboardId],
      queryFn: async () => {
        if (!leaderboardId) throw new Error("Invalid leaderboardId");
        const res = await instance.get(`/api/v1/leaderboards/${leaderboardId}/user-position`);
        return res.data.result;
      },
      enabled: !!leaderboardId,
    });

  return { useLeaderboards, useLeaderboard, useLeaderboardEntries, useUserLeaderboardPosition };
};
