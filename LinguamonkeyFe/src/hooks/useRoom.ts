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

export const roomKeys = {
    all: ["rooms"] as const,
    lists: (params: any) => [...roomKeys.all, "list", params] as const,
    detail: (id: string) => [...roomKeys.all, "detail", id] as const,
    members: (id: string) => [...roomKeys.all, "members", id] as const,
    private: (targetUserId: string) => [...roomKeys.all, "private", targetUserId] as const,
    ai: () => [...roomKeys.all, "aiRoom"] as const,
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

export const useRooms = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/rooms";

    // --- QUERIES ---

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

    const useRoomMembers = (roomId?: string | null) => {
        return useQuery({
            queryKey: roomKeys.members(roomId!),
            queryFn: async () => {
                if (!roomId) throw new Error("Room ID required");
                const { data } = await instance.get<AppApiResponse<MemberResponse[]>>(
                    `${BASE}/${roomId}/members`
                );
                return data.result || [];
            },
            enabled: !!roomId,
        });
    };

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

    // --- MUTATIONS ---

    const useCreateRoom = () => {
        return useMutation({
            mutationFn: async (req: RoomRequest) => {
                const { data } = await instance.post<AppApiResponse<RoomResponse>>(BASE, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
        });
    };

    // New: Join Room Mutation (Handles ID or Code + Password)
    const useJoinRoom = () => {
        return useMutation({
            mutationFn: async ({ roomId, roomCode, password }: { roomId?: string; roomCode?: string; password?: string }) => {
                const { data } = await instance.post<AppApiResponse<RoomResponse>>(`${BASE}/join`, {
                    roomId,
                    roomCode,
                    password
                });
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: roomKeys.all });
                queryClient.invalidateQueries({ queryKey: roomKeys.detail(data.roomId) });
            },
        });
    };

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
                queryClient.invalidateQueries({ queryKey: roomKeys.all });
                queryClient.invalidateQueries({ queryKey: roomKeys.detail(data.roomId) });
            },
        });
    };

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

    const useDeleteRoom = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
        });
    };

    const useAddRoomMembers = () => {
        return useMutation({
            mutationFn: async ({ roomId, memberRequests }: { roomId: string; memberRequests: RoomMemberRequest[] }) => {
                await instance.post<AppApiResponse<void>>(
                    `${BASE}/${roomId}/members`,
                    memberRequests
                );
            },
            onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: roomKeys.members(vars.roomId) }),
        });
    };

    const useRemoveRoomMembers = () => {
        return useMutation({
            mutationFn: async ({ roomId, userIds }: { roomId: string; userIds: string[] }) => {
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
        useJoinRoom, // Export new hook
        useUpdateRoom,
        useDeleteRoom,
        useFindOrCreatePrivateRoom,
        useAddRoomMembers,
        useRemoveRoomMembers,
    };
};