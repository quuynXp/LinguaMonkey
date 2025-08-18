import axios from 'axios'
import useSWR from 'swr'
import { useUserStore } from '../stores/UserStore'

const fetcher = (url: string) => axios.get(url).then(res => res.data)

export const useUserProfile = () => {
  const { userId, setProfile } = useUserStore()

  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/user/${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      onSuccess: (data) => {
        setProfile(data)
      }
    }
  )

  return {
    profile: data,
    isLoading,
    isError: error,
    mutate
  }
}
