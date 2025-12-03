import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import { AppApiResponse, PageResponse, RefundRequestResponse, ApproveRefundRequest } from "../types/dto";

export const adminKeys = {
    refunds: (page: number) => ["admin", "refunds", page] as const,
};

export const useAdmin = () => {
    const queryClient = useQueryClient();

    const usePendingRefunds = (page = 0, size = 10) => {
        return useQuery({
            queryKey: adminKeys.refunds(page),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<RefundRequestResponse>>>(
                    `/api/v1/transactions/refunds/pending?page=${page}&size=${size}`
                );
                return data.result!;
            },
        });
    };

    const useApproveRefund = () => {
        return useMutation({
            mutationFn: async (req: ApproveRefundRequest) => {
                const { data } = await instance.post<AppApiResponse<any>>("/api/v1/transactions/refunds/approve", req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] }),
        });
    };

    const useRejectRefund = () => {
        return useMutation({
            mutationFn: async ({ id, adminId, reason }: { id: string; adminId: string; reason: string }) => {
                const { data } = await instance.post<AppApiResponse<any>>(
                    `/api/v1/transactions/refunds/${id}/reject`,
                    null,
                    { params: { adminId, reason } }
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] }),
        });
    };

    return { usePendingRefunds, useApproveRefund, useRejectRefund };
};