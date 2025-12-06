import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, StyleSheet
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { useLessons } from "../../hooks/useLessons";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { useUserStore } from "../../stores/UserStore";
import {
  LessonResponse, LessonQuestionResponse, LessonProgressRequest
} from "../../types/dto";
import { QuestionType } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { UniversalQuestionView } from "../../components/learn/SkillComponents";
import { LessonInputArea } from "../../components/learn/LessonInputArea";

const validateAnswer = (question: LessonQuestionResponse, answer: any): boolean => {
  if (!question.correctOption) return false;

  const normalize = (str: any) => String(str || "").trim().toLowerCase().replace(/\s+/g, ' ');
  const correctRaw = question.correctOption;
  const userRaw = answer;

  switch (question.questionType) {
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.TRUE_FALSE:
      const cleanCorrect = normalize(correctRaw).replace(/^option/, '');
      const cleanUser = normalize(userRaw).replace(/^option/, '');
      return cleanCorrect === cleanUser;

    case QuestionType.FILL_IN_THE_BLANK:
      const alternatives = correctRaw.split(/\|\|/).map(s => normalize(s));
      return alternatives.some(alt => alt === normalize(userRaw));

    case QuestionType.ORDERING:
      return normalize(correctRaw) === normalize(userRaw);

    case QuestionType.MATCHING:
      try {
        const correctObj = JSON.parse(correctRaw);
        const userObj = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;

        const keys = Object.keys(correctObj);
        if (keys.length !== Object.keys(userObj).length) return false;

        for (const key of keys) {
          if (normalize(correctObj[key]) !== normalize(userObj[key])) return false;
        }
        return true;
      } catch (e) {
        console.warn("Matching validation error", e);
        return false;
      }

    default:
      return normalize(correctRaw) === normalize(userRaw);
  }
};

const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useLessonTest, useUpdateProgress, useSubmitTest } = useLessons();
  const { useStreamPronunciation, useCheckWriting } = useSkillLessons();

  const updateProgressMutation = useUpdateProgress();
  const submitTestMutation = useSubmitTest();
  const checkWritingMutation = useCheckWriting();
  const streamPronunciationMutation = useStreamPronunciation();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const { data: testData, isLoading } = useLessonTest(lesson.lessonId, userId!, !!userId);
  const questions = (testData?.questions || []) as LessonQuestionResponse[];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion) return;
    setIsAnswered(true);
    setSelectedAnswer(answerValue);
    setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: answerValue }));

    if ([QuestionType.WRITING, QuestionType.ESSAY].includes(currentQuestion.questionType)) {
      setIsStreaming(true);
      try {
        const res = await checkWritingMutation.mutateAsync({
          text: answerValue, lessonQuestionId: currentQuestion.lessonQuestionId,
          languageCode: 'vi', duration: 0
        });
        setFeedbackMessage(`Score: ${res.score}. ${res.feedback}`);
        const passed = res.score >= 50;
        setIsCorrect(passed);
        if (passed) setCorrectCount(c => c + 1);
      } finally { setIsStreaming(false); }
      return;
    }

    const checkCorrect = validateAnswer(currentQuestion, answerValue);
    setIsCorrect(checkCorrect);
    if (checkCorrect) {
      setCorrectCount(c => c + 1);
      setFeedbackMessage(t("quiz.correct") || "Correct!");
    } else {
      setFeedbackMessage(`${t("quiz.incorrect") || "Incorrect"}. ${currentQuestion.explainAnswer || ""}`);
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      await submitTestMutation.mutateAsync({
        lessonId: lesson.lessonId, userId: userId!,
        body: { answers: userAnswers, attemptNumber: 1 }
      });
      Alert.alert("Completed", `Score: ${correctCount}/${questions.length}`, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } else {
      setCurrentQuestionIndex(i => i + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setFeedbackMessage(null);
      setIsCorrect(false);
    }
  };

  const handleStartRecording = async () => {
    try { setIsRecording(true); await recorder.record(); } catch (e) { console.error(e); }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const uri = recorder.uri;
    if (uri) {
      setIsStreaming(true);
      setIsAnswered(true);
      await streamPronunciationMutation.mutateAsync({
        audioUri: uri, lessonQuestionId: currentQuestion.lessonQuestionId, languageCode: 'vi',
        onChunk: (chunk) => {
          if (chunk.type === 'final') {
            const passed = (chunk.score || 0) > 70;
            setFeedbackMessage(`Score: ${chunk.score}`);
            setIsCorrect(passed);
            setIsStreaming(false);
            if (passed) setCorrectCount(c => c + 1);
          }
        }
      });
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} />;

  if (!questions || questions.length === 0) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lesson</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Icon name="library-books" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No questions found for this lesson.</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  if (!currentQuestion) return <ActivityIndicator style={styles.center} />;

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentQuestionIndex + 1}/{questions.length}</Text>
        <Text style={{ fontWeight: 'bold', color: '#10B981' }}>{correctCount} ✓</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <UniversalQuestionView question={currentQuestion} />

        <LessonInputArea
          question={currentQuestion}
          isAnswered={isAnswered}
          selectedAnswer={selectedAnswer}
          isLoading={isStreaming}
          onAnswer={handleSubmitAnswer}
          onSkip={handleNext}
          isRecording={isRecording}
          isStreaming={isStreaming}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />

        {feedbackMessage && (
          <View style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name={isCorrect ? "check-circle" : "cancel"} size={24} color={isCorrect ? "#10B981" : "#EF4444"} />
              <Text style={[styles.feedbackTitle, { color: isCorrect ? "#065F46" : "#991B1B" }]}>
                {isCorrect ? "Excellent!" : "Incorrect"}
              </Text>
            </View>
            <Text style={{ color: isCorrect ? "#065F46" : "#991B1B", fontSize: 15 }}>{feedbackMessage}</Text>
          </View>
        )}

        {isAnswered && (
          <TouchableOpacity
            style={[styles.nextBtn, isCorrect ? { backgroundColor: '#10B981' } : { backgroundColor: '#333' }]}
            onPress={handleNext}
          >
            <Text style={styles.btnText}>{isLastQuestion ? "Finish" : "Next"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  content: { padding: 20, paddingBottom: 40 },
  feedback: { padding: 16, borderRadius: 12, marginTop: 20, borderWidth: 1 },
  feedbackCorrect: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  feedbackWrong: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  feedbackTitle: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  nextBtn: { backgroundColor: '#333', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 20 }
});

export default LessonScreen;