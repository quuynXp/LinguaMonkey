import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import instance from '../api/axiosInstance';
import type { ApiResponse, PaginatedResponse } from '../types/api';

interface Wallet {
  walletId: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'REFUND' | 'TRANSFER_RECEIVE';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'PENDING_REFUND' | 'REFUNDED';
  provider: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const useWallet = () => {
  const queryClient = useQueryClient();

  // === QUERIES ===
  const useWalletBalance = (userId?: string) => {
    return useQuery<Wallet>({
      queryKey: ['wallet', userId],
      queryFn: async () => {
        if (!userId) throw new Error('User ID required');
        const res = await instance.get<ApiResponse<Wallet>>(
          `/api/v1/wallet/balance?userId=${userId}`
        );
        return res.data.result!;
      },
      enabled: !!userId,
      staleTime: 60000,
    });
  };

  const useTransactionHistory = (userId?: string, page = 0, size = 10) => {
    return useQuery<PaginatedResponse<Transaction> & { hasNextPage?: boolean }>({
      queryKey: ['transactions', userId, page, size],
      queryFn: async () => {
        if (!userId) throw new Error('User ID required');
        const res = await instance.get<ApiResponse<PaginatedResponse<Transaction>>>(
          `/api/v1/wallet/history?userId=${userId}&page=${page}&size=${size}`
        );
        const data = res.data.result!;
        return {
          ...data,
          hasNextPage: page < (data.pagination?.totalPages ?? 0) - 1,
        };
      },
      enabled: !!userId,
      staleTime: 30000,
    });
  };

  // === MUTATIONS ===
  const useDeposit = () => {
    return useMutation<
      string,
      { message: string },
      {
        userId: string;
        amount: number;
        provider: 'VNPAY' | 'STRIPE';
        currency: string;
        returnUrl: string;
      }
    >({
      mutationFn: async (payload) => {
        const res = await instance.post<ApiResponse<string>>(
          '/api/v1/wallet/deposit',
          payload
        );
        return res.data.result!;
      },
    });
  };

  const useWithdraw = () => {
    return useMutation<
      Transaction,
      { message: string },
      {
        userId: string;
        amount: number;
        provider: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
      }
    >({
      mutationFn: async (payload) => {
        const res = await instance.post<ApiResponse<Transaction>>(
          '/api/v1/wallet/withdraw',
          payload
        );
        return res.data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });
  };

  const useTransfer = () => {
    return useMutation<
      Transaction,
      { message: string },
      {
        senderId: string;
        receiverId: string;
        amount: number;
        description?: string;
        idempotencyKey: string;
      }
    >({
      mutationFn: async (payload) => {
        const res = await instance.post<ApiResponse<Transaction>>(
          '/api/v1/wallet/transfer',
          payload
        );
        return res.data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });
  };

  return {
    useWalletBalance,
    useTransactionHistory,
    useDeposit,
    useWithdraw,
    useTransfer,
  };
};