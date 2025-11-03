import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse, User, RegisterResult } from "../types/api";

export const useUser = (id?: string) =>
  useQuery<any>({ 
    queryKey: ["user", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");
      const res = await instance.get<ApiResponse<User>>(`/api/v1/users/${id}`);
      // backend uses { code, message, result }
      return (res.data as any)?.result ?? (res.data as any);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useUserAchievements = (id?: string) =>
  useQuery<any[]>({
    queryKey: ["user", id, "achievements"],
    queryFn: async () => {
      if (!id) return [];
      const res = await instance.get(`/api/v1/users/${id}/achievements`);
      return (res.data as any)?.result ?? res.data ?? [];
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

export const useUserLearningActivities = (id?: string, timeframe: "week" | "month" | "year" = "month") =>
  useQuery<any[]>({
    queryKey: ["user", id, "activities", timeframe],
    queryFn: async () => {
      if (!id) return [];
      const res = await instance.get(`/api/v1/users/${id}/learning-activities`, { params: { timeframe } });
      return (res.data as any)?.result ?? res.data ?? [];
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

export const useSendFriendRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { currentUserId?: string; targetUserId: string } | string) => {
      const target =
        typeof payload === "string" ? payload : (payload as any).targetUserId || (payload as any).requestedId;
      const res = await instance.post(`/api/v1/friendships`, { requestedUserId: target });
      return (res.data as any)?.result ?? res.data;
    },
    onSuccess: (_, payload) => {
      const targetId = typeof payload === "string" ? payload : (payload as any).targetUserId;
      qc.invalidateQueries({ queryKey: ["user", targetId] });
      qc.invalidateQueries({ queryKey: ["user", targetId, "achievements"] });
      qc.invalidateQueries({ queryKey: ["user", targetId, "activities"] });
      qc.invalidateQueries({ queryKey: ["friendship", "request-status"] });
    },
  });
};


export const useAcceptFriendRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { currentUserId: string; otherUserId: string }) => {
      const { currentUserId, otherUserId } = payload;
      // adjust endpoint if your backend uses different path
      const res = await instance.put(`/api/v1/friendships/${currentUserId}/${otherUserId}`, { status: "ACCEPTED" });
      return (res.data as any)?.result ?? res.data;
    },
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["user", (payload as any).otherUserId] });
      qc.invalidateQueries({ queryKey: ["user", (payload as any).currentUserId] });
      qc.invalidateQueries({ queryKey: ["friendship", "request-status"] });
    },
  });
};

export const useFriendRequestStatus = (currentUserId?: string, otherUserId?: string) =>
  useQuery<any | null>({
    queryKey: ["friendship", "request-status", currentUserId, otherUserId],
    queryFn: async () => {
      if (!currentUserId || !otherUserId) return null;
      const res = await instance.get(`/api/v1/friendships/request-status`, {
        params: { currentUserId, otherUserId },
      });
      return (res.data as any)?.result ?? res.data ?? null;
    },
    enabled: !!currentUserId && !!otherUserId,
    staleTime: 30 * 1000,
  });

export const useCheckIfFriends = (user1Id?: string, user2Id?: string) =>
  useQuery<boolean>({
    queryKey: ["friendship", "check", user1Id, user2Id],
    queryFn: async () => {
      if (!user1Id || !user2Id) return false;
      const res = await instance.get(`/api/v1/friendships/check`, { params: { user1Id, user2Id } });
      return ((res.data as any)?.result ?? res.data) as boolean;
    },
    enabled: !!user1Id && !!user2Id,
    staleTime: 30 * 1000,
  });

export const useUsers = () => ({
  useUser,
  useUserAchievements,
  useUserLearningActivities,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useFriendRequestStatus,
  useCheckIfFriends,
  useUserLevelInfo: (id?: string) =>
    useQuery<any>({
      queryKey: ["userLevelInfo", id],
      queryFn: async () => {
        if (!id) throw new Error("User ID is required");
        const res = await instance.get(`/api/v1/users/${id}/level-info`);
        return (res.data as any)?.result ?? res.data;
      },
      enabled: !!id,
    }),
});
