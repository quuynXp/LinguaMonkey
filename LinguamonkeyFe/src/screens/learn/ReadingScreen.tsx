// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   Animated,
//   ActivityIndicator,
//   TextInput,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useTranslation } from 'react-i18next';
// import { useFocusEffect } from '@react-navigation/native';

// import { useSkillLessons } from '../../hooks/useSkillLessons';
// import { useLessons } from '../../hooks/useLessons';
// import {
//   LessonResponse,
//   ReadingResponse,
//   TranslationRequestBody,
//   LessonQuestionResponse,
// } from '../../types/dto';
// import { createScaledSheet } from '../../utils/scaledStyles';

// interface ReadingScreenProps {
//   navigation: any;
//   route: {
//     params?: {
//       lessonId?: string;
//       lesson?: LessonResponse;
//     };
//   };
// }

// // Helper: Trích xuất dữ liệu Reading từ Lesson Detail
// // Ưu tiên lấy từ field description (nơi lưu passage)
// const extractReadingData = (lesson: LessonResponse | undefined, questions: LessonQuestionResponse[] = []): ReadingResponse | null => {
//   if (!lesson) return null;

//   // Kiểm tra nếu description có dữ liệu dài (giả định là bài đọc)
//   const hasContent = lesson.description && lesson.description.length > 50;

//   if (hasContent) {
//     return {
//       passage: lesson.description || '',
//       questions: questions.map(q => ({
//         id: q.lessonId,
//         question: q.question,
//         options: [q.optionA, q.optionB, q.optionC, q.optionD],
//         correctAnswer: q.correctOption,
//       }))
//     } as unknown as ReadingResponse;
//   }

//   return null;
// };

// const ReadingScreen = ({ navigation, route }: ReadingScreenProps) => {
//   const insets = useSafeAreaInsets();
//   const { t } = useTranslation();
//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   // Chỉ lấy ID từ params, không tin tưởng object lesson truyền qua vì nó có thể cũ
//   const lessonId = route.params?.lessonId || route.params?.lesson?.lessonId;

//   const [readingData, setReadingData] = useState<ReadingResponse | null>(null);
//   const [currentMode, setCurrentMode] = useState<"read" | "translate" | "quiz">("read");

//   // Quiz State
//   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
//   const [quizScore, setQuizScore] = useState(0);
//   const [showQuizResult, setShowQuizResult] = useState(false);

//   // Translation State
//   const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
//   const [userTranslation, setUserTranslation] = useState("");
//   const [translationResults, setTranslationResults] = useState<any[]>([]);

//   // Hooks
//   const { useLesson, useAllQuestions } = useLessons(); // Chỉ dùng useLesson
//   const { useGenerateReading, useCheckTranslation } = useSkillLessons();
//   const generateReadingMutation = useGenerateReading();
//   const checkTranslationMutation = useCheckTranslation();

//   // 1. Fetch Lesson Detail (Nguồn dữ liệu chính)
//   const {
//     data: lessonDetail,
//     isLoading: isLoadingDetail,
//     refetch: refetchDetail,
//     isError
//   } = useLesson(lessonId || null);

//   // 2. Fetch Questions liên quan
//   const {
//     data: questionsData,
//     refetch: refetchQuestions
//   } = useAllQuestions({
//     lessonId: lessonId,
//     size: 50 // Lấy hết câu hỏi
//   });

//   const existingQuestions = (questionsData?.data || []) as LessonQuestionResponse[];

//   // Refetch khi màn hình được focus
//   useFocusEffect(
//     useCallback(() => {
//       if (lessonId) {
//         refetchDetail();
//         refetchQuestions();
//       }
//     }, [lessonId, refetchDetail, refetchQuestions])
//   );

//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 600,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   // Sync state khi data từ API trả về
//   useEffect(() => {
//     if (lessonDetail) {
//       const content = extractReadingData(lessonDetail, existingQuestions);
//       if (content) {
//         setReadingData(content);
//         // Reset translation state khi có content mới
//         const sentences = content.passage?.match(/[^.!?]+[.!?]/g) || [content.passage];
//         setTranslationResults(new Array(sentences.length).fill(null));
//       } else {
//         setReadingData(null);
//       }
//     }
//   }, [lessonDetail, existingQuestions]);

//   const loadReadingContent = () => {
//     if (!lessonId) return;

//     setCurrentMode('read');
//     setTranslationResults([]);

//     generateReadingMutation.mutate({
//       lessonId: lessonId,
//       languageCode: lessonDetail?.languageCode || 'en',
//     }, {
//       onSuccess: (data) => {
//         // Cập nhật ngay lập tức UI với dữ liệu trả về từ mutation để user không phải đợi refetch
//         setReadingData(data);
//         const sentences = data.passage?.match(/[^.!?]+[.!?]/g) || [data.passage];
//         setTranslationResults(new Array(sentences.length).fill(null));

//         Alert.alert(t('common.success'), t('reading.content_generated'));

//         // Gọi refetch ngầm để đồng bộ lại dữ liệu server cho lần vào sau
//         refetchDetail();
//         refetchQuestions();
//       },
//       onError: () => {
//         Alert.alert(t('common.error'), t('reading.error_loading_content'));
//       }
//     });
//   };

//   const handleBack = () => {
//     navigation.goBack();
//   };

//   const handleRegenerate = () => {
//     Alert.alert(
//       t('reading.regenerate_title'),
//       t('reading.regenerate_confirm'),
//       [
//         { text: t('common.cancel'), style: 'cancel' },
//         { text: t('common.ok'), onPress: loadReadingContent }
//       ]
//     );
//   };

//   // --- Quiz Logic & Translation Logic (Giữ nguyên logic cũ nhưng clean code) ---
//   const startQuiz = () => {
//     if (!readingData?.questions || readingData.questions.length === 0) {
//       Alert.alert(t('common.notice'), t('reading.no_quiz_available'));
//       return;
//     }
//     setCurrentQuestionIndex(0);
//     setSelectedAnswer(null);
//     setQuizScore(0);
//     setShowQuizResult(false);
//     setCurrentMode('quiz');
//   };

//   const submitQuizAnswer = () => {
//     if (selectedAnswer === null || !readingData?.questions) return;
//     const currentQ = readingData.questions[currentQuestionIndex];
//     if (currentQ.options[selectedAnswer] === currentQ.correctAnswer) {
//       setQuizScore(prev => prev + 1);
//     }
//     if (currentQuestionIndex < readingData.questions.length - 1) {
//       setCurrentQuestionIndex(prev => prev + 1);
//       setSelectedAnswer(null);
//     } else {
//       setShowQuizResult(true);
//     }
//   };

//   const submitTranslation = () => {
//     if (!lessonId || selectedSentenceIndex === null || !userTranslation.trim() || !readingData?.passage) return;
//     const sentences = readingData.passage.match(/[^.!?]+[.!?]/g) || [readingData.passage];

//     checkTranslationMutation.mutate({
//       lessonId: lessonId,
//       req: {
//         translatedText: userTranslation,
//         targetLanguage: lessonDetail?.languageCode || 'en'
//       } as unknown as TranslationRequestBody
//     }, {
//       onSuccess: (result) => {
//         setTranslationResults(prev => {
//           const next = [...prev];
//           next[selectedSentenceIndex] = {
//             original: sentences[selectedSentenceIndex],
//             translated: userTranslation,
//             isCorrect: result.score > 80,
//             suggestion: result.score <= 80 ? result.feedback : undefined
//           };
//           return next;
//         });
//         setUserTranslation("");
//       },
//       onError: () => Alert.alert(t('common.error'), t('translation.check_failed'))
//     });
//   };

//   // --- Renders ---

//   // Loading ban đầu
//   if (isLoadingDetail) {
//     return (
//       <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
//         <ActivityIndicator size="large" color="#4F46E5" />
//       </View>
//     );
//   }

//   // Lỗi không tìm thấy Lesson
//   if (!lessonDetail || isError) {
//     return (
//       <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
//         <Icon name="error-outline" size={48} color="#EF4444" />
//         <Text style={styles.emptyText}>{t('common.error_occurred')}</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
//           <Text style={styles.retryButtonText}>{t('common.go_back')}</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // Render nội dung chính
//   const renderContent = () => {
//     // Trường hợp chưa có nội dung (Passage rỗng) -> Hiện nút Generate AI
//     if (!readingData) {
//       return (
//         <View style={styles.centerContainer}>
//           <View style={styles.startIconContainer}>
//             <Icon name="smart-toy" size={64} color="#4F46E5" />
//           </View>
//           <Text style={styles.startTitle}>{lessonDetail.title || t('reading.new_lesson')}</Text>
//           <Text style={styles.startSubtitle}>
//             {t('reading.no_content_desc', { defaultValue: 'This lesson has no content yet. Generate one using AI?' })}
//           </Text>

//           <TouchableOpacity
//             style={styles.primaryButton}
//             onPress={loadReadingContent}
//             disabled={generateReadingMutation.isPending}
//           >
//             {generateReadingMutation.isPending ? (
//               <ActivityIndicator color="#FFFFFF" />
//             ) : (
//               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
//                 <Icon name="auto-awesome" size={20} color="#FFF" />
//                 <Text style={styles.primaryButtonText}>{t('reading.generate_content', { defaultValue: 'Generate with AI' })}</Text>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>
//       );
//     }

//     // Trường hợp đã có nội dung -> Hiển thị bài đọc/Quiz/Translate
//     return (
//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         {currentMode === 'read' && (
//           <>
//             <View style={styles.passageHeader}>
//               <Text style={styles.passageTitle}>{lessonDetail.title}</Text>
//               <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerate}>
//                 <Icon name="refresh" size={20} color="#4F46E5" />
//               </TouchableOpacity>
//             </View>
//             <Text style={styles.passageText}>{readingData.passage}</Text>
//           </>
//         )}

//         {currentMode === 'translate' && (
//           <View>
//             <Text style={styles.sectionTitle}>{t('reading.translate_practice')}</Text>
//             {(readingData.passage.match(/[^.!?]+[.!?]/g) || [readingData.passage]).map((sentence, index) => (
//               <TouchableOpacity
//                 key={index}
//                 style={[
//                   styles.sentenceContainer,
//                   selectedSentenceIndex === index && styles.sentenceSelected,
//                   translationResults[index]?.isCorrect && styles.sentenceCorrect
//                 ]}
//                 onPress={() => setSelectedSentenceIndex(index)}
//               >
//                 <Text style={styles.sentenceText}>{sentence.trim()}</Text>
//                 {translationResults[index] && (
//                   <View style={styles.feedbackContainer}>
//                     <Text style={styles.feedbackLabel}>{t('reading.your_translation')}:</Text>
//                     <Text style={styles.feedbackUserText}>{translationResults[index].translated}</Text>
//                     {!translationResults[index].isCorrect && (
//                       <Text style={styles.feedbackSuggestion}>
//                         <Icon name="info" size={14} /> {translationResults[index].suggestion}
//                       </Text>
//                     )}
//                   </View>
//                 )}
//               </TouchableOpacity>
//             ))}
//             {selectedSentenceIndex !== null && (
//               <View style={styles.inputContainer}>
//                 <Text style={styles.inputLabel}>{t('reading.translate_selected')}</Text>
//                 <TextInput
//                   style={styles.textInput}
//                   value={userTranslation}
//                   onChangeText={setUserTranslation}
//                   placeholder={t('reading.enter_translation')}
//                   multiline
//                 />
//                 <TouchableOpacity
//                   style={styles.submitButton}
//                   onPress={submitTranslation}
//                   disabled={checkTranslationMutation.isPending}
//                 >
//                   {checkTranslationMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>{t('common.check')}</Text>}
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         )}

//         {currentMode === 'quiz' && (
//           <View>
//             {showQuizResult ? (
//               <View style={styles.quizResultContainer}>
//                 <Icon name="emoji-events" size={64} color="#F59E0B" />
//                 <Text style={styles.quizResultScore}>{quizScore} / {readingData.questions.length}</Text>
//                 <TouchableOpacity style={styles.primaryButton} onPress={() => { setShowQuizResult(false); setCurrentMode('read'); }}>
//                   <Text style={styles.primaryButtonText}>{t('common.finish')}</Text>
//                 </TouchableOpacity>
//               </View>
//             ) : (
//               <>
//                 <Text style={styles.progressText}>{t('common.question')} {currentQuestionIndex + 1} / {readingData.questions.length}</Text>
//                 <View style={styles.questionCard}>
//                   <Text style={styles.questionText}>{readingData.questions[currentQuestionIndex].question}</Text>
//                   {readingData.questions[currentQuestionIndex].options.map((option, idx) => (
//                     <TouchableOpacity key={idx} style={[styles.optionButton, selectedAnswer === idx && styles.optionSelected]} onPress={() => setSelectedAnswer(idx)}>
//                       <Text style={[styles.optionText, selectedAnswer === idx && styles.optionTextSelected]}>{option}</Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//                 <TouchableOpacity style={[styles.primaryButton, { marginTop: 24 }]} onPress={submitQuizAnswer} disabled={selectedAnswer === null}>
//                   <Text style={styles.primaryButtonText}>{currentQuestionIndex === readingData.questions.length - 1 ? t('common.finish') : t('common.next')}</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         )}

//         {/* Action Buttons Footer - Only show in Read mode or to switch modes */}
//         {currentMode !== 'quiz' && (
//           <View style={styles.actionsContainer}>
//             <TouchableOpacity style={[styles.actionButton, currentMode === 'read' && styles.actionButtonActive]} onPress={() => setCurrentMode('read')}>
//               <Icon name="article" size={20} color={currentMode === 'read' ? '#FFF' : '#4F46E5'} />
//               <Text style={[styles.actionButtonText, currentMode === 'read' && styles.actionButtonTextActive]}>{t('reading.read_mode')}</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={[styles.actionButton, currentMode === 'translate' && styles.actionButtonActive]} onPress={() => setCurrentMode('translate')}>
//               <Icon name="translate" size={20} color={currentMode === 'translate' ? '#FFF' : '#4F46E5'} />
//               <Text style={[styles.actionButtonText, currentMode === 'translate' && styles.actionButtonTextActive]}>{t('reading.translate_mode')}</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={[styles.actionButton]} onPress={startQuiz}>
//               <Icon name="quiz" size={20} color={'#4F46E5'} />
//               <Text style={[styles.actionButtonText]}>{t('reading.take_quiz')}</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//         <View style={{ height: 40 }} />
//       </ScrollView>
//     );
//   };

//   return (
//     <View style={[styles.container, { paddingTop: insets.top }]}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={handleBack}>
//           <Icon name="arrow-back" size={24} color="#374151" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>
//           {lessonDetail?.title || t('reading.practice')}
//         </Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
//         {renderContent()}
//       </Animated.View>
//     </View>
//   );
// };

// const styles = createScaledSheet({
//   // ... (Giữ nguyên styles như file cũ của bạn, đảm bảo đủ các style được dùng)
//   container: { flex: 1, backgroundColor: '#F8FAFC' },
//   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, textAlign: 'center' },
//   centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
//   content: { flex: 1, padding: 20 },
//   passageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
//   passageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', flex: 1 },
//   regenerateButton: { padding: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
//   passageText: { fontSize: 16, color: '#374151', lineHeight: 28, marginBottom: 24 },
//   startIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
//   startTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
//   startSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24, paddingHorizontal: 20 },
//   primaryButton: { backgroundColor: '#4F46E5', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' },
//   primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
//   actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32, marginTop: 16 },
//   actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#4F46E5', backgroundColor: '#FFFFFF', gap: 4 },
//   actionButtonActive: { backgroundColor: '#4F46E5' },
//   actionButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
//   actionButtonTextActive: { color: '#FFFFFF' },
//   // ... (Thêm các styles cho Quiz, Translation, Error, EmptyText từ file cũ)
//   emptyText: { marginTop: 12, color: '#6B7280', fontSize: 16, textAlign: 'center' },
//   retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#4F46E5', borderRadius: 8 },
//   retryButtonText: { color: '#FFF', fontWeight: '600' },
//   sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1F2937' },
//   sentenceContainer: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
//   sentenceSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
//   sentenceCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
//   sentenceText: { fontSize: 16, color: '#374151', lineHeight: 24 },
//   feedbackContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
//   feedbackLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
//   feedbackUserText: { fontSize: 14, color: '#1F2937', marginTop: 2 },
//   feedbackSuggestion: { fontSize: 13, color: '#EF4444', marginTop: 4, fontStyle: 'italic' },
//   inputContainer: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.1, elevation: 4, marginBottom: 32 },
//   inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
//   textInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, color: '#1F2937', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
//   submitButton: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
//   submitButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
//   quizResultContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
//   quizResultScore: { fontSize: 48, fontWeight: 'bold', color: '#1F2937', marginVertical: 16 },
//   progressText: { textAlign: 'center', color: '#6B7280', marginBottom: 16 },
//   questionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
//   questionText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 20 },
//   optionButton: { borderWidth: 1, borderColor: '#E5E7EB', padding: 16, borderRadius: 8, marginBottom: 12 },
//   optionSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
//   optionText: { fontSize: 16, color: '#374151' },
//   optionTextSelected: { color: '#4F46E5', fontWeight: '500' },
// });

// export default ReadingScreen;