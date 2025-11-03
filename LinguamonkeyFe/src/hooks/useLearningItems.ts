import { useEffect, useState } from 'react';
import { BasicLessonResponse } from '../types/api';
import instance from '../api/axiosInstance';

export const useLearningItems = (
  languageCode: 'en' | 'zh' | 'vi',
  lessonType: string
) => {
  const [items, setItems] = useState<BasicLessonResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await instance.get(`/api/v1/basic-lessons`, {
        params: {
          languageCode,
          lessonType,
        },
      });
      setItems(res.data.result.content ?? res.data.result); // handle pageable or single
    } catch (err: any) {
      setError(err.message || 'Failed to fetch learning items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [languageCode, lessonType]);

  return { items, loading, error, refetch: fetchItems };
};
