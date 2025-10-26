// src/hooks/useBilinguaVideo.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type {
  ApiResponse,
  BilingualVideo,
  VideoSubtitle,
} from "../types/api";

/**
 * Hooks for Bilingual Video screen.
 * - Named exports so you can import { useVideos, useVideo, ... } from this file.
 * - All endpoints assume backend prefix: /api/v1/videos
 */

/* -------------------------
   useVideos
   returns: { data: BilingualVideo[], page, totalPages, totalElements }
------------------------- */
export const useVideos = (page = 0, size = 10, category?: string, level?: string) => {
  return useQuery({
    queryKey: ["videos", "bilingual", page, size, category, level],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));
      if (category) params.set("category", category);
      if (level) params.set("level", level);

      const res = await instance.get<ApiResponse<any>>(`/api/v1/videos/bilingual?${params.toString()}`);
      const pageResult = res.data.result;

      // Normalize to shape expected by component: { data: BilingualVideo[] }
      const content: BilingualVideo[] = pageResult?.content ?? [];
      return {
        data: content,
        page: pageResult?.number ?? page,
        totalPages: pageResult?.totalPages ?? 1,
        totalElements: pageResult?.totalElements ?? content.length,
      };
    },
    placeholderData: (previousData) => previousData,
  });
};

/* -------------------------
   useVideo
   returns BilingualVideo (detailed)
------------------------- */
export const useVideo = (videoId?: string | null) => {
  return useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const res = await instance.get<ApiResponse<BilingualVideo>>(`/api/v1/videos/${videoId}`);
      return res.data.result;
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 2,
  });
};

/* -------------------------
   useVideoCategories
------------------------- */
export const useVideoCategories = () => {
  return useQuery({
    queryKey: ["videoCategories"],
    queryFn: async () => {
      const res = await instance.get<ApiResponse<string[]>>(`/api/v1/videos/categories`);
      return res.data.result ?? [];
    },
  });
};

/* -------------------------
   useVideoSubtitles
   returns VideoSubtitle[]
------------------------- */
export const useVideoSubtitles = (videoId?: string | null) => {
  return useQuery({
    queryKey: ["videoSubtitles", videoId],
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const res = await instance.get<ApiResponse<VideoSubtitle[]>>(`/api/v1/videos/${videoId}/subtitles`);
      return res.data.result ?? [];
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 5,
  });
};

/* -------------------------
   useTrackVideoProgress
   returns { trackProgress: async fn, isTracking: boolean }
   trackProgress(videoId, progress, duration?)
------------------------- */
export const useTrackVideoProgress = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: { videoId: string; progress: number; duration?: number }) => {
      if (!user?.userId) throw new Error("User not logged in");
      await instance.post<ApiResponse<void>>(`/api/v1/videos/${payload.videoId}/progress`, {
        userId: user.userId,
        progress: payload.progress,
        duration: payload.duration ?? 0,
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });

  return {
    trackProgress: async (videoId: string, progress: number, duration?: number) => {
      return mutation.mutateAsync({ videoId, progress, duration });
    },
    isTracking: mutation.isPending,
  };
};

/* -------------------------
   useLikeVideo
   returns { toggleLike: async fn, isToggling: boolean }
   toggleLike(videoId, currentlyLiked?)
   - if currentlyLiked === true -> will call DELETE (unlike)
   - else -> POST (like)
------------------------- */
export const useLikeVideo = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ videoId, currentlyLiked }: { videoId: string; currentlyLiked?: boolean }) => {
      if (!user?.userId) throw new Error("User not logged in");
      if (currentlyLiked) {
        await instance.delete<ApiResponse<void>>(`/api/v1/videos/${videoId}/like`, { params: { userId: user.userId } });
      } else {
        await instance.post<ApiResponse<void>>(`/api/v1/videos/${videoId}/like`, null, { params: { userId: user.userId } });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars?.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });

  return {
    toggleLike: async (videoId: string, currentlyLiked?: boolean) => {
      // return promise so caller can await
      return mutation.mutateAsync({ videoId, currentlyLiked });
    },
    isToggling: mutation.isPending,
  };
};

/* -------------------------
   useFavoriteVideo
   returns { toggleFavorite: async fn, isToggling: boolean }
------------------------- */
export const useFavoriteVideo = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ videoId, currentlyFavorited }: { videoId: string; currentlyFavorited?: boolean }) => {
      if (!user?.userId) throw new Error("User not logged in");
      if (currentlyFavorited) {
        await instance.delete<ApiResponse<void>>(`/api/v1/videos/${videoId}/favorite`, { params: { userId: user.userId } });
      } else {
        await instance.post<ApiResponse<void>>(`/api/v1/videos/${videoId}/favorite`, null, { params: { userId: user.userId } });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars?.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });

  return {
    toggleFavorite: async (videoId: string, currentlyFavorited?: boolean) => {
      return mutation.mutateAsync({ videoId, currentlyFavorited });
    },
    isToggling: mutation.isPending,
  };
};
