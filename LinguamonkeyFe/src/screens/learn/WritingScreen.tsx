import { useEffect, useRef, useState } from "react"
import {
    Alert,
    Animated,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons'; 

interface WritingPrompt {
  id: string
  title: string
  description: string
  type: "image" | "video" | "topic"
  mediaUrl?: string
  level: "beginner" | "intermediate" | "advanced"
  category: string
  minWords: number
  maxWords: number
}

interface GrammarError {
  type: "grammar" | "spelling" | "word-choice" | "punctuation"
  start: number
  end: number
  original: string
  suggestion: string
  explanation: string
  severity: "low" | "medium" | "high"
}

interface WritingAnalysis {
  wordCount: number
  grammarErrors: GrammarError[]
  overallScore: number
  grammarScore: number
  vocabularyScore: number
  coherenceScore: number
  suggestions: string[]
}

const WritingScreen = ({ navigation }) => {
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null)
  const [userText, setUserText] = useState("")
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [highlightedErrors, setHighlightedErrors] = useState<GrammarError[]>([])
  const [selectedError, setSelectedError] = useState<GrammarError | null>(null)
  const [currentCategory, setCurrentCategory] = useState("daily")

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const writingPrompts: WritingPrompt[] = [
    {
      id: "1",
      title: "Describe Your Perfect Day",
      description: "Write about what your perfect day would look like from morning to night.",
      type: "image",
      mediaUrl: "https://via.placeholder.com/400x300/87CEEB/FFFFFF?text=Perfect+Day",
      level: "beginner",
      category: "daily",
      minWords: 100,
      maxWords: 200,
    },
    {
      id: "2",
      title: "The Future of Work",
      description: "Discuss how technology will change the way we work in the next 10 years.",
      type: "topic",
      level: "advanced",
      category: "business",
      minWords: 250,
      maxWords: 400,
    },
    {
      id: "3",
      title: "A Memorable Travel Experience",
      description: "Share a story about a travel experience that left a lasting impression on you.",
      type: "image",
      mediaUrl: "https://via.placeholder.com/400x300/98FB98/FFFFFF?text=Travel+Memory",
      level: "intermediate",
      category: "travel",
      minWords: 150,
      maxWords: 300,
    },
    {
      id: "4",
      title: "Environmental Solutions",
      description: "Propose solutions to address climate change and environmental issues.",
      type: "video",
      mediaUrl: "https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4",
      level: "advanced",
      category: "environment",
      minWords: 300,
      maxWords: 500,
    },
  ]

  const categories = [
    { id: "daily", name: "Hàng ngày", icon: "today", color: "#10B981" },
    { id: "business", name: "Kinh doanh", icon: "business", color: "#3B82F6" },
    { id: "travel", name: "Du lịch", icon: "flight", color: "#F59E0B" },
    { id: "environment", name: "Môi trường", icon: "eco", color: "#8B5CF6" },
  ]

  const analyzeWriting = (text: string): WritingAnalysis => {
    // Mock grammar analysis - in real app, use AI service
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
    const wordCount = words.length

    // Mock grammar errors
    const grammarErrors: GrammarError[] = [
      {
        type: "grammar",
        start: text.indexOf("I are"),
        end: text.indexOf("I are") + 5,
        original: "I are",
        suggestion: "I am",
        explanation: 'Subject-verb agreement: Use "am" with "I"',
        severity: "high",
      },
      {
        type: "spelling",
        start: text.indexOf("recieve"),
        end: text.indexOf("recieve") + 7,
        original: "recieve",
        suggestion: "receive",
        explanation: 'Spelling error: "i" before "e" except after "c"',
        severity: "medium",
      },
      {
        type: "word-choice",
        start: text.indexOf("very good"),
        end: text.indexOf("very good") + 9,
        original: "very good",
        suggestion: "excellent",
        explanation: "Consider using more specific vocabulary",
        severity: "low",
      },
    ].filter((error) => error.start !== -1) as []

    // Calculate scores
    const grammarScore = Math.max(0, 100 - grammarErrors.length * 10)
    const vocabularyScore = Math.min(100, Math.max(60, wordCount * 2))
    const coherenceScore = Math.random() * 20 + 80 // Mock coherence score
    const overallScore = Math.round((grammarScore + vocabularyScore + coherenceScore) / 3)

    const suggestions = [
      "Try to use more varied vocabulary",
      "Check subject-verb agreement",
      "Consider adding transition words for better flow",
      "Review spelling of commonly confused words",
    ]

    return {
      wordCount,
      grammarErrors,
      overallScore,
      grammarScore,
      vocabularyScore,
      coherenceScore,
      suggestions,
    }
  }

  const submitWriting = () => {
    if (!userText.trim()) {
      Alert.alert("Lỗi", "Vui lòng viết nội dung trước khi kiểm tra")
      return
    }

    const result = analyzeWriting(userText)
    setAnalysis(result)
    setHighlightedErrors(result.grammarErrors)
    setShowAnalysis(true)
  }

  const applyCorrection = (error: GrammarError) => {
    const newText = userText.substring(0, error.start) + error.suggestion + userText.substring(error.end)
    setUserText(newText)

    // Remove the corrected error from highlights
    setHighlightedErrors((prev) => prev.filter((e) => e !== error))
    setSelectedError(null)
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

  const getErrorColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#EF4444"
      case "medium":
        return "#F59E0B"
      case "low":
        return "#3B82F6"
      default:
        return "#6B7280"
    }
  }

  const renderPromptCard = (prompt: WritingPrompt) => (
    <TouchableOpacity key={prompt.id} style={styles.promptCard} onPress={() => setSelectedPrompt(prompt)}>
      {prompt.mediaUrl && prompt.type === "image" && (
        <Image source={{ uri: prompt.mediaUrl }} style={styles.promptImage} />
      )}

      <View style={styles.promptContent}>
        <View style={styles.promptHeader}>
          <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(prompt.level)}20` }]}>
            <Text style={[styles.levelText, { color: getLevelColor(prompt.level) }]}>
              {prompt.level === "beginner" ? "Sơ cấp" : prompt.level === "intermediate" ? "Trung cấp" : "Nâng cao"}
            </Text>
          </View>
          <Text style={styles.wordCount}>
            {prompt.minWords}-{prompt.maxWords} từ
          </Text>
        </View>

        <Text style={styles.promptTitle}>{prompt.title}</Text>
        <Text style={styles.promptDescription}>{prompt.description}</Text>

        <View style={styles.promptMeta}>
          <Icon
            name={prompt.type === "image" ? "image" : prompt.type === "video" ? "videocam" : "topic"}
            size={16}
            color="#6B7280"
          />
          <Text style={styles.promptType}>
            {prompt.type === "image" ? "Hình ảnh" : prompt.type === "video" ? "Video" : "Chủ đề"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderTextWithHighlights = () => {
    if (highlightedErrors.length === 0) {
      return <Text style={styles.writingText}>{userText}</Text>
    }

    const parts = []
    let lastIndex = 0

    highlightedErrors.forEach((error, index) => {
      // Add text before error
      if (error.start > lastIndex) {
        parts.push(
          <Text key={`text-${index}`} style={styles.writingText}>
            {userText.substring(lastIndex, error.start)}
          </Text>,
        )
      }

      // Add highlighted error
      parts.push(
        <TouchableOpacity key={`error-${index}`} onPress={() => setSelectedError(error)}>
          <Text
            style={[styles.writingText, styles.errorText, { backgroundColor: `${getErrorColor(error.severity)}20` }]}
          >
            {userText.substring(error.start, error.end)}
          </Text>
        </TouchableOpacity>,
      )

      lastIndex = error.end
    })

    // Add remaining text
    if (lastIndex < userText.length) {
      parts.push(
        <Text key="text-end" style={styles.writingText}>
          {userText.substring(lastIndex)}
        </Text>,
      )
    }

    return <View style={styles.highlightedTextContainer}>{parts}</View>
  }

  const renderAnalysisModal = () => (
    <Modal visible={showAnalysis} animationType="slide">
      <View style={styles.analysisContainer}>
        <View style={styles.analysisHeader}>
          <Text style={styles.analysisTitle}>Phân tích bài viết</Text>
          <TouchableOpacity onPress={() => setShowAnalysis(false)}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.analysisContent}>
          {analysis && (
            <>
              {/* Overall Score */}
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Điểm tổng</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    {
                      color:
                        analysis.overallScore >= 80 ? "#10B981" : analysis.overallScore >= 60 ? "#F59E0B" : "#EF4444",
                    },
                  ]}
                >
                  {analysis.overallScore}/100
                </Text>
                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Ngữ pháp</Text>
                    <Text style={styles.scoreItemValue}>{analysis.grammarScore}/100</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Từ vựng</Text>
                    <Text style={styles.scoreItemValue}>{analysis.vocabularyScore}/100</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Mạch lạc</Text>
                    <Text style={styles.scoreItemValue}>{Math.round(analysis.coherenceScore)}/100</Text>
                  </View>
                </View>
              </View>

              {/* Word Count */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Icon name="text-fields" size={24} color="#4F46E5" />
                  <Text style={styles.statValue}>{analysis.wordCount}</Text>
                  <Text style={styles.statLabel}>Số từ</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="error" size={24} color="#EF4444" />
                  <Text style={styles.statValue}>{analysis.grammarErrors.length}</Text>
                  <Text style={styles.statLabel}>Lỗi</Text>
                </View>
              </View>

              {/* Grammar Errors */}
              {analysis.grammarErrors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.sectionTitle}>Lỗi cần sửa</Text>
                  {analysis.grammarErrors.map((error, index) => (
                    <View key={index} style={styles.errorCard}>
                      <View style={styles.errorHeader}>
                        <View
                          style={[styles.errorTypeBadge, { backgroundColor: `${getErrorColor(error.severity)}20` }]}
                        >
                          <Text style={[styles.errorTypeText, { color: getErrorColor(error.severity) }]}>
                            {error.type === "grammar"
                              ? "Ngữ pháp"
                              : error.type === "spelling"
                                ? "Chính tả"
                                : error.type === "word-choice"
                                  ? "Từ vựng"
                                  : "Dấu câu"}
                          </Text>
                        </View>
                        <Text style={styles.errorSeverity}>
                          {error.severity === "high"
                            ? "Nghiêm trọng"
                            : error.severity === "medium"
                              ? "Trung bình"
                              : "Nhẹ"}
                        </Text>
                      </View>

                      <View style={styles.errorContent}>
                        <Text style={styles.errorOriginal}>
                          Lỗi: <Text style={styles.errorHighlight}>{error.original}</Text>
                        </Text>
                        <Text style={styles.errorSuggestion}>
                          Sửa: <Text style={styles.suggestionHighlight}>{error.suggestion}</Text>
                        </Text>
                        <Text style={styles.errorExplanation}>{error.explanation}</Text>
                      </View>

                      <TouchableOpacity style={styles.applyButton} onPress={() => applyCorrection(error)}>
                        <Text style={styles.applyButtonText}>Áp dụng</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Suggestions */}
              <View style={styles.suggestionsSection}>
                <Text style={styles.sectionTitle}>Gợi ý cải thiện</Text>
                {analysis.suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Icon name="lightbulb" size={16} color="#F59E0B" />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )

  if (selectedPrompt) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedPrompt(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedPrompt.title}</Text>
          <TouchableOpacity onPress={submitWriting}>
            <Icon name="check" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.writingContainer}>
          {/* Prompt Display */}
          <View style={styles.promptDisplay}>
            {selectedPrompt.mediaUrl && selectedPrompt.type === "image" && (
              <Image source={{ uri: selectedPrompt.mediaUrl }} style={styles.promptDisplayImage} />
            )}

            <Text style={styles.promptDisplayTitle}>{selectedPrompt.title}</Text>
            <Text style={styles.promptDisplayDescription}>{selectedPrompt.description}</Text>

            <View style={styles.promptRequirements}>
              <Text style={styles.requirementText}>
                Yêu cầu: {selectedPrompt.minWords}-{selectedPrompt.maxWords} từ
              </Text>
              <Text style={styles.currentWordCount}>
                Hiện tại:{" "}
                {
                  userText
                    .trim()
                    .split(/\s+/)
                    .filter((word) => word.length > 0).length
                }{" "}
                từ
              </Text>
            </View>
          </View>

          {/* Writing Area */}
          <View style={styles.writingArea}>
            <Text style={styles.writingLabel}>Viết bài của bạn:</Text>
            <TextInput
              style={styles.writingInput}
              placeholder="Bắt đầu viết ở đây..."
              placeholderTextColor="#9CA3AF"
              value={userText}
              onChangeText={setUserText}
              multiline
              textAlignVertical="top"
            />

            {highlightedErrors.length > 0 && (
              <View style={styles.highlightedTextArea}>
                <Text style={styles.highlightedLabel}>Bài viết với lỗi được đánh dấu:</Text>
                {renderTextWithHighlights()}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={submitWriting}>
              <Icon name="spellcheck" size={20} color="#4F46E5" />
              <Text style={styles.actionButtonText}>Kiểm tra</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="save" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Lưu nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="refresh" size={20} color="#F59E0B" />
              <Text style={styles.actionButtonText}>Làm lại</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Error Detail Modal */}
        <Modal visible={!!selectedError} transparent animationType="fade">
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModal}>
              {selectedError && (
                <>
                  <Text style={styles.errorModalTitle}>Chi tiết lỗi</Text>
                  <Text style={styles.errorModalType}>
                    {selectedError.type === "grammar"
                      ? "Lỗi ngữ pháp"
                      : selectedError.type === "spelling"
                        ? "Lỗi chính tả"
                        : selectedError.type === "word-choice"
                          ? "Lựa chọn từ"
                          : "Dấu câu"}
                  </Text>
                  <Text style={styles.errorModalOriginal}>Lỗi: {selectedError.original}</Text>
                  <Text style={styles.errorModalSuggestion}>Sửa: {selectedError.suggestion}</Text>
                  <Text style={styles.errorModalExplanation}>{selectedError.explanation}</Text>

                  <View style={styles.errorModalActions}>
                    <TouchableOpacity style={styles.errorModalButton} onPress={() => setSelectedError(null)}>
                      <Text style={styles.errorModalButtonText}>Đóng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.errorModalButton, styles.errorModalApplyButton]}
                      onPress={() => applyCorrection(selectedError)}
                    >
                      <Text style={[styles.errorModalButtonText, styles.errorModalApplyButtonText]}>Áp dụng</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {renderAnalysisModal()}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Luyện viết</Text>
        <TouchableOpacity>
          <Icon name="history" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          <View style={styles.welcomeSection}>
            
            <Text style={styles.welcomeTitle}>Luyện kỹ năng viết</Text>
            <Text style={styles.welcomeText}>Chọn chủ đề và viết bài với AI kiểm tra ngữ pháp tự động</Text>
          </View>

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Chủ đề</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesList}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      currentCategory === category.id && styles.selectedCategoryItem,
                      { borderColor: category.color },
                    ]}
                    onPress={() => setCurrentCategory(category.id)}
                  >
                    <Icon
                      name={category.icon}
                      size={20}
                      color={currentCategory === category.id ? "#FFFFFF" : category.color}
                    />
                    <Text style={[styles.categoryText, currentCategory === category.id && styles.selectedCategoryText]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Writing Prompts */}
          <View style={styles.promptsSection}>
            <Text style={styles.sectionTitle}>Chọn đề bài</Text>
            {writingPrompts.filter((prompt) => prompt.category === currentCategory).map(renderPromptCard)}
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
  categoriesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  categoriesList: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  selectedCategoryItem: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  promptsSection: {
    marginBottom: 20,
  },
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promptImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  promptContent: {
    padding: 16,
  },
  promptHeader: {
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
  wordCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  promptDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  promptMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  promptType: {
    fontSize: 12,
    color: "#6B7280",
  },
  writingContainer: {
    flex: 1,
    padding: 20,
  },
  promptDisplay: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promptDisplayImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: "cover",
  },
  promptDisplayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  promptDisplayDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  promptRequirements: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  requirementText: {
    fontSize: 12,
    color: "#6B7280",
  },
  currentWordCount: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  writingArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  writingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  writingInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 200,
    textAlignVertical: "top",
  },
  highlightedTextArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  highlightedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  highlightedTextContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  writingText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  errorText: {
    textDecorationLine: "underline",
    textDecorationColor: "#EF4444",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 300,
  },
  errorModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  errorModalType: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  errorModalOriginal: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 8,
  },
  errorModalSuggestion: {
    fontSize: 14,
    color: "#10B981",
    marginBottom: 8,
  },
  errorModalExplanation: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 16,
  },
  errorModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  errorModalButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  errorModalApplyButton: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  errorModalButtonText: {
    fontSize: 14,
    color: "#374151",
  },
  errorModalApplyButtonText: {
    color: "#FFFFFF",
  },
  analysisContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  analysisHeader: {
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
  analysisTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  analysisContent: {
    flex: 1,
    padding: 20,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 16,
  },
  scoreBreakdown: {
    flexDirection: "row",
    gap: 24,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreItemLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  scoreItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  errorsSection: {
    marginBottom: 20,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  errorTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  errorTypeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  errorSeverity: {
    fontSize: 12,
    color: "#6B7280",
  },
  errorContent: {
    marginBottom: 12,
  },
  errorOriginal: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  errorHighlight: {
    backgroundColor: "#FEE2E2",
    color: "#EF4444",
  },
  errorSuggestion: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  suggestionHighlight: {
    backgroundColor: "#DCFCE7",
    color: "#10B981",
  },
  errorExplanation: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  applyButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  applyButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  suggestionsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
})

export default WritingScreen
