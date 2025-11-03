import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "../types/api";


export const useUserLearningActivities = () => {
  const queryClient = useQueryClient();
  const BASE = "/api/v1/user-learning-activities";

  const useAllActivities = (params?: { userId?: string; page?: number; size?: number; sort?: string }) => {
    return useQuery({
      queryKey: ["userLearningActivities", params || {}],
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.userId) qp.append("userId", params.userId);
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));
        if (params?.sort) qp.append("sort", params.sort);
        const url = qp.toString() ? `${BASE}?${qp.toString()}` : BASE;
        const res = await instance.get<ApiResponse<any>>(url);
        return res.data.result;
      },
      staleTime: 60_000,
    });
  };

  const useGetActivity = (id: string | null) => {
    return useQuery({
      queryKey: ["userLearningActivity", id],
      queryFn: async () => {
        if (!id) throw new Error("id required");
        const res = await instance.get<ApiResponse<any>>(`${BASE}/${id}`);
        return res.data.result!;
      },
      enabled: !!id,
      staleTime: 60_000,
    });
  };

  const useCreateActivity = () => {
    const mutation = useMutation({
      mutationFn: async (payload: any) => {
        const res = await instance.post<ApiResponse<any>>(BASE, payload);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey : ["userLearningActivities"]}),
    });
    return { createActivity: mutation.mutateAsync, isCreating: mutation.isPending, error: mutation.error };
  };

  const useUpdateActivity = () => {
    const mutation = useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
        const res = await instance.put<ApiResponse<any>>(`${BASE}/${id}`, payload);
        return res.data.result!;
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey : ["userLearningActivities"]}),
    });
    return { updateActivity: mutation.mutateAsync, isUpdating: mutation.isPending, error: mutation.error };
  };

  const useDeleteActivity = () => {
    const mutation = useMutation({
      mutationFn: async (id: string) => {
        const res = await instance.delete<ApiResponse<void>>(`${BASE}/${id}`);
        return res.data;
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey : ["userLearningActivities"]}),
    });
    return { deleteActivity: mutation.mutateAsync, isDeleting: mutation.isPending, error: mutation.error };
  };

  return { useAllActivities, useGetActivity, useCreateActivity, useUpdateActivity, useDeleteActivity };
};