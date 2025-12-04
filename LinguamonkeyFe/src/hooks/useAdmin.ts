import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { AppApiResponse, PageResponse, TransactionResponse } from "../types/dto";

interface RefundRequestResponse {
    refundTransactionId: string;
    originalTransactionId: string;
    requesterName: string;
    requesterEmail: string;
    courseName: string;
    amount: number;
    reason: string;
    status: string;
    requestDate: string;
}

interface RejectRefundPayload {
    id: string;
    adminId: string;
    reason: string;
}

export const useAdmin = () => {
    const queryClient = useQueryClient();

    const usePendingRefunds = (page = 0, size = 10) => {
        return useQuery({
            queryKey: ["admin", "refunds", "pending", page, size],
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<RefundRequestResponse>>>(
                    "/api/v1/transactions/refunds/pending",
                    { params: { page, size } }
                );
                return data.result;
            },
        });
    };

    const useApproveRefund = () => {
        return useMutation({
            mutationFn: async ({ refundTransactionId }: { refundTransactionId: string }) => {
                const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
                    "/api/v1/transactions/refunds/approve",
                    { refundTransactionId }
                );
                return data.result;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
            },
        });
    };

    const useRejectRefund = () => {
        return useMutation({
            mutationFn: async ({ id, adminId, reason }: RejectRefundPayload) => {
                const { data } = await instance.post<AppApiResponse<TransactionResponse>>(
                    `/api/v1/transactions/refunds/${id}/reject`,
                    null,
                    { params: { adminId, reason } }
                );
                return data.result;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
            },
        });
    };

    return {
        usePendingRefunds,
        useApproveRefund,
        useRejectRefund,
    };
};