// import React, { useState, useEffect } from 'react';
// import {
//     View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
//     Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image
// } from 'react-native';
// import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// import { Ionicons } from '@expo/vector-icons';
// import { useVideoPlayer, VideoView } from 'expo-video';
// import DraggableFlatList, { ScaleDecorator, RenderItemParams, ShadowDecorator } from 'react-native-draggable-flatlist';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';

// import { useLessons } from '../../hooks/useLessons';
// import { useCourses } from '../../hooks/useCourses';
// import { useUserStore } from '../../stores/UserStore';
// import { LessonQuestionResponse } from '../../types/dto';
// import ScreenLayout from '../../components/layout/ScreenLayout';
// import FileUploader from '../../components/common/FileUploader';
// import { QuestionType, VersionStatus } from '../../types/enums';

// const sanitizeId = (id: string | undefined | null) => {
//     if (!id || id.trim() === "") return null;
//     return id;
// };

// const BACKEND_LESSON_TYPES = [
//     "COURSE_LESSON", "FLASHCARD_SET", "FLASHCARD", "QUIZ",
//     "SPEAKING", "READING", "WRITING", "VOCABULARY",
//     "VIDEO", "DOCUMENT", "AUDIO", "GRAMMAR_PRACTICE"
// ];

// const getBackendSkillType = (lessonType: string): string => {
//     switch (lessonType) {
//         case "SPEAKING": return "SPEAKING";
//         case "LISTENING": case "AUDIO": case "VIDEO": return "LISTENING";
//         case "WRITING": return "WRITING";
//         case "VOCABULARY": case "FLASHCARD": case "FLASHCARD_SET": return "VOCABULARY";
//         case "GRAMMAR_PRACTICE": return "GRAMMAR";
//         default: return "READING";
//     }
// };

// const getQuestionSkillType = (qType: string): string => {
//     switch (qType) {
//         case QuestionType.SPEAKING: return "SPEAKING";
//         case QuestionType.LISTENING: return "LISTENING";
//         case QuestionType.WRITING: case QuestionType.ESSAY: return "WRITING";
//         default: return "READING";
//     }
// };

// interface LocalQuestionState {
//     id: string;
//     question: string;
//     questionType: QuestionType;
//     options: { A: string; B: string; C: string; D: string };
//     pairs: { key: string; value: string }[];
//     orderItems: string[];
//     correctOption: string;
//     transcript: string;
//     explainAnswer: string;
//     weight: string;
//     mediaUrl: string;
// }

// type RootStackParamList = {
//     CreateLesson: { courseId: string; versionId?: string; lessonId?: string };
// };

// const defaultQ: LocalQuestionState = {
//     id: '', question: '', questionType: QuestionType.MULTIPLE_CHOICE,
//     options: { A: '', B: '', C: '', D: '' }, pairs: [{ key: '', value: '' }, { key: '', value: '' }],
//     orderItems: ['', '', ''], correctOption: '', transcript: '', explainAnswer: '', weight: '1', mediaUrl: ''
// };

// const isVideoFile = (url: string) => {
//     return url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm|3gp|ogg|mp3|wav|m4a)$/i) != null;
// };

// const MediaPreviewItem = ({ url, onDelete, style, containerStyle }: any) => {
//     if (!url) return null;

//     const isImageFile = (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('googleusercontent'));
//     const isActualVideo = isVideoFile(url);
//     const isFinalImage = isImageFile || (url.includes('drive.google.com') && url.includes('id=') && !isActualVideo);
//     const player = useVideoPlayer(!isFinalImage ? url : null, (p) => { p.loop = false; });

//     return (
//         <View style={[styles.mediaItemContainer, containerStyle]}>
//             {isFinalImage ? (
//                 <Image source={{ uri: url }} style={[styles.imagePreview, style]} resizeMode="contain" />
//             ) : (
//                 <View style={[styles.videoContainer, style]}>
//                     <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls={true} />
//                 </View>
//             )}
//             {onDelete && (
//                 <TouchableOpacity style={styles.deleteOverlayBtn} onPress={onDelete}>
//                     <Ionicons name="trash" size={18} color="#FFF" />
//                 </TouchableOpacity>
//             )}
//         </View>
//     );
// };

// const CreateLessonScreen = () => {
//     const navigation = useNavigation();
//     const route = useRoute<RouteProp<RootStackParamList, 'CreateLesson'>>();
//     const { courseId, lessonId } = route.params || {};

//     const [targetVersionId, setTargetVersionId] = useState<string | undefined>(route.params?.versionId);

//     const user = useUserStore(state => state.user);
//     const { useCreateLesson, useUpdateLesson, useLesson, useDeleteQuestion } = useLessons();
//     const { useCourseVersions } = useCourses();

//     const createLessonMutation = useCreateLesson();
//     const updateLessonMutation = useUpdateLesson();
//     const deleteQuestionMutation = useDeleteQuestion();

//     const isEditMode = !!lessonId;
//     const { data: lessonData, isLoading: isLoadingLesson } = useLesson(sanitizeId(lessonId));

//     const { data: versionsData } = useCourseVersions(courseId, !targetVersionId);

//     useEffect(() => {
//         if (!targetVersionId && versionsData && versionsData.length > 0) {
//             const draft = versionsData.find((v: any) => v.status === VersionStatus.DRAFT);
//             if (draft) {
//                 setTargetVersionId(draft.versionId);
//             }
//         }
//     }, [targetVersionId, versionsData]);

//     const [lessonName, setLessonName] = useState('');
//     const [description, setDescription] = useState('');
//     const [lessonType, setLessonType] = useState<string>("VOCABULARY");
//     const [thumbnailUrl, setThumbnailUrl] = useState('');
//     const [mediaUrls, setMediaUrls] = useState<string[]>([]);
//     const [questions, setQuestions] = useState<LocalQuestionState[]>([]);

//     const [modalVisible, setModalVisible] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);
//     const [currentQ, setCurrentQ] = useState<LocalQuestionState>(defaultQ);

//     useEffect(() => {
//         if (isEditMode && lessonData) {
//             setLessonName(lessonData.title);
//             setDescription(lessonData.description || '');
//             const type = BACKEND_LESSON_TYPES.includes(lessonData.lessonType) ? lessonData.lessonType : "VOCABULARY";
//             setLessonType(type);
//             setThumbnailUrl(lessonData.thumbnailUrl || '');
//             setMediaUrls(lessonData.videoUrls || []);

//             if (lessonData.questions && Array.isArray(lessonData.questions)) {
//                 console.log("Questions Loaded from LessonData:", lessonData.questions.length);
//                 const mapped = lessonData.questions.map((q: LessonQuestionResponse) => {
//                     let options = { A: '', B: '', C: '', D: '' };
//                     let pairs = [{ key: '', value: '' }];
//                     let orderItems = ['', ''];
//                     try {
//                         if (q.optionsJson) {
//                             const parsed = JSON.parse(q.optionsJson);
//                             if (q.questionType === QuestionType.MATCHING) pairs = Array.isArray(parsed) ? parsed : pairs;
//                             else if (q.questionType === QuestionType.ORDERING) orderItems = Array.isArray(parsed) ? parsed : orderItems;
//                             else if (q.questionType === QuestionType.MULTIPLE_CHOICE) options = { ...options, ...parsed };
//                         }
//                     } catch (e) {
//                         console.warn("Error parsing optionsJson for question:", q.lessonQuestionId);
//                     }
//                     return {
//                         id: q.lessonQuestionId,
//                         question: q.question,
//                         questionType: q.questionType,
//                         options, pairs, orderItems,
//                         correctOption: q.correctOption || '',
//                         transcript: q.transcript || '',
//                         explainAnswer: q.explainAnswer || '',
//                         weight: String(q.weight || '1'),
//                         mediaUrl: q.mediaUrl || ''
//                     };
//                 });

//                 mapped.sort((a: any, b: any) => {
//                     const idxA = lessonData.questions!.find(original => original.lessonQuestionId === a.id)?.orderIndex || 0;
//                     const idxB = lessonData.questions!.find(original => original.lessonQuestionId === b.id)?.orderIndex || 0;
//                     return idxA - idxB;
//                 });

//                 setQuestions(mapped);
//             }
//         }
//     }, [isEditMode, lessonData]);

//     const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

//     const handleSaveQuestion = () => {
//         const finalQ = { ...currentQ };
//         if (!finalQ.question || finalQ.question.trim() === "") finalQ.question = "Question Text";
//         if (finalQ.questionType === QuestionType.TRUE_FALSE && !['True', 'False'].includes(finalQ.correctOption)) {
//             finalQ.correctOption = 'True';
//         }
//         if (isEditingIndex !== null) {
//             const up = [...questions]; up[isEditingIndex] = finalQ; setQuestions(up);
//         } else {
//             setQuestions([...questions, { ...finalQ, id: Date.now().toString() }]);
//         }
//         setModalVisible(false);
//         setCurrentQ(defaultQ);
//     };

//     const handleDeleteQuestion = async (index: number) => {
//         const q = questions[index];
//         if (isEditMode && q.id && q.id.length > 20) {
//             try { await deleteQuestionMutation.mutateAsync(q.id); } catch (e) { }
//         }
//         setQuestions(questions.filter((_, i) => i !== index));
//     };

//     const handleSave = async () => {
//         if (!lessonName) return Alert.alert("Lỗi", "Vui lòng nhập tên bài học");

//         if (!targetVersionId) {
//             return Alert.alert("Lỗi", "Không tìm thấy Version Draft. Vui lòng quay lại màn hình Edit Course và thử lại.");
//         }

//         setIsSubmitting(true);

//         try {
//             const questionsPayload = questions.map((q, i) => {
//                 let optionsJson = null;
//                 let finalCorrect = q.correctOption;

//                 if (q.questionType === QuestionType.MATCHING) {
//                     optionsJson = JSON.stringify(q.pairs);
//                     try {
//                         finalCorrect = JSON.stringify(q.pairs.reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}));
//                     } catch (e) { finalCorrect = "{}"; }
//                 } else if (q.questionType === QuestionType.ORDERING) {
//                     optionsJson = JSON.stringify(q.orderItems);
//                     finalCorrect = q.orderItems.join(" ");
//                 } else if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
//                     optionsJson = JSON.stringify(q.options);
//                 }

//                 const strictSkill = getQuestionSkillType(q.questionType);

//                 return {
//                     lessonId: (lessonId && lessonId.length > 5) ? sanitizeId(lessonId) : null,
//                     question: q.question,
//                     questionType: q.questionType,
//                     skillType: strictSkill,
//                     languageCode: 'vi',
//                     optionsJson: optionsJson,
//                     optionA: q.options.A, optionB: q.options.B, optionC: q.options.C, optionD: q.options.D,
//                     correctOption: finalCorrect,
//                     transcript: q.transcript,
//                     mediaUrl: sanitizeId(q.mediaUrl),
//                     explainAnswer: q.explainAnswer,
//                     weight: parseInt(q.weight) || 1,
//                     orderIndex: i, // Update orderIndex based on current array position
//                     isDeleted: false
//                 };
//             });

//             const strictLessonSkill = getBackendSkillType(lessonType);

//             const payload: any = {
//                 lessonName: lessonName.trim(),
//                 title: lessonName.trim(),
//                 creatorId: sanitizeId(user?.userId),
//                 description: description || '',
//                 thumbnailUrl: sanitizeId(thumbnailUrl),
//                 lessonType: lessonType,
//                 mediaUrls: mediaUrls,
//                 skillType: strictLessonSkill,
//                 languageCode: 'vi',
//                 expReward: 10 + (questions.length * 2),
//                 orderIndex: 0,
//                 isFree: true,
//                 difficultyLevel: "BEGINNER",
//                 durationSeconds: 300,
//                 passScorePercent: 80,
//                 shuffleQuestions: true,
//                 allowedRetakeCount: 999,
//                 courseId: sanitizeId(courseId),
//                 versionId: sanitizeId(targetVersionId),
//                 questions: questionsPayload
//             };

//             if (isEditMode && lessonId) {
//                 await updateLessonMutation.mutateAsync({ id: lessonId, req: payload });
//             } else {
//                 await createLessonMutation.mutateAsync(payload);
//             }

//             Alert.alert("Thành công", "Đã lưu bài học", [{ text: "OK", onPress: () => navigation.goBack() }]);

//         } catch (e: any) {
//             console.error("SAVE ERROR:", e.response?.data || e);
//             const msg = e.response?.data?.message || "Lỗi lưu dữ liệu. Kiểm tra lại định dạng câu hỏi.";
//             Alert.alert("Lỗi Server", JSON.stringify(msg));
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const renderDynamicInputs = () => {
//         const transcriptInput = (
//             <View>
//                 <Text style={styles.label}>Transcript (Correct Text)</Text>
//                 <TextInput
//                     style={[styles.input, { minHeight: 60 }]} multiline
//                     value={currentQ.transcript} onChangeText={t => setCurrentQ({ ...currentQ, transcript: t })}
//                 />
//             </View>
//         );

//         switch (currentQ.questionType) {
//             case QuestionType.SPEAKING:
//             case QuestionType.LISTENING:
//                 return transcriptInput;
//             case QuestionType.MULTIPLE_CHOICE:
//                 return (
//                     <View>
//                         <Text style={styles.label}>Options</Text>
//                         {['A', 'B', 'C', 'D'].map(opt => (
//                             <View key={opt} style={styles.rowCenter}>
//                                 <TouchableOpacity
//                                     style={[styles.radioBtn, currentQ.correctOption === opt && styles.radioBtnActive]}
//                                     onPress={() => setCurrentQ({ ...currentQ, correctOption: opt })}
//                                 >
//                                     <Text style={[styles.radioText, currentQ.correctOption === opt && styles.textActive]}>{opt}</Text>
//                                 </TouchableOpacity>
//                                 <TextInput
//                                     style={[styles.input, { flex: 1, marginLeft: 8 }]}
//                                     value={(currentQ.options as any)[opt]}
//                                     onChangeText={t => setCurrentQ({ ...currentQ, options: { ...currentQ.options, [opt]: t } })}
//                                 />
//                             </View>
//                         ))}
//                     </View>
//                 );
//             case QuestionType.TRUE_FALSE:
//                 return (
//                     <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
//                         {['True', 'False'].map(val => (
//                             <TouchableOpacity
//                                 key={val}
//                                 style={[styles.choiceCard, currentQ.correctOption === val && styles.choiceCardActive]}
//                                 onPress={() => setCurrentQ({ ...currentQ, correctOption: val })}
//                             >
//                                 <Text style={{ fontWeight: 'bold', color: currentQ.correctOption === val ? '#FFF' : '#333' }}>{val}</Text>
//                             </TouchableOpacity>
//                         ))}
//                     </View>
//                 );
//             case QuestionType.MATCHING:
//                 return (
//                     <View>
//                         <Text style={styles.label}>Pairs</Text>
//                         {currentQ.pairs.map((p, i) => (
//                             <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
//                                 <TextInput style={[styles.input, { flex: 1 }]} placeholder="Key" value={p.key} onChangeText={t => { const n = [...currentQ.pairs]; n[i].key = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
//                                 <Text> - </Text>
//                                 <TextInput style={[styles.input, { flex: 1 }]} placeholder="Val" value={p.value} onChangeText={t => { const n = [...currentQ.pairs]; n[i].value = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
//                             </View>
//                         ))}
//                         <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}><Text style={{ color: 'blue' }}>+ Pair</Text></TouchableOpacity>
//                     </View>
//                 );
//             case QuestionType.ORDERING:
//                 return (
//                     <View>
//                         <Text style={styles.label}>Order</Text>
//                         {currentQ.orderItems.map((it, i) => (
//                             <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
//                                 <Text>{i + 1}. </Text>
//                                 <TextInput style={[styles.input, { flex: 1 }]} value={it} onChangeText={t => { const n = [...currentQ.orderItems]; n[i] = t; setCurrentQ({ ...currentQ, orderItems: n }) }} />
//                             </View>
//                         ))}
//                         <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}><Text style={{ color: 'blue' }}>+ Item</Text></TouchableOpacity>
//                     </View>
//                 );
//             case QuestionType.FILL_IN_THE_BLANK:
//                 return (
//                     <View>
//                         <Text style={styles.label}>Correct Answer</Text>
//                         <TextInput style={styles.input} value={currentQ.correctOption} onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })} />
//                     </View>
//                 );
//             default: return null;
//         }
//     };

//     const renderHeader = () => (
//         <View style={styles.section}>
//             <Text style={styles.sectionHeader}>Thông Tin</Text>
//             <View style={styles.rowCenter}>
//                 {thumbnailUrl ? <Image source={{ uri: thumbnailUrl }} style={{ width: 50, height: 50, borderRadius: 5, marginRight: 10 }} /> : null}
//                 <FileUploader mediaType="image" onUploadSuccess={id => setThumbnailUrl(formatDriveUrl(id))}>
//                     <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Upload Thumbnail</Text>
//                 </FileUploader>
//             </View>
//             <Text style={styles.label}>Tên Bài</Text>
//             <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} placeholder="Ví dụ: Bài 1 - Chào hỏi" />

//             <Text style={styles.label}>Version ID (Debug): {targetVersionId || "Missing"}</Text>

//             <Text style={styles.label}>Loại Bài (Lesson Type)</Text>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
//                 {BACKEND_LESSON_TYPES.map(t => (
//                     <TouchableOpacity key={t} style={[styles.pill, lessonType === t && styles.pillActive]} onPress={() => setLessonType(t)}>
//                         <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
//                     </TouchableOpacity>
//                 ))}
//             </ScrollView>
//             <Text style={styles.label}>Media (Video/Audio)</Text>
//             {mediaUrls.map((u, i) => (
//                 <View key={i} style={{ marginBottom: 10 }}>
//                     <MediaPreviewItem url={u} style={{ height: 150 }} onDelete={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))} />
//                 </View>
//             ))}
//             <FileUploader mediaType="all" onUploadSuccess={id => setMediaUrls([...mediaUrls, formatDriveUrl(id)])}>
//                 <View style={[styles.input, { alignItems: 'center', borderStyle: 'dashed' }]}><Text>+ Thêm Media</Text></View>
//             </FileUploader>

//             <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 20 }} />

//             <View style={styles.rowBetween}>
//                 <Text style={styles.sectionHeader}>Câu Hỏi ({questions.length})</Text>
//                 <TouchableOpacity onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setIsEditingIndex(null); }} style={styles.addIconBtn}>
//                     <Ionicons name="add" size={24} color="#FFF" />
//                 </TouchableOpacity>
//             </View>
//             {questions.length > 0 && <Text style={{ fontSize: 12, color: '#999', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' }}>Ấn giữ vào câu hỏi để di chuyển vị trí</Text>}
//             {isLoadingLesson && questions.length === 0 && <ActivityIndicator color="#4ECDC4" />}
//         </View>
//     );

//     const renderFooter = () => (
//         <View style={{ paddingBottom: 50 }}>
//             <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave} disabled={isSubmitting}>
//                 {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveMainText}>LƯU BÀI HỌC</Text>}
//             </TouchableOpacity>
//             <View style={{ height: 50 }} />
//         </View>
//     );

//     const renderQuestionItem = ({ item, drag, isActive, getIndex }: RenderItemParams<LocalQuestionState>) => {
//         const index = getIndex() || 0;
//         return (
//             <ScaleDecorator>
//                 <TouchableOpacity
//                     onLongPress={drag}
//                     disabled={isActive}
//                     style={[
//                         styles.questionCard,
//                         { backgroundColor: isActive ? '#E8F6F3' : '#FAFAFA', opacity: isActive ? 0.9 : 1 }
//                     ]}
//                 >
//                     <View style={styles.rowBetween}>
//                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                             <Ionicons name="menu" size={20} color="#CCC" style={{ marginRight: 8 }} />
//                             <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'gray' }}>{item.questionType}</Text>
//                         </View>
//                         <View style={{ flexDirection: 'row' }}>
//                             <TouchableOpacity onPress={() => { setCurrentQ(item); setModalVisible(true); setIsEditingIndex(index) }}><Ionicons name="create" size={18} color="blue" style={{ marginRight: 10 }} /></TouchableOpacity>
//                             <TouchableOpacity onPress={() => handleDeleteQuestion(index)}><Ionicons name="trash" size={18} color="red" /></TouchableOpacity>
//                         </View>
//                     </View>
//                     <Text numberOfLines={1} style={{ marginLeft: 28 }}>{item.question}</Text>
//                 </TouchableOpacity>
//             </ScaleDecorator>
//         );
//     };

//     return (
//         <ScreenLayout style={styles.container}>
//             <View style={styles.headerRow}>
//                 <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
//                 <Text style={styles.headerTitle}>{isEditMode ? "Sửa Bài" : "Tạo Bài Mới"}</Text>
//                 <View style={{ width: 30 }} />
//             </View>

//             <GestureHandlerRootView style={{ flex: 1 }}>
//                 <DraggableFlatList
//                     data={questions}
//                     onDragEnd={({ data }) => setQuestions(data)}
//                     keyExtractor={(item, index) => item.id || `temp-${index}`}
//                     renderItem={renderQuestionItem}
//                     ListHeaderComponent={renderHeader}
//                     ListFooterComponent={renderFooter}
//                     contentContainerStyle={styles.content}
//                 />
//             </GestureHandlerRootView>

//             <Modal visible={modalVisible} animationType="slide">
//                 <View style={styles.modalHeader}>
//                     <TouchableOpacity onPress={() => setModalVisible(false)}><Text>Hủy</Text></TouchableOpacity>
//                     <Text style={{ fontWeight: 'bold' }}>Chi Tiết Câu Hỏi</Text>
//                     <TouchableOpacity onPress={handleSaveQuestion}><Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Xong</Text></TouchableOpacity>
//                 </View>
//                 <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//                     <ScrollView contentContainerStyle={{ padding: 20 }}>
//                         <Text style={styles.label}>Loại Câu Hỏi</Text>
//                         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                             {Object.values(QuestionType).map(t => (
//                                 <TouchableOpacity key={t} style={[styles.pillSmall, currentQ.questionType === t && styles.pillActive]} onPress={() => setCurrentQ({ ...currentQ, questionType: t })}>
//                                     <Text style={[styles.pillTextSmall, currentQ.questionType === t && styles.textActive]}>{t}</Text>
//                                 </TouchableOpacity>
//                             ))}
//                         </ScrollView>
//                         <Text style={styles.label}>Nội dung câu hỏi</Text>
//                         <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={currentQ.question} onChangeText={t => setCurrentQ({ ...currentQ, question: t })} />
//                         <Text style={styles.label}>Media đính kèm</Text>
//                         {currentQ.mediaUrl ? <MediaPreviewItem url={currentQ.mediaUrl} style={{ height: 150 }} onDelete={() => setCurrentQ({ ...currentQ, mediaUrl: '' })} /> :
//                             <FileUploader mediaType="all" onUploadSuccess={id => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
//                                 <View style={[styles.input, { alignItems: 'center' }]}><Text>Upload</Text></View>
//                             </FileUploader>
//                         }
//                         <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 15 }} />
//                         {renderDynamicInputs()}
//                         <Text style={styles.label}>Giải thích (Optional)</Text>
//                         <TextInput style={styles.input} multiline value={currentQ.explainAnswer} onChangeText={t => setCurrentQ({ ...currentQ, explainAnswer: t })} />
//                     </ScrollView>
//                 </KeyboardAvoidingView>
//             </Modal>
//         </ScreenLayout>
//     );
// };

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#F4F6F8' },
//     content: { padding: 16 },
//     headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
//     headerTitle: { fontSize: 18, fontWeight: 'bold' },
//     section: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
//     sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
//     label: { fontSize: 12, color: '#777', marginTop: 10, marginBottom: 5, fontWeight: '600' },
//     input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },
//     pill: { padding: 8, backgroundColor: '#EEE', borderRadius: 20, marginRight: 8 },
//     pillSmall: { padding: 6, backgroundColor: '#EEE', borderRadius: 16, marginRight: 6 },
//     pillActive: { backgroundColor: '#4ECDC4' },
//     textActive: { color: '#FFF', fontWeight: 'bold' },
//     pillText: { fontSize: 12, color: '#555' },
//     pillTextSmall: { fontSize: 11, color: '#555' },
//     rowCenter: { flexDirection: 'row', alignItems: 'center' },
//     rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
//     saveMainBtn: { backgroundColor: '#2C3E50', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
//     saveMainText: { color: '#FFF', fontWeight: 'bold' },
//     questionCard: { padding: 10, backgroundColor: '#FAFAFA', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
//     addIconBtn: { backgroundColor: '#4ECDC4', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
//     modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#EEE', marginTop: 30 },
//     mediaItemContainer: { position: 'relative', overflow: 'hidden' },
//     deleteOverlayBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'red', borderRadius: 12, padding: 5 },
//     videoContainer: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
//     imagePreview: { backgroundColor: '#EEE', borderRadius: 8 },
//     radioBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
//     radioBtnActive: { backgroundColor: '#4ECDC4' },
//     radioText: { fontWeight: 'bold' },
//     choiceCard: { padding: 10, backgroundColor: '#EEE', borderRadius: 8, minWidth: 80, alignItems: 'center' },
//     choiceCardActive: { backgroundColor: '#4ECDC4' },
// });

// export default CreateLessonScreen;
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image, FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Hooks & Stores
import { useLessons } from '../../hooks/useLessons';
import { useCourses } from '../../hooks/useCourses';
import { useUserStore } from '../../stores/UserStore';
import { LessonQuestionResponse } from '../../types/dto';
import { Country } from '../../types/enums';
import FileUploader from '../../components/common/FileUploader';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { VersionStatus } from '../../types/enums';
import { getCountryFlag } from '../../utils/flagUtils';

// --- DEFINITIONS ---

enum QuestionType {
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
    TRUE_FALSE = 'TRUE_FALSE',
    MATCHING = 'MATCHING',
    ESSAY = 'ESSAY',
    ORDERING = 'ORDERING'
}

const ALLOWED_LESSON_TYPES = [
    "QUIZ", "SPEAKING", "READING", "WRITING", "VOCABULARY", "GRAMMAR_PRACTICE"
];

// Supported langs for dropdown with Flags mapping
const SUPPORTED_INSTRUCTION_LANGUAGES = [
    { code: 'vi', label: 'Vietnamese', countryEnum: Country.VIETNAM },
    { code: 'en', label: 'English', countryEnum: Country.UNITED_STATES },
    { code: 'zh', label: 'Chinese', countryEnum: Country.CHINA },
];

const sanitizeId = (id: string | undefined | null) => (!id || id.trim() === "") ? null : id;

const getBackendSkillType = (lessonType: string): string => {
    switch (lessonType) {
        case "SPEAKING": return "SPEAKING";
        case "WRITING": return "WRITING";
        case "VOCABULARY": return "VOCABULARY";
        case "GRAMMAR_PRACTICE": return "GRAMMAR";
        case "READING": default: return "READING";
    }
};

interface LocalQuestionState {
    id: string;
    question: string;
    questionType: QuestionType;
    options: { A: string; B: string; C: string; D: string };
    pairs: { key: string; value: string }[];
    orderItems: string[];
    correctOption: string;
    transcript: string;
    explainAnswer: string;
    weight: string;
    mediaUrl: string;
}

const defaultQ: LocalQuestionState = {
    id: '', question: '', questionType: QuestionType.MULTIPLE_CHOICE,
    options: { A: '', B: '', C: '', D: '' },
    pairs: [{ key: '', value: '' }],
    orderItems: ['', ''],
    correctOption: '', transcript: '', explainAnswer: '', weight: '1', mediaUrl: ''
};

const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

// --- COMPONENTS ---

const MediaPreviewItem = ({ url, onDelete }: any) => {
    const isImage = url
        ? (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('googleusercontent') || url.includes('export=download'))
        : false;

    const player = useVideoPlayer((url && !isImage) ? url : null, (p) => { p.loop = false; });

    if (!url) return null;

    return (
        <View style={styles.mediaItemContainer}>
            {isImage ? (
                <Image source={{ uri: url }} style={styles.imagePreview} resizeMode="contain" />
            ) : (
                <View style={styles.videoContainer}>
                    <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls />
                </View>
            )}
            <TouchableOpacity style={styles.deleteOverlayBtn} onPress={onDelete}>
                <Ionicons name="trash" size={18} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
};

// --- MAIN SCREEN ---

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { courseId, lessonId, versionId, instructionLanguage: parentInstructionLang } = route.params || {};

    const [targetVersionId, setTargetVersionId] = useState<string | undefined>(versionId);
    const user = useUserStore(state => state.user);

    // API Hooks
    const { useCreateLesson, useUpdateLesson, useLesson, useDeleteQuestion } = useLessons();
    const { useCourseVersions } = useCourses();
    const createLessonMutation = useCreateLesson();
    const updateLessonMutation = useUpdateLesson();
    const deleteQuestionMutation = useDeleteQuestion();

    const isEditMode = !!lessonId;
    const { data: lessonData, isLoading: isLoadingLesson } = useLesson(sanitizeId(lessonId));
    const { data: versionsData } = useCourseVersions(courseId, !targetVersionId);

    // Form State
    const [lessonName, setLessonName] = useState('');
    const [lessonType, setLessonType] = useState<string>("VOCABULARY");
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [instructionLanguage, setInstructionLanguage] = useState<string>("vi");
    const [questions, setQuestions] = useState<LocalQuestionState[]>([]);

    // Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentQ, setCurrentQ] = useState<LocalQuestionState>(defaultQ);

    // Auto-detect Draft Version
    useEffect(() => {
        if (!targetVersionId && versionsData?.length) {
            const draft = versionsData.find((v: any) => v.status === VersionStatus.DRAFT);
            if (draft) setTargetVersionId(draft.versionId);
        }
    }, [targetVersionId, versionsData]);

    // Initial instruction language logic
    useEffect(() => {
        if (!isEditMode) {
            // 1. Ưu tiên kế thừa từ Course cha (nếu có)
            if (parentInstructionLang) {
                setInstructionLanguage(parentInstructionLang);
            } else if (user) {
                // 2. Nếu không, lấy theo Native Language của User
                const userNative = (user as any).nativeLanguage;
                const isSupported = SUPPORTED_INSTRUCTION_LANGUAGES.some(l => l.code === userNative);
                setInstructionLanguage(isSupported ? userNative : 'vi');
            }
        }
    }, [isEditMode, parentInstructionLang, user]);

    // Load Data for Edit
    useEffect(() => {
        if (isEditMode && lessonData) {
            setLessonName(lessonData.title);
            setLessonType(ALLOWED_LESSON_TYPES.includes(lessonData.lessonType) ? lessonData.lessonType : "VOCABULARY");
            setThumbnailUrl(lessonData.thumbnailUrl || '');

            // Load saved instruction lang
            if ((lessonData as any).instructionLanguage) {
                setInstructionLanguage((lessonData as any).instructionLanguage);
            }

            if (lessonData.questions) {
                const mapped = lessonData.questions.map((q: LessonQuestionResponse) => {
                    let options = { A: '', B: '', C: '', D: '' };
                    let pairs = [{ key: '', value: '' }];
                    let orderItems = ['', ''];
                    try {
                        const parsed = q.optionsJson ? JSON.parse(q.optionsJson) : {};
                        if (q.questionType === QuestionType.MATCHING) pairs = Array.isArray(parsed) ? parsed : pairs;
                        else if (q.questionType === QuestionType.ORDERING) orderItems = Array.isArray(parsed) ? parsed : orderItems;
                        else if (q.questionType === QuestionType.MULTIPLE_CHOICE) options = { ...options, ...parsed };
                    } catch (e) { }

                    return {
                        id: q.lessonQuestionId,
                        question: q.question,
                        questionType: q.questionType as QuestionType,
                        options, pairs, orderItems,
                        correctOption: q.correctOption || '',
                        transcript: q.transcript || '',
                        explainAnswer: q.explainAnswer || '',
                        weight: String(q.weight || '1'),
                        mediaUrl: q.mediaUrl || ''
                    };
                });
                setQuestions(mapped);
            }
        }
    }, [isEditMode, lessonData]);

    const handleSaveQuestion = () => {
        const finalQ = { ...currentQ };
        if (!finalQ.question.trim()) finalQ.question = "Question Content";

        // Auto-fix True/False correct option
        if (finalQ.questionType === QuestionType.TRUE_FALSE && !['True', 'False'].includes(finalQ.correctOption)) {
            finalQ.correctOption = 'True';
        }

        if (editingIndex !== null) {
            const up = [...questions]; up[editingIndex] = finalQ; setQuestions(up);
        } else {
            setQuestions([...questions, { ...finalQ, id: Date.now().toString() }]);
        }
        setModalVisible(false);
        setCurrentQ(defaultQ);
    };

    const handleDeleteQuestion = async (index: number) => {
        const q = questions[index];
        if (isEditMode && q.id && q.id.length > 20) {
            try { await deleteQuestionMutation.mutateAsync(q.id); } catch (e) { }
        }
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSaveLesson = async () => {
        if (!lessonName) return Alert.alert("Missing Info", "Please enter lesson name");
        if (!targetVersionId) return Alert.alert("Error", "No Draft Version found.");

        setIsSubmitting(true);
        try {
            const questionsPayload = questions.map((q, i) => {
                let optionsJson = null;
                let finalCorrect = q.correctOption;

                if (q.questionType === QuestionType.MATCHING) {
                    optionsJson = JSON.stringify(q.pairs);
                    try { finalCorrect = JSON.stringify(q.pairs.reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {})); } catch (e) { finalCorrect = "{}" }
                } else if (q.questionType === QuestionType.ORDERING) {
                    optionsJson = JSON.stringify(q.orderItems);
                    finalCorrect = q.orderItems.join(" ");
                } else if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
                    optionsJson = JSON.stringify(q.options);
                }

                return {
                    lessonId: (lessonId && lessonId.length > 5) ? lessonId : null,
                    question: q.question,
                    questionType: q.questionType,
                    skillType: getBackendSkillType(lessonType),
                    languageCode: 'vi', // Legacy
                    targetLanguage: 'en', // New
                    instructionLanguage: instructionLanguage, // New
                    optionsJson,
                    correctOption: finalCorrect,
                    transcript: q.transcript,
                    mediaUrl: sanitizeId(q.mediaUrl),
                    explainAnswer: q.explainAnswer,
                    weight: parseInt(q.weight) || 1,
                    orderIndex: i,
                    isDeleted: false
                };
            });

            const payload: any = {
                title: lessonName.trim(),
                lessonName: lessonName.trim(),
                creatorId: user?.userId,
                lessonType,
                skillType: getBackendSkillType(lessonType),
                thumbnailUrl: sanitizeId(thumbnailUrl),
                courseId: sanitizeId(courseId),
                versionId: sanitizeId(targetVersionId),
                questions: questionsPayload,

                // Languages
                languageCode: 'vi', // Legacy target
                instructionLanguage: instructionLanguage, // New field

                expReward: 10 + questions.length,
                isFree: true,
                difficultyLevel: "BEGINNER",
                passScorePercent: 80,
                shuffleQuestions: true
            };

            if (isEditMode && lessonId) {
                await updateLessonMutation.mutateAsync({ id: lessonId, req: payload });
            } else {
                await createLessonMutation.mutateAsync(payload);
            }
            Alert.alert("Success", "Lesson Saved", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Save failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFlag = (code: string) => {
        const found = SUPPORTED_INSTRUCTION_LANGUAGES.find(l => l.code === code);
        return found ? getCountryFlag(found.countryEnum) : "🏳️";
    }

    const renderHeader = () => (
        <View style={styles.section}>
            <View style={styles.rowCenter}>
                {thumbnailUrl ? <Image source={{ uri: thumbnailUrl }} style={{ width: 60, height: 60, borderRadius: 5, marginRight: 10 }} /> : null}
                <FileUploader mediaType="image" onUploadSuccess={id => setThumbnailUrl(formatDriveUrl(id))}>
                    <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>+ Thumbnail</Text>
                </FileUploader>
            </View>

            <Text style={styles.label}>Lesson Name</Text>
            <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} placeholder="Lesson Title" />

            {/* Instruction Lang Selector */}
            <Text style={styles.label}>Instruction Language (Target: English)</Text>
            <TouchableOpacity style={styles.langSelector} onPress={() => setLangModalVisible(true)}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>{getFlag(instructionLanguage)}</Text>
                <Text>{SUPPORTED_INSTRUCTION_LANGUAGES.find(l => l.code === instructionLanguage)?.label || instructionLanguage}</Text>
                <Ionicons name="caret-down" size={16} style={{ marginLeft: 'auto' }} color="#999" />
            </TouchableOpacity>

            <Text style={styles.label}>Lesson Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ALLOWED_LESSON_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[styles.pill, lessonType === t && styles.pillActive]} onPress={() => setLessonType(t)}>
                        <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.rowBetween}>
                <Text style={styles.sectionHeader}>Questions ({questions.length})</Text>
                <TouchableOpacity onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setEditingIndex(null); }} style={styles.addIconBtn}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderQuestionItem = ({ item, drag, isActive, getIndex }: RenderItemParams<LocalQuestionState>) => (
        <ScaleDecorator>
            <TouchableOpacity
                onLongPress={drag} disabled={isActive}
                style={[styles.questionCard, isActive && { backgroundColor: '#E8F6F3' }]}
            >
                <View style={styles.rowBetween}>
                    <Text style={{ fontWeight: 'bold', color: 'gray' }}>{item.questionType}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => { setCurrentQ(item); setModalVisible(true); setEditingIndex(getIndex() || 0); }} style={{ marginRight: 10 }}>
                            <Ionicons name="create" size={20} color="blue" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteQuestion(getIndex() || 0)}>
                            <Ionicons name="trash" size={20} color="red" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text numberOfLines={2}>{item.question}</Text>
            </TouchableOpacity>
        </ScaleDecorator>
    );

    // Helpers for Question Modal Input rendering (omitted large blocks for brevity, keeping same structure)
    const renderDynamicInputs = () => {
        switch (currentQ.questionType) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <View>
                        <Text style={styles.label}>Options (Tick correct)</Text>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <View key={opt} style={styles.rowCenter}>
                                <TouchableOpacity
                                    style={[styles.radioBtn, currentQ.correctOption === opt && styles.radioBtnActive]}
                                    onPress={() => setCurrentQ({ ...currentQ, correctOption: opt })}
                                >
                                    <Text style={styles.radioText}>{opt}</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                    value={(currentQ.options as any)[opt]}
                                    onChangeText={t => setCurrentQ({ ...currentQ, options: { ...currentQ.options, [opt]: t } })}
                                />
                            </View>
                        ))}
                    </View>
                );
            case QuestionType.TRUE_FALSE:
                return (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        {['True', 'False'].map(val => (
                            <TouchableOpacity key={val}
                                style={[styles.choiceCard, currentQ.correctOption === val && styles.choiceCardActive]}
                                onPress={() => setCurrentQ({ ...currentQ, correctOption: val })}
                            >
                                <Text style={{ color: currentQ.correctOption === val ? '#FFF' : '#333' }}>{val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                return (
                    <View>
                        <Text style={styles.label}>Correct Answer (Exact text)</Text>
                        <TextInput style={styles.input} value={currentQ.correctOption} onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })} />
                    </View>
                );
            case QuestionType.MATCHING:
                return (
                    <View>
                        <Text style={styles.label}>Matching Pairs</Text>
                        {currentQ.pairs.map((p, i) => (
                            <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Key" value={p.key} onChangeText={t => { const n = [...currentQ.pairs]; n[i].key = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
                                <Text> - </Text>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Value" value={p.value} onChangeText={t => { const n = [...currentQ.pairs]; n[i].value = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}><Text style={{ color: 'blue' }}>+ Add Pair</Text></TouchableOpacity>
                    </View>
                );
            case QuestionType.ORDERING:
                return (
                    <View>
                        <Text style={styles.label}>Order Items (Top to Bottom)</Text>
                        {currentQ.orderItems.map((it, i) => (
                            <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <Text>{i + 1}. </Text>
                                <TextInput style={[styles.input, { flex: 1 }]} value={it} onChangeText={t => { const n = [...currentQ.orderItems]; n[i] = t; setCurrentQ({ ...currentQ, orderItems: n }) }} />
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}><Text style={{ color: 'blue' }}>+ Add Item</Text></TouchableOpacity>
                    </View>
                );
            case QuestionType.ESSAY:
                return (
                    <View>
                        <Text style={styles.label}>Suggested Answer (for AI ref)</Text>
                        <TextInput style={[styles.input, { height: 60 }]} multiline value={currentQ.correctOption} onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })} />
                    </View>
                )
            default: return null;
        }
    }

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditMode ? "Edit Lesson" : "New Lesson"}</Text>
                <TouchableOpacity onPress={handleSaveLesson} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator /> : <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>SAVE</Text>}
                </TouchableOpacity>
            </View>

            <GestureHandlerRootView style={{ flex: 1 }}>
                <DraggableFlatList
                    data={questions}
                    onDragEnd={({ data }) => setQuestions(data)}
                    keyExtractor={(item, i) => item.id || `q-${i}`}
                    renderItem={renderQuestionItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                />
            </GestureHandlerRootView>

            {/* Modal Edit Question */}
            <Modal visible={modalVisible} animationType="slide">
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                    <Text style={{ fontWeight: 'bold' }}>Edit Question</Text>
                    <TouchableOpacity onPress={handleSaveQuestion}><Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Done</Text></TouchableOpacity>
                </View>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={styles.label}>Question Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                            {Object.values(QuestionType).map(t => (
                                <TouchableOpacity key={t} style={[styles.pillSmall, currentQ.questionType === t && styles.pillActive]} onPress={() => setCurrentQ({ ...currentQ, questionType: t })}>
                                    <Text style={[styles.pillTextSmall, currentQ.questionType === t && styles.textActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Question Text</Text>
                        <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={currentQ.question} onChangeText={t => setCurrentQ({ ...currentQ, question: t })} />

                        <Text style={styles.label}>Media</Text>
                        {currentQ.mediaUrl ? (
                            <MediaPreviewItem url={currentQ.mediaUrl} onDelete={() => setCurrentQ({ ...currentQ, mediaUrl: '' })} />
                        ) : (
                            <FileUploader mediaType="all" onUploadSuccess={id => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
                                <View style={[styles.input, { alignItems: 'center' }]}><Text>+ Upload Media</Text></View>
                            </FileUploader>
                        )}
                        <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 15 }} />
                        {renderDynamicInputs()}

                        <Text style={styles.label}>Explanation</Text>
                        <TextInput style={styles.input} multiline value={currentQ.explainAnswer} onChangeText={t => setCurrentQ({ ...currentQ, explainAnswer: t })} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Language Selection Modal */}
            <Modal visible={langModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#FFF', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Select Instruction Language</Text>
                        {SUPPORTED_INSTRUCTION_LANGUAGES.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE', alignItems: 'center' }}
                                onPress={() => { setInstructionLanguage(lang.code); setLangModalVisible(false); }}
                            >
                                <Text style={{ fontSize: 24, marginRight: 10 }}>{getCountryFlag(lang.countryEnum)}</Text>
                                <Text style={{ fontSize: 16 }}>{lang.label}</Text>
                                {instructionLanguage === lang.code && <Ionicons name="checkmark" size={20} color="green" style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setLangModalVisible(false)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: 'red' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    section: { marginBottom: 20 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 20 },
    label: { fontSize: 12, color: '#666', marginTop: 12, marginBottom: 4, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FFF' },
    pill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#EEE', borderRadius: 20, marginRight: 8 },
    pillSmall: { padding: 8, backgroundColor: '#EEE', borderRadius: 16, marginRight: 8 },
    pillActive: { backgroundColor: '#20C997' },
    textActive: { color: '#FFF' },
    pillText: { fontSize: 12 },
    pillTextSmall: { fontSize: 11 },
    questionCard: { padding: 12, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    addIconBtn: { backgroundColor: '#20C997', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#EEE', marginTop: 30, backgroundColor: '#FFF' },
    mediaItemContainer: { height: 150, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', marginBottom: 10 },
    imagePreview: { width: '100%', height: '100%', backgroundColor: '#EEE' },
    videoContainer: { width: '100%', height: '100%' },
    deleteOverlayBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,0,0,0.7)', borderRadius: 12, padding: 4 },
    radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    radioBtnActive: { backgroundColor: '#20C997', borderColor: '#20C997' },
    radioText: { fontSize: 12, fontWeight: 'bold' },
    choiceCard: { padding: 10, backgroundColor: '#EEE', borderRadius: 8, flex: 1, alignItems: 'center' },
    choiceCardActive: { backgroundColor: '#20C997' },
    langSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 }
});

export default CreateLessonScreen;