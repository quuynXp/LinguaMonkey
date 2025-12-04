import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useLessons } from "../../hooks/useLessons";
import { useSkillLessons } from "../../hooks/useSkillLessons";
import { useUserStore } from "../../stores/UserStore";
import {
  LessonResponse,
  LessonQuestionResponse,
  LessonProgressRequest,
} from "../../types/dto";
import { SkillType, QuestionType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

import { UniversalQuestionView } from "../../components/learn/SkillComponents";
import { LessonInputArea } from "../../components/learn/LessonInputArea";

// --- CONFIGURANTS ---
const TIME_DO_ALL_QUESTION = 30;
const TIME_DO_ALL_FEEDBACK = 15;
const TIME_SINGLE_QUESTION = 45;

type ViewMode = 'LIST' | 'DO_ALL' | 'SINGLE';
type Phase = 'ANSWER' | 'FEEDBACK';

const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  // Hooks
  const { useAllQuestions, useUpdateProgress, useCreateWrongItem } = useLessons();
  const { useStreamPronunciation, useCheckWriting, useSubmitQuiz } = useSkillLessons();
  const streamPronunciationMutation = useStreamPronunciation();
  const checkWritingMutation = useCheckWriting();
  const submitQuizMutation = useSubmitQuiz();
  const updateProgressMutation = useUpdateProgress();
  const createWrongItemMutation = useCreateWrongItem();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Question Runner State
  const [phase, setPhase] = useState<Phase>('ANSWER');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Media State
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Fetch Questions
  const { data: questionsData, isLoading } = useAllQuestions({
    lessonId: lesson.lessonId,
    size: 50,
  });

  const questions: LessonQuestionResponse[] = useMemo(() => {
    return (questionsData?.data || []) as LessonQuestionResponse[];
  }, [questionsData]);

  const currentQuestion = questions[currentQuestionIndex];

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (viewMode === 'LIST') {
      stopTimers();
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    let limit = 0;
    if (phase === 'ANSWER') {
      limit = viewMode === 'DO_ALL' ? TIME_DO_ALL_QUESTION : TIME_SINGLE_QUESTION;
    } else {
      limit = viewMode === 'DO_ALL' ? TIME_DO_ALL_FEEDBACK : 999999;
    }

    setTimeLeft(limit);
    if (phase === 'ANSWER') setTimeElapsed(0);

    intervalRef.current = window.setInterval(() => {
      if (phase === 'ANSWER') setTimeElapsed(p => p + 1);
    }, 1000);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimerTickZero();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopTimers();
  }, [viewMode, phase, currentQuestionIndex]);

  const stopTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleTimerTickZero = () => {
    if (phase === 'ANSWER') {
      // TIMEOUT: Must show correct answer and reason
      handleSubmitAnswer(false, "TIMEOUT", true);
    } else if (phase === 'FEEDBACK') {
      if (viewMode === 'DO_ALL') {
        handleNext();
      }
    }
  };

  // --- NAVIGATION ACTIONS ---
  const handleStartAll = () => {
    if (questions.length === 0) return;
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    resetQuestionState();
    setViewMode('DO_ALL');
  };

  const handleStartSingle = (index: number) => {
    setCurrentQuestionIndex(index);
    setCorrectCount(0);
    resetQuestionState();
    setViewMode('SINGLE');
  };

  const resetQuestionState = () => {
    setPhase('ANSWER');
    setIsAnswered(false);
    setSelectedAnswer(null);
    setFeedbackMessage(null);
    setIsRecording(false);
    setIsStreaming(false);
    setTimeElapsed(0);
  };

  const handleNext = useCallback(() => {
    stopTimers();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetQuestionState();
    } else {
      Alert.alert("Hoàn thành", `Kết quả: ${correctCount}/${questions.length}`, [
        {
          text: "OK", onPress: () => {
            setViewMode('LIST');
            navigation.goBack();
          }
        }
      ]);
    }
  }, [currentQuestionIndex, questions.length, correctCount]);

  const handleBackToList = () => {
    stopTimers();
    setViewMode('LIST');
  };

  // --- SUBMISSION LOGIC ---
  const handleSubmitAnswer = async (isCorrect: boolean, answerValue: any, isTimeoutOrSkip = false) => {
    if (isAnswered) return;
    stopTimers();

    setIsAnswered(true);
    setSelectedAnswer(answerValue);
    setPhase('FEEDBACK');

    if (isCorrect) setCorrectCount(prev => prev + 1);

    if (userId && currentQuestion) {
      const progressReq: LessonProgressRequest = {
        lessonId: lesson.lessonId,
        userId: userId,
        score: isCorrect ? 1 : 0,
        maxScore: 1,
        attemptNumber: 1,
        completedAt: new Date().toISOString(),
        needsReview: !isCorrect,
        answersJson: JSON.stringify({ [currentQuestion.lessonQuestionId]: answerValue })
      };
      updateProgressMutation.mutate({ lessonId: lesson.lessonId, userId, req: progressReq });

      if (!isCorrect && !isTimeoutOrSkip) {
        createWrongItemMutation.mutate({
          lessonId: lesson.lessonId,
          userId: userId,
          lessonQuestionId: currentQuestion.lessonQuestionId,
          wrongAnswer: typeof answerValue === 'string' ? answerValue : "MEDIA_FILE"
        });
      }
    }

    // Force Feedback Message for Timeout/Skip logic as requested
    if (isTimeoutOrSkip || !feedbackMessage) {
      const correctInfo = currentQuestion?.correctOption ? `Đáp án đúng: ${currentQuestion.correctOption}` : '';
      // Assuming there might be an explanation field, otherwise we use generic
      const explanation = "Hết giờ hoặc đã bỏ qua.";
      setFeedbackMessage(`${explanation}\n${correctInfo}`);
    }
  };

  const handleSkip = () => {
    handleSubmitAnswer(false, "SKIPPED", true);
  };

  // --- SKILL HANDLERS ---
  const handleQuizAnswer = (optionKey: string) => {
    if (!currentQuestion) return;

    // Fallback local check if simple type
    if ([QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE, QuestionType.FILL_IN_THE_BLANK].includes(currentQuestion.questionType)) {
      const isCorrect = optionKey === currentQuestion.correctOption;
      setFeedbackMessage(isCorrect ? "Chính xác!" : `Sai rồi. Đáp án: ${currentQuestion.correctOption}`);
      handleSubmitAnswer(isCorrect, optionKey);
      return;
    }

    // Default API check for complex types
    setIsStreaming(true);
    submitQuizMutation.mutate({
      lessonQuestionId: currentQuestion.lessonQuestionId,
      selectedOption: optionKey,
      duration: timeElapsed
    }, {
      onSuccess: (feedback) => {
        setIsStreaming(false);
        const isCorrect = feedback.includes("Correct") || feedback.includes("True") || feedback.includes("success");
        setFeedbackMessage(isCorrect ? "Chính xác!" : `Sai rồi! Lý do: ${feedback}`);
        handleSubmitAnswer(isCorrect, optionKey);
      },
      onError: () => {
        setIsStreaming(false);
        const isCorrect = optionKey === currentQuestion.correctOption;
        setFeedbackMessage(isCorrect ? "Chính xác!" : "Sai rồi.");
        handleSubmitAnswer(isCorrect, optionKey);
      }
    });
  };

  const startRecording = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true });
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      await recorder.record();
      setIsRecording(true);
    } catch (e) { Alert.alert("Error", "Mic error"); }
  };

  const stopRecording = async () => {
    if (!isRecording || !currentQuestion) return;
    setIsRecording(false);
    setIsStreaming(true);
    await recorder.stop();
    const uri = recorder.uri;

    if (uri) {
      streamPronunciationMutation.mutate({
        audioUri: uri,
        lessonQuestionId: currentQuestion.lessonQuestionId,
        languageCode: lesson.languageCode,
        onChunk: (chunk) => {
          if (chunk.type === 'final') {
            const score = chunk.score || 0;
            const passed = score >= 70;
            setFeedbackMessage(`Điểm: ${score}/100\n${chunk.feedback}`);
            handleSubmitAnswer(passed, "AUDIO_SUBMITTED");
            setIsStreaming(false);
          }
        }
      }, {
        onError: () => {
          setIsStreaming(false);
          handleSubmitAnswer(false, "AUDIO_ERROR");
          setFeedbackMessage("Lỗi xử lý âm thanh.");
        }
      });
    }
  };

  const handleWritingSubmit = (text: string) => {
    if (!currentQuestion) return;
    setIsStreaming(true);
    checkWritingMutation.mutate({
      text: text,
      lessonQuestionId: currentQuestion.lessonQuestionId,
      languageCode: lesson.languageCode,
      duration: timeElapsed
    }, {
      onSuccess: (data) => {
        setIsStreaming(false);
        const passed = data.score >= 70;
        setFeedbackMessage(`Điểm: ${data.score}/100\n${data.feedback}`);
        handleSubmitAnswer(passed, text);
      },
      onError: () => {
        setIsStreaming(false);
        handleSubmitAnswer(false, "WRITING_ERROR");
        setFeedbackMessage("Lỗi chấm bài viết.");
      }
    });
  };

  // --- MAIN RENDER ---
  if (isLoading) {
    return (
      <ScreenLayout style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </ScreenLayout>
    );
  }

  // 1. LIST MODE
  if (viewMode === 'LIST') {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lesson.title}</Text>
        </View>

        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.startAllBtn} onPress={handleStartAll}>
            <Icon name="play-circle-filled" size={24} color="#FFF" />
            <Text style={styles.startAllText}>Start All ({questions.length})</Text>
          </TouchableOpacity>

          <FlatList
            data={questions}
            keyExtractor={(item) => item.lessonQuestionId}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.questionItem} onPress={() => handleStartSingle(index)}>
                <View style={styles.qIndexBadge}>
                  <Text style={styles.qIndexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qSkillType}>{item.questionType}</Text>
                  <Text style={styles.qText} numberOfLines={2}>
                    {item.question || item.transcript || "View Question"}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          />
        </View>
      </ScreenLayout>
    );
  }

  // 2. RUNNER MODE (DO_ALL & SINGLE)
  const isTimerUrgent = phase === 'ANSWER' && timeLeft < 10;
  const isFeedbackPhase = phase === 'FEEDBACK';

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToList} style={styles.closeBtn}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }]} />
        </View>

        <View style={styles.timerBadge}>
          <Icon name="timer" size={16} color={isTimerUrgent ? "#EF4444" : "#4F46E5"} />
          <Text style={[styles.timerText, { color: isTimerUrgent ? "#EF4444" : "#4F46E5" }]}>
            {phase === 'ANSWER' ? `${timeLeft}s` : (viewMode === 'DO_ALL' ? `Next: ${timeLeft}s` : "Done")}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Render Question Body (Universal) */}
        {currentQuestion && <UniversalQuestionView question={currentQuestion} />}

        {/* Feedback Section */}
        {isFeedbackPhase && feedbackMessage && (
          <View style={[styles.feedbackContainer, { borderColor: feedbackMessage.includes("Sai") || feedbackMessage.includes("Lỗi") ? '#EF4444' : '#10B981' }]}>
            <Text style={[styles.feedbackText, { color: feedbackMessage.includes("Sai") || feedbackMessage.includes("Lỗi") ? '#B91C1C' : '#064E3B' }]}>
              {feedbackMessage}
            </Text>

            {viewMode === 'SINGLE' && (
              <TouchableOpacity style={styles.manualNextBtn} onPress={handleBackToList}>
                <Text style={styles.manualNextBtnText}>Return to List</Text>
              </TouchableOpacity>
            )}
            {viewMode === 'DO_ALL' && (
              <TouchableOpacity style={styles.manualNextBtn} onPress={handleNext}>
                <Text style={styles.manualNextBtnText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Input Section - Depends on Question Type */}
        {currentQuestion && (
          <LessonInputArea
            question={currentQuestion}
            isAnswered={isAnswered}
            selectedAnswer={selectedAnswer}
            isLoading={isStreaming}
            onAnswer={(ans) => {
              if (currentQuestion.questionType === QuestionType.WRITING || currentQuestion.questionType === QuestionType.ESSAY) {
                handleWritingSubmit(ans);
              } else {
                handleQuizAnswer(ans);
              }
            }}
            onSkip={handleSkip}
            isRecording={isRecording}
            isStreaming={isStreaming}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
  closeBtn: { padding: 4 },

  // List Mode
  listContainer: { padding: 16, flex: 1 },
  startAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, marginBottom: 16, gap: 8
  },
  startAllText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  questionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 12, borderRadius: 12, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  qIndexBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  qIndexText: { fontWeight: '700', color: '#6B7280' },
  qSkillType: { fontSize: 12, color: '#6366F1', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  qText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // Runner Mode
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  timerText: { fontWeight: 'bold', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },

  feedbackContainer: { marginVertical: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  feedbackText: { fontSize: 16, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  manualNextBtn: { backgroundColor: '#374151', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  manualNextBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default LessonScreen;