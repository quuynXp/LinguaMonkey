import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import instance from "../api/axiosInstance"
import type { ApiResponse, LessonCategory, UserLanguage } from "../types/api"

interface LearnLanguage {
  id: string
  name: string
  flag: string
  progress: number
  lessons: number
  color: string
  language_code: string
}

interface LearnCategory {
  id: string
  name: string
  icon: string
  screen: string
  lessons: number
  category_id?: string
}

interface DailyChallenge {
  id: string
  title: string
  icon: string
  description: string
  screen: string
  isCompleted?: boolean
}

interface LearnData {
  languages: LearnLanguage[]
  categories: LearnCategory[]
  dailyChallenges: DailyChallenge[]
}

export const useLearnData = () => {
  const { t } = useTranslation()

  return useQuery<LearnData>({
    queryKey: ["learnData"],
    queryFn: async () => {
      try {
        // Fetch user languages with progress
        const languagesResponse = await instance.get<ApiResponse<UserLanguage[]>>("/api/v1/user/languages")
        const categoriesResponse = await instance.get<ApiResponse<LessonCategory[]>>("/api/v1/lesson-categories")

        // Transform languages data
        const languages: LearnLanguage[] =
          languagesResponse.data.result?.map((userLang, index) => ({
            id: userLang.languageCode,
            name: userLang.languageCode,
            flag: getLanguageFlag(userLang.languageCode),
            progress: Math.floor(Math.random() * 100), // This should come from actual progress data
            lessons: Math.floor(Math.random() * 50) + 10, // This should come from actual lesson count
            color: getLanguageColor(index),
            language_code: userLang.languageCode,
          })) || []

        // Transform categories data
        const categories: LearnCategory[] =
          categoriesResponse.data.result?.map((category) => ({
            id: category.lessonCategoryId,
            name: category.lessonCategoryName,
            icon: getCategoryIcon(category.lessonCategoryName),
            screen: getCategoryScreen(category.lessonCategoryName),
            lessons: Math.floor(Math.random() * 20) + 5, // This should come from actual lesson count
            category_id: category.lessonCategoryId,
          })) || []

        // Default categories if none from API
        const defaultCategories: LearnCategory[] = [
          {
            id: "listening",
            name: t("learn.categories.listening"),
            icon: "hearing",
            screen: "ListeningScreen",
            lessons: 10,
          },
          {
            id: "speaking",
            name: t("learn.categories.speaking"),
            icon: "record-voice-over",
            screen: "SpeakingScreen",
            lessons: 8,
          },
          {
            id: "reading",
            name: t("learn.categories.reading"),
            icon: "menu-book",
            screen: "ReadingScreen",
            lessons: 12,
          },
          { id: "writing", name: t("learn.categories.writing"), icon: "edit", screen: "WritingScreen", lessons: 7 },
          {
            id: "advanced-listening",
            name: t("learn.categories.advancedListening"),
            icon: "hearing",
            screen: "AdvancedListening",
            lessons: 7,
          },
          {
            id: "ipa",
            name: t("learn.categories.ipa"),
            icon: "record-voice-over",
            screen: "AdvancedSpeaking",
            lessons: 7,
          },
          {
            id: "certification",
            name: t("learn.categories.certification"),
            icon: "school",
            screen: "CertificationLearning",
            lessons: 7,
          },
          { id: "quiz", name: t("learn.categories.quiz"), icon: "quiz", screen: "InteractiveQuiz", lessons: 7 },
        ]

        // Daily challenges
        const dailyChallenges: DailyChallenge[] = [
          {
            id: "vocab-game",
            title: t("learn.challenges.vocabChallenge"),
            icon: "videogame-asset",
            description: t("learn.challenges.game"),
            screen: "MillionaireGame",
          },
          {
            id: "flashcard",
            title: t("learn.challenges.flashcard"),
            icon: "style",
            description: t("learn.challenges.flashcardDesc"),
            screen: "VocabularyFlashcards",
          },
          {
            id: "direction-game",
            title: t("learn.challenges.directionGame"),
            description: t("learn.challenges.funGame"),
            icon: "directions",
            screen: "GameBasedLearning",
          },
          {
            id: "karaoke",
            title: t("learn.challenges.karaoke"),
            icon: "mic",
            description: t("learn.challenges.karaoke"),
            screen: "KaraokeLearning",
          },
          {
            id: "quiz-fun",
            title: t("learn.challenges.funQuiz"),
            icon: "quiz",
            description: t("learn.challenges.quizlet"),
            screen: "QuizLearning",
          },
        ]

        return {
          languages: languages.length > 0 ? languages : getDefaultLanguages(),
          categories: categories.length > 0 ? categories : defaultCategories,
          dailyChallenges,
        }
      } catch (error) {
        console.error("Error fetching learn data:", error)
        // Return default data on error
        return {
          languages: getDefaultLanguages(),
          categories: getDefaultCategories(),
          dailyChallenges: getDefaultChallenges(),
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Helper functions
const getLanguageFlag = (languageCode: string): string => {
  const flagMap: Record<string, string> = {
    zh: "🇨🇳",
    en: "🇺🇸",
    vi: "🇻🇳",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    ja: "🇯🇵",
    ko: "🇰🇷",
  }
  return flagMap[languageCode] || "🌍"
}

const getLanguageColor = (index: number): string => {
  const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]
  return colors[index % colors.length]
}

const getCategoryIcon = (categoryName: string): string => {
  const iconMap: Record<string, string> = {
    listening: "hearing",
    speaking: "record-voice-over",
    reading: "menu-book",
    writing: "edit",
    grammar: "school",
    vocabulary: "style",
    pronunciation: "mic",
  }
  const key = categoryName.toLowerCase()
  return iconMap[key] || "quiz"
}

const getCategoryScreen = (categoryName: string): string => {
  const screenMap: Record<string, string> = {
    listening: "ListeningScreen",
    speaking: "SpeakingScreen",
    reading: "ReadingScreen",
    writing: "WritingScreen",
    grammar: "GrammarLearning",
    vocabulary: "VocabularyFlashcards",
    pronunciation: "AdvancedSpeaking",
  }
  const key = categoryName.toLowerCase()
  return screenMap[key] || "InteractiveQuiz"
}

const getDefaultLanguages = (): LearnLanguage[] => [
  {
    id: "zh",
    name: "Tiếng Trung",
    flag: "🇨🇳",
    progress: 65,
    lessons: 24,
    color: "#EF4444",
    language_code: "zh",
  },
  {
    id: "en",
    name: "Tiếng Anh",
    flag: "🇺🇸",
    progress: 45,
    lessons: 18,
    color: "#3B82F6",
    language_code: "en",
  },
]

const getDefaultCategories = (): LearnCategory[] => [
  { id: "listening", name: "Nghe", icon: "hearing", screen: "ListeningScreen", lessons: 10 },
  { id: "speaking", name: "Nói", icon: "record-voice-over", screen: "SpeakingScreen", lessons: 8 },
  { id: "reading", name: "Đọc", icon: "menu-book", screen: "ReadingScreen", lessons: 12 },
  { id: "writing", name: "Viết", icon: "edit", screen: "WritingScreen", lessons: 7 },
  { id: "advanced-listening", name: "Luyện nghe", icon: "hearing", screen: "AdvancedListening", lessons: 7 },
  { id: "ipa", name: "IPA", icon: "record-voice-over", screen: "AdvancedSpeaking", lessons: 7 },
  { id: "certification", name: "Học chứng chỉ", icon: "school", screen: "CertificationLearning", lessons: 7 },
  { id: "quiz", name: "Quiz", icon: "quiz", screen: "InteractiveQuiz", lessons: 7 },
]

const getDefaultChallenges = (): DailyChallenge[] => [
  {
    id: "vocab-game",
    title: "Thử thách từ vựng",
    icon: "videogame-asset",
    description: "Game",
    screen: "MillionaireGame",
  },
  {
    id: "flashcard",
    title: "Học từ vựng với flashcard",
    icon: "style",
    description: "Học 10 từ mới trong 5 phút",
    screen: "VocabularyFlashcards",
  },
  {
    id: "direction-game",
    title: "Game chỉ đường cho người lạ",
    description: "Game vui",
    icon: "directions",
    screen: "GameBasedLearning",
  },
  {
    id: "karaoke",
    title: "Karaoke",
    icon: "mic",
    description: "Karaoke",
    screen: "KaraokeLearning",
  },
  {
    id: "quiz-fun",
    title: "Đố vui",
    icon: "quiz",
    description: "Quizlet",
    screen: "QuizLearning",
  },
]
