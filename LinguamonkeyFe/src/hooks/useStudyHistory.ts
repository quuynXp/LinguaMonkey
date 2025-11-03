import { useQuery } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
// Import các types từ file trung tâm (Giả định bạn đã tạo file này)
import type { ApiResponse, StudyHistoryResponse } from "../types/api"

/**
 * Hook để lấy Lịch sử học tập đã được tổng hợp từ backend.
 * @param userId ID của người dùng
 * @param timeFilter "week", "month", hoặc "year"
 */
export const useStudyHistory = (userId?: string, timeFilter?: string) => {
  // Sắp xếp key để đảm bảo ổn định
  const queryKey = ["studyHistory", { userId, timeFilter }]

  const queryFn = async () => {
    // Nếu không có userId hoặc filter, không gọi API
    if (!userId || !timeFilter) {
      return null
    }

    // Gọi đúng endpoint controller mới với cả 2 params
    // Backend dùng "period", không phải "timeFilter"
    const response = await instance.get<ApiResponse<StudyHistoryResponse>>(
      `/user-learning-activities/history?userId=${userId}&period=${timeFilter}`
    )

    return response.data.result!
  }

  return useQuery<StudyHistoryResponse | null>({
    queryKey,
    queryFn,
    enabled: !!userId && !!timeFilter, // Chỉ chạy query khi có đủ params
    staleTime: 60_000, // Cache trong 1 phút
  })
}