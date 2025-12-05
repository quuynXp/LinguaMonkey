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

// Helper: Extract media URL from description
const extractMediaFromDesc = (desc?: string) => {
  if (!desc) return null;
  const match = desc.match(/\[Media\]:\s*(\S+)/);
  return match ? match[1] : null;
};

// --- JUST MEDIA COMPONENT ---
const JustMediaView = ({
  lesson,
  onFinish
}: {
  lesson: LessonResponse;
  onFinish: () => void;
}) => {
  const mediaUrl = extractMediaFromDesc(lesson.description) ||
    lesson.videoUrls?.[0] ||
    lesson.thumbnailUrl;
  const cleanDesc = lesson.description?.replace(/\[Media\]:\s*\S+/, '').trim();

  const fakeQuestion: Partial<LessonQuestionResponse> = {
    lessonQuestionId: 'media-only',
    lessonId: lesson.lessonId,
    question: cleanDesc || "Enjoy this content.",
    questionType: lesson.lessonType === 'VIDEO' ? QuestionType.VIDEO :
      lesson.lessonType === 'AUDIO' ? QuestionType.AUDIO :
        QuestionType.READING,
    mediaUrl: mediaUrl || "",
    correctOption: "",
    orderIndex: 0,
    languageCode: lesson.languageCode,
    skillType: lesson.skillTypes,
    weight: 1,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        {lesson.title}
      </Text>

      <UniversalQuestionView question={fakeQuestion as LessonQuestionResponse} />

      <TouchableOpacity
        style={{ backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, width: '100%' }}
        onPress={onFinish}
      >
        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Complete Lesson</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- MAIN SCREEN ---
const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  // Use the new useLessonTest instead of useAllQuestions
  const { useLessonTest, useUpdateProgress, useSubmitTest } = useLessons();
  const { useStreamPronunciation, useCheckWriting, useSubmitQuiz } = useSkillLessons();

  const updateProgressMutation = useUpdateProgress();
  const submitTestMutation = useSubmitTest();

  const isJustMedia = ['VIDEO', 'AUDIO', 'DOCUMENT'].includes(lesson.lessonType);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  // Store user answers for final submission
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const streamPronunciationMutation = useStreamPronunciation();
  const checkWritingMutation = useCheckWriting();
  const submitQuizMutation = useSubmitQuiz();

  // Load questions via startTest API (This ensures we get the correct attempt number and shuffled list)
  const { data: testData, isLoading, isError } = useLessonTest(lesson.lessonId, userId!, !isJustMedia && !!userId);

  useEffect(() => {
    if (testData?.attemptNumber) {
      setAttemptNumber(testData.attemptNumber);
    }
  }, [testData]);

  const questions: LessonQuestionResponse[] = useMemo(() => {
    return (testData?.questions || []) as LessonQuestionResponse[];
  }, [testData]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  // --- JUST MEDIA HANDLER ---
  const handleFinishMediaLesson = () => {
    if (!userId) return;
    const progressReq: LessonProgressRequest = {
      lessonId: lesson.lessonId,
      userId: userId,
      score: 100,
      maxScore: 100,
      attemptNumber: 1,
      completedAt: new Date().toISOString(),
      needsReview: false,
      answersJson: "{}"
    };
    updateProgressMutation.mutate({ lessonId: lesson.lessonId, userId, req: progressReq });
    Alert.alert("Success", "Lesson Completed!", [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  // --- VALIDATION LOGIC ---
  const validateAnswer = (question: LessonQuestionResponse, answer: any): boolean => {
    const correct = question.correctOption?.trim().toLowerCase();
    const selected = typeof answer === 'string' ? answer.trim().toLowerCase() : JSON.stringify(answer).toLowerCase();

    switch (question.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.TRUE_FALSE:
        return correct === selected;

      case QuestionType.FILL_IN_THE_BLANK:
        const alternatives = correct?.split('||').map(s => s.trim().toLowerCase()) || [];
        return alternatives.some(alt => alt === selected);

      case QuestionType.ORDERING:
        return correct?.replace(/\s/g, '') === selected.replace(/\s/g, '');

      case QuestionType.MATCHING:
        try {
          const correctMap = JSON.parse(question.correctOption || '{}');
          const selectedMap = typeof answer === 'object' ? answer : JSON.parse(answer);
          return JSON.stringify(correctMap) === JSON.stringify(selectedMap);
        } catch {
          return false;
        }

      default:
        return false;
    }
  };

  // --- ANSWER SUBMISSION ---
  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion || !userId) return;

    setIsAnswered(true);
    setSelectedAnswer(answerValue);

    // Track locally
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.lessonQuestionId]: answerValue
    }));

    const duration = Math.floor((Date.now() - startTime) / 1000);

    try {
      if (currentQuestion.questionType === QuestionType.SPEAKING) {
        return; // Handled in recording
      } else if (currentQuestion.questionType === QuestionType.WRITING ||
        currentQuestion.questionType === QuestionType.ESSAY) {
        setIsStreaming(true);
        const result = await checkWritingMutation.mutateAsync({
          text: answerValue,
          lessonQuestionId: currentQuestion.lessonQuestionId,
          languageCode: currentQuestion.languageCode,
          duration
        });
        setFeedbackMessage(`Score: ${result.score}/100\n${result.feedback}`);
        setIsStreaming(false);

        const isCorrect = result.score >= 70;
        if (isCorrect) setCorrectCount(prev => prev + 1);

      } else {
        // Immediate validation for user feedback
        const isCorrect = validateAnswer(currentQuestion, answerValue);
        if (isCorrect) {
          setFeedbackMessage("Correct! Great job.");
          setCorrectCount(prev => prev + 1);
        } else {
          setFeedbackMessage(`Incorrect. The answer is: ${currentQuestion.correctOption}`);
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert("Error", error.message || "Failed to submit answer");
      setIsAnswered(false);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleFinishLesson();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setFeedbackMessage(null);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFinishLesson = async () => {
    if (!userId) return;

    const totalQuestions = questions.length;
    // Calculate final score purely client side for display, but server handles real scoring via submitTest
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 100;

    // Use submitTest mutation to save all answers and finalize
    try {
      await submitTestMutation.mutateAsync({
        lessonId: lesson.lessonId,
        userId: userId,
        body: {
          answers: userAnswers,
          attemptNumber: attemptNumber
        }
      });

      Alert.alert(
        "Lesson Complete!",
        `Your score: ${score.toFixed(0)}%\nCorrect: ${correctCount}/${totalQuestions}`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Failed to submit test", error);
      Alert.alert("Error", "Failed to save lesson progress.");
    }
  };

  // --- SPEAKING HANDLERS ---
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      await recorder.record();
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!currentQuestion || !userId) return;

    try {
      setIsRecording(false);
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording URI");

      setIsStreaming(true);
      setIsAnswered(true);

      await streamPronunciationMutation.mutateAsync({
        audioUri: uri,
        lessonQuestionId: currentQuestion.lessonQuestionId,
        languageCode: currentQuestion.languageCode,
        onChunk: (chunk) => {
          if (chunk.type === 'final') {
            setFeedbackMessage(`Score: ${chunk.score}/100\n${chunk.feedback}`);
            setIsStreaming(false);
            if ((chunk.score || 0) >= 70) setCorrectCount(prev => prev + 1);
          }
        }
      });
    } catch (err) {
      console.error('Stop recording error:', err);
      setIsStreaming(false);
      setIsAnswered(false);
    }
  };

  // --- RENDER ---
  if (isJustMedia) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lesson.lessonType} Lesson</Text>
        </View>
        <JustMediaView lesson={lesson} onFinish={handleFinishMediaLesson} />
      </ScreenLayout>
    );
  }

  if (isLoading) {
    return (
      <ScreenLayout style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </ScreenLayout>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>No Questions</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF' }}>This lesson has no questions yet.</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Question {currentQuestionIndex + 1}/{questions.length}
        </Text>
        <Text style={styles.scoreText}>{correctCount} ✓</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <UniversalQuestionView question={currentQuestion} />

        <LessonInputArea
          question={currentQuestion}
          isAnswered={isAnswered}
          selectedAnswer={selectedAnswer}
          isLoading={submitQuizMutation.isPending || checkWritingMutation.isPending}
          onAnswer={handleSubmitAnswer}
          onSkip={handleSkip}
          isRecording={isRecording}
          isStreaming={isStreaming}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />

        {feedbackMessage && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        )}

        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {isLastQuestion ? "Finish Lesson" : "Next Question"}
            </Text>
            <Icon name={isLastQuestion ? "check" : "arrow-forward"} size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB'
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, textAlign: 'center' },
  closeBtn: { padding: 4 },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  content: { padding: 20 },
  feedbackBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6'
  },
  feedbackText: { fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    marginTop: 20
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default LessonScreen;