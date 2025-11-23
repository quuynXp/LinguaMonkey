import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    CoupleResponse,
    CoupleRequest,
} from "../types/dto";

// --- Keys Factory ---
export const coupleKeys = {
    all: ["couples"] as const,
    lists: (params: any) => [...coupleKeys.all, "list", params] as const,
    detail: (user1Id: string, user2Id: string) => [...coupleKeys.all, "detail", user1Id, user2Id] as const,
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
 * Hook: useCouples
 * Handles all CRUD operations for Couple relationships.
 */
export const useCouples = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/couples";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/couples
    const useAllCouples = (params?: { user1Id?: string; status?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: coupleKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<CoupleResponse>>>(
                    BASE,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
            staleTime: 60 * 1000,
        });
    };

    // GET /api/v1/couples/{user1Id}/{user2Id}
    const useCoupleDetail = (user1Id?: string, user2Id?: string) => {
        return useQuery({
            queryKey: coupleKeys.detail(user1Id!, user2Id!),
            queryFn: async () => {
                if (!user1Id || !user2Id) throw new Error("Both user IDs required");
                const { data } = await instance.get<AppApiResponse<CoupleResponse>>(
                    `${BASE}/${user1Id}/${user2Id}`
                );
                return data.result!;
            },
            enabled: !!user1Id && !!user2Id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/couples
    const useCreateCouple = () => {
        return useMutation({
            mutationFn: async (req: CoupleRequest) => {
                const { data } = await instance.post<AppApiResponse<CoupleResponse>>(
                    BASE,
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: coupleKeys.all }),
        });
    };

    // PUT /api/v1/couples/{user1Id}/{user2Id}
    const useUpdateCouple = () => {
        return useMutation({
            mutationFn: async ({ user1Id, user2Id, req }: { user1Id: string; user2Id: string; req: CoupleRequest }) => {
                const { data } = await instance.put<AppApiResponse<CoupleResponse>>(
                    `${BASE}/${user1Id}/${user2Id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: coupleKeys.all });
                queryClient.invalidateQueries({ queryKey: coupleKeys.detail(data.user1Id, data.user2Id) });
                queryClient.invalidateQueries({ queryKey: coupleKeys.detail(data.user2Id, data.user1Id) }); // Bidirectional invalidation
            },
        });
    };

    // DELETE /api/v1/couples/{user1Id}/{user2Id}
    const useDeleteCouple = () => {
        return useMutation({
            mutationFn: async ({ user1Id, user2Id }: { user1Id: string; user2Id: string }) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${user1Id}/${user2Id}`);
            },
            onSuccess: (_, vars) => {
                queryClient.invalidateQueries({ queryKey: coupleKeys.all });
                queryClient.removeQueries({ queryKey: coupleKeys.detail(vars.user1Id, vars.user2Id) });
                queryClient.removeQueries({ queryKey: coupleKeys.detail(vars.user2Id, vars.user1Id) });
            },
        });
    };

    return {
        useAllCouples,
        useCoupleDetail,
        useCreateCouple,
        useUpdateCouple,
        useDeleteCouple,
    };
};