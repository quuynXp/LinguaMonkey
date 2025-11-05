import { useQuery, useMutation } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { queryClient } from "../services/queryClient";
import { DailDayChallenge, UserDailyChallenge } from "../types/api";

const DAILY_CHALLENGES_KEY = ["dailyChallenges"];

export function useDailyChallenges(userId: string) {
  return useQuery<UserDailyChallenge[]>({
    queryKey: [...DAILY_CHALLENGES_KEY, userId],
    queryFn: async () => {
      const res = await instance.get(`/api/v1/daily-challenges/today`, {
        params: { userId },
      });
      return res.data.result;
    },
    enabled: !!userId,
  });
}

export function useAssignChallenge(userId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await instance.post(`/api/v1/daily-challenges/assign`, null, {
        params: { userId },
      });
      return res.data.result as UserDailyChallenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey : [...DAILY_CHALLENGES_KEY, userId]} );
    },
  });
}

export function useCompleteChallenge(userId: string) {
  return useMutation({
    mutationFn: async (challengeId: string) => {
      await instance.post(`/api/v1/daily-challenges/complete/${challengeId}`, null, {
        params: { userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey : [...DAILY_CHALLENGES_KEY, userId] });
    },
  });
}
