import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Modal, SafeAreaView, Alert, Platform, PermissionsAndroid
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from "react-i18next";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

// Imports from project structure
import { useLessons } from "../../hooks/useLessons";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { useUserStore } from "../../stores/UserStore";
import { LessonResponse, LessonQuestionResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { LessonInputArea } from "../../components/learn/LessonInputArea";
import { getDirectMediaUrl } from "../../utils/mediaUtils";

// Defined Enums strictly
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  TRUE_FALSE = 'TRUE_FALSE',
  MATCHING = 'MATCHING',
  ESSAY = 'ESSAY',
  ORDERING = 'ORDERING'
}

// --- Universal Question Component ---
export const UniversalQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
  const { t } = useTranslation();
  const mediaUrl = getDirectMediaUrl(question.mediaUrl);

  const isVideo = mediaUrl && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov'));
  const isImage = mediaUrl && !isVideo;

  const player = useVideoPlayer(isVideo ? mediaUrl : "", (player) => {
    player.loop = false;
  });

  const renderMedia = () => {
    if (!mediaUrl) return null;

    if (isVideo) {
      return (
        <View style={styles.mediaContainer}>
          <VideoView player={player} style={{ width: 320, height: 200, borderRadius: 12 }} contentFit="contain" />
          <TouchableOpacity style={styles.replayButton} onPress={() => player.replay()}>
            <Icon name="replay" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (isImage) {
      return (
        <Image
          source={{ uri: mediaUrl }}
          style={styles.contextImage}
          resizeMode="contain"
        />
      );
    }
    return null;
  };

  return (
    <View style={styles.questionContainer}>
      {renderMedia()}
      {question.transcript && (
        <View style={styles.readingPassageBox}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            <Text style={styles.readingPassageText}>{question.transcript}</Text>
          </ScrollView>
        </View>
      )}
      <Text style={styles.questionText}>{question.question}</Text>
    </View>
  );
};

// --- Main LessonScreen Component ---

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
  const { t } = useTranslation();
  // FIX: Destructure lesson, onComplete, and isCompleted from route.params
  const { lesson, onComplete, isCompleted } = route.params as { lesson: LessonResponse, onComplete?: () => void, isCompleted?: boolean };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useLessonTest, useSubmitTest } = useLessons();
  const { useCheckWriting } = useSkillLessons();
  const submitTestMutation = useSubmitTest();
  const checkWritingMutation = useCheckWriting();

  // FIX: Added startTime ref to track duration
  const startTime = useRef<number>(Date.now());

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

  // FIX: Separate Modal for Retake/Review
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  const { data: testData, isLoading } = useLessonTest(lesson.lessonId, userId!, !!userId);

  useEffect(() => {
    if (isCompleted) {
      setShowCompletedModal(true);
    } else if (testData?.questions) {
      setActiveQuestions(testData.questions);
      setCurrentQuestionIndex(0);
      setCorrectCount(0);
      // Reset start time when questions load
      startTime.current = Date.now();
    }
  }, [testData, isCompleted]);

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= activeQuestions.length - 1;

  const handleRetake = () => {
    setShowCompletedModal(false);
    // Force a refetch of the test data to get a new attemptNumber/questions
    if (userId) {
      // Assuming useLessonTest is configured to refetch on enable/key change. 
      // TanStack Query useLessonTest is configured with staleTime: 0, gcTime: 0, so simply re-rendering will refetch
      // However, to be explicit, one might call a refetch function if available or trigger an invalidation.
      // Since the dependency array [testData, isCompleted] is watched, a change in isCompleted should re-check useEffect logic.
      // We will simply dismiss the modal and let the existing test logic re-run.
      if (testData?.questions) {
        setActiveQuestions(testData.questions);
        setCurrentQuestionIndex(0);
        setCorrectCount(0);
        startTime.current = Date.now();
      }
    }
  };

  const handleViewWrong = () => {
    setShowCompletedModal(false);
    // Navigate to a dedicated WrongAnswersScreen or ReviewScreen
    Alert.alert("Feature Missing", "Navigation to review wrong questions is not implemented yet.");
    navigation.goBack();
  };

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion || isProcessingAI) return;
    setSelectedAnswer(answerValue);
    setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: answerValue }));
    setIsAnswered(true);

    if (currentQuestion.questionType === QuestionType.ESSAY) {
      setIsProcessingAI(true);
      try {
        const res = await checkWritingMutation.mutateAsync({
          text: answerValue,
          lessonQuestionId: currentQuestion.lessonQuestionId,
          languageCode: 'vi',
          duration: 0
        });
        setFeedbackMessage(res.feedback);
        const passed = res.score >= 50;
        setIsCorrect(passed);
        if (passed) setCorrectCount(c => c + 1);
      } catch (e) {
        setFeedbackMessage("AI Error. Please try again.");
        setIsCorrect(false);
      } finally {
        setIsProcessingAI(false);
      }
      return;
    }

    const checkCorrect = validateAnswer(currentQuestion, answerValue);
    setIsCorrect(checkCorrect);
    setFeedbackMessage(checkCorrect ? "Correct!" : "Incorrect");
    if (checkCorrect) setCorrectCount(c => c + 1);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // FIX: Calculate duration in seconds
      const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);

      try {
        await submitTestMutation.mutateAsync({
          lessonId: lesson.lessonId, userId: userId!,
          body: {
            answers: userAnswers,
            attemptNumber: 1,
            durationSeconds: durationSeconds // FIX: Send duration to backend
          }
        });
        // FIX: Call the onComplete callback from CourseDetailsScreen
        if (onComplete) onComplete();
      } catch (error) { console.error(error); }
      setShowSummary(true);
    } else {
      setCurrentQuestionIndex(i => i + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setFeedbackMessage(null);
      setIsCorrect(false);
    }
  };

  if (isLoading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;
  if (!activeQuestions || activeQuestions.length === 0) return <View style={styles.center}><Text>Empty Lesson</Text></View>;

  return (
    <ScreenLayout style={styles.container}>
      {/* Summary Modal (After submitting a test) */}
      <Modal visible={showSummary} animationType="slide">
        <SafeAreaView style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Lesson Complete!</Text>
          <Text style={styles.scoreText}>{Math.round((correctCount / activeQuestions.length) * 100)}%</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}><Text style={{ color: '#FFF' }}>Finish</Text></TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Completed Lesson Modal (When pressing a completed lesson from CourseDetails) */}
      <Modal visible={showCompletedModal} animationType="slide" transparent>
        <View style={styles.completedModalOverlay}>
          <View style={styles.completedModalContent}>
            <Text style={styles.completedTitle}>Lesson Completed!</Text>
            <Text style={styles.completedSubtitle}>You have already finished this lesson. What would you like to do?</Text>

            <TouchableOpacity style={[styles.primaryBtn, { marginBottom: 10 }]} onPress={handleRetake}>
              <Text style={{ color: '#FFF' }}>Retake Test</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewWrong}>
              <Text style={{ color: '#4F46E5' }}>Review Wrong Questions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#9CA3AF' }}>Go Back</Text>
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
  questionContainer: { marginBottom: 20, alignItems: 'center', width: '100%' },
  questionText: { fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center', marginTop: 16 },
  mediaContainer: { width: '100%', alignItems: 'center', marginBottom: 16 },
  contextImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#F9FAFB', marginBottom: 12 },
  replayButton: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 },
  readingPassageBox: { backgroundColor: '#FFF7ED', padding: 16, borderRadius: 8, marginBottom: 12, width: '100%', borderLeftWidth: 4, borderLeftColor: '#F97316' },
  readingPassageText: { fontSize: 15, color: '#431407', lineHeight: 24 },
  feedback: { marginTop: 20, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  feedbackCorrect: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  feedbackWrong: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  feedbackTitle: { fontWeight: 'bold', marginBottom: 5 },
  nextBtn: { marginTop: 20, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  btnCorrect: { backgroundColor: '#10B981' },
  btnWrong: { backgroundColor: '#333' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  summaryContainer: { flex: 1, backgroundColor: '#FFF', padding: 20, justifyContent: 'center', alignItems: 'center' },
  summaryTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  scoreText: { fontSize: 48, fontWeight: 'bold', color: '#4F46E5', marginBottom: 40 },
  primaryBtn: { backgroundColor: '#4F46E5', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10 },
  completedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  completedModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center' },
  completedTitle: { fontSize: 22, fontWeight: 'bold', color: '#10B981', marginBottom: 10 },
  completedSubtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 30 },
  secondaryBtn: { backgroundColor: '#EEF2FF', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10, borderWidth: 1, borderColor: '#4F46E5' }
});

export default LessonScreen;