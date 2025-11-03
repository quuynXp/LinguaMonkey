import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type {
  ApiResponse,
  VideoCall as VideoCallApiType,
  VideoCallParticipant as VideoCallParticipantApiType,
} from "../types/api";

/**
 * Client-side types for the backend VideoCallResponse (camelCase)
 * (backend DTO: com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse)
 */
export interface ParticipantInfo {
  userId: string;
  username?: string | null;
  role?: string | null; // HOST | GUEST
  status?: string | null; // CONNECTED | MUTED | LEFT ...
  joinedAt?: string | null;
}

export interface VideoCallResponse {
  videoCallId: string;
  roomId?: string | null;
  callerId?: string | null;
  calleeId?: string | null;
  videoCallType?: string | null;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  qualityMetrics?: any | null;
  participants?: ParticipantInfo[] | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Request payloads */
export interface CreateGroupCallRequest {
  callerId: string;
  participantIds: string[];
  videoCallType?: string | null;
}

export interface UpdateParticipantStatusRequest {
  status: string;
}

/**
 * Hook: useVideoCalls
 * - get list
 * - get single call
 * - create group call
 * - participants: list/add/remove/update
 * - call history by user
 */
export const useVideoCalls = () => {
  const queryClient = useQueryClient();

  // Get paginated list (backend returns AppApiResponse<Page<VideoCallResponse>>)
  const useVideoCallsList = (params?: {
    callerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    useQuery({
      queryKey: ["videoCalls", params],
      queryFn: async () => {
        const q = new URLSearchParams();
        if (params?.callerId) q.append("callerId", params.callerId);
        if (params?.status) q.append("status", params.status);
        if (params?.page != null) q.append("page", String(params.page));
        if (params?.limit != null) q.append("limit", String(params.limit));

        const url = `/api/v1/video-calls${q.toString() ? `?${q.toString()}` : ""}`;
        const res = await instance.get<ApiResponse<any>>(url);
        // backend wraps result in AppApiResponse -> return result directly
        return res.data.result;
      },
      enabled: !!params, // khi có params thì gọi (giữ giống style bạn dùng)
    });

  // Get one video call by id
  const useVideoCall = (videoCallId: string | null) =>
    useQuery({
      queryKey: ["videoCall", videoCallId],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<VideoCallResponse>>(
          `/api/v1/video-calls/${videoCallId}`
        );
        return res.data.result;
      },
      enabled: !!videoCallId,
    });

  // Create group call
  const useCreateGroupCall = () =>
    useMutation({
      mutationFn: async (data: CreateGroupCallRequest) => {
        const res = await instance.post<ApiResponse<VideoCallResponse>>(
          `/api/v1/video-calls/group`,
          data
        );
        return res.data.result;
      },
      onSuccess: (data) => {
        // invalidate lists so UI refreshes
        queryClient.invalidateQueries({ queryKey: ["videoCalls"] });
        if (data?.videoCallId) {
          queryClient.invalidateQueries({ queryKey: ["videoCall", data.videoCallId] });
        }
      },
    });

  // Create single video call (POST /video-calls) -- basic
  const useCreateVideoCall = () =>
    useMutation({
      mutationFn: async (payload: Partial<VideoCallApiType>) => {
        const res = await instance.post<ApiResponse<VideoCallResponse>>(
          `/api/v1/video-calls`,
          payload
        );
        return res.data.result;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["videoCalls"] });
        if (data?.videoCallId) queryClient.invalidateQueries({ queryKey: ["videoCall", data.videoCallId] });
      },
    });

  // Get participants of a call
  const useGetParticipants = (videoCallId: string | null) =>
    useQuery({
      queryKey: ["videoCallParticipants", videoCallId],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<VideoCallParticipantApiType[]>>(
          `/api/v1/video-calls/${videoCallId}/participants`
        );
        return res.data.result;
      },
      enabled: !!videoCallId,
    });

  // Add participant to call
  const useAddParticipant = () =>
    useMutation({
      mutationFn: async (data: { videoCallId: string; userId: string }) => {
        // Backend expects @RequestParam userId and POST with no body (we send null body)
        const res = await instance.post<ApiResponse<void>>(
          `/api/v1/video-calls/${data.videoCallId}/participants`,
          null,
          { params: { userId: data.userId } }
        );
        return res.data;
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: ["videoCallParticipants", variables.videoCallId] });
        queryClient.invalidateQueries({ queryKey: ["videoCall", variables.videoCallId] });
      },
    });

  // Remove participant
  const useRemoveParticipant = () =>
    useMutation({
      mutationFn: async (data: { videoCallId: string; userId: string }) => {
        const res = await instance.delete<ApiResponse<void>>(
          `/api/v1/video-calls/${data.videoCallId}/participants/${data.userId}`
        );
        return res.data;
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: ["videoCallParticipants", variables.videoCallId] });
        queryClient.invalidateQueries({ queryKey: ["videoCall", variables.videoCallId] });
      },
    });

  // Update participant status (mute/leave/etc)
  const useUpdateParticipantStatus = () =>
    useMutation({
      mutationFn: async (data: {
        videoCallId: string;
        userId: string;
        status: string;
      }) => {
        const payload: UpdateParticipantStatusRequest = { status: data.status };
        const res = await instance.put<ApiResponse<void>>(
          `/api/v1/video-calls/${data.videoCallId}/participants/${data.userId}`,
          payload
        );
        return res.data;
      },
      onSuccess: (_res, variables) => {
        queryClient.invalidateQueries({ queryKey: ["videoCallParticipants", variables.videoCallId] });
        queryClient.invalidateQueries({ queryKey: ["videoCall", variables.videoCallId] });
      },
    });

  // Get call history for a user
  const useVideoCallHistory = (userId: string | null) =>
    useQuery({
      queryKey: ["videoCallHistory", userId],
      queryFn: async () => {
        const res = await instance.get<ApiResponse<VideoCallResponse[]>>(
          `/api/v1/video-calls/history/${userId}`
        );
        return res.data.result;
      },
      enabled: !!userId,
    });

  // Delete a whole call
  const useDeleteVideoCall = () =>
    useMutation({
      mutationFn: async (videoCallId: string) => {
        const res = await instance.delete<ApiResponse<void>>(`/api/v1/video-calls/${videoCallId}`);
        return res.data;
      },
      onSuccess: (_res, videoCallId) => {
        queryClient.invalidateQueries({ queryKey: ["videoCalls"] });
        queryClient.invalidateQueries({ queryKey: ["videoCall", videoCallId] });
      },
    });

  // Update a video call
  const useUpdateVideoCall = () =>
    useMutation({
      mutationFn: async (data: { id: string; payload: Partial<VideoCallApiType> }) => {
        const res = await instance.put<ApiResponse<VideoCallResponse>>(
          `/api/v1/video-calls/${data.id}`,
          data.payload
        );
        return res.data.result;
      },
      onSuccess: (result) => {
        if (result?.videoCallId) {
          queryClient.invalidateQueries({ queryKey: ["videoCall", result.videoCallId] });
          queryClient.invalidateQueries({ queryKey: ["videoCalls"] });
        }
      },
    });

  return {
    useVideoCallsList,
    useVideoCall,
    useCreateGroupCall,
    useCreateVideoCall,
    useGetParticipants,
    useAddParticipant,
    useRemoveParticipant,
    useUpdateParticipantStatus,
    useVideoCallHistory,
    useDeleteVideoCall,
    useUpdateVideoCall,
  };
};
