import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Modal, Alert
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLessons } from "../../hooks/useLessons";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { useUserStore } from "../../stores/UserStore";
import { LessonResponse, LessonQuestionResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { LessonInputArea } from "../../components/learn/LessonInputArea";
import { UniversalQuestionView } from "../../components/learn/SkillComponents";
import { QuestionType } from "../../types/enums";
import { SafeAreaView } from "react-native-safe-area-context";

const validateAnswer = (question: LessonQuestionResponse, answer: any): boolean => {
  if (!question.correctOption) return false;
  const normalize = (str: any) => String(str || "").trim().toLowerCase();
  const correctRaw = question.correctOption;
  const userRaw = answer;

  switch (question.questionType as any) {
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
  const { lesson, onComplete, isCompleted: initialIsCompleted, latestScore: initialLatestScore } = route.params as {
    lesson: LessonResponse,
    onComplete?: () => void,
    isCompleted?: boolean,
    latestScore?: number
  };

  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useLessonTest, useSubmitTest } = useLessons();
  const { useCheckWriting } = useSkillLessons();
  const submitTestMutation = useSubmitTest();
  const checkWritingMutation = useCheckWriting();

  const startTime = useRef<number>(Date.now());
  const hasCheckedStatus = useRef<boolean>(false);

  const [activeQuestions, setActiveQuestions] = useState<LessonQuestionResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [showCompletedModal, setShowCompletedModal] = useState(!!initialIsCompleted);
  const [serverScore, setServerScore] = useState<number | undefined>(initialLatestScore);

  const { data: testData, isLoading } = useLessonTest(lesson.lessonId, userId!, !!userId);

  useEffect(() => {
    if (testData) {
      if (!hasCheckedStatus.current) {
        if (testData.latestScore !== undefined && testData.latestScore >= 50) {
          setServerScore(testData.latestScore);
          setShowCompletedModal(true);
        }
        hasCheckedStatus.current = true;
      }

      if (testData.questions && testData.questions.length > 0) {
        setActiveQuestions(testData.questions);
      }

      if (startTime.current === 0) startTime.current = Date.now();
    }
  }, [testData]);

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= activeQuestions.length - 1;

  const handleRetake = () => {
    setShowCompletedModal(false);
    setShowSummary(false);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setFeedbackMessage(null);
    setIsCorrect(false);
    setUserAnswers({});
    startTime.current = Date.now();
  };

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion || isProcessingAI) return;
    setSelectedAnswer(answerValue);
    setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: answerValue }));
    setIsAnswered(true);

    if (currentQuestion.questionType === QuestionType.ESSAY || currentQuestion.questionType === QuestionType.WRITING || currentQuestion.questionType === QuestionType.SPEAKING) {
      setIsProcessingAI(true);
      setTimeout(() => {
        setIsProcessingAI(false);
        setIsCorrect(true);
        setCorrectCount(c => c + 1);
        setFeedbackMessage("Great effort!");
      }, 1000);
      return;
    }

    const checkCorrect = validateAnswer(currentQuestion, answerValue);
    setIsCorrect(checkCorrect);
    setFeedbackMessage(checkCorrect ? "Correct!" : "Incorrect");
    if (checkCorrect) setCorrectCount(c => c + 1);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);
      setShowSummary(true);

      try {
        await submitTestMutation.mutateAsync({
          lessonId: lesson.lessonId, userId: userId!,
          body: {
            answers: userAnswers,
            attemptNumber: (testData?.attemptNumber || 0) + 1,
            durationSeconds: durationSeconds
          }
        });
        if (onComplete) onComplete();
      } catch (error) { console.error(error); }
    } else {
      setCurrentQuestionIndex(i => i + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setFeedbackMessage(null);
      setIsCorrect(false);
    }
  };

  if (isLoading && !activeQuestions.length) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;
  if (!isLoading && (!activeQuestions || activeQuestions.length === 0)) return <View style={styles.center}><Text>Empty Lesson</Text></View>;

  return (
    <ScreenLayout style={styles.container}>
      <Modal visible={showSummary} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.summaryContainer}>
          <Icon name="emoji-events" size={80} color="#F59E0B" style={{ marginBottom: 20 }} />
          <Text style={styles.summaryTitle}>Lesson Complete!</Text>
          <Text style={styles.scoreText}>{Math.round((correctCount / activeQuestions.length) * 100)}%</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
              <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Finish</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showCompletedModal && !showSummary} animationType="fade" transparent>
        <View style={styles.completedModalOverlay}>
          <View style={styles.completedModalContent}>
            <View style={styles.iconCircle}>
              <Icon name="check" size={40} color="#10B981" />
            </View>
            <Text style={styles.completedTitle}>Lesson Completed!</Text>
            {serverScore !== undefined && (
              <Text style={styles.completedScore}>Highest Score: {Math.round(serverScore)}%</Text>
            )}
            <Text style={styles.completedSubtitle}>You have already passed this lesson. What would you like to do?</Text>

            <TouchableOpacity style={styles.primaryBtnFull} onPress={handleRetake}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Practice Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.textBtn} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#6B7280' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
        <Text style={{ fontWeight: 'bold' }}>{currentQuestionIndex + 1}/{activeQuestions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <UniversalQuestionView key={`q-${currentQuestion.lessonQuestionId}`} question={currentQuestion} />

        <LessonInputArea
          key={`input-${currentQuestion.lessonQuestionId}`}
          question={currentQuestion}
          isAnswered={isAnswered}
          selectedAnswer={selectedAnswer}
          isLoading={isProcessingAI}
          onAnswer={handleSubmitAnswer}
          onSkip={handleNext}
          isRecording={false}
          isStreaming={false}
          onStartRecording={() => { }}
          onStopRecording={() => { }}
          reviewMode={false}
        />

        {(isAnswered || isProcessingAI) && (
          <View style={[styles.feedback, isProcessingAI ? {} : (isCorrect ? styles.feedbackCorrect : styles.feedbackWrong)]}>
            {isProcessingAI ? <ActivityIndicator /> : (
              <>
                <Text style={styles.feedbackTitle}>{isCorrect ? "Correct" : "Incorrect"}</Text>
                <Text>{feedbackMessage}</Text>
              </>
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
  content: { padding: 20, paddingBottom: 100 },
  feedback: { marginTop: 20, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  feedbackCorrect: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  feedbackWrong: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  feedbackTitle: { fontWeight: 'bold', marginBottom: 5 },
  nextBtn: { marginTop: 20, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  btnCorrect: { backgroundColor: '#10B981' },
  btnWrong: { backgroundColor: '#333' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  summaryContainer: { flex: 1, backgroundColor: '#FFF', padding: 20, justifyContent: 'center', alignItems: 'center' },
  summaryTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#111827' },
  scoreText: { fontSize: 64, fontWeight: '900', color: '#4F46E5', marginBottom: 40 },
  primaryBtn: { backgroundColor: '#4F46E5', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  secondaryBtn: { backgroundColor: '#EEF2FF', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, borderWidth: 1, borderColor: '#4F46E5' },
  completedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  completedModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  completedTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  completedScore: { fontSize: 20, fontWeight: '700', color: '#10B981', marginBottom: 12 },
  completedSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  primaryBtnFull: { backgroundColor: '#4F46E5', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  textBtn: { paddingVertical: 10 }
});

export default LessonScreen;