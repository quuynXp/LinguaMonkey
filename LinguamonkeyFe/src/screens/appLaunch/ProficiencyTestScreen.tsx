import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useTranslation } from "react-i18next";
import {
  useAvailableTests, // Đổi tên hook này thành useAvailableTests
  useStartTest,
  useSubmitTest,
} from "../../hooks/useTesting"; // Đảm bảo import đúng file bạn đã cung cấp

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

  // 1. Lấy danh sách các bài test có sẵn
  const { data: availableTests, isLoading: isLoadingTests } = useAvailableTests({
    languageCode: "en", // Hoặc lấy từ state
  });

  // 2. Hook để bắt đầu test
  const { startTest, isStarting } = useStartTest();

  // 3. Hook để nộp bài
  const { submitTest, isSubmitting } = useSubmitTest();

  const handleSelectTest = async (testConfig: TestConfig) => {
    try {
      setCurrentTest(testConfig);
      // Gọi API /start
      const response = await startTest(testConfig.testConfigId);
      if (response) {
        setSessionId(response.sessionId);
        setQuestions(response.questions); // Backend chỉ trả về câu hỏi
        setAnswers({});
        setCurrentQuestionIdx(0);
        setStage("testing");
      }
    } catch (e) {
      console.error("Failed to start test", e);
    }
  };

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    // Tự động chuyển câu
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
    }
  };

  const handleSubmitTest = async () => {
    if (!sessionId) return;
    setStage("submitting");
    try {
      // Gọi API /submit
      const resultData = await submitTest(sessionId, answers);
      setResult(resultData);
      setStage("results");
    } catch (e) {
      console.error("Failed to submit test", e);
      setStage("testing"); // Quay lại nếu lỗi
    }
  };

  // --- RENDER ---

  if (isLoadingTests || isStarting) {
    return <ActivityIndicator size="large" style={styles.container} />;
  }

  // Giai đoạn 1: Chọn bài test
  if (stage === "selection") {
    return (
      <View style={styles.container}>
        <Text>{t("proficiencyTest.selectTest")}</Text>
        <ScrollView>
          {availableTests?.map(test => (
            <TouchableOpacity key={test.testConfigId} onPress={() => handleSelectTest(test)}>
              <Text>{test.title}</Text>
              <Text>{test.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Giai đoạn 2: Làm bài test
  if (stage === "testing" && questions.length > 0) {
    const q = questions[currentQuestionIdx];
    return (
      <View style={styles.container}>
        <Text>
          {t("proficiencyTest.questionProgress", { current: currentQuestionIdx + 1, total: questions.length })}
        </Text>
        <ScrollView>
          <Text>{q.questionText}</Text>
          {q.options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleAnswer(q.questionId, idx)}
              style={answers[q.questionId] === idx ? styles.selectedOption : styles.option}
            >
              <Text>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {Object.keys(answers).length === questions.length && (
          <TouchableOpacity onPress={handleSubmitTest}>
            <Text>{t("proficiencyTest.completeTest")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Giai đoạn 3: Đang nộp bài
  if (stage === "submitting") {
    return <ActivityIndicator size="large" style={styles.container} />;
  }

  // Giai đoạn 4: Kết quả
  if (stage === "results" && result) {
    return (
      <View style={styles.container}>
        <Text>{t("proficiencyTest.results.title")}</Text>
        <Text>Trình độ: {result.proficiencyEstimate}</Text>
        <Text>Điểm: {result.score} / {result.totalQuestions} ({result.percentage.toFixed(1)}%)</Text>
        <ScrollView>
          {/* (Render chi tiết giải thích từng câu ở đây) */}
        </ScrollView>
      </View>
    );
  }

  return <View style={styles.container}><Text>Đã xảy ra lỗi.</Text></View>;
};

const styles = createScaledSheet({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  option: { padding: 10, marginVertical: 5, borderWidth: 1, borderColor: "#ccc" },
  selectedOption: { padding: 10, marginVertical: 5, borderWidth: 2, borderColor: "blue" },
});

export default ProficiencyTestScreen;