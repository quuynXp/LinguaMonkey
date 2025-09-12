// hooks/useProgressStats.ts
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { LessonProgressResponse, LessonResponse, PaginatedResponse } from "../types/api";

type ProgressStats = {
  completedLessons: number;
  totalWords: number;
  timeSpent: number;
  xpEarned: number;
};

export const useProgressStats = (userId: string | undefined) => {
  const [progressStats, setProgressStats] = useState<ProgressStats>({
    completedLessons: 0,
    totalWords: 0,
    timeSpent: 0,
    xpEarned: 0,
  });
  const [lessonProgress, setLessonProgress] = useState<LessonProgressResponse[]>([]);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch lesson progress
        const progressResponse = await axiosInstance.get<PaginatedResponse<LessonProgressResponse>>(
          `/lesson-progress`,
          { params: { userId } }
        );
        const progressData = progressResponse.data.data;
        setLessonProgress(progressData);

        // Fetch all lessons
        const lessonsResponse = await axiosInstance.get<PaginatedResponse<LessonResponse>>(
          `/lessons`
        );
        const lessonsData = lessonsResponse.data.data;
        setLessons(lessonsData);

        // Tính toán progress stats
        const completedLessons = progressData.filter((p) => p.score >= 80 && !p.isDeleted).length;
        const totalWords = progressData.reduce((sum, p) => sum + (p.score || 0), 0); // Giả định score liên quan đến từ
        const timeSpent = lessonsData.length * 10; // Giả định mỗi lesson 10 phút
        const xpEarned = progressData.reduce((sum, p) => sum + (p.score || 0) * 10, 0); // Giả định XP

        setProgressStats({ completedLessons, totalWords, timeSpent, xpEarned });
      } catch (error) {
        console.error("Error fetching progress stats:", error);
      }
    };

    fetchData();
  }, [userId]);

  return { progressStats, lessonProgress, lessons };
};