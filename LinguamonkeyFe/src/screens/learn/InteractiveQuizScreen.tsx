import { useEffect, useRef, useState } from "react"
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { QuizQuestion, QuizResult } from "../../types/api"
import { createScaledSheet } from "../../utils/scaledStyles";

const InteractiveQuizScreen = ({ navigation, route }) => {
  const { quizData } = route.params || {}

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  const mockQuestions: QuizQuestion[] = [
    {
      id: "1",
      question: "What is the correct form of the verb in this sentence: 'She _____ to the store yesterday.'",
      options: ["go", "goes", "went", "going"],
      correctAnswer: 2,
      explanation: "We use 'went' because it's the past tense form of 'go', and 'yesterday' indicates past time.",
      difficulty: "easy",
      skill: "Grammar",
      points: 10,
      type: "comprehension",
      riddle: "",
      category: ""
    },
    {
      id: "2",
      question: "Choose the word that best completes the sentence: 'The weather is _____ today.'",
      options: ["beauty", "beautiful", "beautifully", "beautify"],
      correctAnswer: 1,
      explanation: "'Beautiful' is an adjective that describes the noun 'weather'.",
      difficulty: "easy",
      skill: "Vocabulary",
      points: 10,
      type: "comprehension",
      riddle: "",
      category: ""
    },
    {
      id: "3",
      question: "Which sentence uses the present perfect tense correctly?",
      options: [
        "I have seen that movie last week.",
        "I have seen that movie already.",
        "I have saw that movie yesterday.",
        "I have seeing that movie before.",
      ],
      correctAnswer: 1,
      explanation: "Present perfect is used with 'already' to show completed actions with relevance to the present.",
      difficulty: "medium",
      skill: "Grammar",
      points: 15,
      type: "comprehension",
      riddle: "",
      category: ""
    },
  ]

  const questions = quizData?.questions || mockQuestions
  const currentQuestion = questions[currentQuestionIndex]

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: (currentQuestionIndex + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [currentQuestionIndex])

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeUp()
    }
  }, [timeLeft, isAnswered])

  const handleTimeUp = () => {
    setIsAnswered(true)
    setStreak(0)
    setShowExplanation(true)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return

    setSelectedAnswer(answerIndex)
    setIsAnswered(true)

    const isCorrect = answerIndex === currentQuestion.correctAnswer

    if (isCorrect) {
      setScore(score + currentQuestion.points)
      setStreak(streak + 1)
      setMaxStreak(Math.max(maxStreak, streak + 1))

      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      setStreak(0)
    }

    // Show explanation after a brief delay
    setTimeout(() => {
      setShowExplanation(true)
    }, 1000)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setIsAnswered(false)
      setTimeLeft(30)
    } else {
      setShowResult(true)
    }
  }

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return selectedAnswer === index ? styles.selectedOption : styles.option
    }

    if (index === currentQuestion.correctAnswer) {
      return styles.correctOption
    } else if (index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
      return styles.incorrectOption
    } else {
      return styles.option
    }
  }

  const getOptionTextStyle = (index: number) => {
    if (!isAnswered) {
      return selectedAnswer === index ? styles.selectedOptionText : styles.optionText
    }

    if (index === currentQuestion.correctAnswer) {
      return styles.correctOptionText
    } else if (index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
      return styles.incorrectOptionText
    } else {
      return styles.optionText
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "#10B981"
      case "medium":
        return "#F59E0B"
      case "hard":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const calculateResult = (): QuizResult => {
    const correctAnswers = score / (questions.reduce((sum, q) => sum + q.points, 0) / questions.length)
    const experienceGained = Math.round(score * 1.5)
    const skillsImproved = [...new Set(questions.map((q) => q.skill))] as string[]

    return {
      score,
      totalQuestions: questions.length,
      correctAnswers: Math.round(correctAnswers),
      timeSpent: questions.length * 30 - timeLeft,
      experienceGained,
      skillsImproved,
    }
  }

  const renderResultModal = () => {
    const result = calculateResult()
    const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100)

    return (
      <Modal visible={showResult} animationType="slide">
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Quiz Complete!</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.resultContent}>
            

            <View style={styles.scoreCard}>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
              <Text style={styles.scoreDescription}>
                {result.correctAnswers}/{result.totalQuestions} Correct
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Icon name="stars" size={24} color="#F59E0B" />
                <Text style={styles.statValue}>{result.score}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="trending-up" size={24} color="#10B981" />
                <Text style={styles.statValue}>+{result.experienceGained}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="local-fire-department" size={24} color="#EF4444" />
                <Text style={styles.statValue}>{maxStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="schedule" size={24} color="#3B82F6" />
                <Text style={styles.statValue}>{Math.round(result.timeSpent / 60)}m</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
            </View>

            <View style={styles.skillsSection}>
              <Text style={styles.skillsTitle}>Skills Practiced</Text>
              <View style={styles.skillsList}>
                {result.skillsImproved.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
                <Icon name="home" size={20} color="#6B7280" />
                <Text style={styles.actionButtonText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Icon name="refresh" size={20} color="#4F46E5" />
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Icon name="share" size={20} color="#10B981" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.questionCounter}>
            {currentQuestionIndex + 1}/{questions.length}
          </Text>
          <Text style={styles.currentScore}>{score} pts</Text>
        </View>
        <View style={styles.streakContainer}>
          <Icon name="local-fire-department" size={20} color="#EF4444" />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <View style={[styles.timerCircle, { borderColor: timeLeft <= 10 ? "#EF4444" : "#4F46E5" }]}>
          <Text style={[styles.timerText, { color: timeLeft <= 10 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}</Text>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: `${getDifficultyColor(currentQuestion.difficulty)}20` },
              ]}
            >
              <Text style={[styles.difficultyText, { color: getDifficultyColor(currentQuestion.difficulty) }]}>
                {currentQuestion.difficulty.toUpperCase()}
              </Text>
            </View>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{currentQuestion.skill}</Text>
            </View>
          </View>

          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleAnswerSelect(index)}
                disabled={isAnswered}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIndicator}>
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                  </View>
                  <Text style={getOptionTextStyle(index)}>{option}</Text>
                  {isAnswered && index === currentQuestion.correctAnswer && (
                    <Icon name="check-circle" size={20} color="#10B981" />
                  )}
                  {isAnswered && index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer && (
                    <Icon name="cancel" size={20} color="#EF4444" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Explanation Card */}
        {showExplanation && (
          <Animated.View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <Icon
                name={selectedAnswer === currentQuestion.correctAnswer ? "check-circle" : "info"}
                size={20}
                color={selectedAnswer === currentQuestion.correctAnswer ? "#10B981" : "#3B82F6"}
              />
              <Text style={styles.explanationTitle}>
                {selectedAnswer === currentQuestion.correctAnswer ? "Correct!" : "Explanation"}
              </Text>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>

            <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              </Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {renderResultModal()}
    </View>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerInfo: {
    alignItems: "center",
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  currentScore: {
    fontSize: 12,
    color: "#6B7280",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  timerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  skillBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillBadgeText: {
    fontSize: 10,
    color: "#4F46E5",
    fontWeight: "600",
  },
  questionText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  selectedOption: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  correctOption: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  incorrectOption: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetter: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6B7280",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  selectedOptionText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
  correctOptionText: {
    color: "#10B981",
    fontWeight: "500",
  },
  incorrectOptionText: {
    color: "#EF4444",
    fontWeight: "500",
  },
  explanationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  explanationText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 20,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  resultContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  resultContent: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  resultAnimation: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  scoreCard: {
    alignItems: "center",
    marginBottom: 32,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 16,
    color: "#6B7280",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  statItem: {
    alignItems: "center",
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  skillsSection: {
    width: "100%",
    marginBottom: 32,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  skillTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillTagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  resultActions: {
    flexDirection: "row",
    gap: 16,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
})

export default InteractiveQuizScreen
