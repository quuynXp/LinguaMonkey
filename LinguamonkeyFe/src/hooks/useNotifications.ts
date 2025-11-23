import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    NotificationResponse,
    NotificationRequest,
} from "../types/dto";

// --- Keys Factory ---
export const notificationKeys = {
    all: ["notifications"] as const,
    lists: (params: any) => [...notificationKeys.all, "list", params] as const,
    detail: (id: string) => [...notificationKeys.all, "detail", id] as const,
    byUser: (userId: string) => [...notificationKeys.all, "user", userId] as const,
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

/**
 * Hook: useNotifications
 * Handles CRUD for notifications and manual email/notification triggers.
 */
export const useNotifications = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. NOTIFICATION CRUD QUERIES ===
    // ==========================================

    // GET /api/v1/notifications
    const useAllNotifications = (params?: { userId?: string; title?: string; type?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: notificationKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<NotificationResponse>>>(
                    `/api/v1/notifications`,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
        });
    };

    // GET /api/v1/notifications/{userId}
    const useNotificationsByUserId = (userId?: string, page = 0, size = 10) => {
        const params = { page, size };
        return useQuery({
            queryKey: notificationKeys.byUser(userId!),
            queryFn: async () => {
                if (!userId) throw new Error("User ID required");
                const { data } = await instance.get<AppApiResponse<PageResponse<NotificationResponse>>>(
                    `/api/v1/notifications/${userId}`,
                    { params }
                );
                return mapPageResponse(data.result, page, size);
            },
            enabled: !!userId,
        });
    };

    // GET /api/v1/notifications/detail/{id}
    const useNotificationDetail = (id?: string | null) => {
        return useQuery({
            queryKey: notificationKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Notification ID required");
                const { data } = await instance.get<AppApiResponse<NotificationResponse>>(
                    `/api/v1/notifications/detail/${id}`
                );
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. NOTIFICATION CRUD MUTATIONS ===
    // ==========================================

    // POST /api/v1/notifications
    const useCreateNotification = () => {
        return useMutation({
            mutationFn: async (req: NotificationRequest) => {
                const { data } = await instance.post<AppApiResponse<NotificationResponse>>(
                    "/api/v1/notifications",
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: notificationKeys.all });
                queryClient.invalidateQueries({ queryKey: notificationKeys.byUser(data.userId) });
            },
        });
    };

    // PUT /api/v1/notifications/{id}
    const useUpdateNotification = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: NotificationRequest }) => {
                const { data } = await instance.put<AppApiResponse<NotificationResponse>>(
                    `/api/v1/notifications/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: notificationKeys.detail(data.notificationId) });
                queryClient.invalidateQueries({ queryKey: notificationKeys.byUser(data.userId) });
            },
        });
    };

    // DELETE /api/v1/notifications/{id}
    const useDeleteNotification = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`/api/v1/notifications/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        });
    };

    // ==========================================
    // === 3. EMAIL TRIGGERS (ADMIN/SYSTEM) ===
    // ==========================================

    // FIX: Đổi tên helper thành custom Hook
    const useCreateEmailMutation = <T extends Record<string, any>>(path: string) => {
        return useMutation({
            mutationFn: async (params: T) => {
                // Params are passed as query string for all email endpoints
                await instance.post<AppApiResponse<void>>(
                    `/api/v1/notifications/email/${path}`,
                    null,
                    { params }
                );
            },
            // No onSuccess invalidation needed as these are side-effect triggers
        });
    };

    // POST /api/v1/notifications/email/purchase-course
    const useSendPurchaseCourseEmail = () =>
        useCreateEmailMutation<{ userId: string; courseName: string }>("purchase-course");

    // POST /api/v1/notifications/email/voucher-registration
    const useSendVoucherRegistrationEmail = () =>
        useCreateEmailMutation<{ userId: string; voucherCode: string }>("voucher-registration");

    // POST /api/v1/notifications/email/achievement
    const useSendAchievementEmail = () =>
        useCreateEmailMutation<{ userId: string; title: string; message: string }>("achievement");

    // POST /api/v1/notifications/email/daily-reminder
    const useSendDailyStudyReminder = () =>
        useCreateEmailMutation<{ userId: string }>("daily-reminder");

    // POST /api/v1/notifications/email/password-reset
    const useSendPasswordResetEmail = () =>
        useCreateEmailMutation<{ userId: string; resetLink: string }>("password-reset");

    // POST /api/v1/notifications/email/verify-account
    const useSendVerifyAccountEmail = () =>
        useCreateEmailMutation<{ userId: string; verifyLink: string }>("verify-account");

    // POST /api/v1/notifications/email/inactivity-warning
    const useSendInactivityWarning = () =>
        useCreateEmailMutation<{ userId: string; days: number }>("inactivity-warning");

    // POST /api/v1/notifications/email/streak-reward
    const useSendStreakRewardEmail = () =>
        useCreateEmailMutation<{ userId: string; streakDays: number }>("streak-reward");


    return {
        // CRUD Queries
        useAllNotifications,
        useNotificationsByUserId,
        useNotificationDetail,

        // CRUD Mutations
        useCreateNotification,
        useUpdateNotification,
        useDeleteNotification,

        // Email Triggers
        useSendPurchaseCourseEmail,
        useSendVoucherRegistrationEmail,
        useSendAchievementEmail,
        useSendDailyStudyReminder,
        useSendPasswordResetEmail,
        useSendVerifyAccountEmail,
        useSendInactivityWarning,
        useSendStreakRewardEmail,
    };
};