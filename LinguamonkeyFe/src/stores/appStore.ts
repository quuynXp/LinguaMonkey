import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { UserProfile, Chapter, GrammarTopic, BilingualVideo } from '../types/api'

interface AppState {
  // User state
  user: UserProfile | null
  isAuthenticated: boolean

  // Learning state
  selectedChapter: Chapter | null
  selectedGrammarTopic: GrammarTopic | null
  selectedVideo: BilingualVideo | null

  // UI state
  currentLanguage: string
  theme: 'light' | 'dark'

  // Notes state
  selectedNoteTopic: string

  // Actions
  setUser: (user: UserProfile | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setSelectedChapter: (chapter: Chapter | null) => void
  setSelectedGrammarTopic: (topic: GrammarTopic | null) => void
  setSelectedVideo: (video: BilingualVideo | null) => void
  setCurrentLanguage: (language: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedNoteTopic: (topicId: string) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      selectedChapter: null,
      selectedGrammarTopic: null,
      selectedVideo: null,
      currentLanguage: 'en',
      theme: 'light',
      selectedNoteTopic: 'all',

      // Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),
      setSelectedGrammarTopic: (topic) => set({ selectedGrammarTopic: topic }),
      setSelectedVideo: (video) => set({ selectedVideo: video }),
      setCurrentLanguage: (language) => set({ currentLanguage: language }),
      setTheme: (theme) => set({ theme }),
      setSelectedNoteTopic: (topicId) => set({ selectedNoteTopic: topicId }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          selectedChapter: null,
          selectedGrammarTopic: null,
          selectedVideo: null,
        }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentLanguage: state.currentLanguage,
        theme: state.theme,
      }),
    }
  )
)
