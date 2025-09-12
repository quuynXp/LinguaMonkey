import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "../types/api";

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRequest {
  userId: string;
  amount: number;
  status?: string;
  method?: string;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  method: "VNPAY" | "MOMO" | "STRIPE";
  orderInfo?: string;
}

export interface WebhookRequest {
  provider: "VNPAY" | "MOMO" | "STRIPE";
  payload: any;
}

export const useTransaction = (id?: string) =>
  useQuery<Transaction>({
    queryKey: ["transaction", id],
    queryFn: async () => {
      if (!id) throw new Error("Transaction ID is required");
      const res = await instance.get<ApiResponse<Transaction>>(`/transactions/${id}`);
      return (res.data as any)?.result ?? res.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

export const useTransactions = (params?: { userId?: string; status?: string; page?: number; size?: number }) =>
  useQuery<PaginatedResponse<Transaction>>({
    queryKey: ["transactions", params],
    queryFn: async () => {
      const res = await instance.get<ApiResponse<PaginatedResponse<Transaction>>>(`/transactions`, {
        params,
      });
      return (res.data as any)?.result ?? res.data;
    },
    staleTime: 60 * 1000,
  });

export const useTransactionsByUser = (userId?: string, page?: number, size?: number) =>
  useQuery<PaginatedResponse<Transaction>>({
    queryKey: ["transactions", "user", userId, page, size],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const res = await instance.get<ApiResponse<PaginatedResponse<Transaction>>>(`/transactions/user/${userId}`, {
        params: { page, size },
      });
      return (res.data as any)?.result ?? res.data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TransactionRequest) => {
      const res = await instance.post<ApiResponse<Transaction>>(`/transactions`, payload);
      return (res.data as any)?.result ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionRequest }) => {
      const res = await instance.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
      return (res.data as any)?.result ?? res.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["transaction", id] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await instance.delete<ApiResponse<void>>(`/transactions/${id}`);
      return (res.data as any)?.result ?? res.data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transaction", id] });
    },
  });
};

// 🔥 New Hooks
export const useCreatePayment = () =>
  useMutation({
    mutationFn: async (payload: PaymentRequest) => {
      const res = await instance.post<ApiResponse<string>>(`/transactions/create-payment`, payload);
      return (res.data as any)?.result ?? res.data;
    },
  });

export const useHandleWebhook = () =>
  useMutation({
    mutationFn: async (payload: WebhookRequest) => {
      const res = await instance.post<ApiResponse<string>>(`/transactions/webhook`, payload);
      return (res.data as any)?.result ?? res.data;
    },
  });

export const useTransactionsApi = () => ({
  useTransaction,
  useTransactions,
  useTransactionsByUser,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useCreatePayment,
  useHandleWebhook,
});
