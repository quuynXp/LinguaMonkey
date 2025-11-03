import { useEffect, useRef, useState } from "react"
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
import { useLesson, useLessonQuestions, useLessonProgress, useSubmitLesson, useCompleteLesson } from "../../hooks/useLessons";
import type { LessonQuestion, UserLearningActivity } from "../../types/api";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";

const { width } = Dimensions.get("window")

const LessonScreen = ({ navigation, route }: any) => {
  const { lessonId } = route.params
  const { t } = useTranslation()
  const { user } = useUserStore()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{
    score: number
    correct: number
    total: number
    exp_gained: number
  } | null>(null)

  const { data: lesson, isLoading: lessonLoading, error: lessonError } = useLesson(lessonId)
  const { data: questions = [], isLoading: questionsLoading } = useLessonQuestions(lessonId)
  const { data: progress } = useLessonProgress(lessonId)
  const { submitLesson, isSubmitting } = useSubmitLesson()
  const { completeLesson, isCompleting } = useCompleteLesson()

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const canProceed = currentQuestion && selectedAnswers[currentQuestion.lessonQuestionId]

  
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // === BẮT ĐẦU ===
    // Ghi lại thời điểm bắt đầu
    startTimeRef.current = Date.now();
    
    // Gọi API /start
    UserLearningActivity.logStart({
      userId: user.userId,
      activityType: 'LESSON_START', // Lấy từ Enum ở BE
      relatedEntityId: lessonId,
    }).catch(err => console.error("Failed to log start:", err));

    // === KẾT THÚC ===
    // Trả về một cleanup function, được gọi khi component unmount
    return () => {
      if (startTimeRef.current) {
        // Tính thời gian
        const endTime = Date.now();
        const durationMs = endTime - startTimeRef.current;
        const durationSeconds = Math.round(durationMs / 1000);

        // Chỉ log nếu thời gian > 5 giây (tránh spam)
        if (durationSeconds > 5) {
          // Gọi API /end
          UserLearningActivity.logEnd({
            userId: user.userId,
            activityType: 'LESSON_END',
            relatedEntityId: lessonId,
            durationInSeconds: durationSeconds,
          }).catch(err => console.error("Failed to log end:", err));
        }
      }
    };
    
    // Dependencies: chỉ chạy 1 lần khi vào màn hình
  }, [lessonId, user.userId]);
  
  useEffect(() => {
    if (progress?.completedAt) {
      Alert.alert(
        t("lessons.alreadyCompleted"),
        t("lessons.alreadyCompletedMessage"),
        [
          { text: t("common.back"), onPress: () => navigation.goBack() },
          { text: t("lessons.reviewAnswers"), onPress: () => {} },
        ]
      )
    }
  }, [progress])

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmitLesson()
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmitLesson = async () => {
    if (!lesson || Object.keys(selectedAnswers).length !== questions.length) {
      Alert.alert(t("common.error"), t("lessons.pleaseAnswerAll"))
      return
    }

    try {
      const result = await submitLesson(lesson.lessonId, selectedAnswers)
      setResults(result)
      setShowResults(true)

      // Complete the lesson if score is good enough
      if (result.score >= 70) {
        await completeLesson(lesson.lessonId, result.score)
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("errors.unknown"))
    }
  }

  const handleRetry = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setShowResults(false)
    setResults(null)
  }

  const handleFinish = () => {
    navigation.goBack()
  }

  const renderQuestion = (question: LessonQuestion) => {
    const options = [
      { key: 'A', value: question.optionA },
      { key: 'B', value: question.optionB },
      { key: 'C', value: question.optionB },
      { key: 'D', value: question.optionD },
    ].filter(option => option.value)

    return (
      <View style={styles.questionContainer}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>
            {t("lessons.questionNumber", { current: currentQuestionIndex + 1, total: questions.length })}
          </Text>
          <Text style={styles.skillType}>{question.skillType}</Text>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionButton,
                selectedAnswers[question.lessonQuestionId] === option.value && styles.selectedOption
              ]}
              onPress={() => handleAnswerSelect(question.lessonQuestionId, option.value)}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.optionIndicator,
                  selectedAnswers[question.lessonQuestionId] === option.value && styles.selectedIndicator
                ]}>
                  <Text style={[
                    styles.optionKey,
                    selectedAnswers[question.lessonQuestionId] === option.value && styles.selectedOptionKey
                  ]}>
                    {option.key}
                  </Text>
                </View>
                <Text style={[
                  styles.optionText,
                  selectedAnswers[question.lessonQuestionId] === option.value && styles.selectedOptionText
                ]}>
                  {option.value}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const percentage = Math.round((results.correct / results.total) * 100)
    const passed = percentage >= 70

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Icon 
            name={passed ? "check-circle" : "cancel"} 
            size={64} 
            color={passed ? "#10B981" : "#EF4444"} 
          />
          <Text style={styles.resultsTitle}>
            {passed ? t("lessons.congratulations") : t("lessons.tryAgain")}
          </Text>
          <Text style={styles.resultsSubtitle}>
            {t("lessons.scoreMessage", { score: percentage })}
          </Text>
        </View>

        <View style={styles.resultsStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{results.correct}</Text>
            <Text style={styles.statLabel}>{t("lessons.correct")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{results.total - results.correct}</Text>
            <Text style={styles.statLabel}>{t("lessons.incorrect")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>+{results.exp_gained}</Text>
            <Text style={styles.statLabel}>{t("lessons.expGained")}</Text>
          </View>
        </View>

        <View style={styles.resultsActions}>
          {!passed && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>{t("lessons.retry")}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>{t("lessons.finish")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (lessonError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (lessonLoading || questionsLoading || !lesson || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
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
        <Text style={styles.headerTitle}>{lesson.title}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.expReward}>+{lesson.expReward} XP</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
          ]} 
        />
      </View>

      <ScrollView style={styles.content}>
        {renderQuestion(currentQuestion)}
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Icon name="chevron-left" size={24} color={currentQuestionIndex === 0 ? "#ccc" : "#333"} />
          <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.disabledText]}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.disabledButton]}
          onPress={handleNext}
          disabled={!canProceed || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? t("lessons.submit") : t("common.next")}
              </Text>
              <Icon name="chevron-right" size={24} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Modal */}
      <Modal
        visible={showResults}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderResults()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = createScaledSheet({
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
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  expReward: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10B981",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  skillType: {
    fontSize: 12,
    color: "#3B82F6",
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "500",
  },
  questionText: {
    fontSize: 18,
    color: "#333",
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: "500",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
  },
  selectedOption: {
    borderColor: "#3B82F6",
    backgroundColor: "#EBF8FF",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedIndicator: {
    backgroundColor: "#3B82F6",
  },
  optionKey: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  selectedOptionKey: {
    color: "#fff",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedOptionText: {
    color: "#3B82F6",
    fontWeight: "500",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginRight: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#ccc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: width - 40,
    maxWidth: 400,
  },
  resultsContainer: {
    alignItems: "center",
  },
  resultsHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  resultsStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 30,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  resultsActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  finishButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default LessonScreen
