import { useQuery } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { ApiResponse } from "../types/api"

interface StudySession {
  id: string
  type: "toeic" | "ielts" | "daily" | "lesson" | "quiz"
  title: string
  date: Date
  duration: number
  score?: number
  maxScore?: number
  experience: number
  skills: string[]
  completed: boolean
}

interface TestResult {
  id: string
  testType: "toeic" | "ielts"
  date: Date
  overallScore: number
  sections: {
    listening?: number
    reading?: number
    writing?: number
    speaking?: number
  }
  targetScore: number
  improvement: number
}

interface StudyHistory {
  sessions: StudySession[]
  tests: TestResult[]
}

export const useStudyHistory = (timeFilter: string) => {
  const queryKey = ["studyHistory", timeFilter]
  const queryFn = async () => {
    const response = await instance.get<ApiResponse<StudyHistory>>(`/study-history?timeFilter=${timeFilter}`)
    return response.data.result!
  }

  return useQuery<StudyHistory>({
    queryKey,
    queryFn,
  })
}
