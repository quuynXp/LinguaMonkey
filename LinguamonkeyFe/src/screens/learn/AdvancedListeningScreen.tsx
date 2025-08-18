"use client"

import { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Slider, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Video } from 'expo-av';

interface ListeningContent {
  id: string
  title: string
  description: string
  duration: number
  difficulty: "basic" | "intermediate" | "advanced"
  category: "conversational" | "professional" | "trending" | "age-specific"
  type: "audio" | "video"
  url: string
  transcript: string
  questions: Question[]
  isPersonalized: boolean
  tags: string[]
}

interface Question {
  id: string
  type: "multiple-choice" | "fill-blank" | "true-false" | "short-answer"
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
  timeStamp: number
}

interface UserProgress {
  contentId: string
  completed: boolean
  score: number
  timeSpent: number
  attempts: number
}

const AdvancedListeningScreen = ({ navigation }: any) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<"basic" | "intermediate" | "advanced">("basic")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentContent, setCurrentContent] = useState<ListeningContent | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const listeningContent: ListeningContent[] = [
    {
      id: "1",
      title: "Morning Coffee Chat",
      description: "Casual conversation between friends at a café",
      duration: 180,
      difficulty: "basic",
      category: "conversational",
      type: "audio",
      url: "morning_coffee.mp3",
      transcript:
        "A: Good morning! How's your coffee? B: It's perfect, thanks. I really needed this caffeine boost. A: I know the feeling. Long night at work? B: Yeah, had to finish that presentation for today's meeting.",
      questions: [
        {
          id: "q1",
          type: "multiple-choice",
          question: "Where are the speakers?",
          options: ["At home", "At a café", "At the office", "At a restaurant"],
          correctAnswer: "At a café",
          explanation: "The conversation mentions coffee and the casual setting suggests a café.",
          timeStamp: 15,
        },
        {
          id: "q2",
          type: "true-false",
          question: "Person B had a good night's sleep.",
          correctAnswer: "false",
          explanation: "Person B mentions having a long night at work.",
          timeStamp: 45,
        },
      ],
      isPersonalized: true,
      tags: ["daily life", "friendship", "work"],
    },
    {
      id: "2",
      title: "Tech Startup Pitch",
      description: "Entrepreneur presenting to investors",
      duration: 300,
      difficulty: "advanced",
      category: "professional",
      type: "video",
      url: "startup_pitch.mp4",
      transcript:
        "Good morning, investors. Today I'm excited to present our revolutionary AI-powered solution that will transform how businesses handle customer service. Our platform reduces response time by 80% while maintaining human-like interaction quality.",
      questions: [
        {
          id: "q1",
          type: "fill-blank",
          question: "The platform reduces response time by ____%.",
          correctAnswer: "80",
          explanation: "The speaker clearly states 80% reduction in response time.",
          timeStamp: 60,
        },
        {
          id: "q2",
          type: "short-answer",
          question: "What industry does this startup focus on?",
          correctAnswer: "customer service",
          explanation: "The startup focuses on transforming customer service with AI.",
          timeStamp: 45,
        },
      ],
      isPersonalized: false,
      tags: ["business", "technology", "AI", "investment"],
    },
    {
      id: "3",
      title: "Gen Z Social Media Trends",
      description: "Discussion about latest social media platforms",
      duration: 240,
      difficulty: "intermediate",
      category: "age-specific",
      type: "video",
      url: "social_trends.mp4",
      transcript:
        "So like, TikTok is totally changing the game right now. Everyone's doing these viral dances and the algorithm is so good at showing you exactly what you want to see. It's honestly addictive.",
      questions: [
        {
          id: "q1",
          type: "multiple-choice",
          question: "What platform is being discussed?",
          options: ["Instagram", "TikTok", "YouTube", "Snapchat"],
          correctAnswer: "TikTok",
          explanation: "The speaker specifically mentions TikTok.",
          timeStamp: 10,
        },
      ],
      isPersonalized: true,
      tags: ["social media", "trends", "youth culture"],
    },
    {
      id: "4",
      title: "Medical Consultation",
      description: "Doctor-patient conversation about symptoms",
      duration: 420,
      difficulty: "advanced",
      category: "professional",
      type: "audio",
      url: "medical_consultation.mp3",
      transcript:
        "Doctor: Can you describe your symptoms? Patient: I've been experiencing chest pain and shortness of breath for the past week. Doctor: On a scale of 1 to 10, how would you rate the pain? Patient: About a 7, especially when I climb stairs.",
      questions: [
        {
          id: "q1",
          type: "multiple-choice",
          question: "How long has the patient been experiencing symptoms?",
          options: ["3 days", "1 week", "2 weeks", "1 month"],
          correctAnswer: "1 week",
          explanation: "The patient states symptoms have been present for the past week.",
          timeStamp: 30,
        },
        {
          id: "q2",
          type: "fill-blank",
          question: "The patient rates their pain as _____ out of 10.",
          correctAnswer: "7",
          explanation: "Patient specifically mentions rating the pain as 7.",
          timeStamp: 60,
        },
      ],
      isPersonalized: false,
      tags: ["healthcare", "medical", "symptoms"],
    },
  ]

  const categories = [
    { id: "all", name: "All Categories", icon: "apps" },
    { id: "conversational", name: "Conversational", icon: "chat" },
    { id: "professional", name: "Professional", icon: "business" },
    { id: "trending", name: "Trending", icon: "trending-up" },
    { id: "age-specific", name: "Age-Specific", icon: "people" },
  ]

  const difficulties = [
    { key: "basic", label: "Basic", color: "#4CAF50", description: "Simple vocabulary, clear pronunciation" },
    { key: "intermediate", label: "Intermediate", color: "#FF9800", description: "Natural speed, some idioms" },
    { key: "advanced", label: "Advanced", color: "#F44336", description: "Fast speech, complex topics" },
  ]

  const filteredContent = listeningContent.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = content.difficulty === selectedDifficulty
    const matchesCategory = selectedCategory === "all" || content.category === selectedCategory
    return matchesSearch && matchesDifficulty && matchesCategory
  })

  const startListening = (content: ListeningContent) => {
    setCurrentContent(content)
    setCurrentTime(0)
    setShowTranscript(false)
    setShowQuestions(false)
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setShowResults(false)
  }

  const handleAnswerSubmit = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const calculateScore = () => {
    if (!currentContent) return 0

    let correct = 0
    currentContent.questions.forEach((question) => {
      const userAnswer = userAnswers[question.id]?.toLowerCase().trim()
      const correctAnswer = question.correctAnswer.toLowerCase().trim()

      if (userAnswer === correctAnswer) {
        correct++
      }
    })

    return Math.round((correct / currentContent.questions.length) * 100)
  }

  const finishQuestions = () => {
    const score = calculateScore()
    setShowResults(true)

    // Update progress
    const progress: UserProgress = {
      contentId: currentContent!.id,
      completed: true,
      score,
      timeSpent: Math.round(currentTime),
      attempts: 1,
    }

    setUserProgress((prev) => {
      const existing = prev.find((p) => p.contentId === currentContent!.id)
      if (existing) {
        return prev.map((p) =>
          p.contentId === currentContent!.id ? { ...p, score: Math.max(p.score, score), attempts: p.attempts + 1 } : p,
        )
      }
      return [...prev, progress]
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getDifficultyColor = (difficulty: string) => {
    const diff = difficulties.find((d) => d.key === difficulty)
    return diff?.color || "#9E9E9E"
  }

  const renderContentCard = (content: ListeningContent) => {
    const progress = userProgress.find((p) => p.contentId === content.id)

    return (
      <TouchableOpacity
        key={content.id}
        style={[styles.contentCard, { borderLeftColor: getDifficultyColor(content.difficulty) }]}
        onPress={() => startListening(content)}
      >
        <View style={styles.contentHeader}>
          <View style={styles.contentInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.contentTitle}>{content.title}</Text>
              {content.isPersonalized && (
                <View style={styles.personalizedBadge}>
                  <Icon name="person" size={12} color="#4ECDC4" />
                  <Text style={styles.personalizedText}>For You</Text>
                </View>
              )}
            </View>
            <Text style={styles.contentDescription}>{content.description}</Text>

            <View style={styles.contentMeta}>
              <View style={styles.metaItem}>
                <Icon name={content.type === "video" ? "videocam" : "headphones"} size={16} color="#666" />
                <Text style={styles.metaText}>{formatTime(content.duration)}</Text>
              </View>

              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(content.difficulty) }]}>
                <Text style={styles.difficultyText}>
                  {content.difficulty.charAt(0).toUpperCase() + content.difficulty.slice(1)}
                </Text>
              </View>

              <Text style={styles.questionCount}>{content.questions.length} questions</Text>
            </View>

            <View style={styles.tagsContainer}>
              {content.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {progress && (
            <View style={styles.progressIndicator}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.progressScore}>{progress.score}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderPlayer = () => {
    if (!currentContent) return null

    return (
      <Modal visible={!!currentContent} animationType="slide">
        <SafeAreaView style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setCurrentContent(null)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>{currentContent.title}</Text>
            <TouchableOpacity onPress={() => setShowQuestions(true)}>
              <Icon name="quiz" size={24} color="#4ECDC4" />
            </TouchableOpacity>
          </View>

          <View style={styles.mediaContainer}>
            {currentContent.type === "video" ? (
              <Video
                source={{ uri: currentContent.url }}
                style={styles.videoPlayer}
                controls={false}
                resizeMode="contain"
                paused={!isPlaying}
                rate={playbackRate}
                onLoad={(data) => setDuration(data.duration)}
                onProgress={(data) => setCurrentTime(data.currentTime)}
              />
            ) : (
              <View style={styles.audioPlayer}>
                <Icon name="music-note" size={64} color="#4ECDC4" />
                <Text style={styles.audioTitle}>{currentContent.title}</Text>
                <Text style={styles.audioDifficulty}>
                  {difficulties.find((d) => d.key === currentContent.difficulty)?.description}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.playerControls}>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Slider
                style={styles.progressSlider}
                minimumValue={0}
                maximumValue={duration}
                value={currentTime}
                minimumTrackTintColor="#4ECDC4"
                maximumTrackTintColor="#E5E7EB"
                thumbStyle={styles.sliderThumb}
              />
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton}>
                <Icon name="replay-10" size={24} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButton} onPress={() => setIsPlaying(!isPlaying)}>
                <Icon name={isPlaying ? "pause" : "play-arrow"} size={32} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Icon name="forward-10" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.speedControl}>
              <Text style={styles.speedLabel}>Speed: {playbackRate}x</Text>
              <Slider
                style={styles.speedSlider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.25}
                value={playbackRate}
                onValueChange={setPlaybackRate}
                minimumTrackTintColor="#4ECDC4"
                maximumTrackTintColor="#E5E7EB"
              />
            </View>
          </View>

          <View style={styles.playerActions}>
            <TouchableOpacity
              style={[styles.actionButton, showTranscript && styles.actionButtonActive]}
              onPress={() => setShowTranscript(!showTranscript)}
            >
              <Icon name="subtitles" size={20} color={showTranscript ? "#FFFFFF" : "#6B7280"} />
              <Text style={[styles.actionButtonText, showTranscript && styles.actionButtonTextActive]}>Transcript</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setShowQuestions(true)}>
              <Icon name="quiz" size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Questions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="bookmark-border" size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {showTranscript && (
            <ScrollView style={styles.transcriptContainer}>
              <Text style={styles.transcriptTitle}>Transcript</Text>
              <Text style={styles.transcriptText}>{currentContent.transcript}</Text>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    )
  }

  const renderQuestions = () => {
    if (!currentContent || !showQuestions) return null

    const currentQuestion = currentContent.questions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === currentContent.questions.length - 1

    return (
      <Modal visible={showQuestions} animationType="slide">
        <SafeAreaView style={styles.questionsContainer}>
          <View style={styles.questionsHeader}>
            <TouchableOpacity onPress={() => setShowQuestions(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.questionsTitle}>Comprehension Questions</Text>
            <Text style={styles.questionProgress}>
              {currentQuestionIndex + 1}/{currentContent.questions.length}
            </Text>
          </View>

          {!showResults ? (
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>

              {currentQuestion.type === "multiple-choice" && (
                <View style={styles.optionsContainer}>
                  {currentQuestion.options?.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.optionButton, userAnswers[currentQuestion.id] === option && styles.selectedOption]}
                      onPress={() => handleAnswerSubmit(currentQuestion.id, option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          userAnswers[currentQuestion.id] === option && styles.selectedOptionText,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {currentQuestion.type === "fill-blank" && (
                <TextInput
                  style={styles.answerInput}
                  value={userAnswers[currentQuestion.id] || ""}
                  onChangeText={(text) => handleAnswerSubmit(currentQuestion.id, text)}
                  placeholder="Type your answer here..."
                />
              )}

              {currentQuestion.type === "true-false" && (
                <View style={styles.trueFalseContainer}>
                  {["true", "false"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.trueFalseButton,
                        userAnswers[currentQuestion.id] === option && styles.selectedTrueFalse,
                      ]}
                      onPress={() => handleAnswerSubmit(currentQuestion.id, option)}
                    >
                      <Text
                        style={[
                          styles.trueFalseText,
                          userAnswers[currentQuestion.id] === option && styles.selectedTrueFalseText,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.questionActions}>
                {currentQuestionIndex > 0 && (
                  <TouchableOpacity
                    style={styles.prevButton}
                    onPress={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  >
                    <Text style={styles.prevButtonText}>Previous</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => {
                    if (isLastQuestion) {
                      finishQuestions()
                    } else {
                      setCurrentQuestionIndex((prev) => prev + 1)
                    }
                  }}
                  disabled={!userAnswers[currentQuestion.id]}
                >
                  <Text style={styles.nextButtonText}>{isLastQuestion ? "Finish" : "Next"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.resultsContainer}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>Your Score</Text>
                <Text style={[styles.scoreValue, { color: getDifficultyColor(currentContent.difficulty) }]}>
                  {calculateScore()}%
                </Text>
                <Text style={styles.scoreDescription}>
                  {calculateScore() >= 80
                    ? "Excellent comprehension!"
                    : calculateScore() >= 60
                      ? "Good job! Keep practicing."
                      : "Keep working on your listening skills."}
                </Text>
              </View>

              <View style={styles.answersReview}>
                <Text style={styles.reviewTitle}>Answer Review</Text>
                {currentContent.questions.map((question, index) => {
                  const userAnswer = userAnswers[question.id]
                  const isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()

                  return (
                    <View key={question.id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewQuestionNumber}>Q{index + 1}</Text>
                        <Icon
                          name={isCorrect ? "check-circle" : "cancel"}
                          size={20}
                          color={isCorrect ? "#4CAF50" : "#F44336"}
                        />
                      </View>
                      <Text style={styles.reviewQuestion}>{question.question}</Text>
                      <Text style={styles.reviewUserAnswer}>
                        Your answer:{" "}
                        <Text style={{ color: isCorrect ? "#4CAF50" : "#F44336" }}>{userAnswer || "No answer"}</Text>
                      </Text>
                      {!isCorrect && (
                        <Text style={styles.reviewCorrectAnswer}>
                          Correct answer: <Text style={{ color: "#4CAF50" }}>{question.correctAnswer}</Text>
                        </Text>
                      )}
                      <Text style={styles.reviewExplanation}>{question.explanation}</Text>
                    </View>
                  )
                })}
              </View>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setShowResults(false)
                  setCurrentQuestionIndex(0)
                  setUserAnswers({})
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Advanced Listening</Text>
        <TouchableOpacity>
          <Icon name="analytics" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listening content..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.difficultySelector}>
          {difficulties.map((difficulty) => (
            <TouchableOpacity
              key={difficulty.key}
              style={[
                styles.difficultyButton,
                selectedDifficulty === difficulty.key && styles.selectedDifficultyButton,
                { borderColor: difficulty.color },
              ]}
              onPress={() => setSelectedDifficulty(difficulty.key as any)}
            >
              <Text
                style={[
                  styles.difficultyButtonText,
                  selectedDifficulty === difficulty.key && { color: difficulty.color },
                ]}
              >
                {difficulty.label}
              </Text>
              <Text style={styles.difficultyDescription}>{difficulty.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, selectedCategory === category.id && styles.selectedCategoryChip]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Icon name={category.icon} size={16} color={selectedCategory === category.id ? "#FFFFFF" : "#666"} />
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.selectedCategoryText]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.contentList}>
          <View style={styles.personalizedSection}>
            <Text style={styles.sectionTitle}>🎯 Recommended for You</Text>
            {filteredContent.filter((content) => content.isPersonalized).map(renderContentCard)}
          </View>

          <View style={styles.allContentSection}>
            <Text style={styles.sectionTitle}>📚 All Content</Text>
            {filteredContent.filter((content) => !content.isPersonalized).map(renderContentCard)}
          </View>
        </ScrollView>
      </Animated.View>

      {renderPlayer()}
      {renderQuestions()}
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
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  difficultySelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedDifficultyButton: {
    backgroundColor: "#F8F9FA",
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  difficultyDescription: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },
  categoryScroll: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    marginLeft: 15,
    gap: 6,
  },
  selectedCategoryChip: {
    backgroundColor: "#4ECDC4",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  contentList: {
    flex: 1,
    padding: 20,
  },
  personalizedSection: {
    marginBottom: 30,
  },
  allContentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contentInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  personalizedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  personalizedText: {
    fontSize: 10,
    color: "#4ECDC4",
    fontWeight: "500",
  },
  contentDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  questionCount: {
    fontSize: 12,
    color: "#666",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    color: "#666",
  },
  progressIndicator: {
    alignItems: "center",
    gap: 4,
  },
  progressScore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  playerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  mediaContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoPlayer: {
    flex: 1,
  },
  audioPlayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  audioAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  audioTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  audioDifficulty: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  playerControls: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    minWidth: 40,
  },
  progressSlider: {
    flex: 1,
    marginHorizontal: 12,
  },
  sliderThumb: {
    backgroundColor: "#4ECDC4",
  },
  controlButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    marginBottom: 20,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
  },
  speedControl: {
    alignItems: "center",
  },
  speedLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  speedSlider: {
    width: 200,
  },
  playerActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionButtonTextActive: {
    color: "#FFFFFF",
  },
  transcriptContainer: {
    backgroundColor: "#FFFFFF",
    maxHeight: 200,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  transcriptText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  questionsContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  questionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  questionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  questionProgress: {
    fontSize: 14,
    color: "#666",
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
  },
  selectedOption: {
    borderColor: "#4ECDC4",
    backgroundColor: "#E8F8F5",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedOptionText: {
    color: "#4ECDC4",
    fontWeight: "500",
  },
  answerInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 30,
  },
  trueFalseContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  trueFalseButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  selectedTrueFalse: {
    borderColor: "#4ECDC4",
    backgroundColor: "#E8F8F5",
  },
  trueFalseText: {
    fontSize: 16,
    color: "#333",
  },
  selectedTrueFalseText: {
    color: "#4ECDC4",
    fontWeight: "500",
  },
  questionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  prevButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  prevButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#4ECDC4",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  answersReview: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewQuestionNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ECDC4",
  },
  reviewQuestion: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  reviewUserAnswer: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  reviewCorrectAnswer: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  reviewExplanation: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  retryButton: {
    backgroundColor: "#45B7D1",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default AdvancedListeningScreen
