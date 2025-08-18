import useSWR from 'swr';
import axiosInstance from '../libs/axios';

const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

export const useSWRFetcher = (key: string) => {
  const { data, error } = useSWR(key, fetcher);
  return { data, error, isLoading: !data && !error };
};