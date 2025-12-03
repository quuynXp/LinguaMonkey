import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
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
  LessonProgressWrongItemRequest,
} from "../../types/dto";
import { SkillType, QuestionType, LessonType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

import {
  ListeningQuestionView,
  SpeakingQuestionView,
  ReadingQuestionView,
  WritingQuestionView
} from "../../components/learn/SkillComponents";
import { LessonInputArea } from "../../components/learn/LessonInputArea";

const QUESTION_TIME_LIMIT = 30;

// Component hiển thị mô tả bài học (nếu có) nhưng nhỏ gọn
const LessonContentDisplay = ({ lesson, t, navigation }: { lesson: LessonResponse, t: (key: string) => string, navigation: any }) => {
  const isExternalContent = lesson.lessonType === LessonType.DOCUMENT || lesson.lessonType === LessonType.VIDEO;
  const hasMedia = (lesson.videoUrls && lesson.videoUrls.length > 0) || (lesson.description && lesson.description.startsWith('http'));

  if (isExternalContent && hasMedia) {
    const url = (lesson.videoUrls && lesson.videoUrls.length > 0) ? lesson.videoUrls[0] : lesson.description;
    return (
      <View style={lessonContentStyles.container}>
        <TouchableOpacity
          style={lessonContentStyles.openButton}
          onPress={() => navigation.navigate("WebViewScreen", { url: url, title: lesson.title })}
        >
          <Icon name="open-in-new" size={20} color="#FFF" />
          <Text style={lessonContentStyles.openButtonText}>{t("lesson.openMaterial") || "Mở tài liệu học"}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return null;
};

const lessonContentStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  openButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 }
});

const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useAllQuestions, useUpdateProgress, useCreateWrongItem } = useLessons();
  const { useStreamPronunciation, useCheckWriting, useSubmitQuiz } = useSkillLessons();

  const streamPronunciationMutation = useStreamPronunciation();
  const checkWritingMutation = useCheckWriting();
  const submitQuizMutation = useSubmitQuiz();
  const updateProgressMutation = useUpdateProgress();
  const createWrongItemMutation = useCreateWrongItem();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Fetch Questions
  const { data: questionsData, isLoading } = useAllQuestions({
    lessonId: lesson.lessonId,
    size: 50,
  });

  const questions: LessonQuestionResponse[] = useMemo(() => (questionsData?.data || []) as LessonQuestionResponse[], [questionsData]);
  const currentQuestion = questions[currentQuestionIndex];

  // Timer Logic
  useEffect(() => {
    if (!currentQuestion || isAnswered || isLoading) return;

    setTimeLeft(QUESTION_TIME_LIMIT);
    setTimeElapsed(0);
    const isQuiz = currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE || currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK;

    intervalRef.current = window.setInterval(() => setTimeElapsed(p => p + 1), 1000);

    if (isQuiz) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentQuestionIndex, isAnswered, isLoading, currentQuestion]);

  const handleTimeOut = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    handleSubmitAnswer(false, "TIMEOUT", true);
  };

  const handleNext = useCallback(() => {
    setFeedbackMessage(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      Alert.alert(t("common.congratulations"), `${t("learn.yourScore")}: ${correctCount}/${questions.length}`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    }
  }, [currentQuestionIndex, questions.length, correctCount, navigation, t]);

  const handleSubmitAnswer = async (isCorrect: boolean, answerValue: any, isTimeoutOrSkip = false) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsAnswered(true);
    setSelectedAnswer(answerValue);
    if (isCorrect) setCorrectCount(prev => prev + 1);

    if (userId && currentQuestion) {
      const progressReq: LessonProgressRequest = {
        lessonId: lesson.lessonId,
        userId: userId,
        score: isCorrect ? correctCount + 1 : correctCount,
        maxScore: questions.length,
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
          wrongAnswer: typeof answerValue === 'string' ? answerValue : "AUDIO_FILE"
        });
      }
    }
    // Auto next for Multiple Choice
    if (currentQuestion && (currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE || currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK)) {
      setTimeout(handleNext, 1500);
    }
  };

  const handleSkip = () => {
    handleSubmitAnswer(false, "SKIPPED", true);
    Alert.alert("Đã bỏ qua", `Đáp án đúng là: ${currentQuestion.correctOption}`);
    setTimeout(handleNext, 1000);
  };

  const handleQuizAnswer = (optionKey: string) => {
    if (!currentQuestion) return;
    setIsStreaming(true);
    submitQuizMutation.mutate({
      lessonQuestionId: currentQuestion.lessonQuestionId,
      selectedOption: optionKey,
      duration: timeElapsed
    }, {
      onSuccess: (feedback) => {
        setIsStreaming(false);
        const isCorrect = feedback.includes("Correct");
        setFeedbackMessage(isCorrect ? "Chính xác!" : "Chưa chính xác");
        handleSubmitAnswer(isCorrect, optionKey);
      },
      onError: () => {
        setIsStreaming(false);
        const isCorrect = optionKey === currentQuestion.correctOption;
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
          Alert.alert("Lỗi", "Không thể chấm điểm nói.");
          handleSubmitAnswer(false, "AUDIO_ERROR");
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
        Alert.alert("Lỗi", "Không thể chấm bài viết.");
        handleSubmitAnswer(false, "WRITING_ERROR");
      }
    });
  };

  // --- LOGIC RENDER QUESTION VIEW ---
  const renderQuestionView = () => {
    if (!currentQuestion) return null;

    // FIX: Logic kiểm tra media trước
    const hasMedia = !!currentQuestion.mediaUrl;
    const hasTranscript = !!currentQuestion.transcript;

    // Nếu là skill WRITING/SPEAKING, luôn render component đặc biệt (vì cần input đặc thù)
    if (lesson.skillTypes === SkillType.SPEAKING) return <SpeakingQuestionView question={currentQuestion} />;
    if (lesson.skillTypes === SkillType.WRITING) return <WritingQuestionView question={currentQuestion} />;

    // Đối với LISTENING & READING:
    // Nếu có Media (Audio/Image) -> Render component Skill tương ứng
    if (hasMedia) {
      if (lesson.skillTypes === SkillType.LISTENING) return <ListeningQuestionView question={currentQuestion} />;
      return <ReadingQuestionView question={currentQuestion} />;
    }

    // Nếu KHÔNG có media nhưng có Transcript dài (đoạn văn) -> Render ReadingView
    if (hasTranscript && currentQuestion.transcript.length > 50) {
      return <ReadingQuestionView question={currentQuestion} />;
    }

    // Fallback: Nếu không có gì đặc biệt -> Render dạng câu hỏi Text đơn giản (dùng ReadingView nhưng nó đã được tối ưu để hiện text nếu ko có ảnh)
    return <ReadingQuestionView question={currentQuestion} />;
  };

  if (isLoading) {
    return (
      <ScreenLayout style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </ScreenLayout>
    );
  }

  const hasQuestions = questions.length > 0;
  const progressPercent = hasQuestions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isTimerVisible = currentQuestion && (currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE || currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK);

  return (
    <ScreenLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>

        {hasQuestions ? (
          <>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            {isTimerVisible && (
              <View style={styles.timerBadge}>
                <Icon name="timer" size={16} color={timeLeft < 10 ? "#EF4444" : "#4F46E5"} />
                <Text style={[styles.timerText, { color: timeLeft < 10 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}s</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginLeft: 8 }}>{lesson.title}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Chỉ hiện nút mở tài liệu nếu là bài VIDEO/DOC */}
        <LessonContentDisplay lesson={lesson} t={t} navigation={navigation} />

        {hasQuestions && currentQuestion ? (
          <View style={{ paddingTop: 10 }}>
            {/* Context (Audio/Image/Text) */}
            {renderQuestionView()}

            {/* Feedback & Next Button */}
            {feedbackMessage && isAnswered && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextBtnText}>Tiếp tục</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input Area (Answers/Mic/Input) */}
            {!feedbackMessage && (
              <LessonInputArea
                question={currentQuestion}
                isAnswered={isAnswered}
                selectedAnswer={selectedAnswer}
                isLoading={isStreaming}
                onAnswer={(ans) => {
                  if (lesson.skillTypes === SkillType.WRITING) {
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
          </View>
        ) : (
          /* Empty State / Description Only */
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={styles.descText}>{lesson.description}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.nextBtnText}>{t("lesson.backToCourse") || "Hoàn thành"}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  closeBtn: { padding: 4 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  timerText: { fontWeight: 'bold', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },
  descText: { fontSize: 16, color: '#374151', lineHeight: 24, textAlign: 'center', marginBottom: 20 },

  feedbackContainer: { marginTop: 20, padding: 16, backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#10B981', alignItems: 'center' },
  feedbackText: { fontSize: 16, color: '#064E3B', textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  nextBtn: { backgroundColor: '#10B981', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  nextBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default LessonScreen;