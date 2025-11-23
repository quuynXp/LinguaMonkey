import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    PermissionResponse,
    PermissionRequest,
} from "../types/dto";

// --- Keys Factory ---
export const permissionKeys = {
    all: ["permissions"] as const,
    lists: (params: any) => [...permissionKeys.all, "list", params] as const,
    detail: (id: string) => [...permissionKeys.all, "detail", id] as const,
};

// --- Helper to standardize pagination return ---
const mapPageResponse = <T>(result: any, page: number, size: number) => ({
    data: (result?.content as T[]) || [],
    pagination: {
        pageNumber: result?.pageNumber ?? page,
        pageSize: result?.pageSize ?? size,
        totalElements: result?.totalElements ?? 0,
        totalPages: result?.totalPages ?? 0,
        isLast: result?.isLast ?? true,
        isFirst: result?.isFirst ?? true,
        hasNext: result?.hasNext ?? false,
        hasPrevious: result?.hasPrevious ?? false,
    },
});

/**
 * Hook: usePermissions
 * Handles all CRUD operations for system permissions (Admin access required).
 */
export const usePermissions = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/permissions
    const useAllPermissions = (params?: { name?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10, name } = params || {};
        return useQuery({
            queryKey: permissionKeys.lists(params),
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (name) qp.append("name", name);
                qp.append("page", String(page));
                qp.append("size", String(size));

                const { data } = await instance.get<AppApiResponse<PageResponse<PermissionResponse>>>(
                    `/api/v1/permissions?${qp.toString()}`
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/permissions/{id}
    const usePermission = (id?: string | null) => {
        return useQuery({
            queryKey: permissionKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Permission ID required");
                const { data } = await instance.get<AppApiResponse<PermissionResponse>>(
                    `/api/v1/permissions/${id}`
                );
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/permissions
    const useCreatePermission = () => {
        return useMutation({
            mutationFn: async (req: PermissionRequest) => {
                const { data } = await instance.post<AppApiResponse<PermissionResponse>>(
                    "/api/v1/permissions",
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: permissionKeys.all }),
        });
    };

    // PUT /api/v1/permissions/{id}
    const useUpdatePermission = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: PermissionRequest }) => {
                const { data } = await instance.put<AppApiResponse<PermissionResponse>>(
                    `/api/v1/permissions/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: permissionKeys.detail(data.permissionId) });
                queryClient.invalidateQueries({ queryKey: permissionKeys.all });
            },
        });
    };

    // DELETE /api/v1/permissions/{id}
    const useDeletePermission = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`/api/v1/permissions/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: permissionKeys.all }),
        });
    };

    return {
        useAllPermissions,
        usePermission,
        useCreatePermission,
        useUpdatePermission,
        useDeletePermission,
    };
};