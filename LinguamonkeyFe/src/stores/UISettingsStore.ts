import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UISettingsState {
  currentLanguage: string;
  theme: 'light' | 'dark';

  setCurrentLanguage: (language: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUISettingsStore = create<UISettingsState>()(
  persist(
    (set) => ({
      currentLanguage: 'en',
      theme: 'light',

      setCurrentLanguage: (language) => set({ currentLanguage: language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ currentLanguage: state.currentLanguage, theme: state.theme }),
    }
  )
);