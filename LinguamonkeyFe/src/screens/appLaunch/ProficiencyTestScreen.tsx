// ProficiencyTestScreen.tsx
import { use, useEffect, useRef, useState } from "react"
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import instance from "../../api/axiosInstance"
import { useUserStore } from "../../stores/UserStore"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gotoTab, resetToTab } from "../../utils/navigationRef"
import { LessonCategoryResponse, LessonResponse, LessonQuestionResponse, LessonProgressWrongItemRequest, UIQuestion } from "../../types/api"
// import { t } from "i18next" // <-- XÓA DÒNG NÀY
import { useTranslation } from "react-i18next" // <-- THÊM DÒNG NÀY
import { formatDateTime } from "../../utils/timeHelper"

type RootStackParamList = {
  ProficiencyTest: undefined
  DailyWelcome: { tempUser: any } | undefined
  Dashboard: undefined
}

type Props = NativeStackScreenProps<RootStackParamList, "ProficiencyTest">

type BackendPage<T> = { content: T[]; totalElements?: number; totalPages?: number }
type BackendApiResponse<T> = { code: number; result?: T; data?: T; message?: string }


const ProficiencyTestScreen = ({ navigation }: Props) => {
  const { t } = useTranslation() // <-- THÊM DÒNG NÀY
  const user = useUserStore((s) => s.user)
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [selectedLangIndex, setSelectedLangIndex] = useState(0) // index in availableLanguages
  const [stage, setStage] = useState<"choose-language" | "testing" | "finished">("choose-language")

  const [questions, setQuestions] = useState<UIQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(300)
  const [isCompleted, setIsCompleted] = useState(false)
  const [results, setResults] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const langs = (user?.languages ?? []).map((l: string) => String(l.toLowerCase()))
    setAvailableLanguages(langs.length ? langs : ["en"]) // fallback
  }, [user])

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  }, [])

  useEffect(() => {
    const progress = questions.length ? (currentQuestion + 1) / questions.length : 0
    Animated.timing(progressAnim, { toValue: progress, duration: 200, useNativeDriver: false }).start()
  }, [currentQuestion, questions])

  useEffect(() => {
    let timer: any
    if (stage === "testing") {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleCompleteTest()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [stage, questions])

  const startTestForSelectedLanguage = async () => {
    const code = (availableLanguages[selectedLangIndex] || "EN").toLowerCase()
    setLoading(true)
    setStage("testing")
    setCurrentQuestion(0)
    setAnswers({})
    setIsCompleted(false)
    setResults(null)
    setTimeLeft(300)

    try {
      const catResp = await instance.get("/lesson-categories", {
        params: { lessonCategoryName: "initial", languageCode: code, page: 0, size: 1 },
      })
      const catPayload = catResp.data as BackendApiResponse<BackendPage<LessonCategoryResponse>>
      const categories = catPayload.result?.content ?? (catPayload.data as any)?.content ?? []
      if (!categories || categories.length === 0) {
        Alert.alert(
          t("common.error"),
          t("proficiencyTest.errors.noInitialCategory", { code: code.toUpperCase() })
        )
        setQuestions([])
        setStage("choose-language")
        return
      }
      const categoryId = categories[0].lessonCategoryId

      // 2) get lesson with categoryId + languageCode
      const lessonResp = await instance.get("/lessons", {
        params: { categoryId, languageCode: code, page: 0, size: 1 },
      })
      const lessonPayload = lessonResp.data as BackendApiResponse<BackendPage<LessonResponse>>
      const lessons = lessonPayload.result?.content ?? (lessonPayload.data as any)?.content ?? []
      if (!lessons || lessons.length === 0) {
        Alert.alert(
          t("common.error"),
          t("proficiencyTest.errors.noLessonForInitial", { code: code.toUpperCase() })
        )
        setQuestions([])
        setStage("choose-language")
        return
      }
      const lesson = lessons[0]

      // 3) get lesson-questions (also pass languageCode for safety)
      const qResp = await instance.get("/lesson-questions", {
        params: { lessonId: lesson.lessonId, languageCode: code, page: 0, size: 500 },
      })
      const qPayload = qResp.data as BackendApiResponse<BackendPage<LessonQuestionResponse>>
      const qList = qPayload.result?.content ?? (qPayload.data as any)?.content ?? []
      if (!qList || qList.length === 0) {
        Alert.alert(t("common.error"), t("proficiencyTest.errors.noQuestions"))
        setQuestions([])
        setStage("choose-language")
        return
      }

      const uiQs: UIQuestion[] = qList.map((q) => {
        const opts = [q.optionA ?? "", q.optionB ?? "", q.optionC ?? "", q.optionD ?? ""]
        const correctLetter = (q.correctOption ?? "A").toUpperCase()
        const correctIndex = Math.max(0, ["A", "B", "C", "D"].indexOf(correctLetter))
        return {
          id: q.lessonQuestionId,
          lessonId: q.lessonId, // save real lessonId
          question: q.question,
          options: opts,
          correctIndex,
        }
      })

      setQuestions(uiQs)
    } catch (err) {
      console.error("startTestForSelectedLanguage error", err)
      Alert.alert(t("common.networkError"), t("proficiencyTest.errors.loadFailed"))
      setStage("choose-language")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: answerIndex }))

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((c) => c + 1)
      } else {
        handleCompleteTest()
      }
    }, 250)
  }

  const indexToLetter = (i: number) => {
    if (i < 0 || i > 3) return "?"
    return String.fromCharCode(65 + i)
  }


  const handleCompleteTest = async () => {
    if (isCompleted) return
    setIsCompleted(true)

    let correctAnswers = 0
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correctAnswers++
    })
    const percentage = questions.length ? Math.round((correctAnswers / questions.length) * 100) : 0
    const testResults = { totalQuestions: questions.length, correctAnswers, percentage }

    setResults(testResults)

    // Build wrong items and POST
    const userId = user?.userId
    if (userId) {
      const wrongItems: LessonProgressWrongItemRequest[] = []
      questions.forEach((q, idx) => {
        const selected = answers[idx]
        if (selected === undefined || selected !== q.correctIndex) {
          wrongItems.push({
            lessonId: q.lessonId, // correct lessonId
            userId,
            lessonQuestionId: q.id,
            wrongAnswer: selected === undefined ? "?" : indexToLetter(selected),
            isDeleted: false,
          })
        }
      })

      try {
        // if backend supports batch, replace with batch endpoint; else send individually
        await Promise.all(
          wrongItems.map((item) =>
            instance.post("/lesson-progress-wrong-items", {
              lessonId: item.lessonId,
              userId: item.userId,
              lessonQuestionId: item.lessonQuestionId,
              wrongAnswer: item.wrongAnswer,
              isDeleted: item.isDeleted,
            })
          )
        )
      } catch (err) {
        console.error("Save wrong items error", err)
      }
    } else {
      console.warn("No userId; skipping save wrong items")
    }

    // After finishing language test -> if more languages, ask user
    const langs = availableLanguages
    if (langs.length > 1) {
      const nextIndex = selectedLangIndex + 1
      const hasMore = nextIndex < langs.length
      if (hasMore) {
        Alert.alert(
          t("proficiencyTest.alerts.testCompleteTitle"),
          t("proficiencyTest.alerts.nextLanguagePrompt", {
            percentage: testResults.percentage,
            language: langs[nextIndex].toUpperCase()
          }),
          [
            {
              text: t("common.yes"),
              onPress: () => {
                setSelectedLangIndex(nextIndex)
                // restart test for next language
                setStage("testing")
                // small delay then start
                setTimeout(() => startTestForSelectedLanguage(), 300)
              }
            },
            { text: t("common.no"), onPress: () => finalizeAfterTests() },
          ],
          { cancelable: false }
        )
        return
      }
    }

    finalizeAfterTests()
  }

  const finalizeAfterTests = async () => {

    // you can update user profile with proficiency summary per language here if backend supports it
    // For now navigate to Dashboard (setup only created account; test handled here)
    await AsyncStorage.setItem("hasDonePlacementTest", "true");
    resetToTab("Home")
  }

  const handleTestComplete = async (score: number, total: number) => {
    const proficiency = (score / total) * 100
    //A1, A2, B1, B2, C1, C2, NATIVE 
    let level = 'beginner'
    if (proficiency > 70) level = 'A1'
    else if (proficiency > 40) level = 'A2'
    level.toUpperCase()
    try {
      await instance.put('/users',
        { user_id: useUserStore.getState().user.userId, proficiency: level, })
      navigation.navigate("Dashboard")
    } catch (error) {
      Alert.alert(t("common.error"), t("proficiencyTest.errors.classifyLevelFailed"))
    }
  }


  // UI: choose language screen
  if (stage === "choose-language") {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => gotoTab("Home")}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("proficiencyTest.title")}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
              {t("proficiencyTest.selectLanguage")}
            </Text>
            {availableLanguages.map((lang, idx) => (
              <TouchableOpacity
                key={lang + idx}
                style={[
                  styles.languageChip,
                  selectedLangIndex === idx && styles.languageChipSelected,
                  { marginBottom: 8 }
                ]}
                onPress={() => setSelectedLangIndex(idx)}
              >
                <Text style={[styles.languageText, selectedLangIndex === idx && styles.languageTextSelected]}>
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.nextButton, { marginTop: 16 }]}
              onPress={() => startTestForSelectedLanguage()}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading ? t("common.loading") : t("proficiencyTest.startTest")}
              </Text>
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    )
  }

  // testing UI (use your existing question UI)
  if (questions.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <Text style={{ marginTop: 60, textAlign: "center" }}>
          {t("proficiencyTest.noQuestionsAvailable")}
        </Text>
      </View>
    )
  }

  if (isCompleted && results) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{t("proficiencyTest.results.title")}</Text>
            <Text style={styles.resultsSubtitle}>
              {t("proficiencyTest.results.subtitle", { score: results.percentage })}
            </Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{results.percentage}%</Text>
              <Text style={styles.scoreLabel}>{t("proficiencyTest.results.overallScore")}</Text>
            </View>
            <TouchableOpacity style={[styles.nextButton, { marginTop: 8 }]} onPress={() => {
              // if more languages left start next or finalize
              const nextIndex = selectedLangIndex + 1
              if (nextIndex < availableLanguages.length) {
                setSelectedLangIndex(nextIndex)
                setIsCompleted(false)
                setStage("testing")
                setTimeout(() => startTestForSelectedLanguage(), 300)
              } else {
                finalizeAfterTests()
              }
            }}>
              <Text style={styles.nextButtonText}>
                {selectedLangIndex + 1 < availableLanguages.length
                  ? t("proficiencyTest.continueNext")
                  : t("common.finish")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {t("proficiencyTest.titleWithLanguage", {
                language: availableLanguages[selectedLangIndex]?.toUpperCase()
              })}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t("proficiencyTest.questionProgress", {
                current: Math.min(currentQuestion + 1, questions.length),
                total: questions.length
              })}
            </Text>
          </View>
          <View style={styles.timerContainer}>
            <Icon name="timer" size={20} color="#F59E0B" />
            <Text style={styles.timerText}>{formatDateTime(timeLeft)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>

        <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{questions[currentQuestion]?.question}</Text>

            <View style={styles.optionsContainer}>
              {questions[currentQuestion]?.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, answers[currentQuestion] === index && styles.optionButtonSelected]}
                  onPress={() => handleAnswer(index)}
                >
                  <View style={styles.optionIndicator}>
                    <Text style={[styles.optionLetter, answers[currentQuestion] === index && styles.optionLetterSelected]}>{String.fromCharCode(65 + index)}</Text>
                  </View>
                  <Text style={[styles.optionText, answers[currentQuestion] === index && styles.optionTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={() => handleCompleteTest()}>
            <Text style={styles.skipButtonText}>{t("proficiencyTest.completeTest")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

// ... styles ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flex: 1, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  timerContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  timerText: { fontSize: 14, fontWeight: "600", color: "#F59E0B", marginLeft: 4 },
  progressContainer: { height: 4, backgroundColor: "#E5E7EB", marginHorizontal: 24, borderRadius: 2, marginBottom: 24 },
  progressBar: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 2 },
  questionContainer: { flex: 1, paddingHorizontal: 24 },
  questionCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, marginBottom: 24, elevation: 4 },
  questionText: { fontSize: 18, color: "#1F2937", lineHeight: 28, marginBottom: 24, fontWeight: "500" },
  optionsContainer: { gap: 12 },
  optionButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, borderWidth: 2, borderColor: "transparent" },
  optionButtonSelected: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  optionIndicator: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionLetter: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  optionLetterSelected: { color: "#4F46E5" },
  optionText: { fontSize: 16, color: "#374151", flex: 1, lineHeight: 24 },
  optionTextSelected: { color: "#1F2937", fontWeight: "500" },
  encouragementContainer: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  characterAvatar: { fontSize: 32, marginRight: 12 },
  encouragementBubble: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, elevation: 2 },
  encouragementText: { fontSize: 14, color: "#6B7280", fontStyle: "italic" },
  navigationContainer: { paddingHorizontal: 24, paddingVertical: 20 },
  skipButton: { backgroundColor: "#6B7280", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  skipButtonText: { fontSize: 14, color: "#FFFFFF", fontWeight: "500" },
  resultsCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, marginHorizontal: 24, marginBottom: 24, elevation: 4, alignItems: "center" },
  resultsTitle: { fontSize: 24, fontWeight: "bold", color: "#1F2937", marginBottom: 8 },
  resultsSubtitle: { fontSize: 16, color: "#6B7280", marginBottom: 24 },
  scoreContainer: { alignItems: "center", marginBottom: 24 },
  scoreText: { fontSize: 48, fontWeight: "bold", color: "#10B981" },
  scoreLabel: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  nextButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 12, gap: 8 },
  nextButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  languageChip: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB" },
  languageChipSelected: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  languageText: { color: "#374151" },
  languageTextSelected: { color: "#FFFFFF" },
})

export default ProficiencyTestScreen