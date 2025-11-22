import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
  AppApiResponse,
  PageResponse,
  TransactionResponse,
  TransactionRequest,
  PaymentRequest,
  WebhookRequest,
} from "../types/dto";

// --- Keys Factory ---
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: (params: any) => [...transactionKeys.all, "list", params] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
  byUser: (userId: string, params: any) => [...transactionKeys.all, "user", userId, params] as const,
};

// ==========================================
// === HELPER ===
// ==========================================

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

// ==========================================
// === HOOK LIBRARY ===
// ==========================================

export const useTransactionsApi = () => {
  const queryClient = useQueryClient();

  // GET /api/v1/transactions/{id}
  const useTransaction = (id?: string) =>
    useQuery({
      queryKey: transactionKeys.detail(id!),
      queryFn: async () => {
        if (!id) throw new Error("Transaction ID is required");
        const { data } = await instance.get<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions/${id}`
        );
        return data.result!;
      },
      enabled: !!id,
      staleTime: 60 * 1000,
    });

  // GET /api/v1/transactions
  const useTransactions = (params?: { userId?: string; status?: string; page?: number; size?: number }) => {
    const { page = 0, size = 10 } = params || {};
    return useQuery({
      queryKey: transactionKeys.lists(params),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/transactions`,
          { params: { ...params, page, size } }
        );
        return mapPageResponse(data.result, page, size);
      },
      staleTime: 60 * 1000,
    });
  };

  // GET /api/v1/transactions/user/{userId}
  const useTransactionsByUser = (userId?: string, page?: number, size?: number) => {
    const p = { page: page || 0, size: size || 10 };
    return useQuery({
      queryKey: transactionKeys.byUser(userId!, p),
      queryFn: async () => {
        if (!userId) throw new Error("User ID is required");
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/transactions/user/${userId}`,
          { params: p }
        );
        return mapPageResponse(data.result, p.page, p.size);
      },
      enabled: !!userId,
      staleTime: 60 * 1000,
    });
  };

  // POST /api/v1/transactions
  const useCreateTransaction = () => {
    return useMutation({
      mutationFn: async (payload: TransactionRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions`,
          payload
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });
  };

  // PUT /api/v1/transactions/{id}
  const useUpdateTransaction = () => {
    return useMutation({
      mutationFn: async ({ id, data: req }: { id: string; data: TransactionRequest }) => {
        const { data } = await instance.put<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions/${id}`,
          req
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.detail(data.transactionId) });
        queryClient.invalidateQueries({ queryKey: transactionKeys.lists({}) });
      },
    });
  };

  // DELETE /api/v1/transactions/{id}
  const useDeleteTransaction = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await instance.delete<AppApiResponse<void>>(`/api/v1/transactions/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });
  };

  // POST /api/v1/transactions/create-payment (Returns URL string)
  const useCreatePayment = () =>
    useMutation({
      mutationFn: async (payload: PaymentRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          `/api/v1/transactions/create-payment`,
          payload
        );
        return data.result!;
      },
      onSuccess: () => {
        // Invalidate lists as a new PENDING transaction is likely created
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });

  // POST /api/v1/transactions/webhook (No invalidation needed here, scheduler handles status)
  const useHandleWebhook = () =>
    useMutation({
      mutationFn: async (payload: WebhookRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          `/api/v1/transactions/webhook`,
          payload
        );
        return data.result!;
      },
    });

  return {
    useTransaction,
    useTransactions,
    useTransactionsByUser,
    useCreateTransaction,
    useUpdateTransaction,
    useDeleteTransaction,
    useCreatePayment,
    useHandleWebhook,
  };
};