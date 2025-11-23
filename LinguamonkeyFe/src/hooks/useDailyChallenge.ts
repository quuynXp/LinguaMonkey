import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { AppApiResponse, UserDailyChallengeResponse } from "../types/dto";

// --- Query Keys Factory ---
export const dailyChallengeKeys = {
  all: ["dailyChallenges"] as const,
  byUser: (userId: string) => [...dailyChallengeKeys.all, userId] as const,
};

// ==========================================
// === HOOKS ===
// ==========================================

// 1. GET /api/v1/daily-challenges/today
// Response: List<UserDailyChallengeResponse>
export function useDailyChallenges(userId?: string) {
  return useQuery({
    queryKey: dailyChallengeKeys.byUser(userId!),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const { data } = await instance.get<AppApiResponse<UserDailyChallengeResponse[]>>(
        "/api/v1/daily-challenges/today",
        {
          params: { userId },
        }
      );
      return data.result || [];
    },
    enabled: !!userId,
  });
}

// 2. POST /api/v1/daily-challenges/assign
// Response: UserDailyChallengeResponse
export function useAssignChallenge() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await instance.post<AppApiResponse<UserDailyChallengeResponse>>(
        "/api/v1/daily-challenges/assign",
        null,
        {
          params: { userId },
        }
      );
      return data.result!;
    },
    onSuccess: (_, userId) => {
      // Invalidate list to show new challenge
      queryClient.invalidateQueries({ queryKey: dailyChallengeKeys.byUser(userId) });
    },
  });

  return {
    assignChallenge: mutation.mutateAsync,
    isAssigning: mutation.isPending,
    error: mutation.error,
  };
}

// 3. POST /api/v1/daily-challenges/complete/{challengeId}
// Response: Void
export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, challengeId }: { userId: string; challengeId: string }) => {
      const { data } = await instance.post<AppApiResponse<void>>(
        `/api/v1/daily-challenges/complete/${challengeId}`,
        null,
        {
          params: { userId },
        }
      );
      return data.result;
    },
    onSuccess: (_, vars) => {
      // Invalidate list to update status/progress
      queryClient.invalidateQueries({ queryKey: dailyChallengeKeys.byUser(vars.userId) });
    },
  });

  return {
    completeChallenge: mutation.mutateAsync,
    isCompleting: mutation.isPending,
    error: mutation.error,
  };
}