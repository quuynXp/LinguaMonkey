import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
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
  StreamingChunk,
  LessonProgressResponse
} from "../../types/dto";
import { SkillType, QuestionType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";

import {
  ListeningQuestionView,
  SpeakingQuestionView,
  ReadingQuestionView,
  WritingQuestionView
} from "../../components/learn/SkillComponents";
import { LessonInputArea } from "../../components/learn/LessonInputArea";

const QUESTION_TIME_LIMIT = 20;

const LessonScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { lesson } = route.params as { lesson: LessonResponse };
  const userStore = useUserStore();
  const userId = userStore.user?.userId;

  const { useAllQuestions, useUpdateProgress, useCreateWrongItem } = useLessons();
  const { useStreamPronunciation, useCheckWriting } = useSkillLessons();

  const streamPronunciationMutation = useStreamPronunciation();
  const checkWritingMutation = useCheckWriting();

  const updateProgressMutation = useUpdateProgress();
  const createWrongItemMutation = useCreateWrongItem();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);

  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [speakingFeedback, setSpeakingFeedback] = useState<StreamingChunk | null>(null);

  const timerRef = useRef<number | null>(null);

  const { data: questionsData, isLoading } = useAllQuestions({
    lessonId: lesson.lessonId,
    size: 50,
  });

  const questions: LessonQuestionResponse[] = useMemo(() => (questionsData?.data || []) as LessonQuestionResponse[], [questionsData]);
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!currentQuestion || isAnswered || isLoading) return;

    setTimeLeft(QUESTION_TIME_LIMIT);

    if (currentQuestion.questionType === QuestionType.SPEAKING || currentQuestion.questionType === QuestionType.WRITING) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, isAnswered, isLoading, currentQuestion]);

  const handleTimeout = () => {
    handleSubmitAnswer(false, "TIMEOUT", false);
  };

  const handleNext = useCallback(() => {
    setSpeakingFeedback(null);
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

  const handleSubmitAnswer = async (isCorrect: boolean, answerValue: any, callAi: boolean = false) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsAnswered(true);
    setSelectedAnswer(answerValue);

    let finalCorrect = isCorrect;

    if (finalCorrect) setCorrectCount(prev => prev + 1);

    if (userId) {
      const progressReq: LessonProgressRequest = {
        lessonId: lesson.lessonId,
        userId: userId,
        score: finalCorrect ? correctCount + 1 : correctCount,
        maxScore: questions.length,
        attemptNumber: 1,
        completedAt: new Date().toISOString(),
        needsReview: !finalCorrect,
        answersJson: JSON.stringify({ [currentQuestion.lessonQuestionId]: answerValue })
      };
      updateProgressMutation.mutate({ lessonId: lesson.lessonId, userId, req: progressReq });

      if (!finalCorrect) {
        const wrongItemReq: LessonProgressWrongItemRequest = {
          lessonId: lesson.lessonId,
          userId: userId,
          lessonQuestionId: currentQuestion.lessonQuestionId,
          wrongAnswer: typeof answerValue === 'string' ? answerValue : "AUDIO_FILE"
        };
        createWrongItemMutation.mutate(wrongItemReq);
      }
    }

    if (currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE || currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
      setTimeout(handleNext, 1500);
    }
  };

  const handleQuizAnswer = (optionKey: string) => {
    const isCorrect = optionKey === currentQuestion.correctOption;
    handleSubmitAnswer(isCorrect, optionKey);
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
    if (!isRecording) return;
    setIsRecording(false);
    setIsStreaming(true);
    await recorder.stop();
    const uri = recorder.uri;

    if (uri) {
      const fileUri = Platform.OS === 'ios' ? uri : uri;
      streamPronunciationMutation.mutate({
        audioUri: fileUri,
        lessonQuestionId: currentQuestion.lessonQuestionId,
        languageCode: lesson.languageCode,
        onChunk: (chunk) => {
          if (chunk.type === 'final') {
            setSpeakingFeedback(chunk);
            const score = chunk.score || 0;
            const passed = score >= 70;
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
    setIsStreaming(true);
    checkWritingMutation.mutate({
      text: text,
      lessonQuestionId: currentQuestion.lessonQuestionId,
      languageCode: lesson.languageCode,
    }, {
      onSuccess: (data) => {
        setIsStreaming(false);
        const passed = data.score >= 70;
        Alert.alert("Kết quả", `Điểm: ${data.score}/100\nFeedback: ${data.feedback}`, [
          { text: "Tiếp tục", onPress: () => handleSubmitAnswer(passed, text) }
        ]);
      },
      onError: () => {
        setIsStreaming(false);
        Alert.alert("Lỗi", "Không thể chấm bài viết.");
      }
    });
  };

  const renderQuestionView = () => {
    const type = currentQuestion.questionType;

    if (type === QuestionType.SPEAKING || currentQuestion.skillType === SkillType.SPEAKING) {
      return <SpeakingQuestionView question={currentQuestion} />;
    }
    if (type === QuestionType.WRITING || type === QuestionType.ESSAY || currentQuestion.skillType === SkillType.WRITING) {
      return <WritingQuestionView question={currentQuestion} />;
    }
    if (currentQuestion.skillType === SkillType.LISTENING) {
      return <ListeningQuestionView question={currentQuestion} />;
    }

    return <ReadingQuestionView question={currentQuestion} />;
  };

  if (isLoading || !currentQuestion) {
    return (
      <ScreenLayout style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </ScreenLayout>
    );
  }

  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        {(currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE || currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) && (
          <View style={styles.timerBadge}>
            <Icon name="timer" size={16} color={timeLeft < 5 ? "#EF4444" : "#4F46E5"} />
            <Text style={[styles.timerText, { color: timeLeft < 5 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {renderQuestionView()}

        {speakingFeedback && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackScore}>Điểm: {speakingFeedback.score}/100</Text>
            <Text style={styles.feedbackText}>{speakingFeedback.feedback}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
        )}

        {!speakingFeedback && (
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
  closeBtn: { padding: 4 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  timerText: { fontWeight: 'bold', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },

  feedbackContainer: { marginTop: 20, padding: 16, backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#10B981', alignItems: 'center' },
  feedbackScore: { fontSize: 24, fontWeight: 'bold', color: '#065F46', marginBottom: 8 },
  feedbackText: { fontSize: 16, color: '#064E3B', textAlign: 'center', marginBottom: 16 },
  nextBtn: { backgroundColor: '#10B981', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  nextBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default LessonScreen;