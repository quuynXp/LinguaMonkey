import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    RoomResponse,
    RoomRequest,
    MemberResponse,
    RoomMemberRequest,
} from "../types/dto";

import { RoomPurpose, RoomType } from "../types/enums";
// import { VideoCallParticipant } from "../types/entity"; // Dùng Entity

// --- Keys Factory ---
export const roomKeys = {
    all: ["rooms"] as const,
    lists: (params: any) => [...roomKeys.all, "list", params] as const,
    detail: (id: string) => [...roomKeys.all, "detail", id] as const,
    members: (id: string) => [...roomKeys.all, "members", id] as const,
    private: (targetUserId: string) => [...roomKeys.all, "private", targetUserId] as const,
    ai: () => [...roomKeys.all, "aiRoom"] as const,
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
 * Hook: useRooms 💬
 * Handles all CRUD and special logic for Chat/Video Rooms and membership management.
 */
export const useRooms = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/rooms";

    // ==========================================
    // === 1. ROOM QUERIES ===
    // ==========================================

    // GET /api/v1/rooms
    const useAllRooms = (params?: {
        roomName?: string;
        creatorId?: string;
        purpose?: RoomPurpose;
        roomType?: RoomType;
        page?: number;
        size?: number;
    }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: roomKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<RoomResponse>>>(
                    BASE,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
            staleTime: 5 * 60 * 1000,
        });
    };

    // GET /api/v1/rooms/{id}
    const useRoom = (id?: string | null) => {
        return useQuery({
            queryKey: roomKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Room ID required");
                const { data } = await instance.get<AppApiResponse<RoomResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // GET /api/v1/rooms/{id}/members
    const useRoomMembers = (roomId?: string | null) => {
        return useQuery({
            queryKey: roomKeys.members(roomId!),
            queryFn: async () => {
                if (!roomId) throw new Error("Room ID required");
                // Lỗi: Cannot find name 'List'. Đã sửa thành MemberResponse[]
                const { data } = await instance.get<AppApiResponse<MemberResponse[]>>(
                    `${BASE}/${roomId}/members`
                );
                return data.result || [];
            },
            enabled: !!roomId,
        });
    };

    // GET /api/v1/rooms/ai-chat-room
    const useAiChatRoom = () => {
        return useQuery({
            queryKey: roomKeys.ai(),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<RoomResponse>>(`${BASE}/ai-chat-room`);
                return data.result!;
            },
            staleTime: Infinity,
        });
    };

    // ==========================================
    // === 2. ROOM MUTATIONS ===
    // ==========================================

    // POST /api/v1/rooms
    const useCreateRoom = () => {
        return useMutation({
            mutationFn: async (req: RoomRequest) => {
                const { data } = await instance.post<AppApiResponse<RoomResponse>>(BASE, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
        });
    };

    // POST /api/v1/rooms/private?targetUserId={targetId}
    const useFindOrCreatePrivateRoom = () => {
        return useMutation({
            mutationFn: async (targetUserId: string) => {
                const { data } = await instance.post<AppApiResponse<RoomResponse>>(
                    `${BASE}/private`,
                    null,
                    { params: { targetUserId } }
                );
                return data.result!;
            },
            onSuccess: (data) => {
                // Lỗi logic: Property 'user1Id' does not exist on type 'RoomResponse'.
                // Chỉ cần invalidate danh sách phòng chat chung.
                queryClient.invalidateQueries({ queryKey: roomKeys.all });
                queryClient.invalidateQueries({ queryKey: roomKeys.detail(data.roomId) });
            },
        });
    };

    // PUT /api/v1/rooms/{id}
    const useUpdateRoom = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: RoomRequest }) => {
                const { data } = await instance.put<AppApiResponse<RoomResponse>>(
                    `${BASE}/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: roomKeys.detail(data.roomId) });
                queryClient.invalidateQueries({ queryKey: roomKeys.all });
            },
        });
    };

    // DELETE /api/v1/rooms/{id}
    const useDeleteRoom = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
        });
    };

    // ==========================================
    // === 3. MEMBER MUTATIONS ===
    // ==========================================

    // POST /api/v1/rooms/{id}/members (Add list of members)
    const useAddRoomMembers = () => {
        return useMutation({
            // Lỗi: Cannot find name 'List'. Đã sửa thành RoomMemberRequest[]
            mutationFn: async ({ roomId, memberRequests }: { roomId: string; memberRequests: RoomMemberRequest[] }) => {
                await instance.post<AppApiResponse<void>>(
                    `${BASE}/${roomId}/members`,
                    memberRequests
                );
            },
            onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: roomKeys.members(vars.roomId) }),
        });
    };

    // DELETE /api/v1/rooms/{id}/members (Remove list of members)
    const useRemoveRoomMembers = () => {
        return useMutation({
            // Lỗi: Cannot find name 'List'. Đã sửa thành string[] (UUIDs)
            mutationFn: async ({ roomId, userIds }: { roomId: string; userIds: string[] }) => {
                // NOTE: BE controller uses @RequestBody List<UUID> for DELETE.
                await instance.delete<AppApiResponse<void>>(
                    `${BASE}/${roomId}/members`,
                    { data: userIds }
                );
            },
            onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: roomKeys.members(vars.roomId) }),
        });
    };


    return {
        useAllRooms,
        useRoom,
        useRoomMembers,
        useAiChatRoom,
        useCreateRoom,
        useUpdateRoom,
        useDeleteRoom,
        useFindOrCreatePrivateRoom,
        useAddRoomMembers,
        useRemoveRoomMembers,
    };
};