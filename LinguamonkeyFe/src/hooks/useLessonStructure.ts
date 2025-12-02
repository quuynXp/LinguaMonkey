import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    LessonCategoryResponse,
    LessonCategoryRequest,
    LessonSubCategoryResponse,
    LessonSubCategoryRequest,
    LessonSeriesResponse,
    LessonSeriesRequest,
    LessonOrderInSeriesResponse,
    LessonOrderInSeriesRequest,
    LessonReviewResponse,
    LessonReviewRequest
} from "../types/dto";

// --- HYBRID MAPPER: Bắt cả 2 trường hợp tên biến (Spring Default & Custom DTO) ---
const mapPageResponse = <T>(result: any, page: number, size: number) => {
    if (!result) {
        return {
            data: [] as T[],
            pagination: {
                pageNumber: page,
                pageSize: size,
                totalElements: 0,
                totalPages: 0,
                isLast: true,
                isFirst: true,
                hasNext: false,
                hasPrevious: false,
            },
        };
    }

    return {
        data: (result?.content as T[]) || [],
        pagination: {
            // Check cả 2 trường hợp: pageNumber (custom) HOẶC number (Spring default)
            pageNumber: result?.pageNumber ?? result?.number ?? page,
            pageSize: result?.pageSize ?? result?.size ?? size,
            totalElements: result?.totalElements ?? 0,
            totalPages: result?.totalPages ?? 0,

            // Check cả 2 trường hợp: isLast (custom) HOẶC last (Spring default)
            isLast: result?.isLast ?? result?.last ?? true,
            isFirst: result?.isFirst ?? result?.first ?? true,

            // Logic tính toán fallback
            hasNext: result?.hasNext ?? !(result?.last ?? result?.isLast ?? true),
            hasPrevious: result?.hasPrevious ?? !(result?.first ?? result?.isFirst ?? true),
        },
    };
};

export const useLessonStructure = () => {
    const queryClient = useQueryClient();

    // ==========================================
    // === 1. CATEGORIES ===
    // ==========================================

    const useCategories = (params?: { name?: string; lang?: string; page?: number; size?: number }) => {
        return useQuery({
            queryKey: ["lessonCategories", params],
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.name) qp.append("lessonCategoryName", params.name);
                if (params?.lang) qp.append("languageCode", params.lang);
                if (params?.page !== undefined) qp.append("page", String(params.page));
                if (params?.size !== undefined) qp.append("size", String(params.size));

                const { data } = await instance.get<AppApiResponse<PageResponse<LessonCategoryResponse>>>(
                    `/api/v1/lesson-categories?${qp.toString()}`
                );
                return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
            },
            staleTime: 60 * 60 * 1000,
        });
    };

    const useCreateCategory = () => {
        return useMutation({
            mutationFn: async (req: LessonCategoryRequest) => {
                const { data } = await instance.post<AppApiResponse<LessonCategoryResponse>>("/api/v1/lesson-categories", req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonCategories"] }),
        });
    };

    const useUpdateCategory = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: LessonCategoryRequest }) => {
                const { data } = await instance.put<AppApiResponse<LessonCategoryResponse>>(`/api/v1/lesson-categories/${id}`, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonCategories"] }),
        });
    };

    const useDeleteCategory = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete(`/api/v1/lesson-categories/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonCategories"] }),
        });
    };

    // ==========================================
    // === 2. SUB-CATEGORIES ===
    // ==========================================

    const useSubCategories = (params?: { catId?: string; lang?: string; page?: number; size?: number }) => {
        return useQuery({
            queryKey: ["lessonSubCategories", params],
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.catId) qp.append("lessonCategoryId", params.catId);
                if (params?.lang) qp.append("languageCode", params.lang);
                if (params?.page !== undefined) qp.append("page", String(params.page));
                if (params?.size !== undefined) qp.append("size", String(params.size));

                const { data } = await instance.get<AppApiResponse<PageResponse<LessonSubCategoryResponse>>>(
                    `/api/v1/lesson-sub-categories?${qp.toString()}`
                );
                return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
            },
            staleTime: 60 * 60 * 1000,
        });
    };

    const useCreateSubCategory = () => {
        return useMutation({
            mutationFn: async (req: LessonSubCategoryRequest) => {
                const { data } = await instance.post<AppApiResponse<LessonSubCategoryResponse>>("/api/v1/lesson-sub-categories", req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSubCategories"] }),
        });
    };

    const useUpdateSubCategory = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: LessonSubCategoryRequest }) => {
                const { data } = await instance.put<AppApiResponse<LessonSubCategoryResponse>>(`/api/v1/lesson-sub-categories/${id}`, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSubCategories"] }),
        });
    };

    const useDeleteSubCategory = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete(`/api/v1/lesson-sub-categories/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSubCategories"] }),
        });
    };

    // ==========================================
    // === 3. SERIES & ORDER ===
    // ==========================================

    const useSeries = (params?: { name?: string; lang?: string; page?: number; size?: number }) => {
        return useQuery({
            queryKey: ["lessonSeries", params],
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.name) qp.append("lessonSeriesName", params.name);
                if (params?.lang) qp.append("languageCode", params.lang);
                if (params?.page !== undefined) qp.append("page", String(params.page));
                if (params?.size !== undefined) qp.append("size", String(params.size));

                const { data } = await instance.get<AppApiResponse<PageResponse<LessonSeriesResponse>>>(
                    `/api/v1/lesson-series?${qp.toString()}`
                );
                return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
            },
            staleTime: 60 * 60 * 1000,
        });
    };

    const useCreateSeries = () => {
        return useMutation({
            mutationFn: async (req: LessonSeriesRequest) => {
                const { data } = await instance.post<AppApiResponse<LessonSeriesResponse>>("/api/v1/lesson-series", req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSeries"] }),
        });
    };

    const useUpdateSeries = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: LessonSeriesRequest }) => {
                const { data } = await instance.put<AppApiResponse<LessonSeriesResponse>>(`/api/v1/lesson-series/${id}`, req);
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSeries"] }),
        });
    };

    const useDeleteSeries = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete(`/api/v1/lesson-series/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonSeries"] }),
        });
    };

    const useSeriesOrders = (params?: { lessonId?: string; seriesId?: string; page?: number; size?: number }) => {
        return useQuery({
            queryKey: ["lessonOrderInSeries", params],
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.lessonId) qp.append("lessonId", params.lessonId);
                if (params?.seriesId) qp.append("lessonSeriesId", params.seriesId);
                if (params?.page !== undefined) qp.append("page", String(params.page));
                if (params?.size !== undefined) qp.append("size", String(params.size));

                const { data } = await instance.get<AppApiResponse<PageResponse<LessonOrderInSeriesResponse>>>(
                    `/api/v1/lesson-order-in-series?${qp.toString()}`
                );
                return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
            },
        });
    };

    const useUpdateSeriesOrder = () => {
        return useMutation({
            mutationFn: async ({ lId, sId, req }: { lId: string; sId: string; req: LessonOrderInSeriesRequest }) => {
                const { data } = await instance.put<AppApiResponse<LessonOrderInSeriesResponse>>(
                    `/api/v1/lesson-order-in-series/${lId}/${sId}`,
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonOrderInSeries"] }),
        });
    };

    // ==========================================
    // === 4. LESSON REVIEWS ===
    // ==========================================

    const useReviews = (params?: { lessonId?: string; page?: number; size?: number }) => {
        return useQuery({
            queryKey: ["lessonReviews", params],
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.lessonId) qp.append("lessonId", params.lessonId);
                if (params?.page !== undefined) qp.append("page", String(params.page));
                if (params?.size !== undefined) qp.append("size", String(params.size));

                const { data } = await instance.get<AppApiResponse<PageResponse<LessonReviewResponse>>>(
                    `/api/v1/lesson-reviews?${qp.toString()}`
                );
                return mapPageResponse(data.result, params?.page || 0, params?.size || 20);
            },
            staleTime: 60 * 1000,
        });
    };

    const useReviewById = (id: string, enabled: boolean = true) => {
        return useQuery({
            queryKey: ["lessonReview", id],
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<LessonReviewResponse>>(`/api/v1/lesson-reviews/${id}`);
                return data.result!;
            },
            enabled: enabled,
            staleTime: 60 * 1000,
        });
    };

    const useCreateReview = () => {
        return useMutation({
            mutationFn: async (req: LessonReviewRequest) => {
                const { data } = await instance.post<AppApiResponse<LessonReviewResponse>>("/api/v1/lesson-reviews", req);
                return data.result!;
            },
            onSuccess: (newReview) => {
                queryClient.invalidateQueries({ queryKey: ["lessonReviews"] });
                queryClient.setQueryData(["lessonReview", newReview.lessonId], newReview);
            },
        });
    };

    const useUpdateReview = () => {
        return useMutation({
            mutationFn: async ({ id, userId, req }: { id: string; userId: string; req: LessonReviewRequest }) => {
                const { data } = await instance.put<AppApiResponse<LessonReviewResponse>>(`/api/v1/lesson-reviews/${id}?userId=${userId}`, req);
                return data.result!;
            },
            onSuccess: (updatedReview) => {
                queryClient.invalidateQueries({ queryKey: ["lessonReviews"] });
                queryClient.setQueryData(["lessonReview", updatedReview.lessonId], updatedReview);
            },
        });
    };

    const useDeleteReview = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete(`/api/v1/lesson-reviews/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessonReviews"] }),
        });
    };

    return {
        useCategories,
        useCreateCategory,
        useUpdateCategory,
        useDeleteCategory,
        useSubCategories,
        useCreateSubCategory,
        useUpdateSubCategory,
        useDeleteSubCategory,
        useSeries,
        useCreateSeries,
        useUpdateSeries,
        useDeleteSeries,
        useSeriesOrders,
        useUpdateSeriesOrder,
        useReviews,
        useReviewById,
        useCreateReview,
        useUpdateReview,
        useDeleteReview,
    };
};