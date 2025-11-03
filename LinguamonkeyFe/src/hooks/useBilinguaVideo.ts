import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import type {
  ApiResponse,
  BilingualVideo,
  VideoSubtitle,
  VideoReviewResponse,
  CreateReviewRequest,
} from "../types/api";

/* -------------------------
   useVideos
   Uses /search if any advanced params (q, language, sort) are provided; otherwise falls back to /bilingual.
   Returns: { data: BilingualVideo[], page, totalPages, totalElements }
------------------------- */
export const useVideos = (
  page = 0,
  size = 10,
  category?: string,
  level?: string,
  q?: string,
  language?: string,
  sort?: string
) => {
  const useSearch = !!q || !!language || !!sort;
  return useQuery({
    queryKey: ["videos", "bilingual", page, size, category, level, q, language, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));
      if (category) params.set("category", category);
      if (level) params.set("level", level);
      if (useSearch) {
        if (q) params.set("q", q);
        if (language) params.set("language", language);
        if (sort) params.set("sort", sort);
        const res = await instance.get<ApiResponse<any>>(`/api/v1/videos/search?${params.toString()}`);
        const pageResult = res.data.result;
        const content: BilingualVideo[] = pageResult?.content ?? [];
        return {
          data: content,
          page: pageResult?.number ?? page,
          totalPages: pageResult?.totalPages ?? 1,
          totalElements: pageResult?.totalElements ?? content.length,
        };
      } else {
        const res = await instance.get<ApiResponse<any>>(`/api/v1/videos/bilingual?${params.toString()}`);
        const pageResult = res.data.result;
        const content: BilingualVideo[] = pageResult?.content ?? [];
        return {
          data: content,
          page: pageResult?.number ?? page,
          totalPages: pageResult?.totalPages ?? 1,
          totalElements: pageResult?.totalElements ?? content.length,
        };
      }
    },
    placeholderData: (previousData) => previousData,
  });
};

/* -------------------------
   useVideo
   Returns BilingualVideo (detailed)
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
   Returns VideoSubtitle[]
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
   useVideoReviews
   Returns VideoReviewResponse[]
------------------------- */
export const useVideoReviews = (videoId?: string | null, page = 0, size = 20) => {
  return useQuery({
    queryKey: ["videoReviews", videoId, page, size],
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      const res = await instance.get<ApiResponse<any>>(`/api/v1/videos/${videoId}/reviews?${params.toString()}`);
      const pageResult = res.data.result;
      return pageResult?.content ?? [];
    },
    enabled: !!videoId,
  });
};

/* -------------------------
   useCreateReview
   Returns { createReview: async fn, isCreating: boolean }
------------------------- */
export const useCreateReview = () => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ videoId, req }: { videoId: string; req: CreateReviewRequest }) => {
      const res = await instance.post<ApiResponse<VideoReviewResponse>>(`/api/v1/videos/${videoId}/reviews`, req);
      return res.data.result;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["videoReviews", vars.videoId] });
      qc.invalidateQueries({ queryKey: ["video", vars.videoId] });  // Update ratings if affected
    },
  });
  return {
    createReview: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
};

/* -------------------------
   useReactReview
   Returns { reactReview: async fn, isReacting: boolean }
   reaction: 1 for like, -1 for dislike
------------------------- */
export const useReactReview = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ reviewId, reaction }: { reviewId: string; reaction: number }) => {
      if (!user?.userId) throw new Error("User not logged in");
      await instance.post<ApiResponse<void>>(`/api/v1/reviews/${reviewId}/react`, null, {
        params: { userId: user.userId, reaction },
      });
    },
    onMutate: async ({ reviewId, reaction }) => {
      const data = qc.getQueryData<VideoReviewResponse[]>(["videoReviews", reviewId]);
      const videoId = data?.[0]?.videoId; 
      await qc.cancelQueries({ queryKey: ["videoReviews", videoId] });
      const previous = qc.getQueryData(["videoReviews", videoId]);
      qc.setQueryData(["videoReviews", videoId], (old: VideoReviewResponse[] | undefined) => {
        if (!old) return old;
        return old.map((review) => {
          if (review.reviewId !== reviewId) return review;
          const prevReaction = review.userReaction || 0;
          const newReview = { ...review, userReaction: reaction };
          if (prevReaction === 1) newReview.likeCount = (newReview.likeCount || 0) - 1;
          if (prevReaction === -1) newReview.dislikeCount = (newReview.dislikeCount || 0) - 1;
          if (reaction === 1) newReview.likeCount = (newReview.likeCount || 0) + 1;
          if (reaction === -1) newReview.dislikeCount = (newReview.dislikeCount || 0) + 1;
          return newReview;
        });
      });
      return { previous, videoId };
    },
    onError: (_err, vars, context) => {
      if (context?.previous && context.videoId) {
        qc.setQueryData(["videoReviews", context.videoId], context.previous);
      }
    },
    onSettled: (_data, _err, vars, context) => {
      if (context?.videoId) {
        qc.invalidateQueries({ queryKey: ["videoReviews", context.videoId] });
      }
    },
  });
  return {
    reactReview: mutation.mutateAsync,
    isReacting: mutation.isPending,
  };
};

/* -------------------------
   useTrackVideoProgress
------------------------- */
export const useTrackVideoProgress = () => {
  const mutation = useMutation({
    mutationFn: async ({ videoId, progress, duration }: { videoId: string; progress: number; duration?: number }) => {
      await instance.post(`/api/v1/videos/${videoId}/progress`, { progress, duration });
    },
  });
  return {
    trackProgress: mutation.mutateAsync,
    isTracking: mutation.isPending,
  };
};

/* -------------------------
   useLikeVideo
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
    onMutate: async ({ videoId, currentlyLiked }) => {
      await qc.cancelQueries({ queryKey: ["video", videoId] });
      const previous = qc.getQueryData(["video", videoId]);
      qc.setQueryData(["video", videoId], (old: BilingualVideo | undefined) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !currentlyLiked,
          likesCount: (old.likesCount ?? 0) + (currentlyLiked ? -1 : 1),
        };
      });
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) qc.setQueryData(["video", vars.videoId], context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });
  return {
    toggleLike: mutation.mutateAsync,
    isToggling: mutation.isPending,
  };
};

/* -------------------------
   useDislikeVideo
   Similar to useLikeVideo, but for dislikes.
------------------------- */
export const useDislikeVideo = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ videoId, currentlyDisliked }: { videoId: string; currentlyDisliked?: boolean }) => {
      if (!user?.userId) throw new Error("User not logged in");
      if (currentlyDisliked) {
        await instance.delete<ApiResponse<void>>(`/api/v1/videos/${videoId}/dislike`, { params: { userId: user.userId } });
      } else {
        await instance.post<ApiResponse<void>>(`/api/v1/videos/${videoId}/dislike`, null, { params: { userId: user.userId } });
      }
    },
    onMutate: async ({ videoId, currentlyDisliked }) => {
      await qc.cancelQueries({ queryKey: ["video", videoId] });
      const previous = qc.getQueryData(["video", videoId]);
      qc.setQueryData(["video", videoId], (old: BilingualVideo | undefined) => {
        if (!old) return old;
        return {
          ...old,
          isDisliked: !currentlyDisliked,
          dislikesCount: (old.dislikesCount ?? 0) + (currentlyDisliked ? -1 : 1),
        };
      });
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) qc.setQueryData(["video", vars.videoId], context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });
  return {
    toggleDislike: mutation.mutateAsync,
    isToggling: mutation.isPending,
  };
};

/* -------------------------
   useFavoriteVideo
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
    onMutate: async ({ videoId, currentlyFavorited }) => {
      await qc.cancelQueries({ queryKey: ["video", videoId] });
      const previous = qc.getQueryData(["video", videoId]);
      qc.setQueryData(["video", videoId], (old: BilingualVideo | undefined) => {
        if (!old) return old;
        return { ...old, isFavorited: !currentlyFavorited };
      });
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) qc.setQueryData(["video", vars.videoId], context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["video", vars.videoId] });
      qc.invalidateQueries({ queryKey: ["videos", "bilingual"] });
    },
  });
  return {
    toggleFavorite: mutation.mutateAsync,
    isToggling: mutation.isPending,
  };
};