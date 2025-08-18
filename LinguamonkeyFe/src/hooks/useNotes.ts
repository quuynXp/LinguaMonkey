import { mutate } from "swr"
import type { Note, NoteTopic } from "../types/api"
import { useApiDelete, useApiGet, useApiPost, useApiPut } from "./useApi"

export const useNotes = () => {
  // Get user notes
  const useUserNotes = (topicId?: string, search?: string) => {
    let url = "/notes"
    const params = new URLSearchParams()
    if (topicId && topicId !== "all") params.append("topicId", topicId)
    if (search) params.append("search", search)
    if (params.toString()) url += `?${params.toString()}`

    return useApiGet<Note[]>(url)
  }

  // Get note topics
  const useNoteTopics = () => {
    return useApiGet<NoteTopic[]>("/notes/topics")
  }

  // Create note
  const useCreateNote = () => {
    const { trigger, isMutating } = useApiPost<Note>("/notes")

    const createNote = async (noteData: {
      content: string
      type: "word" | "phrase" | "sentence"
      topicId: string
      language: string
    }) => {
      try {
        const result = await trigger(noteData)
        // Revalidate notes data
        mutate("/notes")
        mutate("/notes/topics")
        return result
      } catch (error) {
        throw error
      }
    }

    return { createNote, isCreating: isMutating }
  }

  // Update note
  const useUpdateNote = () => {
    const { trigger, isMutating } = useApiPut<Note>("/notes")

    const updateNote = async (noteId: string, noteData: Partial<Note>) => {
      try {
        const result = await trigger({ id: noteId, ...noteData })
        // Revalidate notes data
        mutate("/notes")
        return result
      } catch (error) {
        throw error
      }
    }

    return { updateNote, isUpdating: isMutating }
  }

  // Delete note
  const useDeleteNote = () => {
    const { trigger, isMutating } = useApiDelete<{ success: boolean }>("/notes")

    const deleteNote = async (noteId: string) => {
      try {
        const result = await trigger(`/notes/${noteId}`)
        // Revalidate notes data
        mutate("/notes")
        mutate("/notes/topics")
        return result
      } catch (error) {
        throw error
      }
    }

    return { deleteNote, isDeleting: isMutating }
  }

  // Create note topic
  const useCreateNoteTopic = () => {
    const { trigger, isMutating } = useApiPost<NoteTopic>("/notes/topics")

    const createTopic = async (topicData: {
      name: string
      color: string
      icon: string
    }) => {
      try {
        const result = await trigger(topicData)
        // Revalidate topics data
        mutate("/notes/topics")
        return result
      } catch (error) {
        throw error
      }
    }

    return { createTopic, isCreating: isMutating }
  }

  // Generate phonetics and translation
  const useGenerateNoteData = () => {
    const { trigger, isMutating } = useApiPost<{
      phonetic: string
      translation: string
    }>("/notes/generate")

    const generateData = async (content: string, targetLanguage = "vi") => {
      try {
        const result = await trigger({ content, targetLanguage })
        return result
      } catch (error) {
        throw error
      }
    }

    return { generateData, isGenerating: isMutating }
  }

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
