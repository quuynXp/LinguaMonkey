import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import instance from "../api/axiosClient";

import {

  AppApiResponse,

  PageResponse,

  LeaderboardResponse,

  LeaderboardEntryResponse,

  LeaderboardRequest,

  LeaderboardEntryRequest

} from "../types/dto";



// --- Query Keys Factory ---

export const leaderboardKeys = {

  all: ["leaderboards"] as const,

  lists: (tab?: string) => [...leaderboardKeys.all, "list", { tab }] as const,

  detail: (id: string) => [...leaderboardKeys.all, "detail", id] as const,

  top3: (id?: string) => [...leaderboardKeys.all, "top3", { id: id || "global" }] as const,

  entries: {

    all: ["leaderboardEntries"] as const,

    list: (params: any) => [...leaderboardKeys.entries.all, "list", params] as const,

    detail: (leaderboardId: string) => [...leaderboardKeys.entries.all, "detail", leaderboardId] as const,

  }

};



export const useLeaderboards = () => {

  const queryClient = useQueryClient();



  // ==========================================

  // === 1. LEADERBOARDS (Config/Structure) ===

  // ==========================================



  // GET /api/v1/leaderboards?tab={tab}

  const useLeaderboardList = (params: { tab: string; page?: number; size?: number }) => {

    return useQuery({

      queryKey: leaderboardKeys.lists(params.tab),

      queryFn: async () => {

        const qp = new URLSearchParams();

        qp.append("tab", params.tab);

        if (params.page !== undefined) qp.append("page", String(params.page));

        if (params.size !== undefined) qp.append("size", String(params.size));



        const { data } = await instance.get<AppApiResponse<PageResponse<LeaderboardResponse>>>(

          `/api/v1/leaderboards?${qp.toString()}`

        );

        return mapPageResponse(data.result, params.page || 0, params.size || 10);

      },

      staleTime: 60_000, // Cache 1 min

    });

  };



  // GET /api/v1/leaderboards/{id}

  const useLeaderboard = (id: string | null) => {

    return useQuery({

      queryKey: leaderboardKeys.detail(id!),

      queryFn: async () => {

        if (!id) throw new Error("ID required");

        const { data } = await instance.get<AppApiResponse<LeaderboardResponse>>(

          `/api/v1/leaderboards/${id}`

        );

        return data.result!;

      },

      enabled: !!id,

    });

  };



  // GET /api/v1/leaderboards/top-3 (Global) OR /api/v1/leaderboards/{id}/top-3

  // Logic này hiện tại đã được thống nhất để lấy Top 3 từ Leaderboard Entries

  const useTopThree = (leaderboardId?: string | null) => {

    return useQuery({

      queryKey: leaderboardKeys.top3(leaderboardId!),

      queryFn: async () => {

        const url = leaderboardId

          ? `/api/v1/leaderboards/${leaderboardId}/top-3`

          : `/api/v1/leaderboards/top-3`; // Backend đã sửa để trả về Top 3 từ Leaderboard Entry Global



        const { data } = await instance.get<AppApiResponse<LeaderboardEntryResponse[]>>(url);

        return data.result || [];

      },

      staleTime: 30_000, // Cache 30s for top 3

    });

  };



  // POST /api/v1/leaderboards

  const useCreateLeaderboard = () => {

    return useMutation({

      mutationFn: async (req: LeaderboardRequest) => {

        const { data } = await instance.post<AppApiResponse<LeaderboardResponse>>(

          "/api/v1/leaderboards",

          req

        );

        return data.result!;

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.all }),

    });

  };



  // PUT /api/v1/leaderboards/{id}

  const useUpdateLeaderboard = () => {

    return useMutation({

      mutationFn: async ({ id, req }: { id: string; req: LeaderboardRequest }) => {

        const { data } = await instance.put<AppApiResponse<LeaderboardResponse>>(

          `/api/v1/leaderboards/${id}`,

          req

        );

        return data.result!;

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.all }),

    });

  };



  // DELETE /api/v1/leaderboards/{id}

  const useDeleteLeaderboard = () => {

    return useMutation({

      mutationFn: async (id: string) => {

        await instance.delete(`/api/v1/leaderboards/${id}`);

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.all }),

    });

  };



  // ==========================================

  // === 2. LEADERBOARD ENTRIES (User Data) ===

  // ==========================================



  // GET /api/v1/leaderboard-entries

  const useEntries = (params?: { leaderboardId?: string; page?: number; size?: number; }, p0?: { enabled: boolean; }) => {

    const { leaderboardId, page = 0, size = 20 } = params || {};

    return useQuery({

      queryKey: leaderboardKeys.entries.list({ leaderboardId, page, size }),

      queryFn: async () => {

        const qp = new URLSearchParams();

        if (leaderboardId) qp.append("leaderboardId", leaderboardId);

        qp.append("page", String(page));

        qp.append("size", String(size));



        const { data } = await instance.get<AppApiResponse<PageResponse<LeaderboardEntryResponse>>>(

          `/api/v1/leaderboard-entries?${qp.toString()}`

        );

        return mapPageResponse(data.result, page, size);

      },

    });

  };



  // GET /api/v1/leaderboard-entries/{leaderboardId} (Specific entry usually via user context or ID, Controller implies get by ID logic slightly different, likely gets current user or specific logic)

  // Controller method: getLeaderboardEntryByIds (param: leaderboardId, but path variable is just {leaderboardId}, wait... Controller says getLeaderboardEntryByIds params are LeaderboardID and... Pageable? This seems like a list or specific logic. Let's follow endpoint signature)

  // Actually endpoint is GET /api/v1/leaderboard-entries/{leaderboardId}. It returns SINGLE LeaderboardEntryResponse.

  const useEntryDetail = (leaderboardId: string | null) => {

    return useQuery({

      queryKey: leaderboardKeys.entries.detail(leaderboardId!),

      queryFn: async () => {

        if (!leaderboardId) throw new Error("ID required");

        const { data } = await instance.get<AppApiResponse<LeaderboardEntryResponse>>(

          `/api/v1/leaderboard-entries/${leaderboardId}`

        );

        return data.result!;

      },

      enabled: !!leaderboardId,

    });

  };



  // POST /api/v1/leaderboard-entries

  const useCreateEntry = () => {

    return useMutation({

      mutationFn: async (req: LeaderboardEntryRequest) => {

        const { data } = await instance.post<AppApiResponse<LeaderboardEntryResponse>>(

          "/api/v1/leaderboard-entries",

          req

        );

        return data.result!;

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.entries.all }),

    });

  };



  // PUT /api/v1/leaderboard-entries/{leaderboardId}/{userId}

  const useUpdateEntry = () => {

    return useMutation({

      mutationFn: async ({ lId, uId, req }: { lId: string; uId: string; req: LeaderboardEntryRequest }) => {

        const { data } = await instance.put<AppApiResponse<LeaderboardEntryResponse>>(

          `/api/v1/leaderboard-entries/${lId}/${uId}`,

          req

        );

        return data.result!;

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.entries.all }),

    });

  };



  // DELETE /api/v1/leaderboard-entries/{leaderboardId}/{userId}

  const useDeleteEntry = () => {

    return useMutation({

      mutationFn: async ({ lId, uId }: { lId: string; uId: string }) => {

        await instance.delete(`/api/v1/leaderboard-entries/${lId}/${uId}`);

      },

      onSuccess: () => queryClient.invalidateQueries({ queryKey: leaderboardKeys.entries.all }),

    });

  };



  return {

    // Leaderboard

    useLeaderboardList,

    useLeaderboard,

    useTopThree,

    useCreateLeaderboard,

    useUpdateLeaderboard,

    useDeleteLeaderboard,



    // Entries

    useEntries,

    useEntryDetail,

    useCreateEntry,

    useUpdateEntry,

    useDeleteEntry,

  };

};



// Helper to map response

const mapPageResponse = <T>(result: any, page: number, size: number) => ({

  data: (result?.content as T[]) || [],

  pagination: {

    pageNumber: result?.pageNumber ?? page,

    pageSize: result?.pageSize ?? size,

    totalElements: result?.totalElements ?? 0,

    totalPages: result?.totalPages ?? 0,

    isLast: result?.isLast ?? true,

    isFirst: result?.isFirst ?? true,

    hasNext: result?.hasNext ?? false,

    hasPrevious: result?.hasPrevious ?? false,

  }

});