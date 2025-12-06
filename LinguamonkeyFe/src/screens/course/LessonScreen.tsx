import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Modal, SafeAreaView, Dimensions, Alert
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { useLessons } from "../../hooks/useLessons";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { useUserStore } from "../../stores/UserStore";
import { LessonResponse, LessonQuestionResponse } from "../../types/dto";
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
      return normalize(correctRaw).replace(/^option/, '') === normalize(userRaw).replace(/^option/, '');
    case QuestionType.FILL_IN_THE_BLANK:
      return correctRaw.split(/\|\|/).map(s => normalize(s)).some(alt => alt === normalize(userRaw));
    case QuestionType.ORDERING:
      return normalize(correctRaw) === normalize(userRaw);
    case QuestionType.MATCHING:
      try {
        const correctObj = JSON.parse(correctRaw);
        const userObj = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
        const keys = Object.keys(correctObj);
        if (keys.length !== Object.keys(userObj).length) return false;
        return keys.every(key => normalize(correctObj[key]) === normalize(userObj[key]));
      } catch (e) { return false; }
    default:
      return normalize(correctRaw) === normalize(userRaw);
  }
};

const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useLessonTest, useSubmitTest } = useLessons();
  const { useStreamPronunciation, useCheckWriting } = useSkillLessons();

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
  const [reviewMode, setReviewMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { data: testData, isLoading } = useLessonTest(lesson.lessonId, userId!, !!userId);
  const questions = (testData?.questions || []) as LessonQuestionResponse[];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion || isProcessingAI) return;

    setSelectedAnswer(answerValue);
    setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: answerValue }));

    // AI Check Logic - Block UI immediately
    if ([QuestionType.WRITING, QuestionType.ESSAY].includes(currentQuestion.questionType)) {
      setIsProcessingAI(true);
      setIsAnswered(true);
      try {
        const res = await checkWritingMutation.mutateAsync({
          text: answerValue,
          lessonQuestionId: currentQuestion.lessonQuestionId,
          languageCode: 'vi',
          duration: 0
        });
        setAiAnalysisResult(res);
        setFeedbackMessage(res.feedback);
        const passed = res.score >= 50;
        setIsCorrect(passed);
        if (passed) setCorrectCount(c => c + 1);
      } catch (e) {
        setFeedbackMessage("Lỗi kết nối AI. Vui lòng thử lại.");
        setIsCorrect(false);
      } finally {
        setIsProcessingAI(false);
      }
      return;
    }

    // Normal Logic
    setIsAnswered(true);
    const checkCorrect = validateAnswer(currentQuestion, answerValue);
    setIsCorrect(checkCorrect);
    setFeedbackMessage(checkCorrect ? "Correct!" : "Incorrect");
    if (checkCorrect) setCorrectCount(c => c + 1);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Final submission of the whole lesson (mostly for record keeping if individual APIs were called)
      await submitTestMutation.mutateAsync({
        lessonId: lesson.lessonId, userId: userId!,
        body: { answers: userAnswers, attemptNumber: 1 }
      });
      setShowSummary(true);
    } else {
      setCurrentQuestionIndex(i => i + 1);
      resetQuestionState();
    }
  };

  const resetQuestionState = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    setFeedbackMessage(null);
    setIsCorrect(false);
    setAiAnalysisResult(null);
    setReviewMode(false);
    setIsProcessingAI(false);
  };

  const handleStartRecording = async () => {
    try { setIsRecording(true); await recorder.record(); } catch (e) { console.error(e); }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const uri = recorder.uri;
    if (uri) {
      setIsProcessingAI(true);
      setIsAnswered(true);
      await streamPronunciationMutation.mutateAsync({
        audioUri: uri, lessonQuestionId: currentQuestion.lessonQuestionId, languageCode: 'vi',
        onChunk: (chunk) => {
          if (chunk.type === 'final') {
            const passed = (chunk.score || 0) > 60;
            setAiAnalysisResult(chunk);
            setFeedbackMessage(chunk.feedback || `Score: ${chunk.score}`);
            setIsCorrect(passed);
            setIsProcessingAI(false);
            if (passed) setCorrectCount(c => c + 1);
            setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: "Audio Recorded" }));
          }
        }
      });
    }
  };

  const handleReviewQuestion = (index: number) => {
    setShowSummary(false);
    setReviewMode(true);
    setCurrentQuestionIndex(index);
    const question = questions[index];
    const pastAnswer = userAnswers[question.lessonQuestionId];
    setIsAnswered(true);
    setSelectedAnswer(pastAnswer);
    if ([QuestionType.WRITING, QuestionType.ESSAY, QuestionType.SPEAKING].includes(question.questionType)) {
      setIsCorrect(true);
      setFeedbackMessage("Review mode: Answer submitted.");
    } else {
      const checkCorrect = validateAnswer(question, pastAnswer);
      setIsCorrect(checkCorrect);
      setFeedbackMessage(checkCorrect ? "Correct" : "Incorrect");
    }
  };

  const handleRetake = () => {
    setShowSummary(false);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setUserAnswers({});
    resetQuestionState();
  };

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;
  if (!questions || questions.length === 0) return <View style={styles.center}><Text>No questions.</Text></View>;

  return (
    <ScreenLayout style={styles.container}>
      <Modal visible={showSummary} animationType="slide">
        <SafeAreaView style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Lesson Complete!</Text>
          <Text style={styles.scoreText}>{Math.round((correctCount / questions.length) * 100)}%</Text>
          <ScrollView style={styles.summaryList}>
            {questions.map((q, i) => (
              <TouchableOpacity key={i} style={styles.summaryItem} onPress={() => handleReviewQuestion(i)}>
                <Text>Q{i + 1}: {q.question.substring(0, 30)}...</Text>
                <Icon name={userAnswers[q.lessonQuestionId] ? "check-circle" : "cancel"} size={20} color={userAnswers[q.lessonQuestionId] ? "green" : "red"} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.summaryFooter}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}><Text>Retake</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}><Text style={{ color: '#FFF' }}>Finish</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{currentQuestionIndex + 1}/{questions.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <UniversalQuestionView question={currentQuestion} />

        <LessonInputArea
          question={currentQuestion}
          isAnswered={isAnswered}
          selectedAnswer={selectedAnswer}
          isLoading={isProcessingAI}
          onAnswer={handleSubmitAnswer}
          onSkip={handleNext}
          isRecording={isRecording}
          isStreaming={isProcessingAI}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          reviewMode={reviewMode}
        />

        {isProcessingAI && (
          <View style={styles.aiLoading}>
            <ActivityIndicator color="#4F46E5" size="large" />
            <Text style={styles.aiText}>AI is grading your answer...</Text>
          </View>
        )}

        {!isProcessingAI && feedbackMessage && (
          <View style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackTitle}>{isCorrect ? "Correct" : "Incorrect"}</Text>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            {aiAnalysisResult && (
              <View style={styles.aiResult}>
                <Text style={{ fontWeight: 'bold' }}>AI Feedback:</Text>
                <Text>Score: {aiAnalysisResult.score}</Text>
              </View>
            )}
          </View>
        )}

        {isAnswered && !isProcessingAI && (
          <TouchableOpacity style={[styles.nextBtn, isCorrect ? styles.btnCorrect : styles.btnWrong]} onPress={handleNext}>
            <Text style={styles.btnText}>{isLastQuestion ? "Finish" : "Next"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#EEE' },
  headerTitle: { fontWeight: 'bold' },
  progressBar: { width: 100, height: 6, backgroundColor: '#EEE', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
  content: { padding: 20 },
  feedback: { marginTop: 20, padding: 15, borderRadius: 10, borderWidth: 1 },
  feedbackCorrect: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  feedbackWrong: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  feedbackTitle: { fontWeight: 'bold', marginBottom: 5 },
  feedbackText: { color: '#333' },
  nextBtn: { marginTop: 20, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  btnCorrect: { backgroundColor: '#10B981' },
  btnWrong: { backgroundColor: '#333' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  aiLoading: { alignItems: 'center', marginTop: 20 },
  aiText: { marginTop: 10, color: '#4F46E5' },
  aiResult: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  summaryContainer: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  summaryTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  scoreText: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', color: '#4F46E5', marginVertical: 20 },
  summaryList: { flex: 1 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  summaryFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 15, borderRadius: 10, alignItems: 'center' },
  secondaryBtn: { flex: 1, backgroundColor: '#EEE', padding: 15, borderRadius: 10, alignItems: 'center' },
});

export default LessonScreen;