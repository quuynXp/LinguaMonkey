import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  TransactionResponse,
  TransactionRequest,
  PaymentRequest,
  WebhookRequest,
  WithdrawRequest,
} from "../types/dto";

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: (params: any) => [...transactionKeys.all, "list", params] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
  byUser: (userId: string, params: any) => [...transactionKeys.all, "user", userId, params] as const,
  pendingWithdrawals: (params: any) => [...transactionKeys.all, "pending-withdrawals", params] as const,
};

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

export const useTransactionsApi = () => {
  const queryClient = useQueryClient();

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

  const useTransactions = (params?: { userId?: string; status?: string; page?: number; size?: number }) => {
    const { page = 0, size = 10 } = params || {};
    const sortParam = "createdAt,desc";
    return useQuery({
      queryKey: transactionKeys.lists({ ...params, sort: sortParam }),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/transactions`,
          { params: { ...params, page, size, sort: sortParam } }
        );
        return mapPageResponse(data.result, page, size);
      },
      staleTime: 60 * 1000,
    });
  };

  const useTransactionsByUser = (userId?: string, page?: number, size?: number) => {
    const p = {
      page: page || 0,
      size: size || 20,
      sort: "createdAt,desc"
    };

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

  const useWithdraw = () => {
    return useMutation({
      mutationFn: async (payload: WithdrawRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions/withdraw`,
          payload
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      }
    });
  }

  const usePendingWithdrawals = (page?: number, size?: number) => {
    const p = { page: page || 0, size: size || 10, sort: "createdAt,desc" };
    return useQuery({
      queryKey: transactionKeys.pendingWithdrawals(p),
      queryFn: async () => {
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/transactions/withdrawals/pending`,
          { params: p }
        );
        return mapPageResponse(data.result, p.page, p.size);
      },
      staleTime: 30 * 1000,
    });
  };

  const useApproveWithdrawal = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions/withdrawals/${id}/approve`
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });
  };

  const useRejectWithdrawal = () => {
    return useMutation({
      mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          `/api/v1/transactions/withdrawals/${id}/reject`,
          null,
          { params: { reason } }
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });
  };

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
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      },
    });

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
    useWithdraw,
    usePendingWithdrawals,
    useApproveWithdrawal,
    useRejectWithdrawal,
    useCreateTransaction,
    useUpdateTransaction,
    useDeleteTransaction,
    useCreatePayment,
    useHandleWebhook,
  };
};