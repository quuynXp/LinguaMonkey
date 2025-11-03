import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse } from "../types/api"
import { Wallet, Transaction } from "../types/api"


// --- DTOs cho các request ---
interface DepositRequest {
  userId: string
  amount: number
  provider: "VNPAY" | "STRIPE"
  currency: string
  returnUrl: string
}

interface TransferRequest {
  senderId: string
  receiverId: string
  amount: number
  description?: string
  idempotencyKey: string
}

interface WithdrawRequest {
  userId: string
  amount: number
  provider: "PAYMENT_GATEWAY_NAME"
  // ... (Thêm các trường info bank account của PG)
}

export const useWallet = () => {
  const queryClient = useQueryClient()

  // === QUERIES ===

  const useWalletBalance = (userId?: string) => {
    return useQuery<Wallet>({
      queryKey: ["walletBalance", userId],
      queryFn: async () => {
        if (!userId) throw new Error("User ID is required")
        const response = await instance.get<ApiResponse<Wallet>>(`/wallet/balance?userId=${userId}`)
        return response.data.result!
      },
      enabled: !!userId,
    })
  }

  const useTransactionHistory = (userId?: string, page = 0, size = 20) => {
    return useQuery<PaginatedResponse<Transaction>>({
      queryKey: ["transactionHistory", userId, page, size],
      queryFn: async () => {
        if (!userId) throw new Error("User ID is required")
        const qp = new URLSearchParams()
        qp.append("userId", userId)
        qp.append("page", page.toString())
        qp.append("size", size.toString())
        
        const response = await instance.get<ApiResponse<PaginatedResponse<Transaction>>>(`/wallet/history?${qp.toString()}`)
        return response.data.result || { data: [], pagination: { page, limit: size, total: 0, totalPages: 0 } }
      },
      enabled: !!userId,
    })
  }
  
  // === MUTATIONS ===

  const invalidateWallet = () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] })
      queryClient.invalidateQueries({ queryKey: ["transactionHistory"] })
  }

  const useDeposit = () => {
    return useMutation<string, Error, DepositRequest>({
      mutationFn: async (payload) => {
        const response = await instance.post<ApiResponse<string>>("/wallet/deposit", payload)
        return response.data.result!
      },
      // Không cần invalidate, vì ta sẽ mở webview
      // Webhook sẽ cập nhật BE, và ta sẽ refetch khi user quay lại app
    })
  }

  const useWithdraw = () => {
    return useMutation<Transaction, Error, WithdrawRequest>({
      mutationFn: async (payload) => {
        const response = await instance.post<ApiResponse<Transaction>>("/wallet/withdraw", payload)
        return response.data.result!
      },
      onSuccess: () => {
        invalidateWallet()
      },
    })
  }

  const useTransfer = () => {
    return useMutation<Transaction, Error, TransferRequest>({
      mutationFn: async (payload) => {
        const response = await instance.post<ApiResponse<Transaction>>("/wallet/transfer", payload)
        return response.data.result!
      },
      onSuccess: () => {
        invalidateWallet()
      },
    })
  }

  return {
    useWalletBalance,
    useTransactionHistory,
    useDeposit,
    useWithdraw,
    useTransfer,
  }
}