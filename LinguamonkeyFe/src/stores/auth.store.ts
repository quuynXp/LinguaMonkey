import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: { id: string; email: string } | null
  setToken: (token: string) => void
  setUser: (user: { id: string; email: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  logout: () => set({ token: null, user: null }),
}))
