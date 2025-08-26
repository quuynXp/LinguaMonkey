import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { UserReminder } from "../types/api"

export const useReminders = () => {
  const queryClient = useQueryClient()

  // ===== Get all reminders =====
  const useUserReminders = (params?: {
    target_type?: string
    enabled?: boolean
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.target_type) queryParams.append("target_type", params.target_type)
    if (params?.enabled !== undefined) queryParams.append("enabled", params.enabled.toString())
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = `/user/reminders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    return useQuery<UserReminder[]>({
      queryKey: ["userReminders", params],
      queryFn: async () => {
        const res = await instance.get(url)
        return res.data
      },
    })
  }

  // ===== Get reminder by ID =====
  const useReminder = (reminderId: string | null) =>
    useQuery<UserReminder>({
      queryKey: ["reminder", reminderId],
      queryFn: async () => {
        if (!reminderId) throw new Error("Invalid reminderId")
        const res = await instance.get(`/user/reminders/${reminderId}`)
        return res.data
      },
      enabled: !!reminderId,
    })

  // ===== Create reminder =====
  const useCreateReminder = () =>
    useMutation({
      mutationFn: async (data: {
        target_type: string
        target_id?: string
        title?: string
        message?: string
        reminder_time: string
        reminder_date?: string
        repeat_type?: string
        enabled?: boolean
      }) => {
        const res = await instance.post("/user/reminders", data)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userReminders"] })
      },
    })

  // ===== Update reminder =====
  const useUpdateReminder = () =>
    useMutation({
      mutationFn: async ({ reminderId, data }: { reminderId: string; data: Partial<UserReminder> }) => {
        const res = await instance.put(`/user/reminders/${reminderId}`, data)
        return res.data
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["userReminders"] })
        queryClient.invalidateQueries({ queryKey: ["reminder", variables.reminderId] })
      },
    })

  // ===== Delete reminder =====
  const useDeleteReminder = () =>
    useMutation({
      mutationFn: async (reminderId: string) => {
        const res = await instance.delete(`/user/reminders/${reminderId}`)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userReminders"] })
      },
    })

  // ===== Toggle reminder =====
  const useToggleReminder = () =>
    useMutation({
      mutationFn: async (reminderId: string) => {
        const res = await instance.put(`/user/reminders/toggle`, { id: reminderId })
        return res.data
      },
      onSuccess: (data, reminderId) => {
        queryClient.invalidateQueries({ queryKey: ["userReminders"] })
        queryClient.invalidateQueries({ queryKey: ["reminder", reminderId] })
      },
    })

  return {
    useUserReminders,
    useReminder,
    useCreateReminder,
    useUpdateReminder,
    useDeleteReminder,
    useToggleReminder,
  }
}
