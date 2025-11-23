import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
    AppApiResponse,
    PageResponse,
    EventResponse,
    EventRequest,
} from "../types/dto";

// --- Keys Factory ---
export const eventKeys = {
    all: ["events"] as const,
    lists: (params: any) => [...eventKeys.all, "list", params] as const,
    detail: (id: string) => [...eventKeys.all, "detail", id] as const,
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
 * Hook: useEvents 🗓️
 * Handles all CRUD operations for system events/challenges.
 */
export const useEvents = () => {
    const queryClient = useQueryClient();
    const BASE = "/api/v1/events";

    // ==========================================
    // === 1. QUERIES ===
    // ==========================================

    // GET /api/v1/events
    const useAllEvents = (params?: { eventType?: string; page?: number; size?: number }) => {
        const { page = 0, size = 10 } = params || {};
        return useQuery({
            queryKey: eventKeys.lists(params),
            queryFn: async () => {
                const qp = new URLSearchParams();
                if (params?.eventType) qp.append("eventType", params.eventType);
                qp.append("page", String(page));
                qp.append("size", String(size));

                const { data } = await instance.get<AppApiResponse<PageResponse<EventResponse>>>(
                    BASE,
                    { params: qp }
                );
                return mapPageResponse(data.result, page, size);
            },
            staleTime: 5 * 60 * 1000,
        });
    };

    // GET /api/v1/events/{id}
    const useEvent = (id?: string | null) => {
        return useQuery({
            queryKey: eventKeys.detail(id!),
            queryFn: async () => {
                if (!id) throw new Error("Event ID required");
                const { data } = await instance.get<AppApiResponse<EventResponse>>(`${BASE}/${id}`);
                return data.result!;
            },
            enabled: !!id,
        });
    };

    // ==========================================
    // === 2. MUTATIONS (CRUD) ===
    // ==========================================

    // POST /api/v1/events
    const useCreateEvent = () => {
        return useMutation({
            mutationFn: async (req: EventRequest) => {
                const { data } = await instance.post<AppApiResponse<EventResponse>>(
                    BASE,
                    req
                );
                return data.result!;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        });
    };

    // PUT /api/v1/events/{id}
    const useUpdateEvent = () => {
        return useMutation({
            mutationFn: async ({ id, req }: { id: string; req: EventRequest }) => {
                const { data } = await instance.put<AppApiResponse<EventResponse>>(
                    `${BASE}/${id}`,
                    req
                );
                return data.result!;
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
                queryClient.invalidateQueries({ queryKey: eventKeys.all });
            },
        });
    };

    // DELETE /api/v1/events/{id}
    const useDeleteEvent = () => {
        return useMutation({
            mutationFn: async (id: string) => {
                await instance.delete<AppApiResponse<void>>(`${BASE}/${id}`);
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        });
    };

    return {
        useAllEvents,
        useEvent,
        useCreateEvent,
        useUpdateEvent,
        useDeleteEvent,
    };
};