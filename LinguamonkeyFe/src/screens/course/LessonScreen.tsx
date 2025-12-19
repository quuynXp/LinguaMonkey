import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Modal, Animated, FlatList, Dimensions
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLessons } from "../../hooks/useLessons";
import { useUserStore } from "../../stores/UserStore";
import { LessonResponse, LessonQuestionResponse } from "../../types/dto";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { LessonInputArea } from "../../components/learn/LessonInputArea";
import { UniversalQuestionView } from "../../components/learn/SkillComponents";
import { QuestionType } from "../../types/enums";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

const validateAnswer = (question: LessonQuestionResponse, answer: any): boolean => {
  const normalize = (str: any) => String(str || "").trim().toLowerCase();
  const userRaw = answer;

  switch (question.questionType as any) {
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.TRUE_FALSE:
    case QuestionType.SPEAKING:
      if (!question.correctOption) return false;
      return normalize(question.correctOption).replace(/^option/, '') === normalize(userRaw).replace(/^option/, '');

    case QuestionType.FILL_IN_THE_BLANK:
      if (!question.correctAnswer) return false;
      return question.correctAnswer.split(/\|\|/).map(s => normalize(s)).some(alt => alt === normalize(userRaw));

    case QuestionType.ORDERING:
      if (!question.correctAnswer) return false;
      // FIX: Strip all whitespace to compare character sequence only.
      // This prevents errors where "Word ." (user) does not match "Word." (db)
      const cleanCorrect = normalize(question.correctAnswer).replace(/\s+/g, '');
      const cleanUser = normalize(userRaw).replace(/\s+/g, '');
      return cleanCorrect === cleanUser;

    case QuestionType.MATCHING:
      if (!question.correctAnswer) return false;
      try {
        const correctObj = JSON.parse(question.correctAnswer);
        const userObj = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
        const keys = Object.keys(correctObj);
        if (keys.length !== Object.keys(userObj).length) return false;
        return keys.every(key => normalize(correctObj[key]) === normalize(userObj[key]));
      } catch (e) { return false; }

    default:
      return normalize(question.correctAnswer || question.correctOption) === normalize(userRaw);
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
  const submitTestMutation = useSubmitTest();

  const startTime = useRef<number>(Date.now());
  const hasCheckedStatus = useRef<boolean>(false);

  const [originalQuestions, setOriginalQuestions] = useState<LessonQuestionResponse[]>([]);
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
  const [earnedExp, setEarnedExp] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);

  const [isReviewMode, setIsReviewMode] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        setOriginalQuestions(testData.questions);
        setActiveQuestions(testData.questions);
      }

      if (startTime.current === 0) startTime.current = Date.now();
    }
  }, [testData]);

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= activeQuestions.length - 1;

  const triggerCelebration = () => {
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  };


  const handleRetakeFull = () => {
    setShowCompletedModal(false);
    setShowSummary(false);
    setIsReviewMode(false);

    // FIX: Reset serverScore so the UI calculates score based on current attempt
    setServerScore(undefined);

    setActiveQuestions(originalQuestions);

    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setFeedbackMessage(null);
    setIsCorrect(false);
    setUserAnswers({});
    setWrongQuestionIds([]);
    startTime.current = Date.now();
  };

  const handleRetryWrong = () => {
    const wrongQs = originalQuestions.filter(q => wrongQuestionIds.includes(q.lessonQuestionId));

    if (wrongQs.length === 0) {
      handleRetakeFull();
      return;
    }

    setShowSummary(false);
    setIsReviewMode(false);

    // FIX: Reset serverScore for the new mini-session
    setServerScore(undefined);

    setActiveQuestions(wrongQs);

    setCurrentQuestionIndex(0);
    setCorrectCount(0); // Reset for this mini-session
    setIsAnswered(false);
    setSelectedAnswer(null);
    setFeedbackMessage(null);
    setIsCorrect(false);
    setUserAnswers({});
    startTime.current = Date.now();
  };

  const handleReviewAnswers = () => {
    const wrongQs = originalQuestions.filter(q => wrongQuestionIds.includes(q.lessonQuestionId));
    if (wrongQs.length === 0) return;

    setShowSummary(false);
    setIsReviewMode(true);
    setActiveQuestions(wrongQs);
    setCurrentQuestionIndex(0);
    setIsAnswered(true); // Treat as answered to show feedback
  };

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!currentQuestion || isProcessingAI || isReviewMode) return;

    setSelectedAnswer(answerValue);
    setUserAnswers(prev => ({ ...prev, [currentQuestion.lessonQuestionId]: answerValue }));
    setIsAnswered(true);

    if (currentQuestion.questionType === QuestionType.ESSAY || currentQuestion.questionType === QuestionType.WRITING) {
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
      if (isReviewMode) {
        setShowSummary(true);
        triggerCelebration();
        return;
      }

      const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);

      try {
        const result = await submitTestMutation.mutateAsync({
          lessonId: lesson.lessonId, userId: userId!,
          body: {
            answers: userAnswers,
            attemptNumber: (testData?.attemptNumber || 0) + 1,
            durationSeconds: durationSeconds
          }
        });

        setEarnedExp(result.expEarned || 0);
        setEarnedCoins(result.coinsEarned || 0);
        setWrongQuestionIds(result.wrongQuestionIds || []);

        // This will set the score for the summary
        setServerScore(result.percent);

        setShowSummary(true);
        triggerCelebration();

        if (onComplete) onComplete();
      } catch (error) { console.error(error); }
    } else {
      setCurrentQuestionIndex(i => i + 1);

      if (isReviewMode) {
        setIsAnswered(true);
      } else {
        setIsAnswered(false);
        setSelectedAnswer(null);
        setFeedbackMessage(null);
        setIsCorrect(false);
      }
    }
  };

  const renderWrongItem = ({ item }: { item: LessonQuestionResponse }) => (
    <View style={styles.wrongItemRow}>
      <View style={styles.wrongItemHeader}>
        <Icon name="error-outline" size={20} color="#EF4444" />
        <Text style={styles.wrongItemTitle} numberOfLines={1}>Question {item.orderIndex + 1}</Text>
      </View>
      <Text style={styles.wrongItemQuestion} numberOfLines={2}>{item.question}</Text>
      <Text style={styles.wrongItemHint}>Tap Review to see explanation</Text>
    </View>
  );

  const wrongQuestionsList = originalQuestions.filter(q => wrongQuestionIds.includes(q.lessonQuestionId));

  // Logic: Use serverScore ONLY if it's set (meaning test submitted), otherwise calculate from local state.
  // Since we reset serverScore to undefined on retake, this will reflect current progress/result.
  const scorePercentage = Math.round(serverScore !== undefined ? serverScore : (activeQuestions.length > 0 ? (correctCount / activeQuestions.length) * 100 : 0));

  if (isLoading && !activeQuestions.length) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;
  if (!isLoading && (!activeQuestions || activeQuestions.length === 0)) return <View style={styles.center}><Text>Empty Lesson</Text></View>;

  return (
    <ScreenLayout style={styles.container}>

      {/* --- CELEBRATION / SUMMARY MODAL --- */}
      <Modal visible={showSummary} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.summaryContainer}>
          <Animated.View style={[styles.celebrationCard, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
            <Icon
              name={scorePercentage >= 50 ? "emoji-events" : "sentiment-dissatisfied"}
              size={80}
              color={scorePercentage >= 50 ? "#F59E0B" : "#9CA3AF"}
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.summaryTitle}>
              {scorePercentage >= 80 ? "Outstanding!" : scorePercentage >= 50 ? "Good Job!" : "Keep Trying!"}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Score</Text>
                <Text style={[styles.statValue, { color: scorePercentage >= 50 ? '#10B981' : '#EF4444' }]}>
                  {scorePercentage}%
                </Text>
              </View>
              {earnedExp > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>EXP</Text>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>+{earnedExp}</Text>
                </View>
              )}
              {earnedCoins > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Coins</Text>
                  <Text style={[styles.statValue, { color: '#EAB308' }]}>+{earnedCoins}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Wrong Answers List */}
          {wrongQuestionsList.length > 0 ? (
            <View style={styles.wrongListContainer}>
              <Text style={styles.sectionHeader}>Needs Improvement ({wrongQuestionsList.length})</Text>
              <FlatList
                data={wrongQuestionsList}
                renderItem={renderWrongItem}
                keyExtractor={item => item.lessonQuestionId}
                style={styles.wrongList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            <View style={styles.perfectScoreContainer}>
              <Text style={styles.perfectScoreText}>Perfect Score! No wrong answers.</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {wrongQuestionsList.length > 0 && (
              <View style={styles.multiBtnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleReviewAnswers}>
                  <Icon name="visibility" size={20} color="#4F46E5" style={{ marginRight: 5 }} />
                  <Text style={styles.secondaryBtnText}>Review</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 10 }]} onPress={handleRetryWrong}>
                  <Icon name="refresh" size={20} color="#FFF" style={{ marginRight: 5 }} />
                  <Text style={styles.primaryBtnText}>Retry Wrong</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={wrongQuestionsList.length === 0 ? styles.primaryBtnFull : styles.textBtn} onPress={() => navigation.goBack()}>
              <Text style={wrongQuestionsList.length === 0 ? styles.primaryBtnText : { color: '#6B7280' }}>
                {wrongQuestionsList.length === 0 ? "Finish Lesson" : "Exit"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* --- PRE-EXISTING COMPLETED CHECK --- */}
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
            <Text style={styles.completedSubtitle}>You have already passed this lesson. Practice again to improve your skills!</Text>

            <TouchableOpacity style={styles.primaryBtnFull} onPress={handleRetakeFull}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Practice Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.textBtn} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#6B7280' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- LESSON HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }]} />
        </View>
        <Text style={{ fontWeight: 'bold', marginLeft: 10 }}>{currentQuestionIndex + 1}/{activeQuestions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner for Review Mode */}
        {isReviewMode && (
          <View style={styles.reviewBanner}>
            <Icon name="info" color="#FFF" size={20} />
            <Text style={{ color: '#FFF', marginLeft: 8, fontWeight: '600' }}>Review Mode: Answers Revealed</Text>
          </View>
        )}

        <UniversalQuestionView key={`q-${currentQuestion.lessonQuestionId}`} question={currentQuestion} />

        <LessonInputArea
          key={`input-${currentQuestion.lessonQuestionId}`}
          question={currentQuestion}
          isAnswered={isAnswered || isReviewMode}
          selectedAnswer={selectedAnswer}
          isLoading={isProcessingAI}
          onAnswer={handleSubmitAnswer}
          onSkip={handleNext}
          isRecording={false}
          isStreaming={false}
          onStartRecording={() => { }}
          onStopRecording={() => { }}
          reviewMode={isReviewMode}
        />

        {/* FEEDBACK / EXPLANATION AREA */}
        {(isAnswered || isProcessingAI || isReviewMode) && (
          <View style={[styles.feedback, isProcessingAI ? {} : (isCorrect ? styles.feedbackCorrect : styles.feedbackWrong)]}>
            {isProcessingAI ? <ActivityIndicator /> : (
              <>
                <Text style={styles.feedbackTitle}>
                  {isReviewMode ? "Explanation" : (isCorrect ? "Correct" : "Incorrect")}
                </Text>
                <Text style={styles.feedbackText}>
                  {feedbackMessage || currentQuestion.explainAnswer || "No explanation available."}
                </Text>

                {/* Show Correct Answer if Wrong OR in Review Mode */}
                {(!isCorrect || isReviewMode) && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: '#111827' }}>Correct Answer:</Text>
                    <Text style={{ color: '#4B5563' }}>{currentQuestion.correctOption || currentQuestion.correctAnswer}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {(isAnswered || isReviewMode) && !isProcessingAI && (
          <TouchableOpacity
            style={[styles.nextBtn, (isCorrect || isReviewMode) ? styles.btnCorrect : styles.btnWrong]}
            onPress={handleNext}
          >
            <Text style={styles.btnText}>
              {isLastQuestion ? (isReviewMode ? "Finish Review" : "Finish") : "Next"}
            </Text>
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
  progressBarContainer: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginLeft: 15, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5' },
  content: { padding: 20, paddingBottom: 100 },

  feedback: { marginTop: 20, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  feedbackCorrect: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  feedbackWrong: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  feedbackTitle: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  feedbackText: { color: '#374151', lineHeight: 20 },

  nextBtn: { marginTop: 20, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  btnCorrect: { backgroundColor: '#10B981' },
  btnWrong: { backgroundColor: '#374151' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  primaryBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnFull: { backgroundColor: '#4F46E5', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  secondaryBtn: { backgroundColor: '#EEF2FF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
  secondaryBtnText: { color: '#4F46E5', fontWeight: 'bold' },
  textBtn: { paddingVertical: 10, alignItems: 'center' },
  multiBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },

  summaryContainer: { flex: 1, backgroundColor: '#F9FAFB', padding: 20, alignItems: 'center' },
  celebrationCard: { width: '100%', alignItems: 'center', backgroundColor: '#FFF', padding: 25, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  summaryTitle: { fontSize: 26, fontWeight: '800', marginBottom: 20, color: '#111827' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold' },

  wrongListContainer: { flex: 1, width: '100%', marginBottom: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10 },
  wrongList: { flex: 1 },
  wrongItemRow: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA' },
  wrongItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  wrongItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF4444', marginLeft: 5 },
  wrongItemQuestion: { fontSize: 15, color: '#1F2937', marginBottom: 5 },
  wrongItemHint: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },

  perfectScoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  perfectScoreText: { fontSize: 18, color: '#10B981', fontWeight: '600' },
  actionButtonsContainer: { width: '100%', paddingBottom: 20 },

  reviewBanner: { backgroundColor: '#F59E0B', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 15 },

  completedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  completedModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  completedTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  completedScore: { fontSize: 20, fontWeight: '700', color: '#10B981', marginBottom: 12 },
  completedSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
});

export default LessonScreen;