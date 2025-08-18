import type { Video, VideoSubtitle } from "../types/api"
import { useApiGet, useApiPost } from "./useApi"

export const useVideos = () => {
  // Get videos
  const useVideos = (params?: {
    lesson_id?: string
    language_code?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.lesson_id) queryParams.append("lesson_id", params.lesson_id)
    if (params?.language_code) queryParams.append("language_code", params.language_code)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const url = `/videos${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    return useApiGet<Video[]>(url)
  }

  // Get video by ID
  const useVideo = (videoId: string | null) => {
    return useApiGet<Video>(videoId ? `/videos/${videoId}` : null)
  }

  // Get video subtitles
  const useVideoSubtitles = (videoId: string | null, languageCode?: string) => {
    const url = videoId
      ? `/videos/${videoId}/subtitles${languageCode ? `?language_code=${languageCode}` : ""}`
      : null
    return useApiGet<VideoSubtitle[]>(url)
  }

  // Track video progress
  const useTrackVideoProgress = () => {
    const { trigger, isMutating } = useApiPost<{ success: boolean }>("/videos/progress")

    const trackProgress = async (videoId: string, currentTime: number, duration: number) => {
      try {
        const result = await trigger({
          video_id: videoId,
          current_time: currentTime,
          duration: duration,
        })
        return result
      } catch (error) {
        throw error
      }
    }

    return { trackProgress, isTracking: isMutating }
  }

  return {
    useVideos,
    useVideo,
    useVideoSubtitles,
    useTrackVideoProgress,
  }
}
