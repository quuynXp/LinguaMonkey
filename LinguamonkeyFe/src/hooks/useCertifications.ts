import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axiosClient";
import {
  AppApiResponse,
  PageResponse,
  CertificateResponse,
  CertificateRequest,
} from "../types/dto";

// --- Keys Factory ---
export const certificateKeys = {
  all: ["certificates"] as const,
  lists: () => [...certificateKeys.all, "list"] as const,
  list: (page: number, size: number) => [...certificateKeys.lists(), { page, size }] as const,
  details: () => [...certificateKeys.all, "detail"] as const,
  detail: (id: string) => [...certificateKeys.details(), id] as const,
};

// ==========================================
// === CRUD HOOKS (Based on CertificateController) ===
// ==========================================

// 1. GET /api/v1/certificates (Get all)
export const useCertificates = (page = 0, size = 10) => {
  return useQuery({
    queryKey: certificateKeys.list(page, size),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      const { data } = await instance.get<AppApiResponse<PageResponse<CertificateResponse>>>(
        `/api/v1/certificates?${params.toString()}`
      );

      // Map response to Page structure standard
      return {
        data: data.result?.content || [],
        pagination: {
          pageNumber: data.result?.pageNumber || page,
          pageSize: data.result?.pageSize || size,
          totalElements: data.result?.totalElements || 0,
          totalPages: data.result?.totalPages || 0,
          isLast: data.result?.isLast || true,
          isFirst: data.result?.isFirst || true,
          hasNext: data.result?.hasNext || false,
          hasPrevious: data.result?.hasPrevious || false,
        }
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

// 2. GET /api/v1/certificates/{id} (Get by ID)
export const useCertificate = (id?: string | null) => {
  return useQuery({
    queryKey: certificateKeys.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error("Certificate ID is required");
      const { data } = await instance.get<AppApiResponse<CertificateResponse>>(
        `/api/v1/certificates/${id}`
      );
      return data.result;
    },
    enabled: !!id,
  });
};

// 3. POST /api/v1/certificates (Create - Admin)
export const useCreateCertificate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (req: CertificateRequest) => {
      const { data } = await instance.post<AppApiResponse<CertificateResponse>>(
        "/api/v1/certificates",
        req
      );
      return data.result!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });

  return {
    createCertificate: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
};

// 4. PUT /api/v1/certificates/{id} (Update)
export const useUpdateCertificate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, req }: { id: string; req: CertificateRequest }) => {
      const { data } = await instance.put<AppApiResponse<CertificateResponse>>(
        `/api/v1/certificates/${id}`,
        req
      );
      return data.result!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.detail(data.certificateId) });
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });

  return {
    updateCertificate: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
};

// 5. DELETE /api/v1/certificates/{id} (Delete)
export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await instance.delete(`/api/v1/certificates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });

  return {
    deleteCertificate: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};