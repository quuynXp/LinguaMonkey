import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  WalletResponse,
  TransactionResponse,
  DepositRequest,
  WithdrawRequest,
  TransferRequest,
  RefundRequest,
  WebhookRequest,
  ApproveRefundRequest
} from "../types/dto";

type TransactionWithUserIds = TransactionResponse & {
  senderId: string;
  receiverId: string;
  requesterId: string;
};

export const walletKeys = {
  all: ["wallet"] as const,
  balance: (userId: string) => [...walletKeys.all, "balance", userId] as const,
  history: (userId: string, params: any) => [...walletKeys.all, "history", userId, params] as const,
};

const mapPageResponse = <T>(result: any, page: number, size: number) => ({
  data: (result?.content as T[]) || [],
  pagination: {
    pageNumber: result?.number ?? page,
    pageSize: result?.size ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.last ?? true,
    isFirst: result?.first ?? true,
    hasNext: result?.hasNext ?? false,
    hasPrevious: result?.first ?? false,
  },
});

export const useWallet = () => {
  const queryClient = useQueryClient();

  const useWalletBalance = (userId?: string) => {
    return useQuery({
      queryKey: walletKeys.balance(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<WalletResponse>>(
          `/api/v1/wallets/balance`,
          { params: { userId } }
        );
        return data.result!;
      },
      enabled: !!userId,
      staleTime: 60000,
    });
  };

  const useTransactionHistory = (userId?: string, page = 0, size = 10) => {
    const params = { page, size };
    return useQuery({
      queryKey: walletKeys.history(userId!, params),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/wallets/history`,
          { params: { userId, page, size } }
        );
        const pageResult = mapPageResponse(data.result, page, size);
        return {
          ...pageResult,
          hasNextPage: pageResult.pagination.hasNext,
        };
      },
      enabled: !!userId,
      staleTime: 30000,
    });
  };

  const useDeposit = () => {
    return useMutation({
      mutationFn: async (payload: DepositRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          "/api/v1/wallets/deposit",
          payload
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: walletKeys.all });
      },
    });
  };

  const useWithdraw = () => {
    return useMutation({
      mutationFn: async (payload: WithdrawRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallets/withdraw",
          payload
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // Đã xóa invalidateQueries ở đây, vì việc này đã được xử lý bằng userId có sẵn trong WithdrawScreen.tsx
      },
    });
  };

  const useTransfer = () => {
    return useMutation({
      mutationFn: async (payload: TransferRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallets/transfer",
          payload
        );
        return data.result!;
      },
      onSuccess: (data: TransactionWithUserIds) => {
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.senderId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.receiverId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.senderId, {}) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.receiverId, {}) });
      },
    });
  };

  const useRequestRefund = () => {
    return useMutation({
      mutationFn: async (payload: RefundRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallets/refund",
          payload
        );
        return data.result!;
      },
      onSuccess: (data: TransactionWithUserIds) => {
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.requesterId, {}) });
      },
    });
  };

  const useHandleWebhook = () => {
    return useMutation({
      mutationFn: async (payload: WebhookRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          "/api/v1/wallets/webhook",
          payload
        );
        return data.result!;
      },
    });
  };

  const useApproveRefund = () => {
    return useMutation({
      mutationFn: async (payload: ApproveRefundRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallets/admin/approve-refund",
          payload
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.userId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.userId, {}) });
      },
    });
  };

  const useRejectRefund = () => {
    return useMutation({
      mutationFn: async ({ refundTransactionId, adminId, reason }: { refundTransactionId: string, adminId: string, reason: string }) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallets/admin/reject-refund",
          null,
          { params: { refundTransactionId, adminId, reason } }
        );
        return data.result!;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.userId, {}) });
      },
    });
  };

  return {
    useWalletBalance,
    useTransactionHistory,
    useDeposit,
    useWithdraw,
    useTransfer,
    useRequestRefund,
    useHandleWebhook,
    useApproveRefund,
    useRejectRefund,
  };
};