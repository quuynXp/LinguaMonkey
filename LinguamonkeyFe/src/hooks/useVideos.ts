import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  VideoCallResponse,
  VideoCallRequest,
  UpdateParticipantStatusRequest,
  RoomResponse,
  CallPreferencesRequest,
} from "../types/dto";

import { VideoCallParticipant } from "../types/entity";
import { VideoCallType } from "../types/enums";

// Defined locally to ensure correct structure for the group call endpoint
export interface CreateGroupCallRequest {
  callerId: string;
  roomId?: string; // Source Chat Room ID
  participantIds?: string[];
  videoCallType: VideoCallType;
}

export const videoCallKeys = {
  all: ["videoCalls"] as const,
  lists: (params: any) => [...videoCallKeys.all, "list", params] as const,
  detail: (id: string) => [...videoCallKeys.all, "detail", id] as const,
  history: (userId: string) => [...videoCallKeys.all, "history", userId] as const,
  participants: (id: string) => [...videoCallKeys.detail(id), "participants"] as const,
  matchmaking: () => [...videoCallKeys.all, "matchmaking"] as const,
};

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

export interface MatchResponseData {
  status: 'MATCHED' | 'WAITING';
  room?: RoomResponse;
  queueSize?: number;
  secondsWaited?: number;
  currentCriteriaLevel?: number;
  score?: number;
}

export const useVideoCalls = () => {
  const queryClient = useQueryClient();
  const BASE = "/api/v1/video-calls";
  const MATCHMAKING_BASE = "/api/v1/matchmaking";

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

  const useDeleteVideoCall = () =>
    useMutation({
      mutationFn: async (videoCallId: string) => {
        await instance.delete<AppApiResponse<void>>(`${BASE}/${videoCallId}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: videoCallKeys.all });
      },
    });

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

  const useAddParticipant = () =>
    useMutation({
      mutationFn: async (data: { videoCallId: string; userId: string }) => {
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

  const useFindCallPartner = () => {
    return useMutation({
      mutationFn: async (req: CallPreferencesRequest) => {
        const response = await instance.post<AppApiResponse<MatchResponseData>>(
          `${MATCHMAKING_BASE}/find-call`,
          req
        );
        return {
          code: response.data.code,
          message: response.data.message,
          data: response.data.result
        };
      },
    });
  };

  const useCancelFindMatch = () => {
    return useMutation({
      mutationFn: async () => {
        await instance.post(`${MATCHMAKING_BASE}/cancel`);
      }
    });
  };

  return {
    useVideoCallsList,
    useVideoCall,
    useVideoCallHistory,
    useCreateVideoCall,
    useCreateGroupCall,
    useUpdateVideoCall,
    useDeleteVideoCall,
    useGetParticipants,
    useAddParticipant,
    useRemoveParticipant,
    useUpdateParticipantStatus,
    useFindCallPartner,
    useCancelFindMatch,
  };
};