import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  FlatList,
  TextInput,

} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { useSkillLessons } from '../../hooks/useSkillLessons';
import { useLessons } from '../../hooks/useLessons';
import {
  LessonResponse,
  ReadingResponse,
  TranslationRequestBody,
  ComprehensionQuestion
} from '../../types/dto';
import { SkillType } from '../../types/enums';
import { createScaledSheet } from '../../utils/scaledStyles';

interface ReadingScreenProps {
  navigation: any;
  route: {
    params?: {
      lessonId?: string;
      lesson?: LessonResponse;
    };
  };
}

const ReadingScreen = ({ navigation, route }: ReadingScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Params handling
  const paramLessonId = route.params?.lessonId || route.params?.lesson?.lessonId;
  const paramLesson = route.params?.lesson;

  // State
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(paramLessonId);
  const [readingData, setReadingData] = useState<ReadingResponse | null>(null);
  const [currentMode, setCurrentMode] = useState<"read" | "translate" | "quiz">("read");

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Translation State
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
  const [userTranslation, setUserTranslation] = useState("");
  const [translationResults, setTranslationResults] = useState<any[]>([]);

  // Hooks
  const { useAllLessons, useLesson } = useLessons();
  const { useGenerateReading, useCheckTranslation } = useSkillLessons();
  const generateReadingMutation = useGenerateReading();
  const checkTranslationMutation = useCheckTranslation();

  // Data Fetching: List
  const {
    data: lessonsListResponse,
    isLoading: isLoadingList,
    refetch: refetchList
  } = useAllLessons({
    skillType: SkillType.READING,
    page: 0,
    size: 50,
  });
  const lessonsList = (lessonsListResponse?.data || []) as LessonResponse[];

  // Data Fetching: Detail
  const {
    data: lessonDetailData,
    isLoading: isLoadingDetail,
    refetch: refetchDetail
  } = useLesson(currentLessonId || null);

  const activeLesson = lessonDetailData || paramLesson;

  // Effects
  useFocusEffect(
    useCallback(() => {
      if (!currentLessonId) {
        refetchList();
      } else {
        refetchDetail();
      }
    }, [currentLessonId, refetchList, refetchDetail])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load Reading Content when Lesson is selected
  useEffect(() => {
    if (currentLessonId) {
      loadReadingContent(currentLessonId);
    }
  }, [currentLessonId]);

  const loadReadingContent = (lessonId: string) => {
    setReadingData(null);
    setCurrentMode('read');
    setTranslationResults([]);

    generateReadingMutation.mutate({
      lessonId: lessonId,
      languageCode: activeLesson?.languageCode || 'en'
    }, {
      onSuccess: (data) => {
        setReadingData(data);
        // Initialize translation results array based on sentences count
        const sentences = data.passage?.match(/[^.!?]+[.!?]/g) || [data.passage];
        setTranslationResults(new Array(sentences.length).fill(null));
      },
      onError: () => {
        Alert.alert(t('common.error'), t('reading.error_loading_content'));
      }
    });
  };

  const handleSelectLesson = (lesson: LessonResponse) => {
    setCurrentLessonId(lesson.lessonId);
  };

  const handleBack = () => {
    if (currentLessonId && !paramLessonId) {
      setCurrentLessonId(undefined);
      setReadingData(null);
    } else {
      navigation.goBack();
    }
  };

  // --- Quiz Logic ---
  const startQuiz = () => {
    if (!readingData?.questions || readingData.questions.length === 0) {
      Alert.alert(t('common.notice'), t('reading.no_quiz_available'));
      return;
    }
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setShowQuizResult(false);
    setCurrentMode('quiz');
  };

  const submitQuizAnswer = () => {
    if (selectedAnswer === null || !readingData?.questions) return;

    const currentQ = readingData.questions[currentQuestionIndex];
    const isCorrect = currentQ.options[selectedAnswer] === currentQ.correctAnswer;

    if (isCorrect) setQuizScore(prev => prev + 1);

    if (currentQuestionIndex < readingData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setShowQuizResult(true);
    }
  };

  // --- Translation Logic ---
  const submitTranslation = () => {
    if (!currentLessonId || selectedSentenceIndex === null || !userTranslation.trim() || !readingData?.passage) return;

    const sentences = readingData.passage.match(/[^.!?]+[.!?]/g) || [readingData.passage];
    const originalSentence = sentences[selectedSentenceIndex];

    checkTranslationMutation.mutate({
      lessonId: currentLessonId,
      req: {
        translatedText: userTranslation,
        targetLanguage: activeLesson?.languageCode || 'en'
      } as unknown as TranslationRequestBody
    }, {
      onSuccess: (result) => {
        setTranslationResults(prev => {
          const next = [...prev];
          next[selectedSentenceIndex] = {
            original: originalSentence,
            translated: userTranslation,
            isCorrect: result.score > 80,
            suggestion: result.score <= 80 ? result.feedback : undefined
          };
          return next;
        });
        setUserTranslation("");
      },
      onError: () => Alert.alert(t('common.error'), t('translation.check_failed'))
    });
  };

  // --- Render Methods ---

  const renderLessonList = () => {
    if (isLoadingList) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      );
    }

    if (!lessonsList || lessonsList.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="menu-book" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>{t('reading.no_lessons_found')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchList()}>
            <Text style={styles.retryButtonText}>{t('common.reload')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={lessonsList}
        keyExtractor={(item) => item.lessonId}
        contentContainerStyle={styles.listContent}
        refreshing={isLoadingList}
        onRefresh={refetchList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.lessonItem} onPress={() => handleSelectLesson(item)}>
            <View style={styles.lessonIcon}>
              <Icon name="article" size={24} color="#4F46E5" />
            </View>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle} numberOfLines={2}>{item.title || item.lessonName}</Text>
              <Text style={styles.lessonExp}>{item.expReward || 10} XP • {item.difficultyLevel || 'A1'}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderReadingContent = () => {
    if (generateReadingMutation.isPending || !readingData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>{t('reading.generating_content')}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.passageTitle}>{activeLesson?.title}</Text>
        <Text style={styles.passageText}>{readingData.passage}</Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, currentMode === 'translate' && styles.actionButtonActive]}
            onPress={() => setCurrentMode('translate')}
          >
            <Icon name="translate" size={20} color={currentMode === 'translate' ? '#FFF' : '#4F46E5'} />
            <Text style={[styles.actionButtonText, currentMode === 'translate' && styles.actionButtonTextActive]}>
              {t('reading.translate_mode')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, currentMode === 'quiz' && styles.actionButtonActive]}
            onPress={startQuiz}
          >
            <Icon name="quiz" size={20} color={currentMode === 'quiz' ? '#FFF' : '#4F46E5'} />
            <Text style={[styles.actionButtonText, currentMode === 'quiz' && styles.actionButtonTextActive]}>
              {t('reading.take_quiz')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderTranslationMode = () => {
    if (!readingData?.passage) return null;
    const sentences = readingData.passage.match(/[^.!?]+[.!?]/g) || [readingData.passage];

    return (
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>{t('reading.translate_practice')}</Text>
        {sentences.map((sentence, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sentenceContainer,
              selectedSentenceIndex === index && styles.sentenceSelected,
              translationResults[index]?.isCorrect && styles.sentenceCorrect
            ]}
            onPress={() => setSelectedSentenceIndex(index)}
          >
            <Text style={styles.sentenceText}>{sentence.trim()}</Text>
            {translationResults[index] && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackLabel}>{t('reading.your_translation')}:</Text>
                <Text style={styles.feedbackUserText}>{translationResults[index].translated}</Text>
                {!translationResults[index].isCorrect && (
                  <Text style={styles.feedbackSuggestion}>
                    <Icon name="info" size={14} /> {translationResults[index].suggestion}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {selectedSentenceIndex !== null && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('reading.translate_selected')}</Text>
            <TextInput
              style={styles.textInput}
              value={userTranslation}
              onChangeText={setUserTranslation}
              placeholder={t('reading.enter_translation')}
              multiline
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitTranslation}
              disabled={checkTranslationMutation.isPending}
            >
              {checkTranslationMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>{t('common.check')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderQuizMode = () => {
    if (!readingData?.questions) return null;

    if (showQuizResult) {
      return (
        <View style={styles.quizResultContainer}>
          <Icon name="emoji-events" size={64} color="#F59E0B" />
          <Text style={styles.quizResultScore}>{quizScore} / {readingData.questions.length}</Text>
          <Text style={styles.quizResultLabel}>{t('reading.correct_answers')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => {
            setShowQuizResult(false);
            setCurrentMode('read');
          }}>
            <Text style={styles.primaryButtonText}>{t('common.finish')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const question = readingData.questions[currentQuestionIndex];
    return (
      <ScrollView style={styles.content}>
        <Text style={styles.progressText}>
          {t('common.question')} {currentQuestionIndex + 1} / {readingData.questions.length}
        </Text>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.question}</Text>
          {question.options.map((option, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.optionButton,
                selectedAnswer === idx && styles.optionSelected
              ]}
              onPress={() => setSelectedAnswer(idx)}
            >
              <Text style={[
                styles.optionText,
                selectedAnswer === idx && styles.optionTextSelected
              ]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 24 }]}
          onPress={submitQuizAnswer}
          disabled={selectedAnswer === null}
        >
          <Text style={styles.primaryButtonText}>
            {currentQuestionIndex === readingData.questions.length - 1 ? t('common.finish') : t('common.next')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {!currentLessonId ? t('reading.select_lesson') : (activeLesson?.title || t('reading.practice'))}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {!currentLessonId ? renderLessonList() : (
          <>
            {currentMode === 'read' && renderReadingContent()}
            {currentMode === 'translate' && renderTranslationMode()}
            {currentMode === 'quiz' && renderQuizMode()}
          </>
        )}
      </Animated.View>
    </View>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lessonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  lessonExp: {
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  passageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  passageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 28,
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: '#4F46E5',
  },
  actionButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1F2937',
  },
  sentenceContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sentenceSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  sentenceCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  sentenceText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  feedbackContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  feedbackUserText: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 2,
  },
  feedbackSuggestion: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 4,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  progressText: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quizResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  quizResultScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1F2937',
    marginVertical: 16,
  },
  quizResultLabel: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 32,
  },
});

export default ReadingScreen;