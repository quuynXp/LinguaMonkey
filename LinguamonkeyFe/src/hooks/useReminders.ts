import { mutate } from "swr"
import type { UserReminder } from "../types/api"
import { useApiDelete, useApiGet, useApiPost, useApiPut } from "./useApi"

export const useReminders = () => {
  // Get user reminders
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
    return useApiGet<UserReminder[]>(url)
  }

  // Get reminder by ID
  const useReminder = (reminderId: string | null) => {
    return useApiGet<UserReminder>(reminderId ? `/user/reminders/${reminderId}` : null)
  }

  // Create reminder
  const useCreateReminder = () => {
    const { trigger, isMutating } = useApiPost<UserReminder>("/user/reminders")

    const createReminder = async (data: {
      target_type: string
      target_id?: string
      title?: string
      message?: string
      reminder_time: string
      reminder_date?: string
      repeat_type?: string
      enabled?: boolean
    }) => {
      try {
        const result = await trigger(data)
        // Revalidate reminders
        mutate("/user/reminders")
        return result
      } catch (error) {
        throw error
      }
    }

    return { createReminder, isCreating: isMutating }
  }

  // Update reminder
  const useUpdateReminder = () => {
    const { trigger, isMutating } = useApiPut<UserReminder>("/user/reminders")

    const updateReminder = async (reminderId: string, data: Partial<UserReminder>) => {
      try {
        const result = await trigger({ id: reminderId, ...data })
        // Revalidate reminders
        mutate("/user/reminders")
        mutate(`/user/reminders/${reminderId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateReminder, isUpdating: isMutating }
  }

  // Delete reminder
  const useDeleteReminder = () => {
    const { trigger, isMutating } = useApiDelete<{ success: boolean }>("/user/reminders")

    const deleteReminder = async (reminderId: string) => {
      try {
        const result = await trigger(`/user/reminders/${reminderId}`)
        // Revalidate reminders
        mutate("/user/reminders")
        return result
      } catch (error) {
        throw error
      }
    }

    return { deleteReminder, isDeleting: isMutating }
  }

  // Toggle reminder enabled status
  const useToggleReminder = () => {
    const { trigger, isMutating } = useApiPut<{ enabled: boolean }>("/user/reminders/toggle")

    const toggleReminder = async (reminderId: string) => {
      try {
        const result = await trigger({ id: reminderId })
        // Revalidate reminders
        mutate("/user/reminders")
        mutate(`/user/reminders/${reminderId}`)
        return result
      } catch (error) {
        throw error
      }
    }

    return { toggleReminder, isToggling: isMutating }
  }

  return {
    useUserReminders,
    useReminder,
    useCreateReminder,
    useUpdateReminder,
    useDeleteReminder,
    useToggleReminder,
  }
}
