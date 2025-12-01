import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Animated,
  Modal, ActivityIndicator, TextInput, FlatList, Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSkillLessons } from '../../hooks/useSkillLessons';
import { useLessons } from '../../hooks/useLessons';
import { LessonResponse, WritingResponseBody } from '../../types/dto';
import { SkillType } from '../../types/enums';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';

const WritingScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null);
  const [userText, setUserText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<WritingResponseBody | null>(null);

  // Hooks
  const { useAllLessons, useLesson } = useLessons();
  const { useCheckWriting } = useSkillLessons();
  const checkWritingMutation = useCheckWriting();

  // Load danh sách bài học Writing
  const { data: lessonsResponse, isLoading: isLoadingList } = useAllLessons({
    skillType: SkillType.WRITING,
    page: 0, size: 20
  });
  const lessons = lessonsResponse?.data as LessonResponse[] || [];

  // Load chi tiết bài học (để lấy Question ID)
  const { data: lessonDetail } = useLesson(selectedLesson?.lessonId || null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleSubmit = () => {
    if (!lessonDetail?.questions || lessonDetail.questions.length === 0) {
      Alert.alert("Error", "No questions found in this lesson.");
      return;
    }

    // Lấy câu hỏi đầu tiên (Logic đơn giản hóa cho bài luyện tập)
    const targetQuestion = lessonDetail.questions[0];

    checkWritingMutation.mutate({
      text: userText,
      lessonQuestionId: targetQuestion.lessonQuestionId, // QUAN TRỌNG: Gửi ID câu hỏi
      languageCode: lessonDetail.languageCode || 'en',
    }, {
      onSuccess: (data) => {
        setResultData(data);
        setShowResult(true);
      },
      onError: (err) => {
        Alert.alert("Error", "Failed to evaluate writing. " + err.message);
      }
    });
  };

  // --- Render Sections ---

  const renderList = () => (
    <FlatList
      data={lessons}
      keyExtractor={(item) => item.lessonId}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.lessonItem} onPress={() => setSelectedLesson(item)}>
          <View style={styles.iconBox}><Icon name="edit" size={24} color="#4F46E5" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lessonTitle}>{item.title}</Text>
            <Text style={styles.lessonSub}>{item.expReward} XP • {item.difficultyLevel}</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    />
  );

  const renderPractice = () => {
    // Hiển thị đề bài từ câu hỏi đầu tiên
    const questionText = lessonDetail?.questions?.[0]?.question || selectedLesson?.description || "Write about the topic.";

    return (
      <ScrollView style={styles.content}>
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>{t('writing.prompt')}:</Text>
          <Text style={styles.promptText}>{questionText}</Text>
        </View>

        <TextInput
          style={styles.input}
          multiline
          placeholder={t('writing.start_typing')}
          value={userText}
          onChangeText={setUserText}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, checkWritingMutation.isPending && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={checkWritingMutation.isPending}
        >
          {checkWritingMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{t('common.submit')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <ScreenLayout>
      <View style={styles.header}>
        {selectedLesson && (
          <TouchableOpacity onPress={() => setSelectedLesson(null)}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{selectedLesson ? t('writing.practice') : t('writing.select_lesson')}</Text>
      </View>

      {isLoadingList ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} /> :
        (!selectedLesson ? renderList() : renderPractice())
      }

      {/* Result Modal */}
      <Modal visible={showResult} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.scoreText}>{resultData?.score}/100</Text>
          <Text style={styles.feedbackText}>{resultData?.feedback}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowResult(false)}>
            <Text style={styles.btnText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#1F2937' },
  listContent: { padding: 16 },
  lessonItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lessonTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  lessonSub: { fontSize: 12, color: '#6B7280' },
  content: { padding: 20, flex: 1 },
  promptCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2 },
  promptLabel: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 4 },
  promptText: { fontSize: 16, color: '#374151', lineHeight: 24 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, height: 200, textAlignVertical: 'top', fontSize: 16, borderWidth: 1, borderColor: '#D1D5DB' },
  submitBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  disabledBtn: { backgroundColor: '#A5B4FC' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: '#FFF', padding: 20, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 48, fontWeight: 'bold', color: '#4F46E5', marginBottom: 16 },
  feedbackText: { fontSize: 16, textAlign: 'center', color: '#374151', marginBottom: 32 },
  closeBtn: { backgroundColor: '#4B5563', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 }
});

export default WritingScreen;