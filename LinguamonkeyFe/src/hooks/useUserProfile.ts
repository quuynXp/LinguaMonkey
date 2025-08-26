import { useQuery } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type { UserProfile } from "../types/api";


export const useUserProfile = () => {
  const { userId, setProfile } = useUserStore();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const res = await instance.get(`/api/user/${userId}`);
      return res.data;
    },
    enabled: !!userId,
    onSuccess: (data) => setProfile(data),
  });

  return {
    profile: data,
    isLoading,
    isError: error,
    refetch,
  };
};
