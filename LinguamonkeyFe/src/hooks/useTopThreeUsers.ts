import { useQuery } from "@tanstack/react-query"
import axiosInstance from "../api/axiosInstance"
import { Leaderboard } from "../types/api"

interface LeaderboardResponse {
  result: Leaderboard[];
}

const fetchTopThreeUsers = async (): Promise<Leaderboard[]> => {
  const { data } = await axiosInstance.get<LeaderboardResponse>(
    `/leaderboards/top3?tab=top100&period=all`
  );
  return data.result; 
};


export default function useTopThreeUsers() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["topThreeUsers"],
    queryFn: fetchTopThreeUsers,
  });

  return {
    topThreeUsers: data || [],
    isLoading,
    isError,
  };
}
