import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLessons } from '../../hooks/useLessons';
import { useCourses } from '../../hooks/useCourses'; // Import useCourses để fetch version fallback
import { useUserStore } from '../../stores/UserStore';
import { LessonQuestionResponse } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import FileUploader from '../../components/common/FileUploader';
import { QuestionType, VersionStatus } from '../../types/enums';

// ... (Giữ nguyên các mảng ENUMS backend cũ) ...
const BACKEND_LESSON_TYPES = [
    "COURSE_LESSON", "FLASHCARD_SET", "FLASHCARD", "QUIZ",
    "SPEAKING", "READING", "WRITING", "VOCABULARY",
    "VIDEO", "DOCUMENT", "AUDIO", "GRAMMAR_PRACTICE"
];

const getBackendSkillType = (lessonType: string): string => {
    switch (lessonType) {
        case "SPEAKING": return "SPEAKING";
        case "LISTENING": case "AUDIO": case "VIDEO": return "LISTENING";
        case "WRITING": return "WRITING";
        case "VOCABULARY": case "FLASHCARD": case "FLASHCARD_SET": return "VOCABULARY";
        case "GRAMMAR_PRACTICE": return "GRAMMAR";
        default: return "READING";
    }
};

const getQuestionSkillType = (qType: string): string => {
    switch (qType) {
        case QuestionType.SPEAKING: return "SPEAKING";
        case QuestionType.LISTENING: return "LISTENING";
        case QuestionType.WRITING: case QuestionType.ESSAY: return "WRITING";
        default: return "READING";
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

type RootStackParamList = {
    CreateLesson: { courseId: string; versionId?: string; lessonId?: string };
};

const defaultQ: LocalQuestionState = {
    id: '', question: '', questionType: QuestionType.MULTIPLE_CHOICE,
    options: { A: '', B: '', C: '', D: '' }, pairs: [{ key: '', value: '' }, { key: '', value: '' }],
    orderItems: ['', '', ''], correctOption: '', transcript: '', explainAnswer: '', weight: '1', mediaUrl: ''
};

const MediaPreviewItem = ({ url, onDelete, style, containerStyle }: any) => {
    if (!url) return null;
    const isImage = (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('googleusercontent'));
    const player = useVideoPlayer(!isImage ? url : null, (p) => { p.loop = false; });

    return (
        <View style={[styles.mediaItemContainer, containerStyle]}>
            {isImage ? (
                <Image source={{ uri: url }} style={[styles.imagePreview, style]} resizeMode="contain" />
            ) : (
                <View style={[styles.videoContainer, style]}>
                    <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls={true} />
                </View>
            )}
            {onDelete && (
                <TouchableOpacity style={styles.deleteOverlayBtn} onPress={onDelete}>
                    <Ionicons name="trash" size={18} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'CreateLesson'>>();
    const { courseId, lessonId } = route.params || {};

    // State riêng cho versionId để xử lý fallback
    const [targetVersionId, setTargetVersionId] = useState<string | undefined>(route.params?.versionId);

    const user = useUserStore(state => state.user);
    const { useCreateLesson, useUpdateLesson, useLesson, useAllQuestions, useDeleteQuestion } = useLessons();
    // Hook dùng để tìm Draft Version nếu params bị thiếu
    const { useCourseVersions } = useCourses();

    const createLessonMutation = useCreateLesson();
    const updateLessonMutation = useUpdateLesson();
    const deleteQuestionMutation = useDeleteQuestion();

    const isEditMode = !!lessonId;
    const { data: lessonData } = useLesson(lessonId || null);
    const { data: questionsData } = useAllQuestions(lessonId ? { lessonId, size: 100 } : {});

    // Fetch versions nếu chưa có versionId
    const { data: versionsData } = useCourseVersions(courseId, !targetVersionId);

    // Effect: Tự động tìm Version Draft nếu params không có
    useEffect(() => {
        if (!targetVersionId && versionsData && versionsData.length > 0) {
            const draft = versionsData.find((v: any) => v.status === VersionStatus.DRAFT);
            if (draft) {
                console.log("Auto-detected Draft Version ID:", draft.versionId);
                setTargetVersionId(draft.versionId);
            }
        }
    }, [targetVersionId, versionsData]);

    const [lessonName, setLessonName] = useState('');
    const [description, setDescription] = useState('');
    const [lessonType, setLessonType] = useState<string>("VOCABULARY");
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [questions, setQuestions] = useState<LocalQuestionState[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);
    const [currentQ, setCurrentQ] = useState<LocalQuestionState>(defaultQ);

    useEffect(() => {
        if (isEditMode && lessonData) {
            setLessonName(lessonData.title);
            setDescription(lessonData.description || '');
            const type = BACKEND_LESSON_TYPES.includes(lessonData.lessonType) ? lessonData.lessonType : "VOCABULARY";
            setLessonType(type);
            setThumbnailUrl(lessonData.thumbnailUrl || '');
            setMediaUrls(lessonData.videoUrls || []);
        }
    }, [isEditMode, lessonData]);

    useEffect(() => {
        if (isEditMode && questionsData?.data) {
            const mapped = questionsData.data.map((q: LessonQuestionResponse) => {
                let options = { A: '', B: '', C: '', D: '' };
                let pairs = [{ key: '', value: '' }];
                let orderItems = ['', ''];
                try {
                    if (q.optionsJson) {
                        const parsed = JSON.parse(q.optionsJson);
                        if (q.questionType === QuestionType.MATCHING) pairs = Array.isArray(parsed) ? parsed : pairs;
                        else if (q.questionType === QuestionType.ORDERING) orderItems = Array.isArray(parsed) ? parsed : orderItems;
                        else if (q.questionType === QuestionType.MULTIPLE_CHOICE) options = { ...options, ...parsed };
                    }
                } catch (e) { }
                return {
                    id: q.lessonQuestionId,
                    question: q.question,
                    questionType: q.questionType,
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
    }, [isEditMode, questionsData]);

    const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

    const handleSaveQuestion = () => {
        const finalQ = { ...currentQ };
        if (!finalQ.question) finalQ.question = "Question Text";
        if (finalQ.questionType === QuestionType.TRUE_FALSE && !['True', 'False'].includes(finalQ.correctOption)) {
            finalQ.correctOption = 'True';
        }
        if (isEditingIndex !== null) {
            const up = [...questions]; up[isEditingIndex] = finalQ; setQuestions(up);
        } else {
            setQuestions([...questions, { ...finalQ, id: Date.now().toString() }]);
        }
        setModalVisible(false);
        setCurrentQ(defaultQ);
    };

    const handleDeleteQuestion = async (index: number) => {
        const q = questions[index];
        if (isEditMode && q.id.length > 20) {
            try { await deleteQuestionMutation.mutateAsync(q.id); } catch (e) { }
        }
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!lessonName) return Alert.alert("Lỗi", "Vui lòng nhập tên bài học");

        // FIX: Chặn nếu chưa có versionId
        if (!targetVersionId) {
            return Alert.alert("Lỗi", "Không tìm thấy Version Draft. Vui lòng quay lại màn hình Edit Course và thử lại.");
        }

        setIsSubmitting(true);

        try {
            const questionsPayload = questions.map((q, i) => {
                let optionsJson = null;
                let finalCorrect = q.correctOption;
                if (q.questionType === QuestionType.MATCHING) {
                    optionsJson = JSON.stringify(q.pairs);
                    finalCorrect = JSON.stringify(q.pairs.reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}));
                } else if (q.questionType === QuestionType.ORDERING) {
                    optionsJson = JSON.stringify(q.orderItems);
                    finalCorrect = q.orderItems.join(" ");
                } else if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
                    optionsJson = JSON.stringify(q.options);
                }
                const strictSkill = getQuestionSkillType(q.questionType);
                return {
                    lessonId: (lessonId && lessonId.length > 5) ? lessonId : null,
                    question: q.question,
                    questionType: q.questionType,
                    skillType: strictSkill,
                    languageCode: 'vi',
                    optionsJson: optionsJson,
                    optionA: q.options.A, optionB: q.options.B, optionC: q.options.C, optionD: q.options.D,
                    correctOption: finalCorrect,
                    transcript: q.transcript,
                    mediaUrl: q.mediaUrl || null, // Gửi null nếu rỗng
                    explainAnswer: q.explainAnswer,
                    weight: parseInt(q.weight) || 1,
                    orderIndex: i,
                    isDeleted: false
                };
            });

            const strictLessonSkill = getBackendSkillType(lessonType);

            const payload: any = {
                lessonName: lessonName.trim(),
                title: lessonName.trim(),
                creatorId: user?.userId || '',
                description: description || '',
                thumbnailUrl: thumbnailUrl || '',
                lessonType: lessonType,
                mediaUrls: mediaUrls,
                skillType: strictLessonSkill,
                languageCode: 'vi',
                expReward: 10 + (questions.length * 2),
                orderIndex: 0,
                isFree: true,
                difficultyLevel: "BEGINNER",
                durationSeconds: 300,
                passScorePercent: 80,
                shuffleQuestions: true,
                allowedRetakeCount: 999,
                courseId: courseId || '',
                versionId: targetVersionId, // FIX: Đã đảm bảo có ID ở bước check trên
                questions: questionsPayload
            };

            console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

            if (isEditMode && lessonId) {
                await updateLessonMutation.mutateAsync({ id: lessonId, req: payload });
            } else {
                await createLessonMutation.mutateAsync(payload);
            }

            Alert.alert("Thành công", "Đã lưu bài học", [{ text: "OK", onPress: () => navigation.goBack() }]);

        } catch (e: any) {
            console.log("ERROR:", e);
            const msg = e.response?.data?.message || "Lỗi lưu dữ liệu. Kiểm tra lại định dạng câu hỏi.";
            Alert.alert("Lỗi Server", JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... (Phần render UI giữ nguyên như cũ, chỉ thay đổi logic xử lý ở trên) ...
    // Copy lại phần render UI từ code cũ của bạn
    const renderDynamicInputs = () => {
        const transcriptInput = (
            <View>
                <Text style={styles.label}>Transcript (Correct Text)</Text>
                <TextInput
                    style={[styles.input, { minHeight: 60 }]} multiline
                    value={currentQ.transcript} onChangeText={t => setCurrentQ({ ...currentQ, transcript: t })}
                />
            </View>
        );

        switch (currentQ.questionType) {
            case QuestionType.SPEAKING:
            case QuestionType.LISTENING:
                return transcriptInput;
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <View>
                        <Text style={styles.label}>Options</Text>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <View key={opt} style={styles.rowCenter}>
                                <TouchableOpacity
                                    style={[styles.radioBtn, currentQ.correctOption === opt && styles.radioBtnActive]}
                                    onPress={() => setCurrentQ({ ...currentQ, correctOption: opt })}
                                >
                                    <Text style={[styles.radioText, currentQ.correctOption === opt && styles.textActive]}>{opt}</Text>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                        {['True', 'False'].map(val => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.choiceCard, currentQ.correctOption === val && styles.choiceCardActive]}
                                onPress={() => setCurrentQ({ ...currentQ, correctOption: val })}
                            >
                                <Text style={{ fontWeight: 'bold', color: currentQ.correctOption === val ? '#FFF' : '#333' }}>{val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case QuestionType.MATCHING:
                return (
                    <View>
                        <Text style={styles.label}>Pairs</Text>
                        {currentQ.pairs.map((p, i) => (
                            <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Key" value={p.key} onChangeText={t => { const n = [...currentQ.pairs]; n[i].key = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
                                <Text> - </Text>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Val" value={p.value} onChangeText={t => { const n = [...currentQ.pairs]; n[i].value = t; setCurrentQ({ ...currentQ, pairs: n }) }} />
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}><Text style={{ color: 'blue' }}>+ Pair</Text></TouchableOpacity>
                    </View>
                );
            case QuestionType.ORDERING:
                return (
                    <View>
                        <Text style={styles.label}>Order</Text>
                        {currentQ.orderItems.map((it, i) => (
                            <View key={i} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <Text>{i + 1}. </Text>
                                <TextInput style={[styles.input, { flex: 1 }]} value={it} onChangeText={t => { const n = [...currentQ.orderItems]; n[i] = t; setCurrentQ({ ...currentQ, orderItems: n }) }} />
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}><Text style={{ color: 'blue' }}>+ Item</Text></TouchableOpacity>
                    </View>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                return (
                    <View>
                        <Text style={styles.label}>Correct Answer</Text>
                        <TextInput style={styles.input} value={currentQ.correctOption} onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })} />
                    </View>
                );
            default: return null;
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditMode ? "Sửa Bài" : "Tạo Bài Mới"}</Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Thông Tin</Text>
                    <View style={styles.rowCenter}>
                        {thumbnailUrl ? <Image source={{ uri: thumbnailUrl }} style={{ width: 50, height: 50, borderRadius: 5, marginRight: 10 }} /> : null}
                        <FileUploader mediaType="image" onUploadSuccess={id => setThumbnailUrl(formatDriveUrl(id))}>
                            <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Upload Thumbnail</Text>
                        </FileUploader>
                    </View>
                    <Text style={styles.label}>Tên Bài</Text>
                    <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} placeholder="Ví dụ: Bài 1 - Chào hỏi" />

                    <Text style={styles.label}>Version ID (Debug): {targetVersionId || "Missing"}</Text>

                    <Text style={styles.label}>Loại Bài (Lesson Type)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {BACKEND_LESSON_TYPES.map(t => (
                            <TouchableOpacity key={t} style={[styles.pill, lessonType === t && styles.pillActive]} onPress={() => setLessonType(t)}>
                                <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={styles.label}>Media (Video/Audio)</Text>
                    {mediaUrls.map((u, i) => (
                        <View key={i} style={{ marginBottom: 10 }}>
                            <MediaPreviewItem url={u} style={{ height: 150 }} onDelete={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))} />
                        </View>
                    ))}
                    <FileUploader mediaType="all" onUploadSuccess={id => setMediaUrls([...mediaUrls, formatDriveUrl(id)])}>
                        <View style={[styles.input, { alignItems: 'center', borderStyle: 'dashed' }]}><Text>+ Thêm Media</Text></View>
                    </FileUploader>
                </View>

                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionHeader}>Câu Hỏi ({questions.length})</Text>
                        <TouchableOpacity onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setIsEditingIndex(null); }} style={styles.addIconBtn}>
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    {questions.map((q, i) => (
                        <View key={i} style={styles.questionCard}>
                            <View style={styles.rowBetween}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'gray' }}>{q.questionType}</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <TouchableOpacity onPress={() => { setCurrentQ(q); setModalVisible(true); setIsEditingIndex(i) }}><Ionicons name="create" size={18} color="blue" style={{ marginRight: 10 }} /></TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteQuestion(i)}><Ionicons name="trash" size={18} color="red" /></TouchableOpacity>
                                </View>
                            </View>
                            <Text numberOfLines={1}>{q.question}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveMainText}>LƯU BÀI HỌC</Text>}
                </TouchableOpacity>
                <View style={{ height: 50 }} />
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide">
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><Text>Hủy</Text></TouchableOpacity>
                    <Text style={{ fontWeight: 'bold' }}>Chi Tiết Câu Hỏi</Text>
                    <TouchableOpacity onPress={handleSaveQuestion}><Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Xong</Text></TouchableOpacity>
                </View>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={styles.label}>Loại Câu Hỏi</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {Object.values(QuestionType).map(t => (
                                <TouchableOpacity key={t} style={[styles.pillSmall, currentQ.questionType === t && styles.pillActive]} onPress={() => setCurrentQ({ ...currentQ, questionType: t })}>
                                    <Text style={[styles.pillTextSmall, currentQ.questionType === t && styles.textActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Text style={styles.label}>Nội dung câu hỏi</Text>
                        <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={currentQ.question} onChangeText={t => setCurrentQ({ ...currentQ, question: t })} />
                        <Text style={styles.label}>Media đính kèm</Text>
                        {currentQ.mediaUrl ? <MediaPreviewItem url={currentQ.mediaUrl} style={{ height: 150 }} onDelete={() => setCurrentQ({ ...currentQ, mediaUrl: '' })} /> :
                            <FileUploader mediaType="all" onUploadSuccess={id => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
                                <View style={[styles.input, { alignItems: 'center' }]}><Text>Upload</Text></View>
                            </FileUploader>
                        }
                        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 15 }} />
                        {renderDynamicInputs()}
                        <Text style={styles.label}>Giải thích (Optional)</Text>
                        <TextInput style={styles.input} multiline value={currentQ.explainAnswer} onChangeText={t => setCurrentQ({ ...currentQ, explainAnswer: t })} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    content: { padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    section: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    label: { fontSize: 12, color: '#777', marginTop: 10, marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },
    pill: { padding: 8, backgroundColor: '#EEE', borderRadius: 20, marginRight: 8 },
    pillSmall: { padding: 6, backgroundColor: '#EEE', borderRadius: 16, marginRight: 6 },
    pillActive: { backgroundColor: '#4ECDC4' },
    textActive: { color: '#FFF', fontWeight: 'bold' },
    pillText: { fontSize: 12, color: '#555' },
    pillTextSmall: { fontSize: 11, color: '#555' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    saveMainBtn: { backgroundColor: '#2C3E50', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    saveMainText: { color: '#FFF', fontWeight: 'bold' },
    questionCard: { padding: 10, backgroundColor: '#FAFAFA', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
    addIconBtn: { backgroundColor: '#4ECDC4', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#EEE', marginTop: 30 },
    mediaItemContainer: { position: 'relative', overflow: 'hidden' },
    deleteOverlayBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'red', borderRadius: 12, padding: 5 },
    videoContainer: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    imagePreview: { backgroundColor: '#EEE', borderRadius: 8 },
    radioBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
    radioBtnActive: { backgroundColor: '#4ECDC4' },
    radioText: { fontWeight: 'bold' },
    choiceCard: { padding: 10, backgroundColor: '#EEE', borderRadius: 8, minWidth: 80, alignItems: 'center' },
    choiceCardActive: { backgroundColor: '#4ECDC4' },
});

export default CreateLessonScreen;