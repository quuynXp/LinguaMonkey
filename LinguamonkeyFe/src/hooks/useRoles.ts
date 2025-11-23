import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    RoleResponse,
    RoleRequest,
} from "../types/dto";

import { RoleName } from "../types/enums";

// --- Keys Factory ---
export const roleKeys = {
    all: ["roles"] as const,
    lists: (params: any) => [...roleKeys.all, "list", params] as const,
    detail: (id: string) => [...roleKeys.all, "detail", id] as const,
    user: (userId: string) => [...roleKeys.all, "user", userId] as const,
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
 * Hook: useRoles
 * Handles all CRUD operations for roles and user-role assignments.
 */
export const useRoles = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. ROLE CRUD QUERIES ===
    // ==========================================

    // GET /api/v1/roles
    const useAllRoles = (params?: { roleName?: RoleName; page?: number; size?: number }) => {
        const { page = 0, size = 10, roleName } = params || {};
        return useQuery({
            queryKey: roleKeys.lists(params),
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (roleName) qp.append("roleName", roleName);
                qp.append("page", String(page));
                qp.append("size", String(size));

                const { data } = await instance.get<AppApiResponse<PageResponse<RoleResponse>>>(
                    `/api/v1/roles?${qp.toString()}`
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/roles/{id}
    const useRole = (id?: string | null) => {
        return useQuery({
            queryKey: roleKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Role ID required");
                const { data } = await instance.get<AppApiResponse<RoleResponse>>(
                    `/api/v1/roles/${id}`
                );
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. ROLE CRUD MUTATIONS ===
    // ==========================================

    // POST /api/v1/roles
    const useCreateRole = () => {
        return useMutation({
            mutationFn: async (req: RoleRequest) => {
                const { data } = await instance.post<AppApiResponse<RoleResponse>>(
                    "/api/v1/roles",
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
        });
    };

    // PUT /api/v1/roles/{id}
    const useUpdateRole = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: RoleRequest }) => {
                const { data } = await instance.put<AppApiResponse<RoleResponse>>(
                    `/api/v1/roles/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: roleKeys.detail(data.roleName) });
                queryClient.invalidateQueries({ queryKey: roleKeys.all });
            },
        });
    };

    // DELETE /api/v1/roles/{id}
    const useDeleteRole = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`/api/v1/roles/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
        });
    };

    // ==========================================
    // === 3. USER ROLE MANAGEMENT ===
    // ==========================================

    // POST /api/v1/roles/assign-default/{userId}
    const useAssignDefaultStudentRole = () => {
        return useMutation({
            mutationFn: async (userId: string) => {
                await instance.post<AppApiResponse<void>>(`/api/v1/roles/assign-default/${userId}`);
            },
            onSuccess: (data, userId) => {
                queryClient.invalidateQueries({ queryKey: roleKeys.user(userId) });
                queryClient.invalidateQueries({ queryKey: ["users", "detail", userId] });
            },
        });
    };

    // POST /api/v1/roles/assign/{userId}?roleName={roleName}
    const useAssignRoleToUser = () => {
        return useMutation({
            mutationFn: async ({ userId, roleName }: { userId: string; roleName: RoleName }) => {
                await instance.post<AppApiResponse<void>>(
                    `/api/v1/roles/assign/${userId}`,
                    null,
                    { params: { roleName } }
                );
            },
            onSuccess: (data, { userId }) => {
                queryClient.invalidateQueries({ queryKey: roleKeys.user(userId) });
                queryClient.invalidateQueries({ queryKey: ["users", "detail", userId] });
            },
        });
    };

    // DELETE /api/v1/roles/remove/{userId}?roleName={roleName}
    const useRemoveRoleFromUser = () => {
        return useMutation({
            mutationFn: async ({ userId, roleName }: { userId: string; roleName: RoleName }) => {
                await instance.delete<AppApiResponse<void>>(
                    `/api/v1/roles/remove/${userId}`,
                    { params: { roleName } }
                );
            },
            onSuccess: (data, { userId }) => {
                queryClient.invalidateQueries({ queryKey: roleKeys.user(userId) });
                queryClient.invalidateQueries({ queryKey: ["users", "detail", userId] });
            },
        });
    };

    // GET /api/v1/roles/has-role/{userId}?roleName={roleName}
    const useUserHasRole = (userId: string | null, roleName: RoleName) => {
        return useQuery({
            queryKey: [...roleKeys.user(userId!), { roleName }],
            queryFn: async () => {
                if (!userId) throw new Error("User ID required");
                const { data } = await instance.get<AppApiResponse<boolean>>(
                    `/api/v1/roles/has-role/${userId}`,
                    { params: { roleName } }
                );
                return data.result!;
            },
            enabled: !!userId,
        });
    };

    return {
        useAllRoles,
        useRole,
        useCreateRole,
        useUpdateRole,
        useDeleteRole,
        useAssignDefaultStudentRole,
        useAssignRoleToUser,
        useRemoveRoleFromUser,
        useUserHasRole,
    };
};