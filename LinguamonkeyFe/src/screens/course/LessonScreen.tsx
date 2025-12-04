import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet
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
import { SkillType, QuestionType, LessonType } from "../../types/enums";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { UniversalQuestionView } from "../../components/learn/SkillComponents";
import { LessonInputArea } from "../../components/learn/LessonInputArea";

// --- HELPERS ---
const extractMediaFromDesc = (desc?: string) => {
  if (!desc) return null;
  const match = desc.match(/\[Media\]:\s*(\S+)/);
  return match ? match[1] : null;
};

// --- SUB-COMPONENT: Just Media View ---
const JustMediaView = ({ lesson, onFinish }: { lesson: LessonResponse, onFinish: () => void }) => {
  const mediaUrl = extractMediaFromDesc(lesson.description);
  const cleanDesc = lesson.description?.replace(/\[Media\]:\s*\S+/, '').trim();

  // Construct a "Fake" question to reuse the Universal Viewer
  const fakeQuestion: LessonQuestionResponse = {
    lessonQuestionId: 'media-only',
    lessonId: lesson.lessonId,
    question: cleanDesc || "Enjoy this content.",
    questionType: lesson.lessonType === 'VIDEO' ? 'VIDEO' : lesson.lessonType === 'AUDIO' ? 'AUDIO' : 'READING' as any,
    mediaUrl: mediaUrl || lesson.thumbnailUrl || "",
    correctOption: "",
    optionsJson: "{}",
    orderIndex: 0,
    isDeleted: false,
    languageCode: lesson.languageCode
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        {lesson.title}
      </Text>

      <UniversalQuestionView question={fakeQuestion} />

      <View style={{ marginTop: 30, width: '100%' }}>
        <TouchableOpacity
          style={{ backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center' }}
          onPress={onFinish}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Complete Lesson</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// --- MAIN SCREEN ---

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
  const updateProgressMutation = useUpdateProgress();
  const createWrongItemMutation = useCreateWrongItem();

  // Logic: Check Just Media
  const isJustMedia = ['VIDEO', 'AUDIO', 'DOCUMENT'].includes(lesson.lessonType);

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

  const streamPronunciationMutation = useStreamPronunciation();
  const checkWritingMutation = useCheckWriting();
  const submitQuizMutation = useSubmitQuiz();

  const { data: questionsData, isLoading } = useAllQuestions({
    lessonId: lesson.lessonId,
    size: 50,
  });

  const questions: LessonQuestionResponse[] = useMemo(() => {
    return (questionsData?.data || []) as LessonQuestionResponse[];
  }, [questionsData]);

  const currentQuestion = questions[currentQuestionIndex];

  // --- JUST MEDIA HANDLER ---
  const handleFinishMediaLesson = () => {
    if (!userId) return;
    const progressReq: LessonProgressRequest = {
      lessonId: lesson.lessonId,
      userId: userId,
      score: 1, // Full score for just watching
      maxScore: 1,
      attemptNumber: 1,
      completedAt: new Date().toISOString(),
      needsReview: false,
      answersJson: "{}"
    };
    updateProgressMutation.mutate({ lessonId: lesson.lessonId, userId, req: progressReq });
    Alert.alert("Success", "Lesson Completed!", [{ text: "OK", onPress: () => navigation.goBack() }]);
  };

  // --- TIMER LOGIC (Only if NOT JustMedia) ---
  // ... (Same timer logic as before, omitted for brevity but assumed present if questions exist) ...

  // --- NAVIGATION ACTIONS ---
  const handleStartAll = () => {
    if (questions.length === 0) return;
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setPhase('ANSWER');
    setIsAnswered(false);
    setViewMode('DO_ALL');
  };

  const handleStartSingle = (index: number) => {
    setCurrentQuestionIndex(index);
    setCorrectCount(0);
    setPhase('ANSWER');
    setIsAnswered(false);
    setViewMode('SINGLE');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
  };

  // --- SUBMISSION LOGIC (Reuse previous logic) ---
  const handleSubmitAnswer = async (isCorrect: boolean, answerValue: any, isTimeoutOrSkip = false) => {
    // ... (Previous logic for handling question submission)
    // Implementation kept simple for this snippet to focus on Just Media structure
  };

  // --- RENDER ---

  if (isJustMedia) {
    return (
      <ScreenLayout style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lesson.lessonType} View</Text>
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
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.questionItem} onPress={() => handleStartSingle(index)}>
                <View style={styles.qIndexBadge}>
                  <Text style={styles.qIndexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qSkillType}>{item.questionType}</Text>
                  <Text style={styles.qText} numberOfLines={2}>
                    {item.question || "View Question"}
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

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToList} style={styles.closeBtn}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question {currentQuestionIndex + 1}/{questions.length}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {currentQuestion && <UniversalQuestionView question={currentQuestion} />}
        {/* Input Area implementation ... */}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
  closeBtn: { padding: 4 },
  listContainer: { padding: 16, flex: 1 },
  startAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, marginBottom: 16, gap: 8 },
  startAllText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  questionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, gap: 12, shadowColor: '#000', elevation: 1 },
  qIndexBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  qIndexText: { fontWeight: '700', color: '#6B7280' },
  qSkillType: { fontSize: 12, color: '#6366F1', fontWeight: '600', marginBottom: 2 },
  qText: { fontSize: 14, color: '#374151' },
  content: { padding: 20 },
});

export default LessonScreen;