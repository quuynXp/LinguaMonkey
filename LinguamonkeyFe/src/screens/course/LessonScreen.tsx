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
        if (res.score >= 50) setCorrectCount(c => c + 1);
      } finally { setIsStreaming(false); }
      return;
    }

    const isCorrect = validateAnswer(currentQuestion, answerValue);
    if (isCorrect) {
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
            setFeedbackMessage(`Score: ${chunk.score}`);
            setIsStreaming(false);
            if ((chunk.score || 0) > 70) setCorrectCount(c => c + 1);
          }
        }
      });
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} />;
  if (!currentQuestion) return <Text style={styles.center}>No questions found.</Text>;

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="close" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{currentQuestionIndex + 1}/{questions.length}</Text>
        <Text style={{ fontWeight: 'bold', color: 'green' }}>{correctCount} ✓</Text>
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
          <View style={[styles.feedback, { backgroundColor: feedbackMessage.includes("Correct") ? "#D1FAE5" : "#FEE2E2" }]}>
            <Text>{feedbackMessage}</Text>
          </View>
        )}

        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{isLastQuestion ? "Finish" : "Next"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  feedback: { padding: 15, borderRadius: 8, marginTop: 15 },
  nextBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }
});

export default LessonScreen;