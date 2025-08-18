import useSWR from "swr";
import { useProfileStore } from "../stores/UserStore";
import apiClient from "../api/axiosInstance";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const useProfile = () => {
  const { setProfile } = useProfileStore();
  const { data, error, isLoading, mutate } = useSWR("/profile/me", fetcher, {
    onSuccess: (data) => {
      setProfile(data);
    },
  });

  return {
    profile: data,
    isLoading,
    isError: error,
    refreshProfile: mutate,
  };
};
