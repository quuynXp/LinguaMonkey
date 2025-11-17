import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useTranslation } from "react-i18next";
import {
  useAvailableTests,
  useStartTest,
  useSubmitTest,
} from "../../hooks/useTesting";
import { useUserStore } from "../../stores/UserStore"; // Import UserStore
import { gotoTab } from "../../utils/navigationRef"; // Import gotoTab
import { Language, languageToCountry } from "../../types/api";
import CountryFlag from "react-native-country-flag"; // Đảm bảo import đúng file bạn đã cung cấp

// Giả định các kiểu dữ liệu
type TestConfig = {
  testConfigId: string;
  title: string;
  description: string;
};
type TestQuestion = {
  questionId: string;
  questionText: string;
  options: string[];
};
type TestResult = {
  score: number;
  totalQuestions: number;
  percentage: number;
  proficiencyEstimate: string;
  questions: (TestQuestion & { explanation: string; userAnswerIndex: number; correctAnswerIndex: number; isCorrect: boolean })[];
};

type Stage = "selection" | "testing" | "submitting" | "results";

const ProficiencyTestScreen = () => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("selection");
  const [currentTest, setCurrentTest] = useState<TestConfig | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TestResult | null>(null);

  // === 1. Lấy ngôn ngữ target từ UserStore ===
  const targetLanguages = useUserStore(s => s.user?.languages ?? []);

  // (Giả sử bạn có 1 map hoặc fetch từ /api/v1/languages)
  const allLanguages: Record<string, { name: string, iso: string }> = {
    'en': { name: 'English', iso: 'US' },
    'vi': { name: 'Tiếng Việt', iso: 'VN' },
    'zh': { name: '中文', iso: 'CN' },
    'jp': { name: '日本語', iso: 'JP' },
    'fr': { name: 'Français', iso: 'FR' },
    // ... Thêm các ngôn ngữ khác bạn hỗ trợ
  };

  const userTargetLanguages = useMemo(() => {
    return targetLanguages
      .map(code => ({
        code: code,
        name: allLanguages[code]?.name ?? code.toUpperCase(),
        iso: allLanguages[code]?.iso ?? languageToCountry[code as Language] ?? code.toUpperCase().slice(0, 2)
      }))
      .filter(lang => lang.name);
  }, [targetLanguages]);

  // === 2. State cho ngôn ngữ đang được chọn ===
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string | null>(
    userTargetLanguages.length > 0 ? userTargetLanguages[0].code : null
  );

  const { data: availableTests, isLoading: isLoadingTests, isError } = useAvailableTests({
    languageCode: selectedLanguageCode,
  });

  const { startTest, isStarting } = useStartTest();
  const { submitTest, isSubmitting } = useSubmitTest();

  const handleContinueToApp = () => {
    gotoTab("Home");
  };


  const handleSelectTest = async (testConfig: TestConfig) => {
    try {
      setCurrentTest(testConfig);
      const response = await startTest(testConfig.testConfigId);
      if (response && response.questions) {
        setSessionId(response.sessionId);
        setQuestions(response.questions);
        setAnswers({});
        setCurrentQuestionIdx(0);
        setStage("testing");
      } else {
        Alert.alert(t("error.title"), t("error.startTestFailed", "Không thể bắt đầu bài test."));
      }
    } catch (e: any) {
      console.error("Failed to start test", e);
      Alert.alert(t("error.title"), e.message || t("error.startTestFailed", "Không thể bắt đầu bài test."));
    }
  };

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
    }
  };

  const handleSubmitTest = async () => {
    if (!sessionId) return;
    setStage("submitting");
    try {
      const resultData = await submitTest(sessionId, answers);
      setResult(resultData);
      setStage("results");
    } catch (e: any) {
      console.error("Failed to submit test", e);
      Alert.alert(t("error.title"), e.message || t("error.submitTestFailed", "Nộp bài thất bại."));
      setStage("testing");
    }
  };


  if (isStarting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t("proficiencyTest.loadingTest", "Đang tải bài test...")}</Text>
      </View>
    );
  }

  const renderSelectionStage = () => {
    if (userTargetLanguages.length === 0) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{t("proficiencyTest.noLanguageTitle", "Bạn chưa chọn ngôn ngữ")}</Text>
          <Text style={styles.description}>
            {t("proficiencyTest.noLanguageDesc", "Vui lòng quay lại và chọn ít nhất một ngôn ngữ để học.")}
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleContinueToApp}>
            <Text style={styles.submitButtonText}>{t("common.continueToApp", "Tiếp Tục Vào App")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("proficiencyTest.title", "Kiểm Tra Trình Độ")}</Text>
        <Text style={styles.description}>
          {t("proficiencyTest.description", "Hãy chọn ngôn ngữ bạn muốn kiểm tra. Việc này giúp chúng tôi cá nhân hóa lộ trình học cho bạn.")}
        </Text>

        <View style={styles.languageSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
            {userTargetLanguages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langChip,
                  selectedLanguageCode === lang.code && styles.langChipSelected
                ]}
                onPress={() => setSelectedLanguageCode(lang.code)}
              >
                <CountryFlag isoCode={lang.iso} size={18} style={styles.flag} />
                <Text style={[styles.langText, selectedLanguageCode === lang.code && styles.langTextSelected]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.divider} />

        {/* === VÙNG HIỂN THỊ TEST === */}
        <ScrollView style={styles.testList}>
          {/* 1. Đang tải */}
          {isLoadingTests && (
            <ActivityIndicator size="large" color="#4F46E5" style={styles.loadingIndicator} />
          )}

          {/* 2. Không có test */}
          {!isLoadingTests && !isError && availableTests?.length === 0 && (
            <View style={styles.noTestsContainer}>
              <Text style={styles.noTestsText}>
                {t("proficiencyTest.noTestsAvailable", "Hiện chưa có bài test nào cho ngôn ngữ này. Vui lòng thử lại sau.")}
              </Text>
            </View>
          )}

          {/* 3. Lỗi API */}
          {!isLoadingTests && isError && (
            <View style={styles.noTestsContainer}>
              <Text style={styles.noTestsText}>
                {t("errors.loadTestsFailed", "Đã xảy ra lỗi khi tải bài test. Vui lòng kiểm tra kết nối.")}
              </Text>
            </View>
          )}

          {/* 4. Có test */}
          {!isLoadingTests && !isError && availableTests && availableTests.map(test => (
            <TouchableOpacity
              key={test.testConfigId}
              onPress={() => handleSelectTest(test)}
              style={styles.testCard}
            >
              <Text style={styles.testTitle}>{test.title}</Text>
              <Text style={styles.testDescription}>{test.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* === NÚT BỎ QUA === */}
        <TouchableOpacity style={styles.skipButton} onPress={handleContinueToApp}>
          <Text style={styles.skipButtonText}>{t("common.skip", "Bỏ qua")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderTestingStage = () => {
    if (questions.length === 0) {
      return (
        <View style={styles.container}>
          <Text style={styles.noTestsText}>{t("error.noQuestions", "Bài test này không có câu hỏi.")}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={() => setStage("selection")}>
            <Text style={styles.skipButtonText}>{t("common.back", "Quay lại")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const q = questions[currentQuestionIdx];
    const progressPercent = ((currentQuestionIdx + 1) / questions.length) * 100;

    return (
      <View style={styles.container}>
        {/* (Bạn có thể thêm Timer ở đây) */}

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>

        <Text style={styles.questionProgress}>
          {t("proficiencyTest.questionProgress", `Câu ${currentQuestionIdx + 1}/${questions.length}`)}
        </Text>

        <ScrollView>
          <Text style={styles.questionText}>{q.questionText}</Text>
          {q.options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleAnswer(q.questionId, idx)}
              style={[
                styles.option,
                answers[q.questionId] === idx && styles.selectedOption
              ]}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {Object.keys(answers).length === questions.length && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTest}>
            <Text style={styles.submitButtonText}>{t("proficiencyTest.completeTest", "Hoàn thành bài Test")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // === 7. Giai đoạn 3: Đang nộp bài ===
  const renderSubmittingStage = () => {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t("proficiencyTest.submitting", "Đang nộp bài...")}</Text>
      </View>
    );
  }

  // === 8. Giai đoạn 4: Kết quả ===
  const renderResultsStage = () => {
    if (!result) return <View />; // Không bao giờ xảy ra nếu logic đúng

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("proficiencyTest.results.title", "Kết Quả Test")}</Text>
        <Text style={styles.resultProficiency}>Trình độ: {result.proficiencyEstimate}</Text>
        <Text style={styles.resultScore}>
          Điểm: {result.score} / {result.totalQuestions} ({result.percentage.toFixed(1)}%)
        </Text>

        <ScrollView>
          {/* Bạn có thể .map() qua result.questions để render giải thích chi tiết */}
          {result.questions.map((q, index) => (
            <View key={q.questionId} style={[
              styles.resultQuestionCard,
              q.isCorrect ? styles.resultCorrect : styles.resultIncorrect
            ]}>
              <Text style={styles.resultQuestionText}>{index + 1}. {q.questionText}</Text>
              <Text style={styles.resultAnswerText}>
                {t("proficiencyTest.results.yourAnswer", "Bạn chọn")}: {q.options[q.userAnswerIndex ?? -1] ?? t("common.none", "Không chọn")}
              </Text>
              {!q.isCorrect && (
                <Text style={styles.resultAnswerText}>
                  {t("proficiencyTest.results.correctAnswer", "Đáp án đúng")}: {q.options[q.correctAnswerIndex]}
                </Text>
              )}
              <Text style={styles.resultExplanation}>{q.explanation}</Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.submitButton} onPress={handleContinueToApp}>
          <Text style={styles.submitButtonText}>{t("common.continueToApp", "Tiếp Tục Vào App")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === Main Render ===
  if (stage === "selection") return renderSelectionStage();
  if (stage === "testing") return renderTestingStage();
  if (stage === "submitting") return renderSubmittingStage();
  if (stage === "results") return renderResultsStage();

  return <View style={styles.container}><Text>Đã xảy ra lỗi.</Text></View>;
};

// === PHẦN SỬA STYLE ===
// Đã đổi tất cả '12@s' thành 12 (dạng số)
const styles = createScaledSheet({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: 'center', // Center loading text by default
  },
  loadingText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  languageSelector: {
    marginBottom: 16,
  },
  langScroll: {
    paddingVertical: 4,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  langChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  flag: {
    marginRight: 8,
    borderRadius: 4,
  },
  langText: {
    fontSize: 14,
    color: '#374151',
  },
  langTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  testList: {
    flex: 1, // Allows this part to scroll independently
  },
  loadingIndicator: {
    marginTop: 40,
  },
  noTestsContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  noTestsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6', // Lighter grey
  },
  skipButtonText: {
    fontSize: 16,
    color: '#4B5563', // Darker grey text
    fontWeight: '600',
    textAlign: 'center',
  },

  // Styles cho màn hình làm bài
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  questionProgress: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  option: {
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Styles cho màn hình kết quả
  resultProficiency: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10B981', // Màu xanh
    textAlign: 'center',
    marginVertical: 16,
  },
  resultScore: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
  },
  resultQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  resultCorrect: {
    borderColor: '#D1FAE5', // Green border
    backgroundColor: '#F0FDF4', // Light green bg
  },
  resultIncorrect: {
    borderColor: '#FEE2E2', // Red border
    backgroundColor: '#FEF2F2', // Light red bg
  },
  resultQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  resultAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  resultExplanation: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
});

export default ProficiencyTestScreen;