import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse, PaginatedResponse, User, RegisterResult } from "../types/api"

// 1. Get user by ID (cả admin hoặc self)
export const useUser = (id?: string) => {
  return useQuery<User>({
    queryKey: ["user", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required")
      const res = await instance.get<ApiResponse<User>>(`/users/${id}`)
      return res.data.result!
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// 2. Get all users (admin only)
export const useAllUsers = (params?: {
  page?: number
  size?: number
  email?: string
  fullname?: string
  nickname?: string
}) => {
  const { page = 0, size = 20, email, fullname, nickname } = params || {}

  return useQuery<PaginatedResponse<User>>({
    queryKey: ["allUsers", page, size, email, fullname, nickname],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      queryParams.append("page", page.toString())
      queryParams.append("size", size.toString())
      if (email) queryParams.append("email", email)
      if (fullname) queryParams.append("fullname", fullname)
      if (nickname) queryParams.append("nickname", nickname)

      const res = await instance.get<ApiResponse<PaginatedResponse<User>>>(`/users?${queryParams.toString()}`)
      return res.data.result!
    },
    staleTime: 2 * 60 * 1000,
  })
}

// 3. Create user (register)
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await instance.post<ApiResponse<RegisterResult>>("/users", payload)
      return res.data.result!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] })
    },
  })
}

// 4. Update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await instance.put<ApiResponse<User>>(`/users/${id}`, data)
      return res.data.result!
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] })
      queryClient.invalidateQueries({ queryKey: ["user", id] })
    },
  })
}

// 5. Delete user
export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await instance.delete<ApiResponse<void>>(`/users/${id}`)
      return res.data.result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] })
    },
  })
}

// 6. Patch user fields (avatar, country, exp, streak, native-language)
export const usePatchUser = (field: "avatar" | "country" | "exp" | "streak" | "native-language") => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: any }) => {
      const url = `/api/users/${id}/${field}`
      const res = await instance.patch<ApiResponse<User>>(url, null, { params: { [field]: value } })
      return res.data.result!
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["user", id] })
      queryClient.invalidateQueries({ queryKey: ["allUsers"] })
    },
  })
}

// 7. Get user level info (nay trả về User luôn vì trong User đã có level info)
export const useUserLevelInfo = (id?: string) => {
  return useQuery<User>({
    queryKey: ["userLevelInfo", id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required")
      const res = await instance.get<ApiResponse<User>>(`/users/${id}/level-info`)
      return res.data.result!
    },
    enabled: !!id,
  })
}

export const useUsers = () => {
  return {
    useAllUsers,
    useUpdateUser,
    useDeleteUser,
  }
}