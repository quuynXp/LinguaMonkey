import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  VideoCallResponse,
  VideoCallRequest,
  CreateGroupCallRequest,
  UpdateParticipantStatusRequest,
  CallPreferencesRequest, // Thêm DTO Matchmaking
  FindMatchResponse,      // Thêm DTO Matchmaking
} from "../types/dto";

import { VideoCallParticipant } from "../types/entity";

// --- Keys Factory ---
export const videoCallKeys = {
  all: ["videoCalls"] as const,
  lists: (params: any) => [...videoCallKeys.all, "list", params] as const,
  detail: (id: string) => [...videoCallKeys.all, "detail", id] as const,
  history: (userId: string) => [...videoCallKeys.all, "history", userId] as const,
  participants: (id: string) => [...videoCallKeys.detail(id), "participants"] as const,
  matchmaking: () => [...videoCallKeys.all, "matchmaking"] as const,
};

// --- Helper to standardize pagination return ---
const mapPageResponse = <T>(result: any, page: number, size: number) => ({
  data: (result?.content as T[]) || [],
  pagination: {
    pageNumber: result?.number ?? page,
    pageSize: result?.size ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.last ?? true,
    isFirst: result?.first ?? true,
    hasNext: result?.hasNext ?? false,
    hasPrevious: result?.first ?? false,
  },
});

/**
 * Hook: useVideoCalls (Bao gồm Matchmaking)
 */
export const useVideoCalls = () => {
  const queryClient = useQueryClient();
  const BASE = "/api/v1/video-calls";

  // ==========================================
  // === 1. VIDEO CALLS QUERIES (CRUD Base) ===
  // ==========================================

  // GET /api/v1/video-calls
  const useVideoCallsList = (params?: {
    callerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const { page = 0, limit = 10, ...filters } = params || {};
    return useQuery({
      queryKey: videoCallKeys.lists(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (filters.callerId) qp.append("callerId", filters.callerId);
        if (filters.status) qp.append("status", filters.status);
        qp.append("page", String(page));
        qp.append("size", String(limit));

        const { data } = await instance.get<AppApiResponse<PageResponse<VideoCallResponse>>>(
          `${BASE}?${qp.toString()}`
        );
        return mapPageResponse(data.result, page, limit);
      },
      staleTime: 60_000,
    });
  };

  // GET /api/v1/video-calls/{id}
  const useVideoCall = (videoCallId: string | null) =>
    useQuery({
      queryKey: videoCallKeys.detail(videoCallId!),
      queryFn: async () => {
        if (!videoCallId) throw new Error("Video call ID required");
        const { data } = await instance.get<AppApiResponse<VideoCallResponse>>(
          `${BASE}/${videoCallId}`
        );
        return data.result!;
      },
      enabled: !!videoCallId,
    });

  // GET /api/v1/video-calls/history/{userId}
  const useVideoCallHistory = (userId: string | null) =>
    useQuery({
      queryKey: videoCallKeys.history(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<VideoCallResponse[]>>(
          `${BASE}/history/${userId}`
        );
        return data.result || [];
      },
      enabled: !!userId,
    });


  // ==========================================
  // === 2. VIDEO CALLS MUTATIONS ===
  // ==========================================

  // POST /api/v1/video-calls (Basic Create)
  const useCreateVideoCall = () =>
    useMutation({
      mutationFn: async (payload: VideoCallRequest) => {
        const { data } = await instance.post<AppApiResponse<VideoCallResponse>>(
          BASE,
          payload
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
      },
    });

  // POST /api/v1/video-calls/group
  const useCreateGroupCall = () =>
    useMutation({
      mutationFn: async (req: CreateGroupCallRequest) => {
        const { data } = await instance.post<AppApiResponse<VideoCallResponse>>(
          `${BASE}/group`,
          req
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
      },
    });

  // PUT /api/v1/video-calls/{id}
  const useUpdateVideoCall = () =>
    useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: VideoCallRequest }) => {
        const { data } = await instance.put<AppApiResponse<VideoCallResponse>>(
          `${BASE}/${id}`,
          payload
        );
        return data.result!;
      },
      onSuccess: (result) => {
        if (result?.videoCallId) {
          queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(result.videoCallId) });
          queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
        }
      },
    });

  // DELETE /api/v1/video-calls/{id}
  const useDeleteVideoCall = () =>
    useMutation({
      mutationFn: async (videoCallId: string) => {
        await instance.delete<AppApiResponse<void>>(`${BASE}/${videoCallId}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
      },
    });


  // ==========================================
  // === 3. PARTICIPANTS MANAGEMENT ===
  // ==========================================

  // GET /api/v1/video-calls/{id}/participants
  const useGetParticipants = (videoCallId: string | null) =>
    useQuery({
      queryKey: videoCallKeys.participants(videoCallId!),
      queryFn: async () => {
        if (!videoCallId) throw new Error("Video call ID required");
        const { data } = await instance.get<AppApiResponse<VideoCallParticipant[]>>(
          `${BASE}/${videoCallId}/participants`
        );
        return data.result || [];
      },
      enabled: !!videoCallId,
    });

  // POST /api/v1/video-calls/{id}/participants
  const useAddParticipant = () =>
    useMutation({
      mutationFn: async (data: { videoCallId: string; userId: string }) => {
        // Controller expects userId as @RequestParam
        await instance.post<AppApiResponse<void>>(
          `${BASE}/${data.videoCallId}/participants`,
          null,
          { params: { userId: data.userId } }
        );
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(variables.videoCallId) });
        queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(variables.videoCallId) });
      },
    });

  // DELETE /api/v1/video-calls/{id}/participants/{userId}
  const useRemoveParticipant = () =>
    useMutation({
      mutationFn: async (data: { videoCallId: string; userId: string }) => {
        await instance.delete<AppApiResponse<void>>(
          `${BASE}/${data.videoCallId}/participants/${data.userId}`
        );
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(variables.videoCallId) });
        queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(variables.videoCallId) });
      },
    });

  // PUT /api/v1/video-calls/{id}/participants/{userId}
  const useUpdateParticipantStatus = () =>
    useMutation({
      mutationFn: async (data: {
        videoCallId: string;
        userId: string;
        req: UpdateParticipantStatusRequest;
      }) => {
        await instance.put<AppApiResponse<void>>(
          `${BASE}/${data.videoCallId}/participants/${data.userId}`,
          data.req
        );
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(variables.videoCallId) });
        queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(variables.videoCallId) });
      },
    });

  // ==========================================
  // === 4. MATCHMAKING (Integrated from MatchmakingController) ===
  // ==========================================

  // POST /api/v1/matchmaking/find-call
  const useFindCallPartner = () => {
    return useMutation({
      mutationFn: async (req: CallPreferencesRequest) => {
        // Endpoint Matchmaking nằm ngoài BASE /api/v1/video-calls
        const { data } = await instance.post<AppApiResponse<FindMatchResponse>>(
          `/api/v1/matchmaking/find-call`,
          req
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // Invalidate video call lists as a new call might have been created
        queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
        // Optional: Cache partner info or push to specific state
      },
    });
  };


  return {
    useVideoCallsList,
    useVideoCall,
    useVideoCallHistory,

    // CRUD
    useCreateVideoCall,
    useCreateGroupCall,
    useUpdateVideoCall,
    useDeleteVideoCall,

    // Participants
    useGetParticipants,
    useAddParticipant,
    useRemoveParticipant,
    useUpdateParticipantStatus,

    // Matchmaking
    useFindCallPartner,
  };
};