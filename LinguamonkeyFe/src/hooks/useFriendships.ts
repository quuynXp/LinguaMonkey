import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    FriendshipResponse,
    FriendRequestStatusResponse,
    FriendshipRequest,
} from "../types/dto";

// --- Keys Factory ---
export const friendshipKeys = {
    all: ["friendships"] as const,
    lists: (params: any) => [...friendshipKeys.all, "list", params] as const,
    detail: (user1Id: string, user2Id: string) => [...friendshipKeys.all, "detail", user1Id, user2Id] as const,
    status: (user1Id: string, user2Id: string) => [...friendshipKeys.all, "status", user1Id, user2Id] as const,
    check: (user1Id: string, user2Id: string) => [...friendshipKeys.all, "check", user1Id, user2Id] as const,
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
 * Hook: useFriendships
 * Handles all CRUD and status checks for friendships.
 */
export const useFriendships = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. QUERIES (Read Operations) ===
    // ==========================================

    // GET /api/v1/friendships
    const useAllFriendships = (params?: { user1Id?: string; status?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: friendshipKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<FriendshipResponse>>>(
                    `/api/v1/friendships`,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/friendships/{user1Id}/{user2Id}
    const useFriendshipDetail = (user1Id?: string, user2Id?: string) => {
        return useQuery({
            queryKey: friendshipKeys.detail(user1Id!, user2Id!),
            queryFn: async () => {
                if (!user1Id || !user2Id) throw new Error("Both user IDs required");
                const { data } = await instance.get<AppApiResponse<FriendshipResponse>>(
                    `/api/v1/friendships/${user1Id}/${user2Id}`
                );
                return data.result!;
            },
            enabled: !!user1Id && !!user2Id,
        });
    };

    // GET /api/v1/friendships/check?user1Id={...}&user2Id={...}
    const useCheckIfFriends = (user1Id?: string, user2Id?: string) =>
        useQuery<boolean>({
            queryKey: friendshipKeys.check(user1Id!, user2Id!),
            queryFn: async () => {
                if (!user1Id || !user2Id) return false;
                const { data } = await instance.get<AppApiResponse<boolean>>(`/api/v1/friendships/check`, {
                    params: { user1Id, user2Id },
                });
                return data.result || false;
            },
            enabled: !!user1Id && !!user2Id,
        });

    // GET /api/v1/friendships/request-status?currentUserId={...}&otherUserId={...}
    const useFriendRequestStatus = (currentUserId?: string, otherUserId?: string) =>
        useQuery<FriendRequestStatusResponse>({
            queryKey: friendshipKeys.status(currentUserId!, otherUserId!),
            queryFn: async () => {
                if (!currentUserId || !otherUserId) throw new Error("Both user IDs required");
                const { data } = await instance.get<AppApiResponse<FriendRequestStatusResponse>>(
                    `/api/v1/friendships/request-status`,
                    {
                        params: { currentUserId, otherUserId },
                    }
                );
                return data.result!;
            },
            enabled: !!currentUserId && !!otherUserId,
        });

    // ==========================================
    // === 2. MUTATIONS (Write Operations) ===
    // ==========================================

    // POST /api/v1/friendships (Send Request)
    const useCreateFriendship = () => {
        return useMutation({
            mutationFn: async (req: FriendshipRequest) => {
                // req MUST contain requesterId (user1Id) and receiverId (user2Id)
                const { data } = await instance.post<AppApiResponse<FriendshipResponse>>(
                    "/api/v1/friendships",
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: friendshipKeys.lists({}) });
                queryClient.invalidateQueries({ queryKey: friendshipKeys.status(data.requesterId, data.receiverId) });
            },
        });
    };

    // PUT /api/v1/friendships/{user1Id}/{user2Id} (Accept/Block)
    const useUpdateFriendship = () => {
        return useMutation({
            mutationFn: async ({ user1Id, user2Id, req }: { user1Id: string; user2Id: string; req: FriendshipRequest }) => {
                // req SHOULD contain the new status (e.g., { status: "ACCEPTED" })
                const { data } = await instance.put<AppApiResponse<FriendshipResponse>>(
                    `/api/v1/friendships/${user1Id}/${user2Id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: friendshipKeys.lists({}) });
                queryClient.invalidateQueries({ queryKey: friendshipKeys.status(data.requesterId, data.receiverId) });
            },
        });
    };

    // DELETE /api/v1/friendships/{user1Id}/{user2Id}
    const useDeleteFriendship = () => {
        return useMutation({
            mutationFn: async ({ user1Id, user2Id }: { user1Id: string; user2Id: string }) => {
                await instance.delete<AppApiResponse<void>>(
                    `/api/v1/friendships/${user1Id}/${user2Id}`
                );
            },
            onSuccess: (_, vars) => {
                queryClient.invalidateQueries({ queryKey: friendshipKeys.lists({}) });
                queryClient.invalidateQueries({ queryKey: friendshipKeys.status(vars.user1Id, vars.user2Id) });
                queryClient.invalidateQueries({ queryKey: friendshipKeys.check(vars.user1Id, vars.user2Id) });
            },
        });
    };

    return {
        useAllFriendships,
        useFriendshipDetail,
        useCheckIfFriends,
        useFriendRequestStatus,
        useCreateFriendship,
        useUpdateFriendship,
        useDeleteFriendship,
    };
};