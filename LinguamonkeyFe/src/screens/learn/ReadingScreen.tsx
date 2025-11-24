import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList, // Import FlatList
} from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createScaledSheet } from "../../utils/scaledStyles";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { ReadingResponse, ComprehensionQuestion, TranslationRequestBody, LessonResponse } from "../../types/dto"; // Import LessonResponse
import { useLessons } from "../../hooks/useLessons"; // Import useLessons
import { SkillType } from "../../types/enums"; // Import SkillType
import ScreenLayout from "../../components/layout/ScreenLayout";

// --- TYPE DỰA TRÊN API VÀ UI (KHÔNG MOCK DATA) ---
interface ReadingTextData {
  lessonId: string;
  title: string;
  content: string;
  languageCode: string;
  sentences: string[];
  vocabulary: string[];
  level: string;
  category: string;
}

// Type cho trạng thái dịch
interface TranslationResult {
  original: string;
  translated: string;
  isCorrect: boolean;
  suggestion?: string;
}

const ReadingScreen = ({ navigation }: any) => { // Thêm kiểu cho navigation
  const { t } = useTranslation()
  const { mutateAsync: generateReading, isPending: isGeneratingReading } = useSkillLessons().useGenerateReading();
  const { mutateAsync: checkTranslation, isPending: isCheckingTranslation } = useSkillLessons().useCheckTranslation();
  const { useAllLessons, useLesson } = useLessons(); // Sử dụng useAllLessons

  const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null);
  const [selectedTextData, setSelectedTextData] = useState<ReadingTextData | null>(null)
  const [currentMode, setCurrentMode] = useState<"read" | "translate" | "quiz">("read")
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null)
  const [translations, setTranslations] = useState<TranslationResult[]>([])
  const [userTranslation, setUserTranslation] = useState("")

  // DTO chuẩn
  const [currentQuiz, setCurrentQuiz] = useState<ComprehensionQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizScore, setQuizScore] = useState(0)
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [readingData, setReadingData] = useState<ReadingResponse | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current

  // --- HOOK: Lấy danh sách bài đọc ---
  const {
    data: readingLessonsData,
    isLoading: isLoadingLessonsList,
  } = useAllLessons({
    skillType: SkillType.READING,
    page: 0,
    size: 20,
  });

  // --- HOOK: Lấy nội dung chi tiết bài học nếu đã chọn lessonId (Nếu API hỗ trợ) ---
  // Giả sử nếu bạn chọn Lesson, bạn cần fetch chi tiết nội dung (passage, questions)
  const { data: lessonDetail, isLoading: isLoadingLessonDetail } = useLesson(selectedLesson?.lessonId || null);

  // --- EFFECTS ---
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  useEffect(() => {
    if (lessonDetail) {
      // Giả định: lessonDetail chứa đủ thông tin để tạo ReadingTextData và Quiz
      // Nếu API lessonDetail không trả về passage/questions trực tiếp, cần điều chỉnh hoặc sử dụng API khác.
      // Hiện tại, chúng ta mô phỏng việc trích xuất từ lessonDetail:

      // Tách title thành content (Mô phỏng: nếu không có API passage, dùng title)
      const passage = lessonDetail.title || t("reading.noPassageFound");
      const sentences = passage.match(/[^.!?]+[.!?]/g) || [passage];

      // Nếu API có endpoint lấy ReadingContent từ lessonId, bạn sẽ gọi nó ở đây.
      // Vì không có API đó, ta giả sử Question API là nguồn cho quiz.

      // Tạm thời set data với thông tin có sẵn
      setSelectedTextData({
        lessonId: lessonDetail.lessonId,
        languageCode: lessonDetail.languageCode || 'EN',
        title: lessonDetail.title,
        content: passage,
        sentences: sentences,
        vocabulary: ["word", "phrase", "test"], // Chỉ là dữ liệu giả cho UI
        level: lessonDetail.difficultyLevel || "beginner",
        category: lessonDetail.certificateCode || "General" // Giả sử DTO lesson có tên category
      });

      // Cần thêm logic fetch questions hoặc mock data quiz nếu lessonDetail không có
      setReadingData({ passage: passage, questions: currentQuiz } as ReadingResponse); // Cần Question API

      setTranslations(new Array(sentences.length).fill(null));
    }
  }, [lessonDetail]);

  const readingLessons: LessonResponse[] = (readingLessonsData?.data || []) as LessonResponse[];

  const handleSelectLesson = (lesson: LessonResponse) => {
    setSelectedLesson(lesson);
    setSelectedTextData(null); // Reset nội dung cũ
  };

  // GIỮ LẠI loadSampleContent CHO CHỨC NĂNG TẠO NỘI DUNG NGẪU NHIÊN
  const loadSampleContent = async () => {
    // ... (Giữ nguyên logic tạo nội dung mẫu)
    const MOCK_LESSON_ID = "GEN_R0001"; // Dùng ID khác để phân biệt nội dung tạo mẫu
    const MOCK_LANG_CODE = "EN";
    const MOCK_TITLE = t("reading.generatedContentTitle") ?? "Generated Practice Text";

    setSelectedTextData(null);
    setReadingData(null);
    setCurrentMode('read');
    setSelectedLesson(null); // Bỏ chọn bài học nếu đang tạo mẫu

    try {
      const result = await generateReading({
        lessonId: MOCK_LESSON_ID,
        languageCode: MOCK_LANG_CODE
      });

      const passage = result.passage || t("reading.noPassageFound");

      const sentences = passage.match(/[^.!?]+[.!?]/g) || [passage];

      setSelectedTextData({
        lessonId: MOCK_LESSON_ID,
        languageCode: MOCK_LANG_CODE,
        title: MOCK_TITLE,
        content: passage,
        sentences: sentences,
        vocabulary: ["word", "phrase", "test"],
        level: "intermediate", category: "generated"
      });

      setCurrentQuiz(result.questions || []);
      setReadingData(result);
      setTranslations(new Array(sentences.length).fill(null));

    } catch (error) {
      Alert.alert(t("reading.errorLoadingContent") ?? "Lỗi tải nội dung", t("errors.api") ?? "Không thể tải bài đọc từ API.");
      setSelectedTextData(null);
    }
  }

  // Giữ nguyên các hàm submitTranslation, startQuiz, submitQuizAnswer, getLevelColor

  const submitTranslation = async () => {
    // ... (Giữ nguyên)
    if (!selectedTextData || selectedSentenceIndex === null || !userTranslation.trim()) {
      Alert.alert(t("common.error"), t("translation.errorNoInput") ?? "Vui lòng nhập bản dịch");
      return
    }
    if (!readingData) return;

    const sentence = selectedTextData.sentences[selectedSentenceIndex]

    try {
      const apiResult = await checkTranslation({
        lessonId: selectedTextData.lessonId,
        req: {
          translatedText: userTranslation.trim(),
          targetLanguage: selectedTextData.languageCode,
        } as TranslationRequestBody,
      });

      const result: TranslationResult = {
        original: sentence,
        translated: userTranslation.trim(),
        isCorrect: apiResult.score > 80,
        suggestion: apiResult.score <= 80 ? apiResult.feedback : undefined,
      };

      setTranslations((prev) => {
        const newTranslations = [...prev]
        newTranslations[selectedSentenceIndex] = result
        return newTranslations
      })

      setUserTranslation("")

    } catch (error) {
      Alert.alert(t("common.error"), t("translation.errorCheckFailed") ?? "Không thể kiểm tra bản dịch.");
    }
  }

  const startQuiz = () => {
    // ... (Giữ nguyên)
    if (!readingData || currentQuiz.length === 0) {
      Alert.alert(t("quiz.errorTitle") ?? "Lỗi Quiz", t("quiz.errorNoQuestions") ?? "Bài đọc chưa có bộ câu hỏi nào.");
      return;
    }

    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setQuizScore(0)
    setCurrentMode("quiz")
    setShowQuizResult(false);
  }

  const submitQuizAnswer = () => {
    // ... (Giữ nguyên)
    if (selectedAnswer === null) return Alert.alert(t("common.error"), t("quiz.selectAnswerRequired") ?? "Vui lòng chọn câu trả lời");

    const currentQuestion = currentQuiz[currentQuestionIndex]

    const selectedOptionText = currentQuestion.options[selectedAnswer];
    const isCorrect = selectedOptionText === currentQuestion.correctAnswer;

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

  const renderReadingMode = () => (
    // ... (Giữ nguyên)
    <ScrollView style={styles.readingContent}>
      <Text style={styles.readingTitle}>{selectedTextData?.title}</Text>
      <Text style={styles.readingText}>{readingData?.passage || selectedTextData?.content}</Text>

      {selectedTextData?.vocabulary && (
        <View style={styles.vocabularySection}>
          <Text style={styles.vocabularyTitle}>{t("reading.vocabularyTitle") ?? "Từ vựng quan trọng"}</Text>
          <View style={styles.vocabularyList}>
            {selectedTextData.vocabulary.map((word, index) => (
              <View key={index} style={styles.vocabularyItem}>
                <Text style={styles.vocabularyWord}>{word}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.modeActions}>
        <TouchableOpacity style={styles.modeButton} onPress={() => setCurrentMode("translate")}>
          <Icon name="translate" size={20} color="#4F46E5" />
          <Text style={styles.modeButtonText}>{t("reading.modeTranslate") ?? "Dịch từng câu"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeButton} onPress={startQuiz} disabled={isGeneratingReading || currentQuiz.length === 0}>
          <Icon name="quiz" size={20} color={currentQuiz.length === 0 ? "#9CA3AF" : "#10B981"} />
          <Text style={styles.modeButtonText}>{t("reading.modeQuiz") ?? "Làm bài quiz"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderTranslationMode = () => (
    // ... (Giữ nguyên)
    <ScrollView style={styles.translationContent}>
      <Text style={styles.translationTitle}>{t("translation.title") ?? "Dịch từng câu"}</Text>
      <Text style={styles.translationInstruction}>{t("translation.instruction") ?? "Chọn câu và nhập bản dịch của bạn"}</Text>

      <View style={styles.sentencesList}>
        {selectedTextData?.sentences.map((sentence, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sentenceItem,
              selectedSentenceIndex === index && styles.selectedSentenceItem,
              translations[index]?.isCorrect && styles.translatedSentenceItem,
            ]}
            onPress={() => setSelectedSentenceIndex(index)}
          >
            <View style={styles.sentenceHeader}>
              <Text style={styles.sentenceNumber}>{t("common.sentence")} {index + 1}</Text>
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
                <Text style={styles.userTranslationText}>{t("translation.yourTranslation")}: {translations[index].translated}</Text>
                {translations[index].suggestion && (
                  <Text style={styles.suggestionText}>{translations[index].suggestion}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedSentenceIndex !== null && (
        <View style={styles.translationInput}>
          <Text style={styles.inputLabel}>{t("translation.translateSentence", { index: selectedSentenceIndex + 1 })}:</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("translation.inputPlaceholder") ?? "Nhập bản dịch của bạn..."}
            placeholderTextColor="#9CA3AF"
            value={userTranslation}
            onChangeText={setUserTranslation}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.submitButton} onPress={submitTranslation} disabled={isCheckingTranslation || !userTranslation.trim()}>
            {isCheckingTranslation ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t("common.check") ?? "Kiểm tra"}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )

  const renderQuizMode = () => {
    // ... (Giữ nguyên)
    if (showQuizResult) {
      return (
        <View style={styles.quizResultContainer}>
          <Icon name="check-circle" size={64} color="#10B981" />
          <Text style={styles.quizResultTitle}>{t("quiz.completeTitle") ?? "Hoàn thành bài quiz!"}</Text>
          <Text style={styles.quizResultScore}>
            {t("quiz.score") ?? "Điểm số"}: {quizScore}/{currentQuiz.length}
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
              <Text style={styles.resultButtonText}>{t("quiz.backToReading") ?? "Quay lại đọc"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resultButton} onPress={startQuiz}>
              <Text style={styles.resultButtonText}>{t("quiz.retake") ?? "Làm lại"}</Text>
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
            {t("quiz.question")} {currentQuestionIndex + 1}/{currentQuiz.length}
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
              {currentQuestionIndex < currentQuiz.length - 1 ? t("common.nextQuestion") : t("common.finish")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  const renderLessonListItem = ({ item: lesson }: { item: LessonResponse }) => (
    <TouchableOpacity
      key={lesson.lessonId}
      style={localStyles.lessonListItem}
      onPress={() => handleSelectLesson(lesson)}
    >
      <Icon name="menu-book" size={24} color="#4F46E5" />
      <View style={localStyles.lessonInfo}>
        <Text style={localStyles.lessonTitle} numberOfLines={2}>
          {lesson.lessonName || lesson.title || t('common.untitled')}
        </Text>
        <Text style={localStyles.lessonExp}>{lesson.expReward || 10} XP</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#6B7280" />
    </TouchableOpacity>
  );

  // --- RENDER LOGIC: LESSON DETAIL ---
  if (selectedTextData) {
    return (
      <View style={styles.container}>
        {isGeneratingReading && (
          <View style={styles.overlayLoading}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>{t("common.loadingReading") ?? "Đang tải bài đọc..."}</Text>
          </View>
        )}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTextData(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedTextData.title}</Text>
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
              onPress={startQuiz}
              disabled={isGeneratingReading || currentQuiz.length === 0}
            >
              <Icon name="quiz" size={16} color={currentMode === "quiz" || currentQuiz.length > 0 ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        {currentMode === "read" && readingData && renderReadingMode()}
        {currentMode === "translate" && readingData && renderTranslationMode()}
        {currentMode === "quiz" && readingData && renderQuizMode()}
      </View>
    )
  }

  // --- RENDER LOGIC: LESSON LIST / GENERATE ---
  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("reading.screenTitle") ?? "Luyện đọc"}</Text>
        <TouchableOpacity>
          <Icon name="search" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          <View style={styles.welcomeSection}>
            <Icon name="book" size={64} color="#4F46E5" />
            <Text style={styles.welcomeTitle}>{t("reading.welcomeTitle") ?? "Luyện kỹ năng đọc"}</Text>
            <Text style={styles.welcomeText}>{t("reading.welcomeText") ?? "Đọc hiểu, dịch thuật và làm bài quiz để nâng cao khả năng đọc"}</Text>
          </View>

          <View style={styles.textsSection}>
            <Text style={styles.sectionTitle}>
              {readingLessons.length > 0 ? (t("reading.availableLessons") ?? "Bài học có sẵn") : (t("reading.generateSample") ?? "Tạo Bài Đọc Mẫu")}
            </Text>

            {isLoadingLessonsList ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : readingLessons.length > 0 ? (
              <FlatList<LessonResponse>
                data={readingLessons}
                keyExtractor={(item) => item.lessonId}
                renderItem={renderLessonListItem}
                scrollEnabled={false}
                contentContainerStyle={localStyles.lessonsListContainer}
              />
            ) : (
              // Nếu không có bài học nào, hiển thị nút tạo mẫu
              <TouchableOpacity
                style={styles.generateButton}
                onPress={loadSampleContent}
                disabled={isGeneratingReading}
              >
                {isGeneratingReading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="auto-fix-high" size={24} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>{t("reading.generateButton") ?? "Tạo Bài Đọc Mẫu"}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  )
}

// Thêm localStyles cho ReadingScreen
const localStyles = createScaledSheet({
  lessonsListContainer: {
    paddingBottom: 20,
  },
  lessonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  lessonExp: {
    fontSize: 12,
    color: '#6B7280',
  },
});

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
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  generateButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
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
    paddingBottom: 20,
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
  overlayLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  }
})

export default ReadingScreen