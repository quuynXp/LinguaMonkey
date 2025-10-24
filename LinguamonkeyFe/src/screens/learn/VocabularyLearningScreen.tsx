import { useEffect, useRef, useState } from "react"
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 

const { width } = Dimensions.get("window")

interface VocabularyTopic {
  id: string
  title: string
  description: string
  icon: string
  color: string
  difficulty: "beginner" | "intermediate" | "advanced"
  wordCount: number
  category: "conversational" | "professional" | "trending" | "age-specific"
  isPersonalized: boolean
}

interface VocabularyWord {
  id: string
  word: string
  pronunciation: string
  definition: string
  example: string
  audioUrl: string
  difficulty: "beginner" | "intermediate" | "advanced"
  partOfSpeech: string
  synonyms: string[]
  antonyms: string[]
  relatedWords: string[]
}

const VocabularyLearningScreen = ({ navigation }: any) => {
  const [selectedTopic, setSelectedTopic] = useState<VocabularyTopic | null>(null)
  const [currentWords, setCurrentWords] = useState<VocabularyWord[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showDefinition, setShowDefinition] = useState(false)
  const [learningMode, setLearningMode] = useState<"flashcard" | "quiz" | "spelling">("flashcard")
  const [userAnswer, setUserAnswer] = useState("")
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

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

  const vocabularyTopics: VocabularyTopic[] = [
    {
      id: "1",
      title: "Daily Conversations",
      description: "Essential phrases for everyday interactions",
      icon: "chat",
      color: "#4ECDC4",
      difficulty: "beginner",
      wordCount: 150,
      category: "conversational",
      isPersonalized: true,
    },
    {
      id: "2",
      title: "Business & Office",
      description: "Professional vocabulary for workplace",
      icon: "business",
      color: "#45B7D1",
      difficulty: "intermediate",
      wordCount: 200,
      category: "professional",
      isPersonalized: true,
    },
    {
      id: "3",
      title: "Tech Trends 2024",
      description: "Latest technology and digital terms",
      icon: "computer",
      color: "#96CEB4",
      difficulty: "advanced",
      wordCount: 120,
      category: "trending",
      isPersonalized: false,
    },
    {
      id: "4",
      title: "Gen Z Slang",
      description: "Modern expressions and youth language",
      icon: "trending-up",
      color: "#FFEAA7",
      difficulty: "intermediate",
      wordCount: 80,
      category: "age-specific",
      isPersonalized: true,
    },
    {
      id: "5",
      title: "Travel & Tourism",
      description: "Essential vocabulary for travelers",
      icon: "flight",
      color: "#FD79A8",
      difficulty: "beginner",
      wordCount: 180,
      category: "conversational",
      isPersonalized: false,
    },
    {
      id: "6",
      title: "Medical Terms",
      description: "Healthcare and medical vocabulary",
      icon: "local-hospital",
      color: "#E17055",
      difficulty: "advanced",
      wordCount: 250,
      category: "professional",
      isPersonalized: false,
    },
  ]

  const mockWords: VocabularyWord[] = [
    {
      id: "1",
      word: "Serendipity",
      pronunciation: "/ˌserənˈdipədē/",
      definition: "The occurrence and development of events by chance in a happy or beneficial way",
      example: "A fortunate stroke of serendipity brought the two old friends together.",
      audioUrl: "serendipity.mp3",
      difficulty: "advanced",
      partOfSpeech: "noun",
      synonyms: ["chance", "fortune", "luck"],
      antonyms: ["misfortune", "bad luck"],
      relatedWords: ["coincidence", "destiny", "fate"],
    },
    {
      id: "2",
      word: "Collaborate",
      pronunciation: "/kəˈlabəˌrāt/",
      definition: "Work jointly on an activity, especially to produce or create something",
      example: "The teams will collaborate on the new project next quarter.",
      audioUrl: "collaborate.mp3",
      difficulty: "intermediate",
      partOfSpeech: "verb",
      synonyms: ["cooperate", "work together", "partner"],
      antonyms: ["compete", "oppose"],
      relatedWords: ["teamwork", "partnership", "alliance"],
    },
  ]

  const categories = [
    { id: "all", name: "All Topics", icon: "apps" },
    { id: "conversational", name: "Conversational", icon: "chat" },
    { id: "professional", name: "Professional", icon: "business" },
    { id: "trending", name: "Trending", icon: "trending-up" },
    { id: "age-specific", name: "Age-Specific", icon: "people" },
  ]

  const filteredTopics = vocabularyTopics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const startLearning = (topic: VocabularyTopic) => {
    setSelectedTopic(topic)
    setCurrentWords(mockWords) // In real app, fetch words for this topic
    setCurrentWordIndex(0)
    setShowDefinition(false)
    setScore(0)
    setStreak(0)
  }

  const nextWord = () => {
    if (currentWordIndex < currentWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1)
      setShowDefinition(false)
      setUserAnswer("")
    } else {
      setShowResults(true)
    }
  }

  const checkAnswer = () => {
    const currentWord = currentWords[currentWordIndex]
    const isCorrect = userAnswer.toLowerCase().trim() === currentWord.word.toLowerCase()

    if (isCorrect) {
      setScore((prev) => prev + 1)
      setStreak((prev) => prev + 1)
      Alert.alert("Correct! 🎉", "Great job!")
    } else {
      setStreak(0)
      Alert.alert("Try Again", `The correct answer is: ${currentWord.word}`)
    }

    setTimeout(nextWord, 1500)
  }

  const renderTopicCard = (topic: VocabularyTopic) => (
    <TouchableOpacity
      key={topic.id}
      style={[styles.topicCard, { borderLeftColor: topic.color }]}
      onPress={() => startLearning(topic)}
    >
      <View style={styles.topicHeader}>
        <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
          <Icon name={topic.icon} size={24} color={topic.color} />
        </View>
        <View style={styles.topicInfo}>
          <View style={styles.topicTitleRow}>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            {topic.isPersonalized && (
              <View style={styles.personalizedBadge}>
                <Icon name="person" size={12} color="#4ECDC4" />
                <Text style={styles.personalizedText}>For You</Text>
              </View>
            )}
          </View>
          <Text style={styles.topicDescription}>{topic.description}</Text>
          <View style={styles.topicMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(topic.difficulty) }]}>
              <Text style={styles.difficultyText}>
                {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
              </Text>
            </View>
            <Text style={styles.wordCount}>{topic.wordCount} words</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderLearningInterface = () => {
    if (!selectedTopic || currentWords.length === 0) return null

    const currentWord = currentWords[currentWordIndex]

    return (
      <Modal visible={!!selectedTopic} animationType="slide">
        <SafeAreaView style={styles.learningContainer}>
          <View style={styles.learningHeader}>
            <TouchableOpacity onPress={() => setSelectedTopic(null)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.learningTitle}>{selectedTopic.title}</Text>
            <Text style={styles.progress}>
              {currentWordIndex + 1}/{currentWords.length}
            </Text>
          </View>

          <View style={styles.modeSelector}>
            {["flashcard", "quiz", "spelling"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeButton, learningMode === mode && styles.activeModeButton]}
                onPress={() => setLearningMode(mode as any)}
              >
                <Text style={[styles.modeText, learningMode === mode && styles.activeModeText]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.scoreSection}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>
                {score}/{currentWords.length}
              </Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Streak</Text>
              <Text style={[styles.scoreValue, { color: streak > 0 ? "#4ECDC4" : "#666" }]}>{streak} 🔥</Text>
            </View>
          </View>

          {learningMode === "flashcard" && (
            <View style={styles.flashcardContainer}>
              <View style={styles.flashcard}>
                <Text style={styles.wordText}>{currentWord.word}</Text>
                <Text style={styles.pronunciationText}>{currentWord.pronunciation}</Text>
                <Text style={styles.partOfSpeechText}>{currentWord.partOfSpeech}</Text>

                {showDefinition && (
                  <View style={styles.definitionContainer}>
                    <Text style={styles.definitionText}>{currentWord.definition}</Text>
                    <Text style={styles.exampleText}>"{currentWord.example}"</Text>

                    <View style={styles.wordDetails}>
                      <View style={styles.wordDetailSection}>
                        <Text style={styles.detailLabel}>Synonyms:</Text>
                        <Text style={styles.detailText}>{currentWord.synonyms.join(", ")}</Text>
                      </View>
                      <View style={styles.wordDetailSection}>
                        <Text style={styles.detailLabel}>Related:</Text>
                        <Text style={styles.detailText}>{currentWord.relatedWords.join(", ")}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.flashcardActions}>
                {!showDefinition ? (
                  <TouchableOpacity style={styles.showDefinitionButton} onPress={() => setShowDefinition(true)}>
                    <Text style={styles.showDefinitionText}>Show Definition</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.nextButton} onPress={nextWord}>
                    <Text style={styles.nextButtonText}>Next Word</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {learningMode === "spelling" && (
            <View style={styles.spellingContainer}>
              <Text style={styles.spellingPrompt}>Listen and spell the word:</Text>
              <TouchableOpacity style={styles.playButton}>
                <Icon name="volume-up" size={32} color="#4ECDC4" />
              </TouchableOpacity>
              <Text style={styles.pronunciationHint}>{currentWord.pronunciation}</Text>

              <TextInput
                style={styles.spellingInput}
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type the word here..."
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.checkButton} onPress={checkAnswer}>
                <Text style={styles.checkButtonText}>Check Answer</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Vocabulary Learning</Text>
        <TouchableOpacity>
          <Icon name="bookmark" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vocabulary topics..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
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

        <ScrollView showsVerticalScrollIndicator={false} style={styles.topicsList}>
          <View style={styles.personalizedSection}>
            <Text style={styles.sectionTitle}>📚 Recommended for You</Text>
            {filteredTopics.filter((topic) => topic.isPersonalized).map(renderTopicCard)}
          </View>

          <View style={styles.allTopicsSection}>
            <Text style={styles.sectionTitle}>🌟 All Topics</Text>
            {filteredTopics.filter((topic) => !topic.isPersonalized).map(renderTopicCard)}
          </View>
        </ScrollView>
      </Animated.View>

      {renderLearningInterface()}
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
  topicsList: {
    flex: 1,
    padding: 20,
  },
  personalizedSection: {
    marginBottom: 30,
  },
  allTopicsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  topicCard: {
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
  topicHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  topicTitle: {
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
  topicDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  wordCount: {
    fontSize: 12,
    color: "#666",
  },
  learningContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  learningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  progress: {
    fontSize: 14,
    color: "#666",
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  activeModeButton: {
    backgroundColor: "#4ECDC4",
  },
  modeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeModeText: {
    color: "#FFFFFF",
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 15,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  flashcardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  flashcard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  wordText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 16,
    color: "#4ECDC4",
    marginBottom: 4,
  },
  partOfSpeechText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 20,
  },
  definitionContainer: {
    width: "100%",
  },
  definitionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
  },
  wordDetails: {
    gap: 12,
  },
  wordDetailSection: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ECDC4",
    marginRight: 8,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  flashcardActions: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  showDefinitionButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  showDefinitionText: {
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
  spellingContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  spellingPrompt: {
    fontSize: 18,
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F8F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pronunciationHint: {
    fontSize: 16,
    color: "#4ECDC4",
    marginBottom: 30,
  },
  spellingInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  checkButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  checkButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default VocabularyLearningScreen
