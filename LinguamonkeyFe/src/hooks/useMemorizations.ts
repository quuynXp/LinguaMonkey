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

  const useUserMemorizations = (params?: {
    content_type?: string;
    page?: number;
    size?: number;
    keyword?: string;
  }) => {
    return useQuery({
      queryKey: memorizationKeys.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.content_type) qp.append("contentType", params.content_type);
        if (params?.keyword) qp.append("keyword", params.keyword);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<MemorizationResponse>>>(
          `/api/v1/memorizations?${qp.toString()}`
        );

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

  // ==========================================
  // === MUTATIONS ===
  // ==========================================

  const useCreateMemorization = () => {
    return useMutation({
      mutationFn: async (req: MemorizationRequest) => {
        try {
          // LOGGING PAYLOAD BEFORE SEND
          console.log("🔥 [POST] Sending Memorization Payload:", JSON.stringify(req, null, 2));

          const { data } = await instance.post<AppApiResponse<MemorizationResponse>>(
            "/api/v1/memorizations",
            req
          );
          return data.result!;
        } catch (error: any) {
          // LOGGING SERVER ERROR DETAILS
          if (error.response) {
            console.error("🔥 [ERR] Server Response Data:", JSON.stringify(error.response.data, null, 2));
            console.error("🔥 [ERR] Status:", error.response.status);
          }
          throw error;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

  const useUpdateMemorization = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: MemorizationRequest }) => {
        try {
          console.log(`🔥 [PUT] Updating ID: ${id} with Payload:`, JSON.stringify(req, null, 2));
          const { data } = await instance.put<AppApiResponse<MemorizationResponse>>(
            `/api/v1/memorizations/${id}`,
            req
          );
          return data.result!;
        } catch (error: any) {
          if (error.response) {
            console.error("🔥 [ERR] Update Failed Response:", JSON.stringify(error.response.data, null, 2));
          }
          throw error;
        }
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

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