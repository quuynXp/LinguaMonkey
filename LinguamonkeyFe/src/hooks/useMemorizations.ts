import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { UserMemorization } from "../types/api"

export const useMemorizations = () => {
  const queryClient = useQueryClient()

  // Get memorizations
  const useUserMemorizations = (params?: {
    content_type?: string
    is_favorite?: boolean
    search?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.content_type) queryParams.append("content_type", params.content_type)
    if (params?.is_favorite !== undefined) queryParams.append("is_favorite", params.is_favorite.toString())
    if (params?.search) queryParams.append("search", params.search)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = `/user/memorizations${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    return useQuery<UserMemorization[]>({
      queryKey: ["memorizations", params],
      queryFn: async () => {
        const res = await instance.get(url)
        return res.data
      },
    })
  }

  // Get memorization by ID
  const useMemorization = (memorizationId: string | null) =>
    useQuery<UserMemorization>({
      queryKey: ["memorization", memorizationId],
      queryFn: async () => {
        if (!memorizationId) throw new Error("Invalid memorizationId")
        const res = await instance.get(`/user/memorizations/${memorizationId}`)
        return res.data
      },
      enabled: !!memorizationId,
    })

  // Create
  const useCreateMemorization = () =>
    useMutation({
      mutationFn: async (data: { content_type: string; content_id?: string; note_text?: string; is_favorite?: boolean }) => {
        const res = await instance.post("/api/v1/user/memorizations", data)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["memorizations"] })
      },
    })

  // Update
  const useUpdateMemorization = () =>
    useMutation({
      mutationFn: async ({ memorizationId, data }: { memorizationId: string; data: Partial<UserMemorization> }) => {
        const res = await instance.put(`/user/memorizations/${memorizationId}`, data)
        return res.data
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["memorizations"] })
        queryClient.invalidateQueries({ queryKey: ["memorization", variables.memorizationId] })
      },
    })

  // Delete
  const useDeleteMemorization = () =>
    useMutation({
      mutationFn: async (memorizationId: string) => {
        const res = await instance.delete(`/user/memorizations/${memorizationId}`)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["memorizations"] })
      },
    })

  // Toggle favorite
  const useToggleFavorite = () =>
    useMutation({
      mutationFn: async (memorizationId: string) => {
        const res = await instance.put(`/user/memorizations/favorite`, { memorization_id: memorizationId })
        return res.data
      },
      onSuccess: (data, memorizationId) => {
        queryClient.invalidateQueries({ queryKey: ["memorizations"] })
        queryClient.invalidateQueries({ queryKey: ["memorization", memorizationId] })
      },
    })

  return {
    useUserMemorizations,
    useMemorization,
    useCreateMemorization,
    useUpdateMemorization,
    useDeleteMemorization,
    useToggleFavorite,
  }
}
