import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  MemorizationResponse,
  MemorizationRequest
} from "../types/dto";

// --- Keys Factory ---
export const memorizationKeys = {
  all: ["memorizations"] as const,
  lists: () => [...memorizationKeys.all, "list"] as const,
  list: (params: any) => [...memorizationKeys.lists(), params] as const,
  details: () => [...memorizationKeys.all, "detail"] as const,
  detail: (id: string) => [...memorizationKeys.details(), id] as const,
};

export const useMemorizations = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === QUERIES ===
  // ==========================================

  // GET /api/v1/memorizations
  const useUserMemorizations = (params?: {
    content_type?: string;
    page?: number;
    size?: number;
  }) => {
    return useQuery({
      queryKey: memorizationKeys.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.content_type) qp.append("contentType", params.content_type);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<MemorizationResponse>>>(
          `/api/v1/memorizations?${qp.toString()}`
        );

        // Map response standard
        return {
          data: data.result?.content || [],
          pagination: {
            pageNumber: data.result?.pageNumber ?? (params?.page || 0),
            pageSize: data.result?.pageSize ?? (params?.size || 10),
            totalElements: data.result?.totalElements ?? 0,
            totalPages: data.result?.totalPages ?? 0,
            isLast: data.result?.isLast ?? true,
            isFirst: data.result?.isFirst ?? true,
            hasNext: data.result?.hasNext ?? false,
            hasPrevious: data.result?.hasPrevious ?? false,
          }
        };
      },
      staleTime: 60_000,
    });
  };

  // Note: Controller does NOT have getById endpoint explicitly listed in snippet provided!
  // It only has save, update, delete, getAll.
  // Assuming getAll filters sufficiently or Client filters from list.
  // If getById is needed, backend should add: @GetMapping("/{id}")
  // I will disable useMemorization hook or map it to getAll filtering if possible, 
  // but strictly following controller, it's missing.
  // I'll remove useMemorization to stay strict to provided controller.

  // ==========================================
  // === MUTATIONS ===
  // ==========================================

  // POST /api/v1/memorizations
  const useCreateMemorization = () => {
    return useMutation({
      mutationFn: async (req: MemorizationRequest) => {
        const { data } = await instance.post<AppApiResponse<MemorizationResponse>>(
          "/api/v1/memorizations",
          req
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

  // PUT /api/v1/memorizations/{id}
  const useUpdateMemorization = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: MemorizationRequest }) => {
        const { data } = await instance.put<AppApiResponse<MemorizationResponse>>(
          `/api/v1/memorizations/${id}`,
          req
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
        // Invalidate detail if caching individually
        // queryClient.invalidateQueries({ queryKey: memorizationKeys.detail(data.memorizationId) });
      },
    });
  };

  // DELETE /api/v1/memorizations/{id}
  const useDeleteMemorization = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete<AppApiResponse<void>>(`/api/v1/memorizations/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

  // Toggle Favorite Logic (Helper using Update)
  // Since controller has no specific toggle endpoint, we fetch the item (or use passed data), flip boolean, and call update.
  // This hook requires passing the FULL current object to be safe, or at least enough fields to make a valid PUT request.
  // Simplest way: UI passes current isFavorite and other required fields.
  const useToggleFavorite = () => {
    return useMutation({
      mutationFn: async ({ id, currentReq }: { id: string; currentReq: MemorizationRequest }) => {
        const updatedReq = { ...currentReq, isFavorite: !currentReq.isFavorite };
        const { data } = await instance.put<AppApiResponse<MemorizationResponse>>(
          `/api/v1/memorizations/${id}`,
          updatedReq
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

  return {
    useUserMemorizations,
    useCreateMemorization,
    useUpdateMemorization,
    useDeleteMemorization,
    useToggleFavorite,
  };
};