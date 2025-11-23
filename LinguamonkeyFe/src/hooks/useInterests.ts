import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    InterestResponse,
    InterestRequest,
} from "../types/dto";

// --- Keys Factory ---
export const interestKeys = {
    all: ["interests"] as const,
    lists: () => [...interestKeys.all, "list"] as const,
    detail: (id: string) => [...interestKeys.all, "detail", id] as const,
};

/**
 * Hook: useInterests
 * Handles all CRUD operations for system interests.
 */
export const useInterests = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/interests";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/interests (Get all interests)
    const useAllInterests = () => {
        return useQuery({
            queryKey: interestKeys.lists(),
            queryFn: async () => {
                // FIX: Thay List<InterestResponse> bằng InterestResponse[]
                const { data } = await instance.get<AppApiResponse<InterestResponse[]>>(BASE);
                return data.result || [];
            },
            staleTime: 60 * 60 * 1000, // Cache 1 hour, rarely changes
        });
    };

    // GET /api/v1/interests/{id}
    const useInterest = (id?: string | null) => {
        return useQuery({
            queryKey: interestKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Interest ID required");
                const { data } = await instance.get<AppApiResponse<InterestResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/interests
    const useCreateInterest = () => {
        return useMutation({
            mutationFn: async (req: InterestRequest) => {
                const { data } = await instance.post<AppApiResponse<InterestResponse>>(BASE, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: interestKeys.all }),
        });
    };

    // PUT /api/v1/interests/{id}
    const useUpdateInterest = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: InterestRequest }) => {
                const { data } = await instance.put<AppApiResponse<InterestResponse>>(
                    `${BASE}/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: interestKeys.lists() });
                queryClient.invalidateQueries({ queryKey: interestKeys.detail(data.interestId) });
            },
        });
    };

    // DELETE /api/v1/interests/{id}
    const useDeleteInterest = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: interestKeys.all }),
        });
    };

    return {
        useAllInterests,
        useInterest,
        useCreateInterest,
        useUpdateInterest,
        useDeleteInterest,
    };
};