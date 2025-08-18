"use client"

import { useEffect, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 

interface QuizQuestion {
  id: string
  riddle: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  category: string
}

const QuizLearningScreen = ({ navigation }: any) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>([])

  const questions: QuizQuestion[] = [
    {
      id: "1",
      riddle: "I have keys but no locks. I have space but no room. You can enter, but you can't go outside. What am I?",
      options: ["A house", "A keyboard", "A car", "A book"],
      correctAnswer: 1,
      explanation:
        "A keyboard has keys (letter keys), space (spacebar), and you can enter (press enter), but you cannot physically go outside of it.",
      difficulty: "medium",
      category: "Logic",
    },
    {
      id: "2",
      riddle: "The more you take, the more you leave behind. What am I?",
      options: ["Footsteps", "Money", "Time", "Memories"],
      correctAnswer: 0,
      explanation: "The more steps you take while walking, the more footprints you leave behind.",
      difficulty: "easy",
      category: "Logic",
    },
    {
      id: "3",
      riddle:
        "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
      options: ["A plant", "Fire", "A balloon", "A cloud"],
      correctAnswer: 1,
      explanation: "Fire grows when it spreads, needs air (oxygen) to survive, and water extinguishes it.",
      difficulty: "hard",
      category: "Science",
    },
    {
      id: "4",
      riddle: "What has hands but cannot clap?",
      options: ["A statue", "A clock", "A mannequin", "A robot"],
      correctAnswer: 1,
      explanation: "A clock has hands (hour and minute hands) but cannot clap because they are not physical hands.",
      difficulty: "easy",
      category: "Objects",
    },
    {
      id: "5",
      riddle: "I can be cracked, made, told, and played. What am I?",
      options: ["A game", "A joke", "A song", "A story"],
      correctAnswer: 1,
      explanation: "A joke can be cracked (told), made (created), told (shared), and played (as a prank).",
      difficulty: "medium",
      category: "Wordplay",
    },
  ]

  const progressAnimation = new Animated.Value(0)

  useEffect(() => {
    setAnsweredQuestions(new Array(questions.length).fill(false))
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerActive && timeLeft > 0 && !showResult) {
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
  }, [isTimerActive, timeLeft, showResult])

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: ((currentQuestion + 1) / questions.length) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [currentQuestion])

  const handleTimeUp = () => {
    setIsTimerActive(false)
    if (selectedAnswer === null) {
      setShowResult(true)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      Alert.alert("No Answer", "Please select an answer before submitting.")
      return
    }

    setIsTimerActive(false)
    setShowResult(true)

    const newAnsweredQuestions = [...answeredQuestions]
    newAnsweredQuestions[currentQuestion] = true
    setAnsweredQuestions(newAnsweredQuestions)

    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setTimeLeft(30)
      setIsTimerActive(true)
    } else {
      // Quiz completed
      Alert.alert("Quiz Complete!", `Your final score: ${score}/${questions.length}\n${getScoreMessage()}`, [
        { text: "Review Answers", onPress: () => {} },
        { text: "Try Again", onPress: resetQuiz },
      ])
    }
  }

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100
    if (percentage >= 80) return "Excellent work! 🎉"
    if (percentage >= 60) return "Good job! 👍"
    if (percentage >= 40) return "Keep practicing! 💪"
    return "Don't give up! Try again! 🌟"
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setTimeLeft(30)
    setIsTimerActive(true)
    setAnsweredQuestions(new Array(questions.length).fill(false))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "#4CAF50"
      case "medium":
        return "#FF9800"
      case "hard":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const currentQ = questions[currentQuestion]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Quiz Challenge</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {score}/{questions.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.questionCounter}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.timerSection}>
        <View style={[styles.timerCircle, { borderColor: timeLeft <= 10 ? "#F44336" : "#4ECDC4" }]}>
          <Text style={[styles.timerText, { color: timeLeft <= 10 ? "#F44336" : "#4ECDC4" }]}>{timeLeft}</Text>
        </View>
        <Text style={styles.timerLabel}>seconds left</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(currentQ.difficulty) }]}>
              <Text style={styles.difficultyText}>{currentQ.difficulty}</Text>
            </View>
            <Text style={styles.categoryText}>{currentQ.category}</Text>
          </View>

          <Text style={styles.riddleText}>{currentQ.riddle}</Text>

          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, index) => {
              let optionStyle = styles.optionButton
              let textStyle = styles.optionText

              if (showResult) {
                if (index === currentQ.correctAnswer) {
                  optionStyle = [styles.optionButton, styles.correctOption]
                  textStyle = [styles.optionText, styles.correctOptionText]
                } else if (index === selectedAnswer && selectedAnswer !== currentQ.correctAnswer) {
                  optionStyle = [styles.optionButton, styles.incorrectOption]
                  textStyle = [styles.optionText, styles.incorrectOptionText]
                }
              } else if (selectedAnswer === index) {
                optionStyle = [styles.optionButton, styles.selectedOption]
                textStyle = [styles.optionText, styles.selectedOptionText]
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={optionStyle}
                  onPress={() => handleAnswerSelect(index)}
                  disabled={showResult}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                    <Text style={textStyle}>{option}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {showResult && (
            <View style={styles.explanationSection}>
              <View style={styles.resultHeader}>
                <Icon
                  name={selectedAnswer === currentQ.correctAnswer ? "check-circle" : "cancel"}
                  size={24}
                  color={selectedAnswer === currentQ.correctAnswer ? "#4CAF50" : "#F44336"}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: selectedAnswer === currentQ.correctAnswer ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {selectedAnswer === currentQ.correctAnswer ? "Correct!" : "Incorrect!"}
                </Text>
              </View>
              <Text style={styles.explanationTitle}>Explanation:</Text>
              <Text style={styles.explanationText}>{currentQ.explanation}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionSection}>
        {!showResult ? (
          <TouchableOpacity
            style={[styles.submitButton, selectedAnswer === null && styles.disabledButton]}
            onPress={handleSubmitAnswer}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
            <Text style={styles.nextButtonText}>
              {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
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
  scoreContainer: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scoreText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
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
  questionCounter: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  timerText: {
    fontSize: 20,
    fontWeight: "700",
  },
  timerLabel: {
    fontSize: 12,
    color: "#666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  riddleText: {
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
  correctOption: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  incorrectOption: {
    backgroundColor: "#FFEBEE",
    borderColor: "#F44336",
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
  correctOptionText: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  incorrectOptionText: {
    color: "#F44336",
    fontWeight: "500",
  },
  explanationSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  actionSection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  submitButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#45B7D1",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default QuizLearningScreen
