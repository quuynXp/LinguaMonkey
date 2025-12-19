import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  MemorizationResponse,
  MemorizationRequest
} from "../types/dto";

export const memorizationKeys = {
  all: ["memorizations"] as const,
  lists: () => [...memorizationKeys.all, "list"] as const,
  list: (params: any) => [...memorizationKeys.lists(), params] as const,
};

export const useMemorizations = () => {
  const queryClient = useQueryClient();

  const useUserMemorizations = (params?: {
    userId?: string;
    content_type?: string;
    page?: number;
    size?: number;
    keyword?: string;
  }) => {
    return useQuery({
      queryKey: memorizationKeys.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.userId) qp.append("userId", params.userId);

        if (params?.content_type) qp.append("contentType", params.content_type);
        if (params?.keyword) qp.append("keyword", params.keyword);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<MemorizationResponse>>>(
          `/api/v1/memorizations?${qp.toString()}`
        );
        return data.result;
      },
      enabled: !!params?.userId,
      staleTime: 60_000,
    });
  };

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
        queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      },
    });
  };

  const useUpdateMemorization = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: MemorizationRequest }) => {
        const { data } = await instance.put<AppApiResponse<MemorizationResponse>>(
          `/api/v1/memorizations/${id}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: memorizationKeys.lists() });
      },
    });
  };

  const useDeleteMemorization = () => {
    return useMutation({
      mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
        await instance.delete(`/api/v1/memorizations/${id}?userId=${userId}`);
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
  };
};