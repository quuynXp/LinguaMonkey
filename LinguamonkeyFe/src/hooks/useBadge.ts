import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import type { BadgeResponse, BadgeProgressResponse } from "../types/api";

export const useBadge = (badgeId?: string) => {
  const [badge, setBadge] = useState<BadgeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadge = useCallback(async () => {
    if (!badgeId) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await axiosInstance.get<{ result: BadgeResponse }>(
        `/api/v1/badges/${badgeId}`
      );
      setBadge(data.result);
    } catch (err) {
      console.error("❌ Failed to fetch badge:", err);
      setError("Failed to load badge information.");
    } finally {
      setLoading(false);
    }
  }, [badgeId]);

  useEffect(() => {
    fetchBadge();
  }, [fetchBadge]);

  return { badge, loading, error, refetch: fetchBadge };
};

export const useBadgeProgress = (userId?: string) => {
  const [progressList, setProgressList] = useState<BadgeProgressResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setProgressList([]);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data } = await axiosInstance.get<{ result: BadgeProgressResponse[] }>(
        `/api/v1/badges/user/${userId}/progress`
      );
      setProgressList(data.result || []);
    } catch (err) {
      console.error("❌ Failed to fetch badge progress:", err);
      setError("Failed to load badge progress.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progressList, loading, error, refetch: fetchProgress };
};
