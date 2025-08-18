"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

type RootStackParamList = {
  ProficiencyTest: { userData: any }
  DailyWelcome: { tempUser: any }
}

type Props = NativeStackScreenProps<RootStackParamList, "ProficiencyTest">

const ProficiencyTestScreen = ({ navigation, route }: Props) => {
  const { userData } = route.params
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [isCompleted, setIsCompleted] = useState(false)
  type TestResults = {
    totalQuestions: number
    correctAnswers: number
    percentage: number
    level: string
    levelName: string
    breakdown: {
      beginner: number
      intermediate: number
      advanced: number
    }
  }
  const [results, setResults] = useState<TestResults | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  // Sample proficiency test questions for multiple languages
  const testQuestions = {
    en: [
      {
        id: 1,
        type: "multiple_choice",
        question: "What is the correct form of the verb 'to be' in this sentence: 'She ___ a teacher.'",
        options: ["am", "is", "are", "be"],
        correct: 1,
        level: "beginner",
      },
      {
        id: 2,
        type: "multiple_choice",
        question: "Choose the correct preposition: 'I'm interested ___ learning English.'",
        options: ["on", "in", "at", "for"],
        correct: 1,
        level: "intermediate",
      },
      {
        id: 3,
        type: "multiple_choice",
        question: "Which sentence uses the subjunctive mood correctly?",
        options: [
          "If I was rich, I would travel.",
          "If I were rich, I would travel.",
          "If I am rich, I would travel.",
          "If I will be rich, I would travel.",
        ],
        correct: 1,
        level: "advanced",
      },
    ],
    es: [
      {
        id: 1,
        type: "multiple_choice",
        question: "¿Cuál es la forma correcta del verbo 'ser' en esta oración: 'Ella ___ profesora.'",
        options: ["soy", "es", "son", "eres"],
        correct: 1,
        level: "beginner",
      },
      {
        id: 2,
        type: "multiple_choice",
        question: "Elige la preposición correcta: 'Estoy interesado ___ aprender español.'",
        options: ["en", "de", "por", "para"],
        correct: 0,
        level: "intermediate",
      },
    ],
    fr: [
      {
        id: 1,
        type: "multiple_choice",
        question: "Quelle est la forme correcte du verbe 'être': 'Elle ___ professeure.'",
        options: ["suis", "est", "sont", "êtes"],
        correct: 1,
        level: "beginner",
      },
    ],
  }

  const getCurrentQuestions = () => {
    const primaryLanguage = userData.targetLanguages[0] as keyof typeof testQuestions
    return testQuestions[primaryLanguage] || testQuestions.en
  }

  const questions = getCurrentQuestions()

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleCompleteTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Update progress animation
    const progress = (currentQuestion + 1) / questions.length
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [currentQuestion])

  const handleAnswer = (answerIndex: number) => {
    setAnswers({
      ...answers,
      [currentQuestion]: answerIndex,
    })

    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
      } else {
        handleCompleteTest()
      }
    }, 500)
  }

  const handleCompleteTest = () => {
    if (isCompleted) return

    setIsCompleted(true)

    // Calculate results
    let correctAnswers = 0
    let beginnerCorrect = 0
    let intermediateCorrect = 0
    let advancedCorrect = 0

    questions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correctAnswers++
        if (question.level === "beginner") beginnerCorrect++
        else if (question.level === "intermediate") intermediateCorrect++
        else if (question.level === "advanced") advancedCorrect++
      }
    })

    const percentage = (correctAnswers / questions.length) * 100
    let level = "beginner"
    let levelName = "Beginner"

    if (percentage >= 80) {
      level = "advanced"
      levelName = "Advanced"
    } else if (percentage >= 60) {
      level = "intermediate"
      levelName = "Intermediate"
    }

    const testResults = {
      totalQuestions: questions.length,
      correctAnswers,
      percentage: Math.round(percentage),
      level,
      levelName,
      breakdown: {
        beginner: beginnerCorrect,
        intermediate: intermediateCorrect,
        advanced: advancedCorrect,
      },
    }

    setResults(testResults)

    // Create final user account
    setTimeout(() => {
      const finalUserData = {
        ...userData,
        proficiencyLevel: level,
        testResults,
        accountId: Math.random().toString(36).substr(2, 10),
        createdAt: new Date().toISOString(),
      }

      // Navigate to home screen with user data
      // Auto-proceed after showing generated account
      setTimeout(() => {
        navigation.navigate("DailyWelcome", { tempUser: finalUserData })
      }, 2000)
    }, 3000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isCompleted && results) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Results Animation */}
          

          {/* Results Card */}
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Test Complete!</Text>
            <Text style={styles.resultsSubtitle}>Here are your results</Text>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{results.percentage}%</Text>
              <Text style={styles.scoreLabel}>Overall Score</Text>
            </View>

            <View style={styles.levelContainer}>
              <View style={[styles.levelBadge, styles[`${results.level}Badge`]]}>
                <Text style={styles.levelText}>{results.levelName}</Text>
              </View>
            </View>

            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Question Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Correct Answers:</Text>
                <Text style={styles.breakdownValue}>
                  {results.correctAnswers}/{results.totalQuestions}
                </Text>
              </View>
            </View>

            <View style={styles.characterContainer}>
              <Text style={styles.characterText}>{userData.character.avatar}</Text>
              <Text style={styles.characterMessage}>
                Great job, {userData.accountName}! I'll be your learning companion on this journey.
              </Text>
            </View>
          </View>

          <Text style={styles.redirectText}>Setting up your personalized learning path...</Text>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Proficiency Test</Text>
            <Text style={styles.headerSubtitle}>
              Question {currentQuestion + 1} of {questions.length}
            </Text>
          </View>
          <View style={styles.timerContainer}>
            <Icon name="timer" size={20} color="#F59E0B" />
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
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

        {/* Question */}
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
                    <Text
                      style={[styles.optionLetter, answers[currentQuestion] === index && styles.optionLetterSelected]}
                    >
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, answers[currentQuestion] === index && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Character Encouragement */}
          <View style={styles.encouragementContainer}>
            <Text style={styles.characterAvatar}>{userData.character.avatar}</Text>
            <View style={styles.encouragementBubble}>
              <Text style={styles.encouragementText}>
                {currentQuestion === 0 && "Take your time and choose the best answer!"}
                {currentQuestion === 1 && "You're doing great! Keep it up!"}
                {currentQuestion >= 2 && "Almost there! You've got this!"}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleCompleteTest}>
            <Text style={styles.skipButtonText}>Complete Test</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 4,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 24,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  questionText: {
    fontSize: 18,
    color: "#1F2937",
    lineHeight: 28,
    marginBottom: 24,
    fontWeight: "500",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  optionLetterSelected: {
    color: "#4F46E5",
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
    lineHeight: 24,
  },
  optionTextSelected: {
    color: "#1F2937",
    fontWeight: "500",
  },
  encouragementContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  characterAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  encouragementBubble: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  encouragementText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  navigationContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  skipButton: {
    backgroundColor: "#6B7280",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  resultsAnimation: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 24,
  },
  resultsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#10B981",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  levelContainer: {
    marginBottom: 24,
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  beginnerBadge: {
    backgroundColor: "#FEF3C7",
  },
  intermediateBadge: {
    backgroundColor: "#DBEAFE",
  },
  advancedBadge: {
    backgroundColor: "#D1FAE5",
  },
  levelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  breakdownContainer: {
    width: "100%",
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  characterContainer: {
    alignItems: "center",
  },
  characterText: {
    fontSize: 32,
    marginBottom: 8,
  },
  characterMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  redirectText: {
    fontSize: 14,
    color: "#4F46E5",
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: 24,
  },
})

export default ProficiencyTestScreen
