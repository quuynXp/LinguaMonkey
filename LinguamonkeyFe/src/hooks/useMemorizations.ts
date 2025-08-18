import { mutate } from "swr"
import type { UserMemorization } from "../types/api"
import { useApiDelete, useApiGet, useApiPost, useApiPut } from "./useApi"

export const useMemorizations = () => {
  // Get user memorizations (notes)
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
    return useApiGet<UserMemorization[]>(url)
  }

  // Get memorization by ID
  const useMemorization = (memorizationId: string | null) => {
    return useApiGet<UserMemorization>(memorizationId ? `/user/memorizations/${memorizationId}` : null)
  }

  // Create memorization
  const useCreateMemorization = () => {
    const { trigger, isMutating } = useApiPost<UserMemorization>("/user/memorizations")

    const createMemorization = async (data: {
      content_type: string
      content_id?: string
      note_text?: string
      is_favorite?: boolean
    }) => {
      try {
        const result = await trigger(data)
        // Revalidate memorizations
        mutate("/user/memorizations")
        return result
      } catch (error) {
        throw error
      }
    }

    return { createMemorization, isCreating: isMutating }
  }

  // Update memorization
  const useUpdateMemorization = () => {
    const { trigger, isMutating } = useApiPut<UserMemorization>("/user/memorizations")

    const updateMemorization = async (memorizationId: string, data: Partial<UserMemorization>) => {
      try {
        const result = await trigger({ memorization_id: memorizationId, ...data })
        // Revalidate memorizations
        mutate("/user/memorizations")
        mutate(`/user/memorizations/${memorizationId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateMemorization, isUpdating: isMutating }
  }

  // Delete memorization
  const useDeleteMemorization = () => {
    const { trigger, isMutating } = useApiDelete<{ success: boolean }>("/user/memorizations")

    const deleteMemorization = async (memorizationId: string) => {
      try {
        const result = await trigger(`/user/memorizations/${memorizationId}`)
        // Revalidate memorizations
        mutate("/user/memorizations")
        return result
      } catch (error) {
        throw error
      }
    }

    return { deleteMemorization, isDeleting: isMutating }
  }

  // Toggle favorite
  const useToggleFavorite = () => {
    const { trigger, isMutating } = useApiPut<{ is_favorite: boolean }>("/user/memorizations/favorite")

    const toggleFavorite = async (memorizationId: string) => {
      try {
        const result = await trigger({ memorization_id: memorizationId })
        // Revalidate memorizations
        mutate("/user/memorizations")
        mutate(`/user/memorizations/${memorizationId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { toggleFavorite, isToggling: isMutating }
  }

  return {
    useUserMemorizations,
    useMemorization,
    useCreateMemorization,
    useUpdateMemorization,
    useDeleteMemorization,
    useToggleFavorite,
  }
}
