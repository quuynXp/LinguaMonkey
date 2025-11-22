import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
  AppApiResponse,
  PageResponse,
  UserReminderResponse, // Cần đảm bảo DTO này tồn tại
  UserReminderRequest
} from "../types/dto";

// --- Keys Factory ---
export const reminderKeys = {
  all: ["reminders"] as const,
  lists: () => [...reminderKeys.all, "list"] as const,
  list: (params: any) => [...reminderKeys.lists(), params] as const,
  details: () => [...reminderKeys.all, "detail"] as const,
  detail: (id: string) => [...reminderKeys.details(), id] as const,
};

export const useReminders = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // === QUERIES ===
  // ==========================================

  // GET /api/v1/reminders
  const useUserReminders = (params?: {
    enabled?: boolean;
    page?: number;
    size?: number;
  }) => {
    return useQuery({
      queryKey: reminderKeys.list(params),
      queryFn: async () => {
        const qp = new URLSearchParams();
        if (params?.enabled !== undefined) qp.append("enabled", String(params.enabled));
        if (params?.page !== undefined) qp.append("page", String(params.page));
        if (params?.size !== undefined) qp.append("size", String(params.size));

        const { data } = await instance.get<AppApiResponse<PageResponse<UserReminderResponse>>>(
          `/api/v1/reminders?${qp.toString()}`
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

  // GET /api/v1/reminders/{id} (Optional if Controller supports it, usually list is enough for simple items)
  // Controller created above DOES NOT have getById. Skipping.

  // ==========================================
  // === MUTATIONS ===
  // ==========================================

  // POST /api/v1/reminders
  const useCreateReminder = () => {
    return useMutation({
      mutationFn: async (req: UserReminderRequest) => {
        const { data } = await instance.post<AppApiResponse<UserReminderResponse>>(
          "/api/v1/reminders",
          req
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      },
    });
  };

  // PUT /api/v1/reminders/{id}
  const useUpdateReminder = () => {
    return useMutation({
      mutationFn: async ({ id, req }: { id: string; req: UserReminderRequest }) => {
        const { data } = await instance.put<AppApiResponse<UserReminderResponse>>(
          `/api/v1/reminders/${id}`,
          req
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      },
    });
  };

  // PATCH /api/v1/reminders/{id}/toggle
  const useToggleReminder = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { data } = await instance.patch<AppApiResponse<UserReminderResponse>>(
          `/api/v1/reminders/${id}/toggle`
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      },
    });
  };

  // DELETE /api/v1/reminders/{id}
  const useDeleteReminder = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete<AppApiResponse<void>>(`/api/v1/reminders/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reminderKeys.lists() });
      },
    });
  };

  return {
    useUserReminders,
    useCreateReminder,
    useUpdateReminder,
    useToggleReminder,
    useDeleteReminder,
  };
};