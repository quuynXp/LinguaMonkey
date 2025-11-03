import { useEffect, useState } from 'react';
import axiosIntansce from '../api/axiosInstance';

const useTopThreeUsers = () => {
  const [topThreeUsers, setTopThreeUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchTopThreeUsers = async () => {
      setIsLoading(true);
      try {
        const response = await axiosIntansce.get('/api/v1/leaderboards/global/top-3');
        setTopThreeUsers(response.data.result);
        console.log("Data result top3", response.data.result)
        setIsError(false);
      } catch (error) {
        console.error('Error fetching top 3 global users:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopThreeUsers();
  }, []);

  return { topThreeUsers, isLoading, isError };
};

export default useTopThreeUsers;