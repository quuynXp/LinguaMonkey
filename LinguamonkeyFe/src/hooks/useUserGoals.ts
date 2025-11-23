import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    UserGoalResponse,
    UserGoalRequest,
} from "../types/dto";

// --- Keys Factory ---
export const userGoalKeys = {
    all: ["userGoals"] as const,
    lists: (params: any) => [...userGoalKeys.all, "list", params] as const,
    detail: (id: string) => [...userGoalKeys.all, "detail", id] as const,
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
 * Hook: useUserGoalsApi 🎯
 * Handles all CRUD operations for user learning goals.
 */
export const useUserGoalsApi = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/user-goals";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/user-goals
    const useAllUserGoals = (params?: { userId?: string; languageCode?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: userGoalKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<UserGoalResponse>>>(
                    BASE,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/user-goals/{id}
    const useUserGoal = (id?: string | null) => {
        return useQuery({
            queryKey: userGoalKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("User Goal ID required");
                const { data } = await instance.get<AppApiResponse<UserGoalResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/user-goals
    const useCreateUserGoal = () => {
        return useMutation({
            mutationFn: async (req: UserGoalRequest) => {
                const { data } = await instance.post<AppApiResponse<UserGoalResponse>>(
                    BASE,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: userGoalKeys.all });
                // Invalidate related user roadmap cache if applicable
                queryClient.invalidateQueries({ queryKey: ["roadmaps", "userList", data.userId] });
            },
        });
    };

    // PUT /api/v1/user-goals/{id}
    const useUpdateUserGoal = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: UserGoalRequest }) => {
                const { data } = await instance.put<AppApiResponse<UserGoalResponse>>(
                    `${BASE}/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: userGoalKeys.detail(data.goalId) });
                queryClient.invalidateQueries({ queryKey: userGoalKeys.all });
                queryClient.invalidateQueries({ queryKey: ["roadmaps", "userList", data.userId] });
            },
        });
    };

    // DELETE /api/v1/user-goals/{id}
    const useDeleteUserGoal = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: userGoalKeys.all }),
        });
    };

    return {
        useAllUserGoals,
        useUserGoal,
        useCreateUserGoal,
        useUpdateUserGoal,
        useDeleteUserGoal,
    };
};