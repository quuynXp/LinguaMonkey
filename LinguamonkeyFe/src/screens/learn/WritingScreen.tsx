import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { useSkillLessons } from '../../hooks/useSkillLessons';
import { useLessons } from '../../hooks/useLessons';
import {
  LessonResponse,
  WritingResponseBody
} from '../../types/dto';
import { SkillType } from '../../types/enums';

interface WritingScreenProps {
  navigation: any;
  route: {
    params?: {
      lessonId?: string;
      lesson?: LessonResponse;
    };
  };
}

const WritingScreen = ({ navigation, route }: WritingScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Params
  const paramLessonId = route.params?.lessonId || route.params?.lesson?.lessonId;
  const paramLesson = route.params?.lesson;

  // State
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(paramLessonId);
  const [userText, setUserText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<WritingResponseBody | null>(null);

  // Hooks
  const { useAllLessons, useLesson } = useLessons();
  const { useCheckWriting } = useSkillLessons();
  const checkWritingMutation = useCheckWriting();

  // Data: List
  const {
    data: lessonsListResponse,
    isLoading: isLoadingList,
    refetch: refetchList
  } = useAllLessons({
    skillType: SkillType.WRITING,
    page: 0,
    size: 50,
  });
  const lessonsList = (lessonsListResponse?.data || []) as LessonResponse[];

  // Data: Detail
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

  // Handlers
  const handleSelectLesson = (lesson: LessonResponse) => {
    setCurrentLessonId(lesson.lessonId);
    setUserText("");
    setResultData(null);
  };

  const handleBack = () => {
    if (currentLessonId && !paramLessonId) {
      setCurrentLessonId(undefined);
      setUserText("");
    } else {
      navigation.goBack();
    }
  };

  const submitWriting = () => {
    if (!currentLessonId || !userText.trim()) {
      Alert.alert(t('common.notice'), t('writing.please_enter_text'));
      return;
    }

    checkWritingMutation.mutate({
      lessonId: currentLessonId,
      text: userText,
      languageCode: activeLesson?.languageCode || 'en',
      generateImage: false,
    }, {
      onSuccess: (data) => {
        setResultData(data);
        setShowResult(true);
      },
      onError: (err) => {
        Alert.alert(t('common.error'), t('writing.analysis_failed'));
      }
    });
  };

  // Renderers
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
          <Icon name="edit-note" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>{t('writing.no_lessons_found')}</Text>
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
              <Icon name="create" size={24} color="#4F46E5" />
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

  const renderPracticeScreen = () => {
    if (isLoadingDetail && !activeLesson) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.promptContainer}>
          <Text style={styles.promptTitle}>{activeLesson?.title}</Text>
          <Text style={styles.promptDesc}>{activeLesson?.description}</Text>
          {activeLesson?.thumbnailUrl && (
            <Image source={{ uri: activeLesson.thumbnailUrl }} style={styles.promptImage} resizeMode="cover" />
          )}
        </View>

        <View style={styles.writingArea}>
          <Text style={styles.label}>{t('writing.your_response')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('writing.start_typing')}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            value={userText}
            onChangeText={setUserText}
          />
          <View style={styles.wordCountContainer}>
            <Text style={styles.wordCountText}>
              {userText.trim().split(/\s+/).filter(w => w.length > 0).length} {t('writing.words')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!userText.trim() || checkWritingMutation.isPending) && styles.submitButtonDisabled]}
          onPress={submitWriting}
          disabled={!userText.trim() || checkWritingMutation.isPending}
        >
          {checkWritingMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('writing.check_writing')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderResultModal = () => {
    if (!showResult || !resultData) return null;

    return (
      <Modal visible={showResult} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('writing.result')}</Text>
            <TouchableOpacity onPress={() => setShowResult(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.resultContent}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{resultData.score}</Text>
              <Text style={styles.scoreLabel}>{t('writing.score')}</Text>
            </View>

            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>{t('writing.feedback')}</Text>
              <Text style={styles.feedbackText}>{resultData.feedback}</Text>
            </View>

            {/* If the API returned a corrected version (hypothetically, using generic response structure) */}
            {(resultData as any).correctedText && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>{t('writing.correction')}</Text>
                <Text style={styles.correctionText}>{(resultData as any).correctedText}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResult(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {!currentLessonId ? t('writing.select_lesson') : (activeLesson?.title || t('writing.practice'))}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {!currentLessonId ? renderLessonList() : renderPracticeScreen()}
      </Animated.View>

      {renderResultModal()}
    </View>
  );
};

const styles = StyleSheet.create({
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
  promptContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  promptDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  promptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  writingArea: {
    flex: 1,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  wordCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  wordCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  resultContent: {
    padding: 20,
  },
  scoreContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#4F46E5',
    marginBottom: 32,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  correctionText: {
    fontSize: 15,
    color: '#10B981',
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default WritingScreen;