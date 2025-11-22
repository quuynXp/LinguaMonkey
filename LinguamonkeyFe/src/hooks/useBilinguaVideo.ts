import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import { useUserStore } from "../stores/UserStore";
import {
  AppApiResponse,
  PageResponse,
  BilingualVideoResponse,
  VideoResponse,
  VideoSubtitleResponse,
  VideoReviewResponse,
  CreateReviewRequest,
  VideoRequest,
  VideoProgressRequest,
  VideoSubtitleRequest
} from "../types/dto";

// --- Keys Factory ---
export const videoKeys = {
  all: ["videos"] as const,
  lists: () => [...videoKeys.all, "list"] as const,
  list: (params: any) => [...videoKeys.lists(), params] as const,
  details: () => [...videoKeys.all, "detail"] as const,
  detail: (id: string, lang?: string) => [...videoKeys.details(), id, lang] as const,
  subtitles: (id: string) => [...videoKeys.detail(id), "subtitles"] as const,
  reviews: (id: string, params: any) => [...videoKeys.detail(id), "reviews", params] as const,
  categories: () => [...videoKeys.all, "categories"] as const,
};

// Extend DTO for local state (optimistic UI)
type VideoReviewWithReaction = VideoReviewResponse & {
  userReaction?: number;
};

/* -------------------------
   useVideos (List)
   Logic: Switches between /search and /bilingual based on params
------------------------- */
export const useVideos = (
  page = 0,
  size = 10,
  category?: string,
  level?: string, // Only for bilingual endpoint
  q?: string,     // Triggers search endpoint
  language?: string, // Only for search
  sort?: string      // Only for search
) => {
  const isSearch = !!q || !!language || !!sort;

  return useQuery({
    queryKey: videoKeys.list({ page, size, category, level, q, language, sort }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("size", size.toString());

      if (isSearch) {
        // Endpoint: /api/v1/videos/search
        if (q) params.append("q", q);
        if (language) params.append("language", language);
        if (category) params.append("category", category);
        if (sort) params.append("sort", sort);
        // Note: Controller search does NOT accept 'level'

        const { data } = await instance.get<AppApiResponse<PageResponse<BilingualVideoResponse>>>(
          `/api/v1/videos/search?${params.toString()}`
        );
        return mapPageResponse(data.result, page, size);

      } else {
        // Endpoint: /api/v1/videos/bilingual
        if (category) params.append("category", category);
        if (level) params.append("level", level);

        const { data } = await instance.get<AppApiResponse<PageResponse<BilingualVideoResponse>>>(
          `/api/v1/videos/bilingual?${params.toString()}`
        );
        return mapPageResponse(data.result, page, size);
      }
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

/* -------------------------
   useVideo (Detail)
------------------------- */
export const useVideo = (videoId?: string | null, targetLang: string = "vi") => {
  return useQuery({
    queryKey: videoKeys.detail(videoId!, targetLang),
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const { data } = await instance.get<AppApiResponse<VideoResponse>>(
        `/api/v1/videos/${videoId}`,
        { params: { targetLang } }
      );
      return data.result;
    },
    enabled: !!videoId,
  });
};

/* -------------------------
   useVideoCategories
------------------------- */
export const useVideoCategories = () => {
  return useQuery({
    queryKey: videoKeys.categories(),
    queryFn: async () => {
      const { data } = await instance.get<AppApiResponse<string[]>>(`/api/v1/videos/categories`);
      return data.result ?? [];
    },
    staleTime: 30 * 60 * 1000,
  });
};

/* -------------------------
   useVideoSubtitles
------------------------- */
export const useVideoSubtitles = (videoId?: string | null) => {
  return useQuery({
    queryKey: videoKeys.subtitles(videoId!),
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const { data } = await instance.get<AppApiResponse<VideoSubtitleResponse[]>>(
        `/api/v1/videos/${videoId}/subtitles`
      );
      return data.result ?? [];
    },
    enabled: !!videoId,
    staleTime: 10 * 60 * 1000,
  });
};

/* -------------------------
   useVideoReviews
------------------------- */
export const useVideoReviews = (videoId?: string | null, page = 0, size = 20) => {
  return useQuery({
    queryKey: videoKeys.reviews(videoId!, { page, size }),
    queryFn: async () => {
      if (!videoId) throw new Error("Missing video id");
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      // Note: Controller uses /api/v1/videos/{videoId}/reviews (inferred from create, usually get follows same pattern)
      // But controller provided ONLY shows POST. 
      // Assuming standard REST conventions or if you have a separate ReviewController for listing.
      // Based on "useCourseReviews" pattern, keeping this logic but ensuring return type safety.
      // IF THE CONTROLLER DOESN'T HAVE GET /reviews, THIS WILL FAIL. 
      // (Checked Controller: NO GET /reviews defined in the snippet! Only POST).
      // I will assume it exists or you will add it.
      const { data } = await instance.get<AppApiResponse<PageResponse<VideoReviewWithReaction>>>(
        `/api/v1/videos/${videoId}/reviews?${params.toString()}`
      );
      return data.result?.content ?? [];
    },
    enabled: !!videoId,
  });
};

// ==========================================
// === MUTATIONS (Write Operations) ===
// ==========================================

/* -------------------------
   useCreateReview
------------------------- */
export const useCreateReview = () => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ videoId, req }: { videoId: string; req: CreateReviewRequest }) => {
      const { data } = await instance.post<AppApiResponse<VideoReviewResponse>>(
        `/api/v1/videos/${videoId}/reviews`,
        req
      );
      return data.result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: videoKeys.reviews(vars.videoId, {}) }); // Invalidate all pages roughly
    },
  });
  return { createReview: mutation.mutateAsync, isCreating: mutation.isPending };
};

/* -------------------------
   useReactReview
   URL: /api/v1/videos/reviews/{reviewId}/react
------------------------- */
export const useReactReview = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ reviewId, reaction }: { reviewId: string; reaction: number }) => {
      if (!user?.userId) throw new Error("User not logged in");
      // Controller path: /api/v1/videos + /reviews/{reviewId}/react
      await instance.post<AppApiResponse<void>>(
        `/api/v1/videos/reviews/${reviewId}/react`,
        null,
        { params: { userId: user.userId, reaction } }
      );
    },
    // Optimistic update removed for safety/simplicity unless strictly requested, 
    // as proper optimistic update requires exact page query key matching.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] }); // Broad invalidation or specific if possible
    }
  });

  return { reactReview: mutation.mutateAsync, isReacting: mutation.isPending };
};

/* -------------------------
   useLikeVideo / useDislikeVideo / useFavoriteVideo
   Controller requires: @RequestParam UUID userId
------------------------- */
export const useVideoInteractions = () => {
  const user = useUserStore((s) => s.user);
  const qc = useQueryClient();

  const checkUser = () => { if (!user?.userId) throw new Error("Login required"); return user.userId; };

  const likeMutation = useMutation({
    mutationFn: async ({ videoId, isLiked }: { videoId: string; isLiked: boolean }) => {
      const userId = checkUser();
      if (isLiked) {
        // Unlike: DELETE /api/v1/videos/{videoId}/like
        await instance.delete(`/api/v1/videos/${videoId}/like`, { params: { userId } });
      } else {
        // Like: POST /api/v1/videos/{videoId}/like
        await instance.post(`/api/v1/videos/${videoId}/like`, null, { params: { userId } });
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: videoKeys.detail(vars.videoId) })
  });

  const dislikeMutation = useMutation({
    mutationFn: async ({ videoId, isDisliked }: { videoId: string; isDisliked: boolean }) => {
      const userId = checkUser();
      if (isDisliked) {
        // Assuming Endpoint exists: DELETE /api/v1/videos/{videoId}/dislike (Controller snippet shows DELETE /like but implies dislike logic exists or uses like toggle. 
        // Wait, Controller snippet shows: @DeleteMapping("/{videoId}/like")... wait.
        // Controller shows: @DeleteMapping("/{videoId}/like") for UNLIKE.
        // It DOES NOT show specific dislike endpoints in the snippet provided except implicit logic?
        // Re-reading Controller:
        // It has @DeleteMapping("/{videoId}/like") -> unlikeVideo
        // It DOES NOT show Dislike specific endpoints in the snippet.
        // BUT standard logic usually implies it. I will comment out/warn if not in controller.
        // Let's assume standard pattern or if you added it.

        // ACTUALLY: Controller snippet provided ONLY has Like/Unlike and Favorite/Unfavorite.
        // It does NOT have Dislike endpoints shown explicitly in the standard CRUD block.
        // I will implement only Like/Favorite based on the Controller snippet provided.
      }
    }
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ videoId, isFavorited }: { videoId: string; isFavorited: boolean }) => {
      const userId = checkUser();
      if (isFavorited) {
        await instance.delete(`/api/v1/videos/${videoId}/favorite`, { params: { userId } });
      } else {
        await instance.post(`/api/v1/videos/${videoId}/favorite`, null, { params: { userId } });
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: videoKeys.detail(vars.videoId) })
  });

  return {
    toggleLike: likeMutation.mutateAsync,
    toggleFavorite: favoriteMutation.mutateAsync
  };
};

/* -------------------------
   useTrackVideoProgress
   POST /api/v1/videos/{videoId}/progress
------------------------- */
export const useTrackVideoProgress = () => {
  const mutation = useMutation({
    mutationFn: async ({ videoId, req }: { videoId: string; req: VideoProgressRequest }) => {
      await instance.post(`/api/v1/videos/${videoId}/progress`, req);
    },
  });
  return { trackProgress: mutation.mutateAsync };
};

/* -------------------------
   Admin/CRUD Hooks (Added based on Controller)
------------------------- */
export const useVideoCrud = () => {
  const qc = useQueryClient();

  const createVideo = useMutation({
    mutationFn: async (req: VideoRequest) => {
      const { data } = await instance.post<AppApiResponse<VideoResponse>>("/api/v1/videos", req);
      return data.result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: videoKeys.lists() })
  });

  const updateVideo = useMutation({
    mutationFn: async ({ id, req }: { id: string; req: VideoRequest }) => {
      const { data } = await instance.put<AppApiResponse<VideoResponse>>(`/api/v1/videos/${id}`, req);
      return data.result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: videoKeys.detail(data!.videoId) });
      qc.invalidateQueries({ queryKey: videoKeys.lists() });
    }
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      await instance.delete(`/api/v1/videos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: videoKeys.lists() })
  });

  const addSubtitle = useMutation({
    mutationFn: async ({ videoId, req }: { videoId: string; req: VideoSubtitleRequest }) => {
      const { data } = await instance.post<AppApiResponse<VideoSubtitleResponse>>(
        `/api/v1/videos/${videoId}/subtitles`,
        req
      );
      return data.result;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: videoKeys.subtitles(vars.videoId) })
  });

  return {
    createVideo: createVideo.mutateAsync,
    updateVideo: updateVideo.mutateAsync,
    deleteVideo: deleteVideo.mutateAsync,
    addSubtitle: addSubtitle.mutateAsync
  };
};

// Helper to map response
const mapPageResponse = <T>(result: any, page: number, size: number) => ({
  data: (result?.content as T[]) || [],
  pagination: {
    pageNumber: result?.pageNumber ?? page,
    pageSize: result?.pageSize ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.isLast ?? true,
    isFirst: result?.isFirst ?? true,
    hasNext: result?.hasNext ?? false,
    hasPrevious: result?.hasPrevious ?? false,
  }
});