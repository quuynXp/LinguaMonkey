import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosInstance";
import {
    AppApiResponse,
    PageResponse,
    LanguageResponse,
    LanguageRequest,
} from "../types/dto";

// --- Keys Factory ---
export const languageKeys = {
    all: ["languages"] as const,
    lists: (params: any) => [...languageKeys.all, "list", params] as const,
    detail: (code: string) => [...languageKeys.all, "detail", code] as const,
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
 * Hook: useLanguages
 * Handles all CRUD operations for system languages using languageCode as the identifier.
 */
export const useLanguages = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/languages";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/languages
    const useAllLanguages = (params?: { languageCode?: string; languageName?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: languageKeys.lists(params),
            queryFn: async () => {
                const { data } = await instance.get<AppApiResponse<PageResponse<LanguageResponse>>>(
                    BASE,
                    { params: { ...params, page, size } }
                );
                return mapPageResponse(data.result, page, size);
            },
            staleTime: 60 * 60 * 1000,
        });
    };

    // GET /api/v1/languages/{id} (Uses languageCode as ID)
    const useLanguage = (languageCode?: string | null) => {
        return useQuery({
            queryKey: languageKeys.detail(languageCode!),
            queryFn: async () => {
                if (!languageCode) throw new Error("Language Code required");
                const { data } = await instance.get<AppApiResponse<LanguageResponse>>(`${BASE}/${languageCode}`);
                return data.result!;
            },
            enabled: !!languageCode,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/languages
    const useCreateLanguage = () => {
        return useMutation({
            mutationFn: async (req: LanguageRequest) => {
                const { data } = await instance.post<AppApiResponse<LanguageResponse>>(BASE, req);
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: languageKeys.lists({}) });
                queryClient.invalidateQueries({ queryKey: languageKeys.detail(data.languageCode) });
            },
        });
    };

    // PUT /api/v1/languages/{id} (Uses languageCode as ID)
    const useUpdateLanguage = () => {
        return useMutation({
            mutationFn: async ({ languageCode, req }: { languageCode: string; req: LanguageRequest }) => {
                const { data } = await instance.put<AppApiResponse<LanguageResponse>>(
                    `${BASE}/${languageCode}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: languageKeys.lists({}) });
                queryClient.invalidateQueries({ queryKey: languageKeys.detail(data.languageCode) });
            },
        });
    };

    // DELETE /api/v1/languages/{id} (Uses languageCode as ID)
    const useDeleteLanguage = () => {
        return useMutation({
            mutationFn: async (languageCode: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${languageCode}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: languageKeys.lists({}) }),
        });
    };

    return {
        useAllLanguages,
        useLanguage,
        useCreateLanguage,
        useUpdateLanguage,
        useDeleteLanguage,
    };
};