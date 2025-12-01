import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    PageResponse,
    UserResponse,
    ChatMessageResponse,
    CourseResponse,
    LessonResponse,
    NotificationResponse,
    MemorizationResponse,
} from "../types/dto";

// --- Keys Factory ---
export const searchKeys = {
    all: ["search"] as const,
    results: (type: string, keyword: string, params: any) => [...searchKeys.all, type, keyword, params] as const,
};

// --- Helper to standardize pagination return (Adapting to non-AppApiResponse Page<T>) ---
// Note: Since the Controller returns Page<T> directly (without AppApiResponse wrapper),
// the axios response data will contain the Page structure at the root.
// --- Helper to standardize pagination return (Adapting to non-AppApiResponse Page<T>) ---
const mapSearchPageResponse = <T>(result: any, page: number, size: number) => ({
    content: (result?.content as T[]) || [],
    pageNumber: result?.number ?? page,
    pageSize: result?.size ?? size,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLast: result?.last ?? true,
    isFirst: result?.first ?? true,
    hasNext: result ? !result.last : false,
    hasPrevious: result ? !result.first : false,
});

/**
 * Hook: useSearch
 * Handles global search operations across various domains using Elasticsearch.
 */
export const useSearch = () => {
    const BASE = "/api/v1/search";

    // 1. GET /api/v1/search/users
    const useSearchUsers = (
        keyword: string,
        filters?: { country?: string; gender?: string; ageRange?: string },
        page = 0,
        size = 10,
        enabled: boolean = true
    ) => {
        const params = { keyword, page, size, ...filters };
        return useInfiniteQuery({
            queryKey: searchKeys.results("users", keyword, params),
            queryFn: async ({ pageParam = 0 }) => {
                const { data } = await instance.get<PageResponse<UserResponse>>(`${BASE}/users`, {
                    params: { ...params, page: pageParam }
                });
                return mapSearchPageResponse<UserResponse>(data, pageParam, size);
            },
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.pageNumber + 1 : undefined,
            enabled: enabled,
        });
    };

    // 2. GET /api/v1/search/messages
    const useSearchMessages = (keyword: string, roomId?: string, page = 0, size = 10, enabled: boolean = true) => {
        const params = { keyword, roomId, page, size };
        return useInfiniteQuery({
            queryKey: searchKeys.results("messages", keyword, params),
            queryFn: async ({ pageParam = 0 }) => {
                const { data } = await instance.get<PageResponse<ChatMessageResponse>>(`${BASE}/messages`, { params: { ...params, page: pageParam } });
                return mapSearchPageResponse<ChatMessageResponse>(data, pageParam, size);
            },
            initialPageParam: 0,
            getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.pageNumber + 1 : undefined,
            enabled: enabled && keyword.length > 2,
        });
    };

    // 3. GET /api/v1/search/courses
    const useSearchCourses = (keyword: string, page = 0, size = 10, enabled: boolean = true) => {
        const params = { keyword, page, size };
        return useQuery({
            queryKey: searchKeys.results("courses", keyword, params),
            queryFn: async () => {
                const { data } = await instance.get<PageResponse<CourseResponse>>(`${BASE}/courses`, { params });
                return mapSearchPageResponse<CourseResponse>(data, page, size);
            },
            enabled: enabled && keyword.length > 2,
        });
    };

    // 4. GET /api/v1/search/lessons
    const useSearchLessons = (keyword: string, page = 0, size = 10, enabled: boolean = true) => {
        const params = { keyword, page, size };
        return useQuery({
            queryKey: searchKeys.results("lessons", keyword, params),
            queryFn: async () => {
                const { data } = await instance.get<PageResponse<LessonResponse>>(`${BASE}/lessons`, { params });
                return mapSearchPageResponse<LessonResponse>(data, page, size);
            },
            enabled: enabled && keyword.length > 2,
        });
    };

    // 5. GET /api/v1/search/notifications
    const useSearchNotifications = (keyword: string, page = 0, size = 10, enabled: boolean = true) => {
        const params = { keyword, page, size };
        return useQuery({
            queryKey: searchKeys.results("notifications", keyword, params),
            queryFn: async () => {
                const { data } = await instance.get<PageResponse<NotificationResponse>>(`${BASE}/notifications`, { params });
                return mapSearchPageResponse<NotificationResponse>(data, page, size);
            },
            enabled: enabled && keyword.length > 2,
        });
    };

    // 6. GET /api/v1/search/memorizations
    const useSearchMemorizations = (keyword: string, page = 0, size = 10, enabled: boolean = true) => {
        const params = { keyword, page, size };
        return useQuery({
            queryKey: searchKeys.results("memorizations", keyword, params),
            queryFn: async () => {
                const { data } = await instance.get<PageResponse<MemorizationResponse>>(`${BASE}/memorizations`, { params });
                return mapSearchPageResponse<MemorizationResponse>(data, page, size);
            },
            enabled: enabled && keyword.length > 2,
        });
    };

    return {
        useSearchUsers,
        useSearchMessages,
        useSearchCourses,
        useSearchLessons,
        useSearchNotifications,
        useSearchMemorizations,
    };
};