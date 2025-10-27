import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import {ReadingText, Translation, QuizQuestion} from "../../types/api"


const ReadingScreen = ({ navigation }) => {
  const [selectedText, setSelectedText] = useState<ReadingText | null>(null)
  const [currentMode, setCurrentMode] = useState<"read" | "translate" | "quiz">("read")
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null)
  const [translations, setTranslations] = useState<Translation[]>([])
  const [userTranslation, setUserTranslation] = useState("")
  const [showTranslationResult, setShowTranslationResult] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizScore, setQuizScore] = useState(0)
  const [showQuizResult, setShowQuizResult] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const readingTexts: ReadingText[] = [
    {
      id: "1",
      title: "A Day at the Coffee Shop",
      content:
        "Sarah walked into her favorite coffee shop on a rainy Tuesday morning. The warm aroma of freshly brewed coffee filled the air, making her feel instantly comfortable. She ordered her usual cappuccino and found a quiet corner table by the window. As she sipped her coffee, she watched people hurrying past with umbrellas, grateful to be inside where it was warm and dry.",
      level: "beginner",
      category: "daily-life",
      sentences: [
        "Sarah walked into her favorite coffee shop on a rainy Tuesday morning.",
        "The warm aroma of freshly brewed coffee filled the air, making her feel instantly comfortable.",
        "She ordered her usual cappuccino and found a quiet corner table by the window.",
        "As she sipped her coffee, she watched people hurrying past with umbrellas, grateful to be inside where it was warm and dry.",
      ],
      vocabulary: ["aroma", "cappuccino", "umbrellas", "grateful", "comfortable"],
    },
    {
      id: "2",
      title: "The Future of Technology",
      content:
        "Artificial intelligence is revolutionizing the way we live and work. Machine learning algorithms can now process vast amounts of data in seconds, enabling computers to make decisions that were once exclusively human. This technological advancement has implications for various industries, from healthcare to finance. However, as we embrace these innovations, we must also consider the ethical implications and ensure that technology serves humanity rather than replacing it.",
      level: "advanced",
      category: "technology",
      sentences: [
        "Artificial intelligence is revolutionizing the way we live and work.",
        "Machine learning algorithms can now process vast amounts of data in seconds, enabling computers to make decisions that were once exclusively human.",
        "This technological advancement has implications for various industries, from healthcare to finance.",
        "However, as we embrace these innovations, we must also consider the ethical implications and ensure that technology serves humanity rather than replacing it.",
      ],
      vocabulary: ["revolutionizing", "algorithms", "implications", "innovations", "ethical"],
    },
  ]

  const generateQuiz = (text: ReadingText): QuizQuestion[] => {
    const questions: QuizQuestion[] = [
      {
        id: "1",
        question: "What did Sarah order at the coffee shop?",
        options: ["Espresso", "Cappuccino", "Latte", "Americano"],
        correctAnswer: 1,
        explanation: 'The text states "She ordered her usual cappuccino"',
        type: "comprehension",
        riddle: "",
        category: "",
        difficulty: "easy",
        skill: "",
        points: 0
      },
      {
        id: "2",
        question: 'What does "aroma" mean?',
        options: ["Sound", "Smell", "Taste", "Color"],
        correctAnswer: 1,
        explanation: "Aroma refers to a pleasant smell, especially from food or drink",
        type: "vocabulary",
        riddle: "",
        category: "",
        difficulty: "easy",
        skill: "",
        points: 0
      },
      {
        id: "3",
        question: 'Which tense is used in "Sarah walked into her favorite coffee shop"?',
        options: ["Present", "Past", "Future", "Present Perfect"],
        correctAnswer: 1,
        explanation: 'The verb "walked" is in the simple past tense',
        type: "grammar",
        riddle: "",
        category: "",
        difficulty: "easy",
        skill: "",
        points: 0
      },
    ]
    return questions
  }

  const translateSentence = (sentence: string, userTranslation: string) => {
    // Mock translation evaluation
    const mockCorrectTranslation = {
      "Sarah walked into her favorite coffee shop on a rainy Tuesday morning.":
        "Sarah bước vào quán cà phê yêu thích của cô vào một buổi sáng thứ Ba mưa.",
      "The warm aroma of freshly brewed coffee filled the air, making her feel instantly comfortable.":
        "Hương thơm ấm áp của cà phê mới pha tràn ngập không khí, khiến cô cảm thấy thoải mái ngay lập tức.",
    }

    const correctTranslation = mockCorrectTranslation[sentence] || "Bản dịch mẫu không có sẵn"
    const similarity = calculateTranslationSimilarity(userTranslation, correctTranslation)

    return {
      original: sentence,
      translated: userTranslation,
      isCorrect: similarity > 0.7,
      suggestion: similarity <= 0.7 ? `Gợi ý: ${correctTranslation}` : undefined,
    }
  }

  const calculateTranslationSimilarity = (user: string, correct: string): number => {
    // Simple similarity calculation
    const userWords = user.toLowerCase().split(" ")
    const correctWords = correct.toLowerCase().split(" ")
    const commonWords = userWords.filter((word) => correctWords.includes(word))
    return commonWords.length / Math.max(userWords.length, correctWords.length)
  }

  const submitTranslation = () => {
    if (!selectedText || selectedSentence === null || !userTranslation.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập bản dịch")
      return
    }

    const sentence = selectedText.sentences[selectedSentence]
    const result = translateSentence(sentence, userTranslation.trim())

    setTranslations((prev) => {
      const newTranslations = [...prev]
      newTranslations[selectedSentence] = result
      return newTranslations
    })

    setShowTranslationResult(true)
    setUserTranslation("")
  }

  const startQuiz = () => {
    if (!selectedText) return

    const quiz = generateQuiz(selectedText)
    setCurrentQuiz(quiz)
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setQuizScore(0)
    setCurrentMode("quiz")
  }

  const submitQuizAnswer = () => {
    if (selectedAnswer === null) return

    const currentQuestion = currentQuiz[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer

    if (isCorrect) {
      setQuizScore((prev) => prev + 1)
    }

    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setSelectedAnswer(null)
    } else {
      setShowQuizResult(true)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "#10B981"
      case "intermediate":
        return "#F59E0B"
      case "advanced":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const renderTextCard = (text: ReadingText) => (
    <TouchableOpacity key={text.id} style={styles.textCard} onPress={() => setSelectedText(text)}>
      <View style={styles.textHeader}>
        <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(text.level)}20` }]}>
          <Text style={[styles.levelText, { color: getLevelColor(text.level) }]}>
            {text.level === "beginner" ? "Sơ cấp" : text.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
          </Text>
        </View>
        <Text style={styles.categoryText}>{text.category}</Text>
      </View>
      <Text style={styles.textTitle}>{text.title}</Text>
      <Text style={styles.textPreview} numberOfLines={3}>
        {text.content}
      </Text>
    </TouchableOpacity>
  )

  const renderReadingMode = () => (
    <ScrollView style={styles.readingContent}>
      <Text style={styles.readingTitle}>{selectedText?.title}</Text>
      <Text style={styles.readingText}>{selectedText?.content}</Text>

      <View style={styles.vocabularySection}>
        <Text style={styles.vocabularyTitle}>Từ vựng quan trọng</Text>
        <View style={styles.vocabularyList}>
          {selectedText?.vocabulary.map((word, index) => (
            <View key={index} style={styles.vocabularyItem}>
              <Text style={styles.vocabularyWord}>{word}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.modeActions}>
        <TouchableOpacity style={styles.modeButton} onPress={() => setCurrentMode("translate")}>
          <Icon name="translate" size={20} color="#4F46E5" />
          <Text style={styles.modeButtonText}>Dịch từng câu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeButton} onPress={startQuiz}>
          <Icon name="quiz" size={20} color="#10B981" />
          <Text style={styles.modeButtonText}>Làm bài quiz</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderTranslationMode = () => (
    <ScrollView style={styles.translationContent}>
      <Text style={styles.translationTitle}>Dịch từng câu</Text>
      <Text style={styles.translationInstruction}>Chọn câu và nhập bản dịch của bạn</Text>

      <View style={styles.sentencesList}>
        {selectedText?.sentences.map((sentence, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sentenceItem,
              selectedSentence === index && styles.selectedSentenceItem,
              translations[index] && styles.translatedSentenceItem,
            ]}
            onPress={() => setSelectedSentence(index)}
          >
            <View style={styles.sentenceHeader}>
              <Text style={styles.sentenceNumber}>Câu {index + 1}</Text>
              {translations[index] && (
                <Icon
                  name={translations[index].isCorrect ? "check-circle" : "error"}
                  size={20}
                  color={translations[index].isCorrect ? "#10B981" : "#EF4444"}
                />
              )}
            </View>
            <Text style={styles.sentenceText}>{sentence}</Text>
            {translations[index] && (
              <View style={styles.translationResult}>
                <Text style={styles.userTranslationText}>Bản dịch của bạn: {translations[index].translated}</Text>
                {translations[index].suggestion && (
                  <Text style={styles.suggestionText}>{translations[index].suggestion}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedSentence !== null && (
        <View style={styles.translationInput}>
          <Text style={styles.inputLabel}>Dịch câu {selectedSentence + 1}:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập bản dịch của bạn..."
            placeholderTextColor="#9CA3AF"
            value={userTranslation}
            onChangeText={setUserTranslation}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.submitButton} onPress={submitTranslation}>
            <Text style={styles.submitButtonText}>Kiểm tra</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderQuizMode = () => {
    if (showQuizResult) {
      return (
        <View style={styles.quizResultContainer}>
          <Icon name="check-circle" size={64} color="#10B981" />
          <Text style={styles.quizResultTitle}>Hoàn thành bài quiz!</Text>
          <Text style={styles.quizResultScore}>
            Điểm số: {quizScore}/{currentQuiz.length}
          </Text>
          <Text style={styles.quizResultPercentage}>{Math.round((quizScore / currentQuiz.length) * 100)}%</Text>

          <View style={styles.quizResultActions}>
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => {
                setShowQuizResult(false)
                setCurrentMode("read")
              }}
            >
              <Text style={styles.resultButtonText}>Quay lại đọc</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resultButton} onPress={startQuiz}>
              <Text style={styles.resultButtonText}>Làm lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    const currentQuestion = currentQuiz[currentQuestionIndex]
    if (!currentQuestion) return null

    return (
      <ScrollView style={styles.quizContent}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizProgress}>
            Câu {currentQuestionIndex + 1}/{currentQuiz.length}
          </Text>
          <View style={styles.quizProgressBar}>
            <View
              style={[
                styles.quizProgressFill,
                { width: `${((currentQuestionIndex + 1) / currentQuiz.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.questionContainer}>
          <View style={styles.questionTypeContainer}>
            <Text
              style={[
                styles.questionType,
                {
                  backgroundColor:
                    currentQuestion.type === "vocabulary"
                      ? "#EEF2FF"
                      : currentQuestion.type === "grammar"
                        ? "#ECFDF5"
                        : "#FEF2F2",
                  color:
                    currentQuestion.type === "vocabulary"
                      ? "#4F46E5"
                      : currentQuestion.type === "grammar"
                        ? "#10B981"
                        : "#EF4444",
                },
              ]}
            >
              {currentQuestion.type === "vocabulary"
                ? "Từ vựng"
                : currentQuestion.type === "grammar"
                  ? "Ngữ pháp"
                  : "Hiểu đọc"}
            </Text>
          </View>

          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, selectedAnswer === index && styles.selectedOptionButton]}
                onPress={() => setSelectedAnswer(index)}
              >
                <View style={styles.optionContent}>
                  <View style={[styles.optionIndicator, selectedAnswer === index && styles.selectedOptionIndicator]}>
                    <Text style={[styles.optionLetter, selectedAnswer === index && styles.selectedOptionLetter]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, selectedAnswer === index && styles.selectedOptionText]}>
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitQuizButton, selectedAnswer === null && styles.submitQuizButtonDisabled]}
            onPress={submitQuizAnswer}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.submitQuizButtonText}>
              {currentQuestionIndex < currentQuiz.length - 1 ? "Câu tiếp theo" : "Hoàn thành"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  if (selectedText) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedText(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedText.title}</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeTab, currentMode === "read" && styles.activeModeTab]}
              onPress={() => setCurrentMode("read")}
            >
              <Icon name="menu-book" size={16} color={currentMode === "read" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, currentMode === "translate" && styles.activeModeTab]}
              onPress={() => setCurrentMode("translate")}
            >
              <Icon name="translate" size={16} color={currentMode === "translate" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, currentMode === "quiz" && styles.activeModeTab]}
              onPress={() => setCurrentMode("quiz")}
            >
              <Icon name="quiz" size={16} color={currentMode === "quiz" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        {currentMode === "read" && renderReadingMode()}
        {currentMode === "translate" && renderTranslationMode()}
        {currentMode === "quiz" && renderQuizMode()}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Luyện đọc</Text>
        <TouchableOpacity>
          <Icon name="search" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          <View style={styles.welcomeSection}>
            <Icon name="book" size={64} color="#4F46E5" />
            <Text style={styles.welcomeTitle}>Luyện kỹ năng đọc</Text>
            <Text style={styles.welcomeText}>Đọc hiểu, dịch thuật và làm bài quiz để nâng cao khả năng đọc</Text>
          </View>

          <View style={styles.textsSection}>
            <Text style={styles.sectionTitle}>Chọn bài đọc</Text>
            {readingTexts.map(renderTextCard)}
          </View>
        </Animated.View>
      </ScrollView>
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
    flex: 1,
    textAlign: "center",
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
  },
  modeTab: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeModeTab: {
    backgroundColor: "#4F46E5",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
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
  textsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  textCard: {
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
  textHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    fontWeight: "600",
  },
  categoryText: {
    fontSize: 12,
    color: "#6B7280",
  },
  textTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  textPreview: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  readingContent: {
    flex: 1,
    padding: 20,
  },
  readingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  readingText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 24,
  },
  vocabularySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vocabularyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  vocabularyList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vocabularyItem: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vocabularyWord: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  modeActions: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  translationContent: {
    flex: 1,
    padding: 20,
  },
  translationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  translationInstruction: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  sentencesList: {
    marginBottom: 20,
  },
  sentenceItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedSentenceItem: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  translatedSentenceItem: {
    borderColor: "#10B981",
  },
  sentenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sentenceNumber: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  sentenceText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  translationResult: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  userTranslationText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: "#EF4444",
    fontStyle: "italic",
  },
  translationInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quizContent: {
    flex: 1,
    padding: 20,
  },
  quizHeader: {
    marginBottom: 24,
  },
  quizProgress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  quizProgressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  quizProgressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 2,
  },
  questionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  questionTypeContainer: {
    marginBottom: 16,
  },
  questionType: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  questionText: {
    fontSize: 18,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOptionButton: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedOptionIndicator: {
    backgroundColor: "#4F46E5",
  },
  optionLetter: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  selectedOptionLetter: {
    color: "#FFFFFF",
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  selectedOptionText: {
    color: "#1F2937",
    fontWeight: "500",
  },
  submitQuizButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitQuizButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  submitQuizButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quizResultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  quizResultAnimation: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  quizResultTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  quizResultScore: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 8,
  },
  quizResultPercentage: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 32,
  },
  quizResultActions: {
    flexDirection: "row",
    gap: 16,
  },
  resultButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
})

export default ReadingScreen
