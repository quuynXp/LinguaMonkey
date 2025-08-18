"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from "react-native-video"
import { useLessons } from "../hooks/useLessons"
import { useAppStore } from "../stores/appStore"
import type { Chapter, Lesson, QuizQuestion } from "../types/api"
import { quizAnswerSchema, validateData } from "../utils/validation"

const { width, height } = Dimensions.get("window")

const FreeLessonScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { selectedChapter, setSelectedChapter } = useAppStore()
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: string }>({})
  const [quizScore, setQuizScore] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const { useChapters, useChapter, useCompleteLesson, useSubmitQuiz } = useLessons()

  // Fetch chapters data
  const { data: chaptersResponse, error: chaptersError, isLoading: chaptersLoading } = useChapters()
  const chapters = chaptersResponse?.data || []

  // Fetch selected chapter data
  const {
    data: chapterResponse,
    error: chapterError,
    isLoading: chapterLoading,
  } = useChapter(selectedChapter?.id || null)
  const chapterData = chapterResponse?.data

  // Mutations
  const { completeLesson, isCompleting } = useCompleteLesson()
  const { submitQuiz, isSubmitting } = useSubmitQuiz()

  useEffect(() => {
    if (chapterData) {
      setSelectedChapter(chapterData)
    }
  }, [chapterData, setSelectedChapter])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#757575"
    }
  }

  const getTypeMaterialIcons = (type: string) => {
    switch (type) {
      case "video":
        return "play-circle-filled"
      case "article":
        return "article"
      case "quiz":
        return "quiz"
      case "image":
        return "image"
      case "audio":
        return "audiotrack"
      default:
        return "book"
    }
  }

  const handleLessonPress = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setShowLessonModal(true)
    setQuizAnswers({})
    setQuizScore(null)
    setValidationErrors({})
  }

  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))

    // Clear validation error for this question
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }

  const handleSubmitQuiz = async () => {
    if (!selectedLesson) return

    try {
      // Validate quiz answers
      await validateData(quizAnswerSchema, {
        lessonId: selectedLesson.id,
        answers: quizAnswers,
      })

      const result = await submitQuiz(selectedLesson.id, quizAnswers)

      if (result?.data) {
        setQuizScore(result.data.score)

        if (result.data.score >= 70) {
          Alert.alert(t("common.success"), t("lessons.lessonCompleted"), [{ text: t("common.confirm") }])

          // Mark lesson as completed
          await completeLesson(selectedLesson.id, result.data.score)
        } else {
          Alert.alert(t("lessons.tryAgain"), t("lessons.quizScore", { score: result.data.score }), [
            { text: t("common.confirm") },
          ])
        }
      }
    } catch (error: any) {
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors)
      } else {
        Alert.alert(t("common.error"), error.message || t("errors.unknown"))
      }
    }
  }

  const renderChapterCard = (chapter: Chapter) => (
    <TouchableOpacity
      key={chapter.id}
      style={[styles.chapterCard, !chapter.unlocked && styles.lockedCard]}
      onPress={() => chapter.unlocked && setSelectedChapter(chapter)}
      disabled={!chapter.unlocked}
    >
      <View style={styles.chapterHeader}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        {!chapter.unlocked && <Icon name="lock" size={20} color="#757575" />}
      </View>
      <Text style={styles.chapterDescription}>{chapter.description}</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${chapter.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{chapter.progress}%</Text>
      </View>
      <Text style={styles.lessonCount}>
        {chapter.lessons.length} {t("navigation.lessons").toLowerCase()}
      </Text>
    </TouchableOpacity>
  )

  const renderLessonItem = (lesson: Lesson) => (
    <TouchableOpacity key={lesson.id} style={styles.lessonItem} onPress={() => handleLessonPress(lesson)}>
      <View style={styles.lessonIcon}>
        <Icon name={getTypeIcon(lesson.type)} size={24} color="#2196F3" />
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonDescription}>{lesson.description}</Text>
        <View style={styles.lessonMeta}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) }]}>
            <Text style={styles.difficultyText}>{t(`lessons.difficulty.${lesson.difficulty}`)}</Text>
          </View>
          <Text style={styles.duration}>{lesson.duration}</Text>
        </View>
      </View>
      {lesson.completed && <Icon name="check-circle" size={24} color="#4CAF50" />}
    </TouchableOpacity>
  )

  const renderLessonContent = () => {
    if (!selectedLesson) return null

    switch (selectedLesson.type) {
      case "video":
        return (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: selectedLesson.content.videoUrl || "" }}
              style={styles.video}
              controls={true}
              resizeMode="contain"
            />
            <Text style={styles.transcript}>{selectedLesson.content.transcript}</Text>
          </View>
        )

      case "article":
        return (
          <ScrollView style={styles.articleContainer}>
            <Text style={styles.articleText}>{selectedLesson.content.text}</Text>
            {selectedLesson.content.images?.map((image: string, index: number) => (
              <View key={index} style={styles.imageContainer}>
                <Text style={styles.imagePlaceholder}>Image: {image}</Text>
              </View>
            ))}
          </ScrollView>
        )

      case "quiz":
        return (
          <ScrollView style={styles.quizContainer}>
            {selectedLesson.content.questions?.map((question: QuizQuestion, index: number) => (
              <View key={question.id} style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {index + 1}. {question.question}
                </Text>
                {validationErrors[question.id] && (
                  <Text style={styles.errorText}>{validationErrors[question.id][0]}</Text>
                )}
                {question.options?.map((option: string) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionButton, quizAnswers[question.id] === option && styles.selectedOption]}
                    onPress={() => handleQuizAnswer(question.id, option)}
                  >
                    <Text style={[styles.optionText, quizAnswers[question.id] === option && styles.selectedOptionText]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmitQuiz}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t("lessons.submitQuiz")}</Text>
              )}
            </TouchableOpacity>
            {quizScore !== null && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{t("lessons.quizScore", { score: quizScore })}</Text>
              </View>
            )}
          </ScrollView>
        )

      case "image":
        return (
          <ScrollView style={styles.imageContainer}>
            {selectedLesson.content.images?.map((image: string, index: number) => (
              <View key={index} style={styles.lessonImageContainer}>
                <Text style={styles.imagePlaceholder}>Image: {image}</Text>
              </View>
            ))}
            {selectedLesson.content.vocabulary && (
              <View style={styles.vocabularySection}>
                <Text style={styles.vocabularyTitle}>{t("videos.vocabulary")}</Text>
                {selectedLesson.content.vocabulary.map((item: any, index: number) => (
                  <View key={index} style={styles.vocabularyItem}>
                    <Text style={styles.vocabularyWord}>{item.word}</Text>
                    <Text style={styles.vocabularyPronunciation}>{item.pronunciation}</Text>
                    <Text style={styles.vocabularyMeaning}>{item.meaning}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )

      case "audio":
        return (
          <View style={styles.audioContainer}>
            <TouchableOpacity style={styles.playButton}>
              <Icon name="play-arrow" size={48} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.audioTranscript}>{selectedLesson.content.transcript}</Text>
            <View style={styles.phrasesSection}>
              <Text style={styles.phrasesTitle}>Key Phrases</Text>
              {selectedLesson.content.phrases?.map((phrase: string, index: number) => (
                <Text key={index} style={styles.phraseItem}>
                  • {phrase}
                </Text>
              ))}
            </View>
          </View>
        )

      default:
        return <Text>Content not available</Text>
    }
  }

  if (chaptersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (chaptersError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.network")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("lessons.title")}</Text>
        <View style={styles.headerRight} />
      </View>

      {!selectedChapter ? (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>{t("lessons.chooseChapter")}</Text>
          {chapters.map(renderChapterCard)}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <View style={styles.chapterHeader}>
            <TouchableOpacity onPress={() => setSelectedChapter(null)}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.selectedChapterTitle}>{selectedChapter.title}</Text>
          </View>
          {chapterLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <ScrollView>{selectedChapter.lessons.map(renderLessonItem)}</ScrollView>
          )}
        </View>
      )}

      <Modal visible={showLessonModal} animationType="slide" onRequestClose={() => setShowLessonModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLessonModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedLesson?.title}</Text>
            <View style={styles.headerRight} />
          </View>
          {renderLessonContent()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  chapterCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lockedCard: {
    opacity: 0.6,
  },
  chapterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  chapterDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },
  lessonCount: {
    fontSize: 12,
    color: "#999",
  },
  selectedChapterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lessonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  lessonDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 10,
  },
  difficultyText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  duration: {
    fontSize: 12,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  videoContainer: {
    padding: 20,
  },
  video: {
    width: "100%",
    height: 200,
    backgroundColor: "#000",
    marginBottom: 20,
  },
  transcript: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  articleContainer: {
    padding: 20,
  },
  articleText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 20,
  },
  imageContainer: {
    padding: 20,
  },
  lessonImageContainer: {
    height: 200,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    fontSize: 14,
    color: "#666",
  },
  vocabularySection: {
    marginTop: 20,
  },
  vocabularyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  vocabularyItem: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  vocabularyPronunciation: {
    fontSize: 14,
    color: "#2196F3",
    fontStyle: "italic",
    marginVertical: 2,
  },
  vocabularyMeaning: {
    fontSize: 14,
    color: "#666",
  },
  quizContainer: {
    padding: 20,
  },
  questionContainer: {
    marginBottom: 25,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: "#2196F3",
    backgroundColor: "#e3f2fd",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedOptionText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scoreContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  audioContainer: {
    padding: 20,
    alignItems: "center",
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  audioTranscript: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  phrasesSection: {
    width: "100%",
  },
  phrasesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  phraseItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    textAlign: "center",
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
})

export default FreeLessonScreen
