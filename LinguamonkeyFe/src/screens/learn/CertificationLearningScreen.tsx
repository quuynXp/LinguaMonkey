
import { useEffect, useState } from "react"
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { CertificationTest, useCertifications } from "../../hooks/useCertifications"
import { useUserStore } from "../../stores/UserStore"
import { formatDateTime } from "../../utils/timeHelper"
import Toast from "../../utils/toastConfig"
import { createScaledSheet } from "../../utils/scaledStyles"

const CertificationLearningScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user } = useUserStore()

  const [selectedLanguage, setSelectedLanguage] = useState<string>("All")
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [testMode, setTestMode] = useState<"selection" | "practice" | "exam" | "results">("selection")
  const [testResult, setTestResult] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)

  const { useAvailableCertifications, useTestQuestions, useSubmitTest, useStartTest } = useCertifications();

  const userLanguages = user?.languages || []

  const { data: certifications = [], isLoading, error, refetch } = useAvailableCertifications(
    selectedLanguage === "All" ? userLanguages : [selectedLanguage]
  );

  const { data: testQuestions = [], isLoading: questionsLoading } = useTestQuestions(
    selectedTest?.id || null,
    testMode === "practice" ? "practice" : "exam"
  );

  const { submitTest, isSubmitting } = useSubmitTest()
  const { startTest, isStarting } = useStartTest()

  // Get unique languages from certifications
  const availableLanguages = ["All", ...new Set(certifications?.map((cert) => cert.language) || [])]

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (testMode === "exam" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testMode, timeLeft]);

  const handleTimeUp = () => {
    Toast.show({
      type: "error",
      text1: t("certifications.timeUp"),
      text2: t("certifications.timeUpMessage"),
    })
    submitTestAnswers()
  }

  const startPracticeTest = async (test: CertificationTest) => {
  try {
    const res = await startTest({ testId: test.id, mode: "practice" }); 
    setSelectedTest(test);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setTestMode("practice");
    setSessionId(res.sessionId);
    setStartTime(res.startTime);
  } catch (err: any) {
    Toast.show({ type: "error", text1: t("common.error"), text2: err.message || t("errors.unknown") });
  }
};

  const startFullExam = async (test: CertificationTest) => {
  try {
    const res = await startTest({ testId: test.id, mode: "exam" });
    setSelectedTest(test);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setTimeLeft(test.duration * 60); 
    setTestMode("exam");
    setSessionId(res.sessionId);
    setStartTime(res.startTime);
  } catch (err: any) {
    Toast.show({ type: "error", text1: t("common.error"), text2: err.message || t("errors.unknown") });
  }
};

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }))
  }

  const nextQuestion = () => {
    if (testQuestions && currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const submitTestAnswers = async () => {
  if (!selectedTest || !testQuestions || !startTime) return;

  const timeSpent = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);

  try {
    const result = await submitTest({
      testId: selectedTest.id,
      answers: selectedAnswers,
      mode: testMode === "exam" ? "exam" : "practice",
      timeSpent,
    });
    setTestResult(result);
    setTestMode("results");
    if (result.passed) {
      Toast.show({ type: "success", text1: t("certifications.testPassed"), text2: t("certifications.congratulations") });
    } else {
      Toast.show({ type: "error", text1: t("certifications.testFailed"), text2: t("certifications.tryAgain") });
    }
  } catch (err: any) {
    Toast.show({ type: "error", text1: t("common.error"), text2: err.message || t("errors.unknown") });
  }
};

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getSkillColor = (percentage: number): string => {
    if (percentage >= 80) return "#4CAF50"
    if (percentage >= 60) return "#FF9800"
    return "#F44336"
  }

  const renderTestCard = ({ item }: { item: any }) => (
    <View style={[styles.testCard, { borderLeftColor: item.color }]}>
      <View style={styles.testHeader}>
        <Text style={styles.testIcon}>{item.icon}</Text>
        <View style={styles.testInfo}>
          <Text style={styles.testLevel}>{item.level}</Text>
          <Text style={styles.testName}>{item.name}</Text>
        </View>
      </View>

      <Text style={styles.testDescription}>{item.description}</Text>

      <View style={styles.testStats}>
        <View style={styles.statItem}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.statText}>
            {item.duration} {t("common.minutes")}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="quiz" size={16} color="#666" />
          <Text style={styles.statText}>
            {item.totalQuestions} {t("certifications.questions")}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="grade" size={16} color="#666" />
          <Text style={styles.statText}>
            {t("certifications.pass")}: {item.passingScore}%
          </Text>
        </View>
      </View>

      {item.userProgress && (
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {t("certifications.attempts")}: {item.userProgress.attempts}
          </Text>
          {item.userProgress.bestScore && (
            <Text style={styles.progressText}>
              {t("certifications.bestScore")}: {item.userProgress.bestScore}%
            </Text>
          )}
        </View>
      )}

      <View style={styles.testActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.practiceButton]}
          onPress={() => startPracticeTest(item)}
          disabled={isStarting}
        >
          <Text style={styles.practiceButtonText}>
            {isStarting ? t("common.starting") : t("certifications.practiceTest")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.examButton]}
          onPress={() => startFullExam(item)}
          disabled={isStarting}
        >
          <Text style={styles.examButtonText}>{isStarting ? t("common.starting") : t("certifications.fullExam")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("certifications.title")}</Text>
          <View />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.loadCertificationsFailed")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (testMode === "results" && testResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTestMode("selection")}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("certifications.testResults")}</Text>
          <View />
        </View>

        <ScrollView style={styles.resultsContainer}>
          <View style={styles.scoreCard}>
            <View style={[styles.scoreCircle, { borderColor: testResult.passed ? "#4CAF50" : "#F44336" }]}>
              <Text style={[styles.scoreText, { color: testResult.passed ? "#4CAF50" : "#F44336" }]}>
                {Math.round(testResult.score)}%
              </Text>
            </View>
            <Text style={[styles.resultStatus, { color: testResult.passed ? "#4CAF50" : "#F44336" }]}>
              {testResult.passed ? t("certifications.passed") : t("certifications.failed")}
            </Text>
            <Text style={styles.resultSubtext}>
              {testResult.correctAnswers} {t("certifications.outOf")} {testResult.totalQuestions}{" "}
              {t("certifications.correct")}
            </Text>
            <Text style={styles.completedDate}>
              {t("certifications.completedOn")} {formatDateTime(testResult.completedAt)}
            </Text>
          </View>

          <View style={styles.skillBreakdownCard}>
            <Text style={styles.sectionTitle}>{t("certifications.skillBreakdown")}</Text>
            {Object.entries(testResult.skillBreakdown).map(([skill, data]: [string, any]) => {
              const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0
              return (
                <View key={skill} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{t(`certifications.skills.${skill}`)}</Text>
                    <Text style={styles.skillScore}>
                      {data.correct}/{data.total}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percentage}%`, backgroundColor: getSkillColor(percentage) },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>

          <View style={styles.suggestionsCard}>
            <Text style={styles.sectionTitle}>{t("certifications.improvementSuggestions")}</Text>
            {testResult.suggestions.map((suggestion: string, index: number) => (
              <View key={index} style={styles.suggestionItem}>
                <Icon name="lightbulb-outline" size={20} color="#FF9800" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => setTestMode("selection")}>
              <Text style={styles.retakeButtonText}>{t("certifications.takeAnotherTest")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (testMode === "practice" || testMode === "exam") {
    if (questionsLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>{t("certifications.loadingQuestions")}</Text>
          </View>
        </SafeAreaView>
      )
    }

    if (!testQuestions || testQuestions.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Icon name="quiz" size={64} color="#9CA3AF" />
            <Text style={styles.errorText}>{t("certifications.noQuestionsAvailable")}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setTestMode("selection")}>
              <Text style={styles.retryText}>{t("common.back")}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )
    }

    const currentQ = testQuestions[currentQuestion]
    const progress = ((currentQuestion + 1) / testQuestions.length) * 100

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTestMode("selection")}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {selectedTest?.level} - {testMode === "exam" ? t("certifications.exam") : t("certifications.practice")}
          </Text>
          {testMode === "exam" && <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {t("certifications.question")} {currentQuestion + 1} {t("certifications.of")} {testQuestions.length}
          </Text>
        </View>

        <ScrollView style={styles.questionContainer}>
          <View style={styles.questionCard}>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{t(`certifications.skills.${currentQ.skill}`).toUpperCase()}</Text>
            </View>

            <Text style={styles.questionText}>{currentQ.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQ.options.map((option: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, selectedAnswers[currentQ.id] === index && styles.selectedOption]}
                  onPress={() => handleAnswerSelect(currentQ.id, index)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                    <Text
                      style={[styles.optionText, selectedAnswers[currentQ.id] === index && styles.selectedOptionText]}
                    >
                      {option}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationSection}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestion === 0 && styles.disabledButton]}
            onPress={previousQuestion}
            disabled={currentQuestion === 0}
          >
            <Text style={styles.navButtonText}>{t("common.previous")}</Text>
          </TouchableOpacity>

          {currentQuestion === testQuestions.length - 1 ? (
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={submitTestAnswers}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? t("common.submitting") : t("certifications.submitTest")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navButton} onPress={nextQuestion}>
              <Text style={styles.navButtonText}>{t("common.next")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const filteredTests =
    certifications?.filter((test) => selectedLanguage === "All" || test.language === selectedLanguage) || []

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("certifications.title")}</Text>
        <View />
      </View>

      <View style={styles.languageSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableLanguages.map((language) => (
            <TouchableOpacity
              key={language}
              style={[styles.languageChip, selectedLanguage === language && styles.selectedLanguageChip]}
              onPress={() => setSelectedLanguage(language)}
            >
              <Text style={[styles.languageChipText, selectedLanguage === language && styles.selectedLanguageChipText]}>
                {language === "All" ? t("common.all") : language}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>{t("certifications.loadingCertifications")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTests}
          renderItem={renderTestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.testsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="school" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t("certifications.noCertificationsAvailable")}</Text>
              <Text style={styles.emptySubtext}>{t("certifications.checkBackLater")}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  languageSelector: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  languageChip: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginLeft: 15,
  },
  selectedLanguageChip: {
    backgroundColor: "#4ECDC4",
  },
  languageChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedLanguageChipText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  testsList: {
    padding: 20,
  },
  testCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  testIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testLevel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  testName: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  testDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  testStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  progressInfo: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 12,
    color: "#4ECDC4",
    fontWeight: "500",
    marginBottom: 2,
  },
  testActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  practiceButton: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  examButton: {
    backgroundColor: "#4ECDC4",
  },
  practiceButtonText: {
    color: "#4ECDC4",
    fontSize: 14,
    fontWeight: "500",
  },
  examButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skillBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 15,
  },
  skillBadgeText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
  },
  questionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: "#E3F2FD",
    borderColor: "#4ECDC4",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  selectedOptionText: {
    color: "#4ECDC4",
    fontWeight: "500",
  },
  navigationSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  navButton: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "700",
  },
  resultStatus: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  resultSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  completedDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  skillBreakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  skillItem: {
    marginBottom: 15,
  },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  skillName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  skillScore: {
    fontSize: 14,
    color: "#666",
  },
  suggestionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 10,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  retakeButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retakeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#D1D5DB",
    textAlign: "center",
  },
})

export default CertificationLearningScreen
