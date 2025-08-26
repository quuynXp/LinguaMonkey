import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import instance from "../api/axiosInstance"
import type { Note, NoteTopic } from "../types/api"

export const useNotes = () => {
  const queryClient = useQueryClient()

  // Get user notes
  const useUserNotes = (topicId?: string, search?: string) => {
    let url = "/notes"
    const params = new URLSearchParams()
    if (topicId && topicId !== "all") params.append("topicId", topicId)
    if (search) params.append("search", search)
    if (params.toString()) url += `?${params.toString()}`

    return useQuery<Note[]>({
      queryKey: ["notes", topicId, search],
      queryFn: async () => {
        const res = await instance.get(url)
        return res.data
      },
    })
  }

  // Get note topics
  const useNoteTopics = () =>
    useQuery<NoteTopic[]>({
      queryKey: ["noteTopics"],
      queryFn: async () => {
        const res = await instance.get("/notes/topics")
        return res.data
      },
    })

  // Create note
  const useCreateNote = () =>
    useMutation({
      mutationFn: async (noteData: {
        content: string
        type: "word" | "phrase" | "sentence"
        topicId: string
        language: string
      }) => {
        const res = await instance.post("/notes", noteData)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
        queryClient.invalidateQueries({ queryKey: ["noteTopics"] })
      },
    })

  // Update note
  const useUpdateNote = () =>
    useMutation({
      mutationFn: async ({ noteId, noteData }: { noteId: string; noteData: Partial<Note> }) => {
        const res = await instance.put(`/notes/${noteId}`, noteData)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      },
    })

  // Delete note
  const useDeleteNote = () =>
    useMutation({
      mutationFn: async (noteId: string) => {
        const res = await instance.delete(`/notes/${noteId}`)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
        queryClient.invalidateQueries({ queryKey: ["noteTopics"] })
      },
    })

  // Create note topic
  const useCreateNoteTopic = () =>
    useMutation({
      mutationFn: async (topicData: { name: string; color: string; icon: string }) => {
        const res = await instance.post("/notes/topics", topicData)
        return res.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["noteTopics"] })
      },
    })

  // Generate phonetics and translation
  const useGenerateNoteData = () =>
    useMutation({
      mutationFn: async ({ content, targetLanguage = "vi" }: { content: string; targetLanguage?: string }) => {
        const res = await instance.post("/notes/generate", { content, targetLanguage })
        return res.data
      },
    })

  return {
    useUserNotes,
    useNoteTopics,
    useCreateNote,
    useUpdateNote,
    useDeleteNote,
    useCreateNoteTopic,
    useGenerateNoteData,
  }
}
