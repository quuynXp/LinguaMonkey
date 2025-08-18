"use client"

import { useEffect, useState } from "react"
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons';
interface CertificationTest {
  id: string
  language: "English" | "Chinese" | "Japanese" | "Korean" | "French"
  level: string
  name: string
  description: string
  duration: number // in minutes
  totalQuestions: number
  passingScore: number
  icon: string
  color: string
}

interface TestQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  skill: "reading" | "listening" | "grammar" | "vocabulary"
}

interface TestResult {
  score: number
  totalQuestions: number
  correctAnswers: number
  skillBreakdown: {
    reading: { correct: number; total: number }
    listening: { correct: number; total: number }
    grammar: { correct: number; total: number }
    vocabulary: { correct: number; total: number }
  }
  suggestions: string[]
  passed: boolean
}

const CertificationLearningScreen = ({ navigation }: any) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English")
  const [selectedTest, setSelectedTest] = useState<CertificationTest | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [testMode, setTestMode] = useState<"selection" | "practice" | "exam" | "results">("selection")
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const certificationTests: CertificationTest[] = [
    {
      id: "1",
      language: "English",
      level: "TOEFL iBT",
      name: "Test of English as a Foreign Language",
      description: "Academic English proficiency test for university admission",
      duration: 180,
      totalQuestions: 80,
      passingScore: 80,
      icon: "🇺🇸",
      color: "#4285F4",
    },
    {
      id: "2",
      language: "English",
      level: "IELTS",
      name: "International English Language Testing System",
      description: "English proficiency test for study, work and migration",
      duration: 165,
      totalQuestions: 40,
      passingScore: 6.5,
      icon: "🇬🇧",
      color: "#34A853",
    },
    {
      id: "3",
      language: "Chinese",
      level: "HSK 6",
      name: "Hanyu Shuiping Kaoshi Level 6",
      description: "Highest level Chinese proficiency test",
      duration: 140,
      totalQuestions: 101,
      passingScore: 180,
      icon: "🇨🇳",
      color: "#EA4335",
    },
    {
      id: "4",
      language: "Japanese",
      level: "JLPT N1",
      name: "Japanese Language Proficiency Test N1",
      description: "Advanced Japanese language certification",
      duration: 170,
      totalQuestions: 100,
      passingScore: 100,
      icon: "🇯🇵",
      color: "#FBBC04",
    },
    {
      id: "5",
      language: "Korean",
      level: "TOPIK II",
      name: "Test of Proficiency in Korean Level 6",
      description: "Advanced Korean language proficiency test",
      duration: 180,
      totalQuestions: 50,
      passingScore: 230,
      icon: "🇰🇷",
      color: "#9C27B0",
    },
    {
      id: "6",
      language: "French",
      level: "DALF C2",
      name: "Diplôme Approfondi de Langue Française",
      description: "Advanced French language diploma",
      duration: 210,
      totalQuestions: 60,
      passingScore: 50,
      icon: "🇫🇷",
      color: "#FF5722",
    },
  ]

  const sampleQuestions: TestQuestion[] = [
    {
      id: "1",
      question:
        'Choose the best word to complete the sentence: "The research findings were _____ with previous studies."',
      options: ["consistent", "consisting", "consistency", "consistently"],
      correctAnswer: 0,
      explanation: '"Consistent" is the correct adjective form meaning "in agreement with" previous studies.',
      skill: "vocabulary",
    },
    {
      id: "2",
      question: "Which sentence demonstrates correct parallel structure?",
      options: [
        "She likes reading, writing, and to paint.",
        "She likes reading, writing, and painting.",
        "She likes to read, writing, and painting.",
        "She likes read, write, and paint.",
      ],
      correctAnswer: 1,
      explanation:
        "Parallel structure requires all items in a series to have the same grammatical form (gerunds: reading, writing, painting).",
      skill: "grammar",
    },
    {
      id: "3",
      question: "Based on the passage, what can be inferred about the author's opinion?",
      options: [
        "The author strongly supports the policy.",
        "The author is neutral about the policy.",
        "The author has reservations about the policy.",
        "The author completely opposes the policy.",
      ],
      correctAnswer: 2,
      explanation:
        "The author uses cautious language and presents counterarguments, indicating reservations rather than strong support or opposition.",
      skill: "reading",
    },
  ]

  const languages = ["English", "Chinese", "Japanese", "Korean", "French"]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (testMode === "exam" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [testMode, timeLeft])

  const handleTimeUp = () => {
    Alert.alert("Time's Up!", "Your exam time has expired. Submitting your answers now.")
    submitTest()
  }

  const startPracticeTest = (test: CertificationTest) => {
    setSelectedTest(test)
    setCurrentQuestion(0)
    setSelectedAnswers(new Array(sampleQuestions.length).fill(-1))
    setTestMode("practice")
  }

  const startFullExam = (test: CertificationTest) => {
    setSelectedTest(test)
    setCurrentQuestion(0)
    setSelectedAnswers(new Array(test.totalQuestions).fill(-1))
    setTimeLeft(test.duration * 60) // Convert minutes to seconds
    setTestMode("exam")
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const nextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const submitTest = () => {
    // Calculate results
    let correctAnswers = 0
    const skillBreakdown = {
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      vocabulary: { correct: 0, total: 0 },
    }

    sampleQuestions.forEach((question, index) => {
      const skill = question.skill
      skillBreakdown[skill].total++

      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++
        skillBreakdown[skill].correct++
      }
    })

    const score = (correctAnswers / sampleQuestions.length) * 100
    const passed = selectedTest ? score >= selectedTest.passingScore : false

    const suggestions = generateSuggestions(skillBreakdown)

    const result: TestResult = {
      score,
      totalQuestions: sampleQuestions.length,
      correctAnswers,
      skillBreakdown,
      suggestions,
      passed,
    }

    setTestResult(result)
    setTestMode("results")
  }

  const generateSuggestions = (skillBreakdown: TestResult["skillBreakdown"]): string[] => {
    const suggestions: string[] = []

    Object.entries(skillBreakdown).forEach(([skill, data]) => {
      const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0

      if (percentage < 60) {
        switch (skill) {
          case "reading":
            suggestions.push(
              "Focus on reading comprehension exercises and practice identifying main ideas and inferences.",
            )
            break
          case "listening":
            suggestions.push("Improve listening skills by practicing with audio materials at various speeds.")
            break
          case "grammar":
            suggestions.push(
              "Review grammar rules, especially parallel structure, verb tenses, and sentence construction.",
            )
            break
          case "vocabulary":
            suggestions.push(
              "Expand vocabulary through reading and using flashcards for academic and professional terms.",
            )
            break
        }
      }
    })

    if (suggestions.length === 0) {
      suggestions.push("Excellent work! Continue practicing to maintain your proficiency level.")
    }

    return suggestions
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const renderTestCard = ({ item }: { item: CertificationTest }) => (
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
          <Text style={styles.statText}>{item.duration} min</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="quiz" size={16} color="#666" />
          <Text style={styles.statText}>{item.totalQuestions} questions</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="grade" size={16} color="#666" />
          <Text style={styles.statText}>Pass: {item.passingScore}%</Text>
        </View>
      </View>

      <View style={styles.testActions}>
        <TouchableOpacity style={[styles.actionButton, styles.practiceButton]} onPress={() => startPracticeTest(item)}>
          <Text style={styles.practiceButtonText}>Practice Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.examButton]} onPress={() => startFullExam(item)}>
          <Text style={styles.examButtonText}>Full Exam</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (testMode === "results" && testResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTestMode("selection")}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Test Results</Text>
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
              {testResult.passed ? "PASSED" : "FAILED"}
            </Text>
            <Text style={styles.resultSubtext}>
              {testResult.correctAnswers} out of {testResult.totalQuestions} correct
            </Text>
          </View>

          <View style={styles.skillBreakdownCard}>
            <Text style={styles.sectionTitle}>Skill Breakdown</Text>
            {Object.entries(testResult.skillBreakdown).map(([skill, data]) => {
              const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0
              return (
                <View key={skill} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</Text>
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
            <Text style={styles.sectionTitle}>Improvement Suggestions</Text>
            {testResult.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Icon name="lightbulb-outline" size={20} color="#FF9800" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => setTestMode("selection")}>
              <Text style={styles.retakeButtonText}>Take Another Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviewButton} onPress={() => {}}>
              <Text style={styles.reviewButtonText}>Review Answers</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (testMode === "practice" || testMode === "exam") {
    const currentQ = sampleQuestions[currentQuestion]
    const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTestMode("selection")}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {selectedTest?.level} - {testMode === "exam" ? "Exam" : "Practice"}
          </Text>
          {testMode === "exam" && <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {sampleQuestions.length}
          </Text>
        </View>

        <ScrollView style={styles.questionContainer}>
          <View style={styles.questionCard}>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{currentQ.skill.toUpperCase()}</Text>
            </View>

            <Text style={styles.questionText}>{currentQ.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQ.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, selectedAnswers[currentQuestion] === index && styles.selectedOption]}
                  onPress={() => handleAnswerSelect(index)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                    <Text
                      style={[
                        styles.optionText,
                        selectedAnswers[currentQuestion] === index && styles.selectedOptionText,
                      ]}
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
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          {currentQuestion === sampleQuestions.length - 1 ? (
            <TouchableOpacity style={styles.submitButton} onPress={submitTest}>
              <Text style={styles.submitButtonText}>Submit Test</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navButton} onPress={nextQuestion}>
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const filteredTests = certificationTests.filter((test) => test.language === selectedLanguage)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Certification Tests</Text>
        <View />
      </View>

      <View style={styles.languageSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language}
              style={[styles.languageChip, selectedLanguage === language && styles.selectedLanguageChip]}
              onPress={() => setSelectedLanguage(language)}
            >
              <Text style={[styles.languageChipText, selectedLanguage === language && styles.selectedLanguageChipText]}>
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTests}
        renderItem={renderTestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.testsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const getSkillColor = (percentage: number): string => {
  if (percentage >= 80) return "#4CAF50"
  if (percentage >= 60) return "#FF9800"
  return "#F44336"
}

const styles = StyleSheet.create({
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
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
    justifyContent: "space-between",
    marginBottom: 30,
  },
  retakeButton: {
    flex: 0.48,
    backgroundColor: "#4ECDC4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retakeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  reviewButton: {
    flex: 0.48,
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
})

export default CertificationLearningScreen
