import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
    AppApiResponse,
    PageResponse,
    Character3dResponse,
    Character3dRequest,
} from "../types/dto";

// --- Keys Factory ---
export const character3dKeys = {
    all: ["character3ds"] as const,
    lists: (params: any) => [...character3dKeys.all, "list", params] as const,
    detail: (id: string) => [...character3dKeys.all, "detail", id] as const,
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
 * Hook: useCharacter3ds
 * Handles all CRUD operations for 3D character models.
 */
export const useCharacter3ds = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/character3ds";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/character3ds
    const useAllCharacter3ds = (params?: { character3dName?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: character3dKeys.lists(params),
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.character3dName) qp.append("character3dName", params.character3dName);
                qp.append("page", String(page));
                qp.append("size", String(size));

                const { data } = await instance.get<AppApiResponse<PageResponse<Character3dResponse>>>(
                    BASE,
                    { params: qp }
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/character3ds/{id}
    const useCharacter3d = (id?: string | null) => {
        return useQuery({
            queryKey: character3dKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Character3d ID required");
                const { data } = await instance.get<AppApiResponse<Character3dResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/character3ds
    const useCreateCharacter3d = () => {
        return useMutation({
            mutationFn: async (req: Character3dRequest) => {
                const { data } = await instance.post<AppApiResponse<Character3dResponse>>(
                    BASE,
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: character3dKeys.all }),
        });
    };

    // PUT /api/v1/character3ds/{id}
    const useUpdateCharacter3d = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: Character3dRequest }) => {
                const { data } = await instance.put<AppApiResponse<Character3dResponse>>(
                    `${BASE}/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: character3dKeys.detail(data.character3dId) });
                queryClient.invalidateQueries({ queryKey: character3dKeys.all });
            },
        });
    };

    // DELETE /api/v1/character3ds/{id}
    const useDeleteCharacter3d = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: character3dKeys.all }),
        });
    };

    return {
        useAllCharacter3ds,
        useCharacter3d,
        useCreateCharacter3d,
        useUpdateCharacter3d,
        useDeleteCharacter3d,
    };
};