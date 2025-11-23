import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    BasicLessonResponse,
    BasicLessonRequest,
} from "../types/dto";

// --- Keys Factory ---
export const basicLessonKeys = {
    all: ["basicLessons"] as const,
    lists: (languageCode: string, lessonType: string) => [...basicLessonKeys.all, "list", languageCode, lessonType] as const,
    detail: (id: string) => [...basicLessonKeys.all, "detail", id] as const,
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
 * Hook: useBasicLessons
 * Handles CRUD and retrieval for core foundational lessons (e.g., IPA, Basic Characters).
 */
export const useBasicLessons = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/basic-lessons";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/basic-lessons/{id}
    const useBasicLesson = (id?: string | null) => {
        return useQuery({
            queryKey: basicLessonKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Basic Lesson ID required");
                const { data } = await instance.get<AppApiResponse<BasicLessonResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // GET /api/v1/basic-lessons?languageCode={...}&lessonType={...}&page={...}
    const useBasicLessonsList = (languageCode?: string, lessonType?: string, page = 0, size = 10) => {
        const params = { languageCode, lessonType, page, size };
        return useQuery({
            queryKey: basicLessonKeys.lists(languageCode!, lessonType!),
            queryFn: async () => {
                if (!languageCode || !lessonType) return mapPageResponse([], page, size);

                const qp = new URLSearchParams();
                qp.append("languageCode", languageCode);
                qp.append("lessonType", lessonType);
                qp.append("page", String(page));
                qp.append("size", String(size));

                const { data } = await instance.get<AppApiResponse<PageResponse<BasicLessonResponse>>>(
                    `${BASE}?${qp.toString()}`
                );
                return mapPageResponse(data.result, page, size);
            },
            enabled: !!languageCode && !!lessonType,
            staleTime: 60 * 60 * 1000,
        });
    };

    // ==========================================
    // === 2. MUTATIONS ===
    // ==========================================

    // POST /api/v1/basic-lessons
    const useCreateBasicLesson = () => {
        return useMutation({
            mutationFn: async (req: BasicLessonRequest) => {
                const { data } = await instance.post<AppApiResponse<BasicLessonResponse>>(
                    BASE,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                // Invalidate the list relevant to this new lesson
                queryClient.invalidateQueries({
                    queryKey: basicLessonKeys.lists(data.languageCode, data.lessonType)
                });
            },
        });
    };

    // Note: Controller KHÔNG CÓ PUT/DELETE. Nếu bạn muốn thêm, Controller cần được cập nhật.

    return {
        useBasicLesson,
        useBasicLessonsList,
        useCreateBasicLesson,
    };
};