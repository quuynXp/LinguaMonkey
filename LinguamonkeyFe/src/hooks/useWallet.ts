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

// --- STRUCTURAL TYPE FOR INVALIDATION ---
// Vì TransactionResponse gốc không chứa senderId/receiverId/requesterId, 
// ta thêm chúng vào đây để code onSuccess có thể truy cập.
type TransactionWithUserIds = TransactionResponse & {
  senderId: string;
  receiverId: string;
  requesterId: string; // Cho Refund
};

// --- Keys Factory ---
export const walletKeys = {
  all: ["wallet"] as const,
  balance: (userId: string) => [...walletKeys.all, "balance", userId] as const,
  history: (userId: string, params: any) => [...walletKeys.all, "history", userId, params] as const,
};

// --- Helper to standardize pagination return ---
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

  // ==========================================
  // === QUERIES ===
  // ==========================================

  // GET /api/v1/wallet/balance
  const useWalletBalance = (userId?: string) => {
    return useQuery({
      queryKey: walletKeys.balance(userId!),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<WalletResponse>>(
          `/api/v1/wallet/balance`,
          { params: { userId } }
        );
        return data.result!;
      },
      enabled: !!userId,
      staleTime: 60000,
    });
  };

  // GET /api/v1/wallet/history
  const useTransactionHistory = (userId?: string, page = 0, size = 10) => {
    const params = { page, size };
    return useQuery({
      queryKey: walletKeys.history(userId!, params),
      queryFn: async () => {
        if (!userId) throw new Error("User ID required");
        const { data } = await instance.get<AppApiResponse<PageResponse<TransactionResponse>>>(
          `/api/v1/wallet/history`,
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

  // ==========================================
  // === MUTATIONS (Transactions) ===
  // ==========================================

  // POST /api/v1/wallet/deposit (Returns payment URL string)
  const useDeposit = () => {
    return useMutation({
      mutationFn: async (payload: DepositRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          "/api/v1/wallet/deposit",
          payload
        );
        return data.result!;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: walletKeys.all });
      },
    });
  };

  // POST /api/v1/wallet/withdraw
  const useWithdraw = () => {
    return useMutation({
      mutationFn: async (payload: WithdrawRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallet/withdraw",
          payload
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // data.userId là trường có sẵn trong TransactionResponse
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.userId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.userId, {}) });
      },
    });
  };

  // POST /api/v1/wallet/transfer
  const useTransfer = () => {
    return useMutation({
      mutationFn: async (payload: TransferRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallet/transfer",
          payload
        );
        return data.result!;
      },
      onSuccess: (data: TransactionWithUserIds) => {
        // FIX: Sử dụng senderId/receiverId từ Structural Type
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.senderId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.receiverId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.senderId, {}) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.receiverId, {}) });
      },
    });
  };

  // POST /api/v1/wallet/refund
  const useRequestRefund = () => {
    return useMutation({
      mutationFn: async (payload: RefundRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallet/refund",
          payload
        );
        return data.result!;
      },
      onSuccess: (data: TransactionWithUserIds) => {
        // FIX: Sử dụng requesterId từ Structural Type
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.requesterId, {}) });
      },
    });
  };

  // POST /api/v1/wallet/webhook
  const useHandleWebhook = () => {
    return useMutation({
      mutationFn: async (payload: WebhookRequest) => {
        const { data } = await instance.post<AppApiResponse<string>>(
          "/api/v1/wallet/webhook",
          payload
        );
        return data.result!;
      },
    });
  };

  // ==========================================
  // === MUTATIONS (Admin) ===
  // ==========================================

  // POST /api/v1/wallet/admin/approve-refund
  const useApproveRefund = () => {
    return useMutation({
      mutationFn: async (payload: ApproveRefundRequest) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallet/admin/approve-refund",
          payload
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // data.userId là trường có sẵn trong TransactionResponse
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(data.userId) });
        queryClient.invalidateQueries({ queryKey: walletKeys.history(data.userId, {}) });
      },
    });
  };

  // POST /api/v1/wallet/admin/reject-refund
  const useRejectRefund = () => {
    return useMutation({
      mutationFn: async ({ refundTransactionId, adminId, reason }: { refundTransactionId: string, adminId: string, reason: string }) => {
        const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
          "/api/v1/wallet/admin/reject-refund",
          null,
          { params: { refundTransactionId, adminId, reason } }
        );
        return data.result!;
      },
      onSuccess: (data) => {
        // data.userId là trường có sẵn trong TransactionResponse
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