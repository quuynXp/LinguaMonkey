import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Course, Lesson, UserGoal } from '../types/entity';

interface LearningState {
  selectedCourse: Course | null;
  selectedLesson: Lesson | null;
  progress: { [lessonId: string]: number }; // lesson_id to score
  goals: UserGoal[];

  setSelectedCourse: (course: Course | null) => void;
  setSelectedLesson: (lesson: Lesson | null) => void;
  updateProgress: (lessonId: string, score: number) => void;
  addGoal: (goal: UserGoal) => void;
  clearProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      selectedCourse: null,
      selectedLesson: null,
      progress: {},
      goals: [],

      setSelectedCourse: (course) => set({ selectedCourse: course }),
      setSelectedLesson: (lesson) => set({ selectedLesson: lesson }),
      updateProgress: (lessonId, score) =>
        set((state) => ({
          progress: { ...state.progress, [lessonId]: score },
        })),
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
      clearProgress: () => set({ progress: {}, selectedLesson: null }),
    }),
    {
      name: 'learning-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
        goals: state.goals,
      }),
    }
  )
);