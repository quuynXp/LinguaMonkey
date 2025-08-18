"use client"

import { useEffect, useState } from "react"
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 

interface Player {
  id: string
  name: string
  avatar: string
  score: number
  isEliminated: boolean
  currentStreak: number
}

interface GameQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  difficulty: number
  category: "grammar" | "vocabulary" | "fill-blank" | "comprehension"
  explanation: string
}

const MillionaireGameScreen = ({ navigation }: any) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "You", avatar: "👤", score: 0, isEliminated: false, currentStreak: 0 },
    { id: "2", name: "Alice", avatar: "👩", score: 0, isEliminated: false, currentStreak: 0 },
    { id: "3", name: "Bob", avatar: "👨", score: 0, isEliminated: false, currentStreak: 0 },
    { id: "4", name: "Carol", avatar: "👱‍♀️", score: 0, isEliminated: false, currentStreak: 0 },
    { id: "5", name: "David", avatar: "👨‍💼", score: 0, isEliminated: false, currentStreak: 0 },
  ])

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [gamePhase, setGamePhase] = useState<"waiting" | "question" | "results" | "winner">("waiting")
  const [timeLeft, setTimeLeft] = useState(15)
  const [currentDifficulty, setCurrentDifficulty] = useState(1)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const questions: GameQuestion[] = [
    {
      id: "1",
      question: 'Choose the correct form: "She _____ to the store yesterday."',
      options: ["go", "goes", "went", "going"],
      correctAnswer: 2,
      difficulty: 1,
      category: "grammar",
      explanation: 'Past tense of "go" is "went" when referring to yesterday.',
    },
    {
      id: "2",
      question: 'Fill in the blank: "The book _____ on the table is mine."',
      options: ["lying", "laying", "lies", "lays"],
      correctAnswer: 0,
      difficulty: 2,
      category: "fill-blank",
      explanation: '"Lying" is correct because the book is resting on the table.',
    },
    {
      id: "3",
      question: 'Which word means "extremely happy"?',
      options: ["Melancholy", "Euphoric", "Lethargic", "Skeptical"],
      correctAnswer: 1,
      difficulty: 3,
      category: "vocabulary",
      explanation: "Euphoric means feeling intense excitement and happiness.",
    },
    {
      id: "4",
      question: 'Identify the subject in: "Running quickly, the athlete won the race."',
      options: ["Running", "quickly", "athlete", "race"],
      correctAnswer: 2,
      difficulty: 4,
      category: "grammar",
      explanation: "The athlete is performing the action, making it the subject.",
    },
    {
      id: "5",
      question: 'Complete: "If I _____ rich, I would travel the world."',
      options: ["am", "was", "were", "will be"],
      correctAnswer: 2,
      difficulty: 5,
      category: "fill-blank",
      explanation: 'Subjunctive mood uses "were" for hypothetical situations.',
    },
  ]

  const prizeAmounts = [
    "$100",
    "$200",
    "$500",
    "$1,000",
    "$2,000",
    "$5,000",
    "$10,000",
    "$25,000",
    "$50,000",
    "$100,000",
    "$250,000",
    "$500,000",
    "$750,000",
    "$1,000,000",
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gamePhase === "question" && timeLeft > 0 && !showResult) {
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
  }, [gamePhase, timeLeft, showResult])

  const handleTimeUp = () => {
    if (selectedAnswer === null) {
      // Player didn't answer in time - eliminate them
      eliminatePlayer("1") // Assuming player ID '1' is the current user
    }
    processAnswers()
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult || gamePhase !== "question") return
    setSelectedAnswer(answerIndex)
  }

  const submitAnswer = () => {
    if (selectedAnswer === null) {
      Alert.alert("No Answer", "Please select an answer before submitting.")
      return
    }
    processAnswers()
  }

  const processAnswers = () => {
    setShowResult(true)
    setGamePhase("results")

    // Simulate other players' answers
    const updatedPlayers = players.map((player) => {
      if (player.isEliminated) return player

      let isCorrect = false
      if (player.id === "1") {
        // Current user's answer
        isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer
      } else {
        // Simulate AI players with decreasing accuracy as difficulty increases
        const accuracy = Math.max(0.3, 1 - currentDifficulty * 0.15)
        isCorrect = Math.random() < accuracy
      }

      if (isCorrect) {
        return {
          ...player,
          score: player.score + currentDifficulty * 100,
          currentStreak: player.currentStreak + 1,
        }
      } else {
        return {
          ...player,
          isEliminated: true,
          currentStreak: 0,
        }
      }
    })

    setPlayers(updatedPlayers)

    // Check if game should end
    const remainingPlayers = updatedPlayers.filter((p) => !p.isEliminated)
    if (remainingPlayers.length <= 1) {
      setTimeout(() => {
        setGamePhase("winner")
      }, 3000)
    }
  }

  const eliminatePlayer = (playerId: string) => {
    setPlayers((prev) => prev.map((player) => (player.id === playerId ? { ...player, isEliminated: true } : player)))
  }

  const nextQuestion = () => {
    const remainingPlayers = players.filter((p) => !p.isEliminated)
    if (remainingPlayers.length <= 1) {
      setGamePhase("winner")
      return
    }

    setCurrentQuestion((prev) => prev + 1)
    setCurrentDifficulty((prev) => prev + 1)
    setSelectedAnswer(null)
    setShowResult(false)
    setTimeLeft(15)
    setGamePhase("question")
  }

  const startGame = () => {
    setGamePhase("question")
    setTimeLeft(15)
  }

  const resetGame = () => {
    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        score: 0,
        isEliminated: false,
        currentStreak: 0,
      })),
    )
    setCurrentQuestion(0)
    setCurrentDifficulty(1)
    setSelectedAnswer(null)
    setShowResult(false)
    setGamePhase("waiting")
    setTimeLeft(15)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "#4CAF50"
    if (difficulty <= 4) return "#FF9800"
    return "#F44336"
  }

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={[styles.playerCard, item.isEliminated && styles.eliminatedPlayer]}>
      <Text style={styles.playerAvatar}>{item.avatar}</Text>
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, item.isEliminated && styles.eliminatedText]}>{item.name}</Text>
        <Text style={[styles.playerScore, item.isEliminated && styles.eliminatedText]}>
          ${item.score.toLocaleString()}
        </Text>
        {item.currentStreak > 0 && !item.isEliminated && <Text style={styles.streakText}>🔥 {item.currentStreak}</Text>}
      </View>
      {item.isEliminated && <Icon name="close" size={20} color="#F44336" />}
    </View>
  )

  const remainingPlayers = players.filter((p) => !p.isEliminated)
  const winner = remainingPlayers.length === 1 ? remainingPlayers[0] : null

  if (gamePhase === "winner") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.winnerContainer}>
          <Text style={styles.winnerTitle}>🎉 WINNER! 🎉</Text>
          {winner && (
            <View style={styles.winnerCard}>
              <Text style={styles.winnerAvatar}>{winner.avatar}</Text>
              <Text style={styles.winnerName}>{winner.name}</Text>
              <Text style={styles.winnerScore}>${winner.score.toLocaleString()}</Text>
              <Text style={styles.winnerSubtext}>Answered {winner.currentStreak} questions correctly!</Text>
            </View>
          )}
          <View style={styles.winnerActions}>
            <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.title}>Who Wants to Be a Millionaire?</Text>
        <TouchableOpacity onPress={() => setShowLeaderboard(true)}>
          <Icon name="leaderboard" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <View style={styles.gameInfo}>
        <View style={styles.difficultySection}>
          <Text style={styles.difficultyLabel}>Difficulty Level</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(currentDifficulty) }]}>
            <Text style={styles.difficultyText}>{currentDifficulty}</Text>
          </View>
        </View>
        <View style={styles.prizeSection}>
          <Text style={styles.prizeLabel}>Current Prize</Text>
          <Text style={styles.prizeAmount}>
            {prizeAmounts[Math.min(currentDifficulty - 1, prizeAmounts.length - 1)]}
          </Text>
        </View>
      </View>

      <View style={styles.playersSection}>
        <Text style={styles.playersTitle}>Players Remaining: {remainingPlayers.length}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.playersRow}>
            {players.slice(0, 5).map((player) => (
              <View key={player.id} style={[styles.playerChip, player.isEliminated && styles.eliminatedChip]}>
                <Text style={styles.chipAvatar}>{player.avatar}</Text>
                <Text style={[styles.chipName, player.isEliminated && styles.eliminatedText]}>{player.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {gamePhase === "waiting" && (
        <View style={styles.waitingSection}>
          <Text style={styles.waitingTitle}>Ready to Play?</Text>
          <Text style={styles.waitingSubtext}>
            Answer questions correctly to stay in the game. Wrong answers eliminate you!
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {gamePhase === "question" && (
        <View style={styles.questionSection}>
          <View style={styles.timerSection}>
            <View style={[styles.timerCircle, { borderColor: timeLeft <= 5 ? "#F44336" : "#FFD700" }]}>
              <Text style={[styles.timerText, { color: timeLeft <= 5 ? "#F44336" : "#FFD700" }]}>{timeLeft}</Text>
            </View>
          </View>

          <ScrollView style={styles.questionContent}>
            <View style={styles.questionCard}>
              <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
              <Text style={styles.questionText}>{questions[currentQuestion]?.question}</Text>

              <View style={styles.optionsContainer}>
                {questions[currentQuestion]?.options.map((option, index) => {
                  let optionStyle = styles.optionButton
                  let textStyle = styles.optionText

                  if (showResult) {
                    if (index === questions[currentQuestion].correctAnswer) {
                      optionStyle = [styles.optionButton, styles.correctOption]
                      textStyle = [styles.optionText, styles.correctOptionText]
                    } else if (
                      index === selectedAnswer &&
                      selectedAnswer !== questions[currentQuestion].correctAnswer
                    ) {
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
                  <Text style={styles.explanationTitle}>Explanation:</Text>
                  <Text style={styles.explanationText}>{questions[currentQuestion]?.explanation}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actionSection}>
            {!showResult ? (
              <TouchableOpacity
                style={[styles.submitButton, selectedAnswer === null && styles.disabledButton]}
                onPress={submitAnswer}
                disabled={selectedAnswer === null}
              >
                <Text style={styles.submitButtonText}>Final Answer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
                <Text style={styles.nextButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <Modal visible={showLeaderboard} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leaderboard</Text>
            <TouchableOpacity onPress={() => setShowLeaderboard(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={players.sort((a, b) => b.score - a.score)}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id}
            style={styles.leaderboardList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#16213E",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD700",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD700",
  },
  gameInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#16213E",
  },
  difficultySection: {
    alignItems: "center",
  },
  difficultyLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    marginBottom: 5,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  difficultyText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  prizeSection: {
    alignItems: "center",
  },
  prizeLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    marginBottom: 5,
  },
  prizeAmount: {
    fontSize: 18,
    color: "#FFD700",
    fontWeight: "700",
  },
  playersSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#16213E",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  playersTitle: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 10,
    fontWeight: "500",
  },
  playersRow: {
    flexDirection: "row",
  },
  playerChip: {
    backgroundColor: "#0F3460",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    alignItems: "center",
    minWidth: 60,
  },
  eliminatedChip: {
    backgroundColor: "#2C1810",
    opacity: 0.6,
  },
  chipAvatar: {
    fontSize: 16,
    marginBottom: 2,
  },
  chipName: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  eliminatedText: {
    color: "#999",
    textDecorationLine: "line-through",
  },
  waitingSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 15,
    textAlign: "center",
  },
  waitingSubtext: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  questionSection: {
    flex: 1,
  },
  timerSection: {
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
  },
  timerText: {
    fontSize: 20,
    fontWeight: "700",
  },
  questionContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "600",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#0F3460",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: "#1E4A72",
    borderColor: "#FFD700",
  },
  correctOption: {
    backgroundColor: "#1B4332",
    borderColor: "#4CAF50",
  },
  incorrectOption: {
    backgroundColor: "#4A1E1E",
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
    backgroundColor: "#FFD700",
    color: "#1A1A2E",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
  selectedOptionText: {
    color: "#FFD700",
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
    backgroundColor: "#0F3460",
    borderRadius: 8,
    padding: 15,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFD700",
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  actionSection: {
    padding: 20,
    backgroundColor: "#16213E",
  },
  submitButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#666",
  },
  submitButtonText: {
    color: "#1A1A2E",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  winnerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  winnerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 30,
    textAlign: "center",
  },
  winnerCard: {
    backgroundColor: "#16213E",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginBottom: 40,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  winnerAvatar: {
    fontSize: 60,
    marginBottom: 15,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  winnerScore: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10,
  },
  winnerSubtext: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
  },
  winnerActions: {
    width: "100%",
  },
  playAgainButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 15,
  },
  playAgainText: {
    color: "#1A1A2E",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#16213E",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD700",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFD700",
  },
  leaderboardList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213E",
    borderRadius: 12,
    padding: 15,
    marginVertical: 5,
  },
  eliminatedPlayer: {
    backgroundColor: "#2C1810",
    opacity: 0.6,
  },
  playerAvatar: {
    fontSize: 24,
    marginRight: 15,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  playerScore: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "500",
  },
  streakText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 2,
  },
})

export default MillionaireGameScreen
