import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { AppApiResponse, UserDailyChallengeResponse } from "../types/dto";

export const dailyChallengeKeys = {
  all: ["dailyChallenges"] as const,
  byUser: (userId: string) => [...dailyChallengeKeys.all, userId] as const,
};

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
    placeholderData: (previousData) => previousData,
  });
}

export function useClaimChallengeReward() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, challengeId }: { userId: string; challengeId: string }) => {
      const { data } = await instance.post<AppApiResponse<void>>(
        `/api/v1/daily-challenges/claim/${challengeId}`,
        null,
        {
          params: { userId },
        }
      );
      return data.result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: dailyChallengeKeys.byUser(vars.userId) });
      queryClient.invalidateQueries({ queryKey: ['userProfile', vars.userId] }); // Update coin/exp user
    },
  });

  return {
    claimReward: mutation.mutateAsync,
    isClaiming: mutation.isPending,
    error: mutation.error,
  };
}