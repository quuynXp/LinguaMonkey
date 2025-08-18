"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
interface StudyRoom {
  id: string
  title: string
  creatorName: string
  topic: string
  maxParticipants: number
  currentParticipants: number
  difficulty: "easy" | "medium" | "hard"
  language: string
  isPrivate: boolean
  participants: Participant[]
}

interface Participant {
  id: string
  name: string
  avatar: string
  level: number
  isReady: boolean
  score?: number
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  timeLimit: number
}

interface InteractiveMaterialIcons {
  id: string
  type: "thumbs-up" | "heart" | "fire" | "star" | "clap"
  emoji: string
  color: string
}

const GroupStudyScreen = ({ navigation }) => {
  const [currentView, setCurrentView] = useState<"lobby" | "room" | "quiz">("lobby")
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomIdInput, setRoomIdInput] = useState("")
  const [newRoomData, setNewRoomData] = useState({
    title: "",
    topic: "",
    maxParticipants: 4,
    difficulty: "medium" as const,
    language: "en",
  })

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const iconAnimations = useRef<{ [key: string]: Animated.Value }>({}).current

  const interactiveIcons: InteractiveIcon[] = [
    { id: "thumbs-up", type: "thumbs-up", emoji: "👍", color: "#10B981" },
    { id: "heart", type: "heart", emoji: "❤️", color: "#EF4444" },
    { id: "fire", type: "fire", emoji: "🔥", color: "#F59E0B" },
    { id: "star", type: "star", emoji: "⭐", color: "#8B5CF6" },
    { id: "clap", type: "clap", emoji: "👏", color: "#3B82F6" },
  ]

  const mockQuestions: QuizQuestion[] = [
    {
      id: "1",
      question: "What is the past tense of 'go'?",
      options: ["goed", "went", "gone", "going"],
      correctAnswer: 1,
      explanation: "'Went' is the correct past tense form of the irregular verb 'go'.",
      timeLimit: 30,
    },
    {
      id: "2",
      question: "Choose the correct article: '__ apple a day keeps the doctor away.'",
      options: ["A", "An", "The", "No article"],
      correctAnswer: 1,
      explanation: "We use 'an' before words that start with a vowel sound, like 'apple'.",
      timeLimit: 30,
    },
  ]

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    loadStudyRooms()
  }, [])

  useEffect(() => {
    if (quizStarted && timeLeft > 0 && !showExplanation) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showExplanation) {
      handleTimeUp()
    }
  }, [timeLeft, showExplanation, quizStarted])

  const loadStudyRooms = () => {
    const mockRooms: StudyRoom[] = [
      {
        id: "123456",
        title: "English Grammar Basics",
        creatorName: "Sarah Chen",
        topic: "Grammar",
        maxParticipants: 6,
        currentParticipants: 4,
        difficulty: "easy",
        language: "en",
        isPrivate: false,
        participants: [
          { id: "1", name: "Sarah Chen", avatar: "👩‍🦰", level: 25, isReady: true },
          { id: "2", name: "Mike Johnson", avatar: "👨‍💼", level: 18, isReady: true },
          { id: "3", name: "Lisa Wang", avatar: "👩‍🎓", level: 22, isReady: false },
          { id: "4", name: "Alex Kim", avatar: "👨‍💻", level: 20, isReady: true },
        ],
      },
      {
        id: "789012",
        title: "Business English Vocabulary",
        creatorName: "David Park",
        topic: "Vocabulary",
        maxParticipants: 4,
        currentParticipants: 2,
        difficulty: "hard",
        language: "en",
        isPrivate: false,
        participants: [
          { id: "5", name: "David Park", avatar: "👨‍🏫", level: 35, isReady: true },
          { id: "6", name: "Emma Wilson", avatar: "👩‍💼", level: 28, isReady: false },
        ],
      },
    ]

    setStudyRooms(mockRooms)
  }

  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleCreateRoom = () => {
    if (!newRoomData.title || !newRoomData.topic) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    const newRoom: StudyRoom = {
      id: generateRoomId(),
      title: newRoomData.title,
      creatorName: "You",
      topic: newRoomData.topic,
      maxParticipants: newRoomData.maxParticipants,
      currentParticipants: 1,
      difficulty: newRoomData.difficulty,
      language: newRoomData.language,
      isPrivate: false,
      participants: [{ id: "current", name: "You", avatar: "🧑‍💻", level: 23, isReady: false }],
    }

    setCurrentRoom(newRoom)
    setCurrentView("room")
    setShowCreateModal(false)

    // Reset form
    setNewRoomData({
      title: "",
      topic: "",
      maxParticipants: 4,
      difficulty: "medium",
      language: "en",
    })
  }

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) {
      Alert.alert("Error", "Please enter a room ID")
      return
    }

    const room = studyRooms.find((r) => r.id === roomIdInput)
    if (!room) {
      Alert.alert("Error", "Room not found")
      return
    }

    if (room.currentParticipants >= room.maxParticipants) {
      Alert.alert("Error", "Room is full")
      return
    }

    // Add current user to room
    const updatedRoom = {
      ...room,
      currentParticipants: room.currentParticipants + 1,
      participants: [...room.participants, { id: "current", name: "You", avatar: "🧑‍💻", level: 23, isReady: false }],
    }

    setCurrentRoom(updatedRoom)
    setCurrentView("room")
    setShowJoinModal(false)
    setRoomIdInput("")
  }

  const handleStartQuiz = () => {
    if (!currentRoom) return

    const allReady = currentRoom.participants.every((p) => p.isReady)
    if (!allReady) {
      Alert.alert("Wait", "All participants must be ready before starting")
      return
    }

    setQuizStarted(true)
    setCurrentView("quiz")
    setTimeLeft(30)
    setParticipants(currentRoom.participants.map((p) => ({ ...p, score: 0 })))
  }

  const handleToggleReady = () => {
    if (!currentRoom) return

    const updatedParticipants = currentRoom.participants.map((p) =>
      p.id === "current" ? { ...p, isReady: !p.isReady } : p,
    )

    setCurrentRoom({
      ...currentRoom,
      participants: updatedParticipants,
    })
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return

    setSelectedAnswer(answerIndex)
    setShowExplanation(true)

    // Update participant score
    const isCorrect = answerIndex === mockQuestions[currentQuestionIndex].correctAnswer
    if (isCorrect) {
      setParticipants((prev) => prev.map((p) => (p.id === "current" ? { ...p, score: (p.score || 0) + 10 } : p)))
    }
  }

  const handleTimeUp = () => {
    setShowExplanation(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mockQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setTimeLeft(30)
    } else {
      // Quiz finished
      Alert.alert("Quiz Complete!", "Great job everyone!", [{ text: "OK", onPress: () => setCurrentView("room") }])
    }
  }

  const sendInteractiveMaterialIcons = (icon: InteractiveIcon) => {
    // Create animation for the icon
    if (!iconAnimations[icon.id]) {
      iconAnimations[icon.id] = new Animated.Value(0)
    }

    Animated.sequence([
      Animated.timing(iconAnimations[icon.id], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(iconAnimations[icon.id], {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    // In real app, send to other participants
    console.log(`Sent ${icon.emoji} to room`)
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

  const renderLobby = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Icon name="group" size={120} color="#4F46E5" style={styles.welcomeAnimation} />
          <Text style={styles.welcomeTitle}>Group Study Rooms</Text>
          <Text style={styles.welcomeText}>
            Join or create study rooms to learn with friends and compete in real-time quizzes
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.createRoomButton} onPress={() => setShowCreateModal(true)}>
            <Icon name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.createRoomText}>Create Room</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.joinRoomButton} onPress={() => setShowJoinModal(true)}>
            <Icon name="login" size={24} color="#4F46E5" />
            <Text style={styles.joinRoomText}>Join with ID</Text>
          </TouchableOpacity>
        </View>

        {/* Available Rooms */}
        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>Available Rooms</Text>
          {studyRooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              onPress={() => {
                setCurrentRoom(room)
                setCurrentView("room")
              }}
            >
              <View style={styles.roomHeader}>
                <Text style={styles.roomTitle}>{room.title}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(room.difficulty)}20` }]}>
                  <Text style={[styles.difficultyText, { color: getDifficultyColor(room.difficulty) }]}>
                    {room.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.roomCreator}>Created by {room.creatorName}</Text>
              <Text style={styles.roomTopic}>Topic: {room.topic}</Text>

              <View style={styles.roomFooter}>
                <View style={styles.participantsInfo}>
                  <Icon name="people" size={16} color="#6B7280" />
                  <Text style={styles.participantsText}>
                    {room.currentParticipants}/{room.maxParticipants}
                  </Text>
                </View>
                <Text style={styles.roomId}>ID: {room.id}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  )

  const renderRoom = () => {
    if (!currentRoom) return null

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Room Info */}
          <View style={styles.roomInfoCard}>
            <Text style={styles.roomInfoTitle}>{currentRoom.title}</Text>
            <Text style={styles.roomInfoTopic}>Topic: {currentRoom.topic}</Text>
            <View style={styles.roomInfoMeta}>
              <Text style={styles.roomInfoId}>Room ID: {currentRoom.id}</Text>
              <View
                style={[styles.difficultyBadge, { backgroundColor: `${getDifficultyColor(currentRoom.difficulty)}20` }]}
              >
                <Text style={[styles.difficultyText, { color: getDifficultyColor(currentRoom.difficulty) }]}>
                  {currentRoom.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.participantsSection}>
            <Text style={styles.sectionTitle}>
              Participants ({currentRoom.currentParticipants}/{currentRoom.maxParticipants})
            </Text>
            <View style={styles.participantsList}>
              {currentRoom.participants.map((participant) => (
                <View key={participant.id} style={styles.participantCard}>
                  <Text style={styles.participantAvatar}>{participant.avatar}</Text>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{participant.name}</Text>
                    <Text style={styles.participantLevel}>Level {participant.level}</Text>
                  </View>
                  <View style={styles.participantStatus}>
                    <Icon
                      name={participant.isReady ? "check-circle" : "schedule"}
                      size={20}
                      color={participant.isReady ? "#10B981" : "#F59E0B"}
                    />
                    <Text
                      style={[styles.participantStatusText, { color: participant.isReady ? "#10B981" : "#F59E0B" }]}
                    >
                      {participant.isReady ? "Ready" : "Not Ready"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Room Actions */}
          <View style={styles.roomActions}>
            <TouchableOpacity
              style={[
                styles.readyButton,
                currentRoom.participants.find((p) => p.id === "current")?.isReady && styles.readyButtonActive,
              ]}
              onPress={handleToggleReady}
            >
              <Icon
                name={currentRoom.participants.find((p) => p.id === "current")?.isReady ? "check-circle" : "schedule"}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.readyButtonText}>
                {currentRoom.participants.find((p) => p.id === "current")?.isReady ? "Ready!" : "Get Ready"}
              </Text>
            </TouchableOpacity>

            {currentRoom.creatorName === "You" && (
              <TouchableOpacity style={styles.startQuizButton} onPress={handleStartQuiz}>
                <Icon name="play-arrow" size={20} color="#FFFFFF" />
                <Text style={styles.startQuizText}>Start Quiz</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interactive Icons */}
          <View style={styles.interactiveSection}>
            <Text style={styles.sectionTitle}>Send Reactions</Text>
            <View style={styles.interactiveIcons}>
              {interactiveIcons.map((icon) => (
                <TouchableOpacity
                  key={icon.id}
                  style={[styles.interactiveIcon, { backgroundColor: `${icon.color}20` }]}
                  onPress={() => sendInteractiveIcon(icon)}
                >
                  <Animated.Text
                    style={[
                      styles.interactiveIconEmoji,
                      {
                        transform: [
                          {
                            scale: iconAnimations[icon.id]
                              ? iconAnimations[icon.id].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.5],
                                })
                              : 1,
                          },
                        ],
                      },
                    ]}
                  >
                    {icon.emoji}
                  </Animated.Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    )
  }

  const renderQuiz = () => {
    const currentQuestion = mockQuestions[currentQuestionIndex]
    if (!currentQuestion) return null

    return (
      <View style={styles.quizContainer}>
        {/* Quiz Header */}
        <View style={styles.quizHeader}>
          <Text style={styles.quizProgress}>
            Question {currentQuestionIndex + 1}/{mockQuestions.length}
          </Text>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: timeLeft <= 10 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}s</Text>
          </View>
        </View>

        {/* Participants Scores */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scoresContainer}>
          <View style={styles.scoresList}>
            {participants.map((participant) => (
              <View key={participant.id} style={styles.scoreCard}>
                <Text style={styles.scoreAvatar}>{participant.avatar}</Text>
                <Text style={styles.scoreName}>{participant.name}</Text>
                <Text style={styles.scoreValue}>{participant.score || 0}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quizOption,
                  selectedAnswer === index && styles.selectedQuizOption,
                  showExplanation && index === currentQuestion.correctAnswer && styles.correctQuizOption,
                  showExplanation &&
                    selectedAnswer === index &&
                    selectedAnswer !== currentQuestion.correctAnswer &&
                    styles.incorrectQuizOption,
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={showExplanation}
              >
                <View style={styles.optionIndicator}>
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={styles.quizOptionText}>{option}</Text>
                {showExplanation && index === currentQuestion.correctAnswer && (
                  <Icon name="check-circle" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Explanation</Text>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>

              <TouchableOpacity style={styles.nextQuestionButton} onPress={handleNextQuestion}>
                <Text style={styles.nextQuestionText}>
                  {currentQuestionIndex < mockQuestions.length - 1 ? "Next Question" : "Finish Quiz"}
                </Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    )
  }

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.createModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Study Room</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter room title"
                value={newRoomData.title}
                onChangeText={(text) => setNewRoomData({ ...newRoomData, title: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Topic *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Grammar, Vocabulary, Speaking"
                value={newRoomData.topic}
                onChangeText={(text) => setNewRoomData({ ...newRoomData, topic: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Participants</Text>
              <View style={styles.participantOptions}>
                {[2, 4, 6, 8, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.participantOption,
                      newRoomData.maxParticipants === num && styles.selectedParticipantOption,
                    ]}
                    onPress={() => setNewRoomData({ ...newRoomData, maxParticipants: num })}
                  >
                    <Text
                      style={[
                        styles.participantOptionText,
                        newRoomData.maxParticipants === num && styles.selectedParticipantOptionText,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Difficulty</Text>
              <View style={styles.difficultyOptions}>
                {[
                  { value: "easy", label: "Easy", color: "#10B981" },
                  { value: "medium", label: "Medium", color: "#F59E0B" },
                  { value: "hard", label: "Hard", color: "#EF4444" },
                ].map((diff) => (
                  <TouchableOpacity
                    key={diff.value}
                    style={[
                      styles.difficultyOption,
                      newRoomData.difficulty === diff.value && {
                        backgroundColor: `${diff.color}20`,
                        borderColor: diff.color,
                      },
                    ]}
                    onPress={() => setNewRoomData({ ...newRoomData, difficulty: diff.value as any })}
                  >
                    <Text
                      style={[
                        styles.difficultyOptionText,
                        newRoomData.difficulty === diff.value && { color: diff.color },
                      ]}
                    >
                      {diff.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCreateButton} onPress={handleCreateRoom}>
              <Text style={styles.modalCreateText}>Create Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderJoinModal = () => (
    <Modal visible={showJoinModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.joinModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Join Study Room</Text>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          

          <Text style={styles.joinModalDescription}>Enter the 6-digit room ID to join a study session</Text>

          <TextInput
            style={styles.roomIdInput}
            placeholder="Enter Room ID (6 digits)"
            value={roomIdInput}
            onChangeText={setRoomIdInput}
            keyboardType="numeric"
            maxLength={6}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowJoinModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalJoinButton} onPress={handleJoinRoom}>
              <Text style={styles.modalJoinText}>Join Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (currentView === "lobby") {
              navigation.goBack()
            } else {
              setCurrentView("lobby")
              setCurrentRoom(null)
              setQuizStarted(false)
            }
          }}
        >
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentView === "lobby" ? "Group Study" : currentView === "room" ? "Study Room" : "Quiz"}
        </Text>
        {currentView === "room" && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Leave Room", "Are you sure you want to leave?", [
                { text: "Cancel", style: "cancel" },
                { text: "Leave", onPress: () => setCurrentView("lobby") },
              ])
            }
          >
            <Icon name="exit-to-app" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
        {currentView !== "room" && <View style={styles.placeholder} />}
      </View>

      {currentView === "lobby" && renderLobby()}
      {currentView === "room" && renderRoom()}
      {currentView === "quiz" && renderQuiz()}

      {renderCreateModal()}
      {renderJoinModal()}
    </View>
  )
}

const styles = StyleSheet.create({
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  createRoomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createRoomText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  joinRoomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4F46E5",
    gap: 8,
  },
  joinRoomText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  roomsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  roomCreator: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  roomTopic: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  roomFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  participantsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  roomId: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  roomInfoCard: {
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
  roomInfoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  roomInfoTopic: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  roomInfoMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomInfoId: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  participantsSection: {
    marginBottom: 20,
  },
  participantsList: {
    gap: 8,
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  participantAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  participantLevel: {
    fontSize: 12,
    color: "#6B7280",
  },
  participantStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  roomActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  readyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  readyButtonActive: {
    backgroundColor: "#10B981",
  },
  readyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  startQuizButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  startQuizText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  interactiveSection: {
    marginBottom: 20,
  },
  interactiveIcons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  interactiveIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  interactiveIconEmoji: {
    fontSize: 24,
  },
  quizContainer: {
    flex: 1,
    padding: 20,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quizProgress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  timerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  scoresContainer: {
    marginBottom: 20,
  },
  scoresList: {
    flexDirection: "row",
    gap: 12,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreAvatar: {
    fontSize: 24,
    marginBottom: 4,
  },
  scoreName: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  questionContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  selectedQuizOption: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  correctQuizOption: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  incorrectQuizOption: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
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
  quizOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  explanationContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 16,
  },
  nextQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextQuestionText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  createModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: "100%",
    maxHeight: "80%",
  },
  joinModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 350,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
  },
  participantOptions: {
    flexDirection: "row",
    gap: 8,
  },
  participantOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  selectedParticipantOption: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  participantOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedParticipantOptionText: {
    color: "#FFFFFF",
  },
  difficultyOptions: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  difficultyOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCreateText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  joinModalAnimation: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 16,
  },
  joinModalDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  roomIdInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalJoinButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalJoinText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default GroupStudyScreen
