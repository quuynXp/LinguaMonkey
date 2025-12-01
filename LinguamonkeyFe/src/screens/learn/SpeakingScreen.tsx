// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import {
//     View,
//     Text,
//     ScrollView,
//     TouchableOpacity,
//     Alert,
//     Animated,
//     Modal,
//     ActivityIndicator,
//     Platform,
//     LayoutAnimation,
//     UIManager,
//     StatusBar,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useFocusEffect } from '@react-navigation/native';
// import PermissionService from '../../services/permissionService';
// import i18n from '../../i18n'; // User's i18n
// import { useSkillLessons } from '../../hooks/useSkillLessons';
// import { useLessons } from '../../hooks/useLessons';
// import { useUserStore } from '../../stores/UserStore';
// import { useToast } from '../../utils/useToast';
// import ScreenLayout from '../../components/layout/ScreenLayout'; // User's Layout
// import MistakeReviewComponent from '../../components/reviews/MistakeReviewComponent';

// import {
//     StreamingChunk,
//     WordFeedback,
//     FinalResult,
//     SpeakingSentence,
//     LessonResponse,
//     LessonHierarchicalResponse,
//     SubCategoryDto
// } from '../../types/dto';
// import { SkillType } from '../../types/enums';
// import { createScaledSheet } from '../../utils/scaledStyles';

// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// const MIN_RECORD_DURATION_MS = 1000;

// const SpeakingScreen = ({ navigation, route }: any) => {
//     const insets = useSafeAreaInsets();
//     const { user } = useUserStore();
//     const { showToast } = useToast();

//     // Params
//     const paramLessonId = route.params?.lessonId;

//     // State Data
//     const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
//     const [attemptNumber, setAttemptNumber] = useState<number>(1); // Logic from BE
//     const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
//     const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());

//     // Recording State
//     const [isRecording, setIsRecording] = useState(false);
//     const [isStreaming, setIsStreaming] = useState(false);
//     const [streamingChunks, setStreamingChunks] = useState<StreamingChunk[]>([]);
//     const [wordFeedbacks, setWordFeedbacks] = useState<WordFeedback[]>([]);
//     const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
//     const [showResult, setShowResult] = useState(false);
//     const [hasMicPermission, setHasMicPermission] = useState(false);

//     // Animations
//     const fadeAnim = useRef(new Animated.Value(0)).current;
//     const pulseAnim = useRef(new Animated.Value(1)).current;

//     // Refs
//     const stopSignalRef = useRef(false);
//     const isPreparingRef = useRef(false);
//     const recordingStartTimeRef = useRef(0);
//     const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

//     // Hooks
//     const { useStreamPronunciation } = useSkillLessons();
//     const {
//         useSkillLessonTree,
//         useLesson,
//         useLessonWrongItems,
//         useSubmitTest,
//         useStartTest // Hook này cần trả về attemptNumber
//     } = useLessons();

//     const streamPronunciationMutation = useStreamPronunciation();
//     const submitTestMutation = useSubmitTest();
//     const startTestMutation = useStartTest();

//     // 1. Fetch Tree
//     const {
//         data: treeData,
//         isLoading: isTreeLoading,
//         refetch: refetchTree
//     } = useSkillLessonTree(SkillType.SPEAKING, i18n.language || 'en');

//     // 2. Fetch Detail
//     const { data: lessonDetail } = useLesson(currentLesson?.lessonId || paramLessonId || null);

//     // 3. Fetch Wrong Items
//     const { data: wrongItemsData, refetch: refetchWrongItems } = useLessonWrongItems(
//         currentLesson?.lessonId || '',
//         user?.userId || ''
//     );

//     useEffect(() => {
//         Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
//         checkAndRequestMicrophonePermission();
//     }, []);

//     useEffect(() => {
//         if (lessonDetail) {
//             setCurrentLesson(lessonDetail);
//         }
//     }, [lessonDetail]);

//     // -- Logic Logic --

//     const checkAndRequestMicrophonePermission = async () => {
//         const granted = await PermissionService.requestMicrophonePermission();
//         setHasMicPermission(granted);
//     };

//     const toggleCategory = (catId: string) => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setExpandedCategories(prev => {
//             const next = new Set(prev);
//             if (next.has(catId)) next.delete(catId);
//             else next.add(catId);
//             return next;
//         });
//     };

//     const toggleSubCategory = (subCatId: string) => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setExpandedSubCategories(prev => {
//             const next = new Set(prev);
//             if (next.has(subCatId)) next.delete(subCatId);
//             else next.add(subCatId);
//             return next;
//         });
//     };

//     const handleSelectLesson = (lesson: LessonResponse) => {
//         if (!user?.userId) {
//             showToast({ message: i18n.t('auth.required'), type: 'error' });
//             return;
//         }

//         // Gọi API startTest để lấy attemptNumber chính xác từ DB
//         startTestMutation.mutate({ lessonId: lesson.lessonId, userId: user.userId }, {
//             onSuccess: (data: any) => {
//                 // data.result should contain { attemptNumber: 5, ... }
//                 const realAttempt = data?.attemptNumber || 1;
//                 setAttemptNumber(realAttempt);
//                 setCurrentLesson(lesson);

//                 // Reset states
//                 setFinalResult(null);
//                 setWordFeedbacks([]);
//                 setStreamingChunks([]);
//                 setShowResult(false);
//             },
//             onError: () => {
//                 showToast({ message: i18n.t('common.error_occurred'), type: 'error' });
//             }
//         });
//     };

//     const handleBack = () => {
//         if (currentLesson && !paramLessonId) {
//             setCurrentLesson(null);
//             refetchTree(); // Refresh tree status when going back
//         } else {
//             navigation.goBack();
//         }
//     };

//     const startPulseAnimation = () => {
//         Animated.loop(
//             Animated.sequence([
//                 Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
//                 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
//             ])
//         ).start();
//     };

//     const stopPulseAnimation = () => {
//         pulseAnim.stopAnimation();
//         Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
//     };

//     const startRecording = async () => {
//         if (!currentLesson) return;
//         if (!hasMicPermission) {
//             await checkAndRequestMicrophonePermission();
//             return;
//         }

//         stopSignalRef.current = false;
//         isPreparingRef.current = true;
//         recordingStartTimeRef.current = Date.now();

//         try {
//             setIsRecording(true);
//             startPulseAnimation();
//             await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
//             await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);

//             if (stopSignalRef.current) {
//                 isPreparingRef.current = false;
//                 setIsRecording(false);
//                 stopPulseAnimation();
//                 return;
//             }

//             await recorder.record();
//             isPreparingRef.current = false;
//         } catch (error) {
//             console.error(error);
//             setIsRecording(false);
//             stopPulseAnimation();
//         }
//     };

//     const stopRecording = async () => {
//         if (!currentLesson) return;
//         stopSignalRef.current = true;
//         if (isPreparingRef.current) return;

//         const duration = Date.now() - recordingStartTimeRef.current;

//         try {
//             if (recorder.isRecording) {
//                 await recorder.stop();

//                 if (duration < MIN_RECORD_DURATION_MS) {
//                     setIsRecording(false);
//                     stopPulseAnimation();
//                     showToast({ message: i18n.t('speaking.hold_to_record_reminder'), type: 'info' });
//                     return;
//                 }

//                 const uri = recorder.uri;
//                 if (uri) {
//                     setIsRecording(false);
//                     stopPulseAnimation();
//                     setIsStreaming(true);
//                     setStreamingChunks([]);
//                     setWordFeedbacks([]);
//                     setFinalResult(null);

//                     const fileUri = Platform.OS === 'ios' ? uri : `${uri}`;

//                     streamPronunciationMutation.mutate({
//                         audioUri: fileUri,
//                         lessonId: currentLesson.lessonId,
//                         languageCode: currentLesson.languageCode || 'vi',
//                         referenceText: currentLesson.title || '',
//                         onChunk: handleStreamingChunk,
//                     }, {
//                         onSuccess: () => setIsStreaming(false),
//                         onError: () => {
//                             setIsStreaming(false);
//                             Alert.alert(i18n.t('common.error'), i18n.t('speaking.error_analysis'));
//                         }
//                     });
//                 }
//             }
//         } catch (error) {
//             setIsRecording(false);
//             stopPulseAnimation();
//         }
//     };

//     const handleStreamingChunk = (chunk: StreamingChunk) => {
//         setStreamingChunks(prev => [...prev, chunk]);

//         if (chunk.type === 'chunk' && chunk.word_analysis) {
//             setWordFeedbacks(prev => [...prev, {
//                 word: chunk.word_analysis!.word,
//                 spoken: chunk.word_analysis!.spoken,
//                 score: chunk.word_analysis!.word_score,
//                 isCorrect: chunk.word_analysis!.is_correct,
//             }]);
//         }

//         if (chunk.type === 'final') {
//             const result = {
//                 overall_score: chunk.score || 0,
//                 accuracy_score: chunk.metadata?.accuracy_score || 0,
//                 fluency_score: chunk.metadata?.fluency_score || 0,
//                 error_count: chunk.metadata?.error_count || 0,
//                 feedback: chunk.feedback,
//             };
//             setFinalResult(result);
//             setShowResult(true);

//             if (user?.userId && currentLesson) {
//                 submitTestMutation.mutate({
//                     lessonId: currentLesson.lessonId,
//                     userId: user.userId,
//                     body: {
//                         answers: {
//                             "speaking_result": result, // Lưu full result hoặc chỉ score
//                             "score": result.overall_score
//                         },
//                         attemptNumber: attemptNumber // Real attempt from BE
//                     }
//                 }, {
//                     onSuccess: () => {
//                         refetchWrongItems();
//                         // Tăng attemptNumber lên 1 cho lần thử tiếp theo ngay tại client
//                         setAttemptNumber(prev => prev + 1);
//                     }
//                 });
//             }
//         }
//     };

//     const handleRetryMistake = (wrongText: string, questionId: string) => {
//         setShowResult(false);
//         setFinalResult(null);
//         setWordFeedbacks([]);
//         setStreamingChunks([]);
//         showToast({ message: i18n.t('speaking.retry_prompt', { text: wrongText }), type: 'info' });
//     };

//     // -- Renderers --

//     const renderTree = () => {
//         if (isTreeLoading) return <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />;
//         if (!treeData || treeData.length === 0) return <Text style={styles.emptyText}>{i18n.t('common.no_data')}</Text>;

//         return (
//             <ScrollView contentContainerStyle={styles.listContent}>
//                 {treeData.map((category: LessonHierarchicalResponse) => (
//                     <View key={category.categoryId} style={styles.categoryContainer}>
//                         <TouchableOpacity
//                             style={styles.categoryHeader}
//                             onPress={() => toggleCategory(category.categoryId)}
//                             activeOpacity={0.7}
//                         >
//                             <View style={styles.categoryTitleRow}>
//                                 <Icon name={expandedCategories.has(category.categoryId) ? "folder-open" : "folder"} size={24} color="#F59E0B" />
//                                 <Text style={styles.categoryTitle}>{category.categoryName}</Text>
//                             </View>
//                             {category.coinReward > 0 && (
//                                 <View style={styles.coinBadge}>
//                                     <Icon name="monetization-on" size={14} color="#FFF" />
//                                     <Text style={styles.coinText}>+{category.coinReward}</Text>
//                                 </View>
//                             )}
//                         </TouchableOpacity>

//                         {expandedCategories.has(category.categoryId) && (
//                             <View style={styles.subCategoryList}>
//                                 {category.subCategories.map((sub: SubCategoryDto) => (
//                                     <View key={sub.subCategoryId} style={styles.subCategoryContainer}>
//                                         <TouchableOpacity
//                                             style={styles.subCategoryHeader}
//                                             onPress={() => toggleSubCategory(sub.subCategoryId)}
//                                         >
//                                             <Icon name="subdirectory-arrow-right" size={20} color="#9CA3AF" />
//                                             <Text style={styles.subCategoryTitle}>{sub.subCategoryName}</Text>
//                                             <Icon name={expandedSubCategories.has(sub.subCategoryId) ? "expand-less" : "expand-more"} size={20} color="#9CA3AF" />
//                                         </TouchableOpacity>

//                                         {expandedSubCategories.has(sub.subCategoryId) && (
//                                             <View style={styles.lessonList}>
//                                                 {sub.lessons.map((lesson: LessonResponse) => (
//                                                     <TouchableOpacity
//                                                         key={lesson.lessonId}
//                                                         style={styles.lessonItem}
//                                                         onPress={() => handleSelectLesson(lesson)}
//                                                     >
//                                                         <View style={styles.lessonRow}>
//                                                             <View style={[styles.lessonIcon, { backgroundColor: '#EEF2FF' }]}>
//                                                                 <Icon name="mic" size={20} color="#4F46E5" />
//                                                             </View>
//                                                             <Text style={styles.lessonTitle}>{lesson.title || lesson.lessonName}</Text>
//                                                         </View>
//                                                         <Icon name="chevron-right" size={20} color="#E5E7EB" />
//                                                     </TouchableOpacity>
//                                                 ))}
//                                             </View>
//                                         )}
//                                     </View>
//                                 ))}
//                             </View>
//                         )}
//                     </View>
//                 ))}
//             </ScrollView>
//         );
//     };

//     const renderPracticeInterface = () => {
//         if (!currentLesson) return null;

//         return (
//             <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//                 <View style={styles.sentenceCard}>
//                     <Text style={styles.sentenceText}>{currentLesson.title}</Text>
//                     {currentLesson.description && <Text style={styles.ipaText}>/{currentLesson.description}/</Text>}
//                     <Text style={styles.attemptLabel}>{i18n.t('speaking.attempt')}: {attemptNumber}</Text>
//                 </View>

//                 <MistakeReviewComponent
//                     wrongItems={wrongItemsData || []}
//                     onRetry={handleRetryMistake}
//                 />

//                 <View style={styles.recordingSection}>
//                     <Text style={styles.recordingTitle}>{isRecording ? i18n.t('speaking.recording') : i18n.t('speaking.tap_hold_record')}</Text>
//                     <Animated.View style={[styles.recordButton, isRecording && { transform: [{ scale: pulseAnim }] }]}>
//                         <TouchableOpacity
//                             style={[
//                                 styles.recordButtonInner,
//                                 isRecording && styles.recordingActive,
//                                 (!hasMicPermission || isStreaming) && { backgroundColor: '#E5E7EB' }
//                             ]}
//                             onPressIn={startRecording}
//                             onPressOut={stopRecording}
//                             disabled={!hasMicPermission || isStreaming}
//                         >
//                             <Icon name={isRecording ? 'graphic-eq' : 'mic'} size={40} color={(!hasMicPermission || isStreaming) ? '#9CA3AF' : "#FFFFFF"} />
//                         </TouchableOpacity>
//                     </Animated.View>
//                 </View>

//                 {isStreaming && (
//                     <View style={styles.streamingContainer}>
//                         <ActivityIndicator size="small" color="#4F46E5" />
//                         <Text style={styles.streamingText}>{i18n.t('speaking.analyzing')}</Text>
//                         <View style={styles.chunksContainer}>
//                             {streamingChunks.map((chunk, idx) => (
//                                 chunk.word_analysis && (
//                                     <Text key={idx} style={{
//                                         color: chunk.word_analysis.is_correct ? '#10B981' : '#EF4444',
//                                         fontSize: 18, margin: 4, fontWeight: '500'
//                                     }}>
//                                         {chunk.word_analysis.word}
//                                     </Text>
//                                 )
//                             ))}
//                         </View>
//                     </View>
//                 )}
//             </ScrollView>
//         );
//     };

//     return (
//         <ScreenLayout>
//             <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={handleBack} style={styles.backButton}>
//                     <Icon name="arrow-back" size={24} color="#374151" />
//                 </TouchableOpacity>
//                 <Text style={styles.headerTitle}>
//                     {!currentLesson ? i18n.t('speaking.title') : i18n.t('speaking.practice')}
//                 </Text>
//                 <View style={{ width: 24 }} />
//             </View>

//             <View style={styles.container}>
//                 {!currentLesson ? renderTree() : renderPracticeInterface()}
//             </View>

//             {/* Modal Result */}
//             <Modal visible={showResult} animationType="slide" transparent={false}>
//                 <View style={[styles.resultContainer, { paddingTop: insets.top }]}>
//                     <View style={styles.header}>
//                         <Text style={styles.headerTitle}>{i18n.t('speaking.result')}</Text>
//                         <TouchableOpacity onPress={() => setShowResult(false)}>
//                             <Icon name="close" size={24} color="#374151" />
//                         </TouchableOpacity>
//                     </View>
//                     <ScrollView contentContainerStyle={styles.resultContent}>
//                         {finalResult && (
//                             <>
//                                 <View style={styles.scoreCircle}>
//                                     <Text style={styles.scoreValue}>{finalResult.overall_score}</Text>
//                                     <Text style={styles.scoreLabel}>{i18n.t('speaking.score_overall')}</Text>
//                                 </View>

//                                 <View style={styles.feedbackBox}>
//                                     <Text style={styles.sectionTitle}>{i18n.t('speaking.feedback')}</Text>
//                                     <Text style={styles.feedbackText}>{finalResult.feedback}</Text>
//                                 </View>

//                                 <TouchableOpacity
//                                     style={styles.retryButton}
//                                     onPress={() => setShowResult(false)}
//                                 >
//                                     <Text style={styles.retryButtonText}>{i18n.t('common.continue')}</Text>
//                                 </TouchableOpacity>
//                             </>
//                         )}
//                     </ScrollView>
//                 </View>
//             </Modal>
//         </ScreenLayout>
//     );
// };

// const styles = createScaledSheet({
//     container: { flex: 1, backgroundColor: '#F8FAFC' },
//     header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
//     backButton: { padding: 4 },
//     headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1, textAlign: 'center' },
//     listContent: { padding: 16 },
//     emptyText: { textAlign: 'center', marginTop: 20, color: '#6B7280' },

//     // Tree Styles
//     categoryContainer: { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 2 },
//     categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
//     categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//     categoryTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
//     coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
//     coinText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

//     subCategoryList: { backgroundColor: '#F9FAFB', paddingBottom: 8 },
//     subCategoryContainer: { marginTop: 1 },
//     subCategoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 24, justifyContent: 'space-between' },
//     subCategoryTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563', flex: 1, marginLeft: 8 },

//     lessonList: { paddingLeft: 40, paddingRight: 16 },
//     lessonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
//     lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
//     lessonIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
//     lessonTitle: { fontSize: 14, color: '#374151' },

//     // Practice Styles
//     content: { flex: 1, padding: 20 },
//     sentenceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, elevation: 3 },
//     sentenceText: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
//     ipaText: { fontSize: 16, color: '#6B7280', fontStyle: 'italic' },
//     attemptLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },

//     recordingSection: { alignItems: 'center', marginTop: 20 },
//     recordingTitle: { fontSize: 16, color: '#4B5563', marginBottom: 20 },
//     recordButton: { marginBottom: 16 },
//     recordButtonInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', elevation: 6 },
//     recordingActive: { backgroundColor: '#EF4444' },

//     streamingContainer: { marginTop: 24, padding: 16, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center' },
//     streamingText: { color: '#4F46E5', marginTop: 8, marginBottom: 12 },
//     chunksContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },

//     // Result Modal Styles
//     resultContainer: { flex: 1, backgroundColor: '#F8FAFC' },
//     resultContent: { padding: 20 },
//     scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
//     scoreValue: { fontSize: 32, fontWeight: 'bold', color: '#4F46E5' },
//     scoreLabel: { fontSize: 12, color: '#6B7280' },
//     feedbackBox: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginTop: 20 },
//     sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
//     feedbackText: { lineHeight: 22, color: '#374151' },
//     retryButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
//     retryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
// });

// export default SpeakingScreen;

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Alert, Animated,
    Modal, ActivityIndicator, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio'; // Assuming Expo SDK 52+
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSkillLessons } from '../../hooks/useSkillLessons';
import { useLessons } from '../../hooks/useLessons';
import { LessonResponse, StreamingChunk, FinalResult } from '../../types/dto';
import { createScaledSheet } from '../../utils/scaledStyles';
import ScreenLayout from '../../components/layout/ScreenLayout';

const SpeakingScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Params & State
    const paramLessonId = route.params?.lessonId;
    const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamData, setStreamData] = useState<StreamingChunk[]>([]);
    const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Hooks
    const { useLesson } = useLessons();
    const { useStreamPronunciation } = useSkillLessons();
    const streamMutation = useStreamPronunciation();

    // Load Lesson Data
    const { data: lessonDetail } = useLesson(paramLessonId || null);

    useEffect(() => {
        if (lessonDetail) setCurrentLesson(lessonDetail);
    }, [lessonDetail]);

    // --- Logic Recording ---

    const startAnim = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        ).start();
    };

    const startRecording = async () => {
        try {
            await setAudioModeAsync({ allowsRecording: true });
            await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
            await recorder.record();
            setIsRecording(true);
            setStreamData([]);
            setFinalResult(null);
            startAnim();
        } catch (e) {
            Alert.alert("Error", "Could not start recording");
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        setIsRecording(false);
        pulseAnim.stopAnimation();
        await recorder.stop();
        const uri = recorder.uri;

        if (uri && currentLesson && currentLesson.questions && currentLesson.questions.length > 0) {
            handleStream(uri);
        } else {
            Alert.alert("Error", "No questions found in this lesson to practice.");
        }
    };

    const handleStream = (uri: string) => {
        setIsStreaming(true);
        const fileUri = Platform.OS === 'ios' ? uri : uri;

        // Lấy câu hỏi đầu tiên làm bài tập (Logic simplified)
        const targetQuestion = currentLesson!.questions![0];

        streamMutation.mutate({
            audioUri: fileUri,
            lessonQuestionId: targetQuestion.lessonQuestionId, // Gửi ID câu hỏi
            languageCode: currentLesson!.languageCode,
            onChunk: (chunk) => {
                // Cập nhật UI realtime
                setStreamData(prev => [...prev, chunk]);
                if (chunk.type === 'final') {
                    setFinalResult({
                        overall_score: chunk.score || 0,
                        accuracy_score: chunk.metadata?.accuracy_score || 0,
                        fluency_score: chunk.metadata?.fluency_score || 0,
                        error_count: chunk.metadata?.error_count || 0,
                        feedback: chunk.feedback
                    });
                }
            }
        }, {
            onSuccess: () => setIsStreaming(false),
            onError: (e) => {
                setIsStreaming(false);
                Alert.alert("Error", "Analysis failed");
            }
        });
    };

    // --- Render ---

    const targetQuestion = currentLesson?.questions?.[0];

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentLesson?.title || t('speaking.loading')}</Text>
            </View>

            <View style={styles.content}>
                {/* 1. TRANSCRIPT CARD */}
                <View style={styles.card}>
                    <Text style={styles.label}>{t('speaking.read_aloud')}:</Text>
                    <Text style={styles.transcript}>
                        {targetQuestion?.transcript || targetQuestion?.question || "Loading..."}
                    </Text>
                </View>

                {/* 2. REALTIME FEEDBACK AREA */}
                <View style={styles.feedbackArea}>
                    <Text style={styles.label}>{t('speaking.feedback')}:</Text>
                    <View style={styles.wordsContainer}>
                        {streamData.filter(c => c.type === 'chunk').map((chunk, index) => (
                            <Text key={index} style={[
                                styles.word,
                                { color: chunk.word_analysis?.is_correct ? '#10B981' : '#EF4444' }
                            ]}>
                                {chunk.word_analysis?.word}
                            </Text>
                        ))}
                    </View>
                    {isStreaming && <ActivityIndicator color="#4F46E5" style={{ marginTop: 10 }} />}
                </View>

                {/* 3. RECORD BUTTON */}
                <View style={styles.footer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            style={[styles.recordBtn, isRecording && styles.recordingBtn]}
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            disabled={isStreaming || !targetQuestion}
                        >
                            <Icon name={isRecording ? "graphic-eq" : "mic"} size={40} color="#FFF" />
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.hint}>{isRecording ? t('speaking.release_to_send') : t('speaking.hold_to_record')}</Text>
                </View>
            </View>

            {/* 4. RESULT MODAL */}
            <Modal visible={!!finalResult} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.score}>{finalResult?.overall_score}</Text>
                        <Text style={styles.modalTitle}>{t('speaking.score')}</Text>
                        <Text style={styles.modalFeedback}>{finalResult?.feedback}</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setFinalResult(null)}>
                            <Text style={styles.btnText}>{t('common.continue')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    header: { flexDirection: 'row', padding: 16, alignItems: 'center', backgroundColor: '#FFF', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#1F2937' },
    content: { flex: 1, padding: 20, alignItems: 'center' },
    card: { backgroundColor: '#FFF', width: '100%', padding: 24, borderRadius: 16, elevation: 4, marginBottom: 20, alignItems: 'center' },
    label: { fontSize: 14, color: '#6B7280', marginBottom: 8, alignSelf: 'flex-start' },
    transcript: { fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center' },

    feedbackArea: { flex: 1, width: '100%' },
    wordsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    word: { fontSize: 20, margin: 4, fontWeight: '500' },

    footer: { marginBottom: 40, alignItems: 'center' },
    recordBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 6 },
    recordingBtn: { backgroundColor: '#EF4444' },
    hint: { marginTop: 12, color: '#6B7280' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center' },
    score: { fontSize: 60, fontWeight: 'bold', color: '#4F46E5' },
    modalTitle: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
    modalFeedback: { fontSize: 16, textAlign: 'center', color: '#374151', marginBottom: 24 },
    closeBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
    btnText: { color: '#FFF', fontWeight: 'bold' }
});

export default SpeakingScreen;