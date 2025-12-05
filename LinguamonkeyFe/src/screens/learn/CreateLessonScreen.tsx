import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLessons } from '../../hooks/useLessons';
import { useUserStore } from '../../stores/UserStore';
import { LessonRequest, LessonQuestionRequest, LessonQuestionResponse } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import FileUploader from '../../components/common/FileUploader';
import { DifficultyLevel, LessonType, QuestionType, SkillType } from '../../types/enums';

// --- TYPES & INTERFACES ---

interface LocalQuestionState {
    id: string;
    question: string;
    questionType: QuestionType;

    // Dynamic Data Holders
    options: { A: string; B: string; C: string; D: string }; // For Multiple Choice
    pairs: { key: string; value: string }[]; // For Matching
    orderItems: string[]; // For Ordering

    correctOption: string; // Used for Multiple Choice, T/F, Fill Blank

    transcript: string;
    explainAnswer: string;
    weight: string;
    mediaUrl: string;
}

type RootStackParamList = {
    CreateLesson: { courseId: string; versionId: string; lessonId?: string };
};

type CreateLessonRouteProp = RouteProp<RootStackParamList, 'CreateLesson'>;

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<CreateLessonRouteProp>();
    const { courseId, lessonId } = route.params || {};

    const user = useUserStore(state => state.user);
    const {
        useCreateLesson,
        useUpdateLesson,
        useCreateQuestion,
        useUpdateQuestion,
        useLesson,
        useAllQuestions
    } = useLessons();

    const createLessonMutation = useCreateLesson();
    const updateLessonMutation = useUpdateLesson();
    const createQuestionMutation = useCreateQuestion();
    const updateQuestionMutation = useUpdateQuestion();

    const isEditMode = !!lessonId;

    // --- FETCH DATA FOR EDIT MODE ---
    const { data: lessonData } = useLesson(lessonId || null);
    const { data: questionsData } = useAllQuestions(lessonId ? { lessonId, size: 100 } : {});

    // --- LESSON STATE ---
    const [lessonName, setLessonName] = useState('');
    const [description, setDescription] = useState('');
    const [lessonType, setLessonType] = useState<LessonType>(LessonType.VOCABULARY);
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);

    // --- QUESTIONS STATE ---
    const [questions, setQuestions] = useState<LocalQuestionState[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- MODAL FORM STATE ---
    const defaultQ: LocalQuestionState = {
        id: '',
        question: '',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: { A: '', B: '', C: '', D: '' },
        pairs: [{ key: '', value: '' }, { key: '', value: '' }],
        orderItems: ['', '', ''],
        correctOption: '',
        transcript: '',
        explainAnswer: '',
        weight: '1',
        mediaUrl: ''
    };
    const [currentQ, setCurrentQ] = useState<LocalQuestionState>(defaultQ);
    const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);

    const isMediaLesson = [LessonType.VIDEO, LessonType.AUDIO, LessonType.DOCUMENT].includes(lessonType);

    // --- EFFECTS ---

    // Populate data when in edit mode
    useEffect(() => {
        if (isEditMode && lessonData) {
            setLessonName(lessonData.title);
            setDescription(lessonData.description || '');
            setLessonType(lessonData.lessonType || LessonType.VOCABULARY);
            setThumbnailUrl(lessonData.thumbnailUrl || '');
            // FIX: DTO LessonResponse uses videoUrls, but UI uses mediaUrls
            setMediaUrls(lessonData.videoUrls || []);
        }
    }, [isEditMode, lessonData]);

    useEffect(() => {
        if (isEditMode && questionsData?.data) {
            // FIX: Explicitly type 'q' as LessonQuestionResponse to avoid 'unknown' error
            const mappedQuestions: LocalQuestionState[] = questionsData.data.map((q: LessonQuestionResponse) => {
                let options = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' };
                let pairs = [{ key: '', value: '' }];
                let orderItems = ['', ''];
                let correctOption = q.correctOption || '';

                try {
                    if (q.optionsJson) {
                        const parsed = JSON.parse(q.optionsJson);
                        if (q.questionType === QuestionType.MATCHING) {
                            pairs = Array.isArray(parsed) ? parsed : pairs;
                        } else if (q.questionType === QuestionType.ORDERING) {
                            // For ordering, correctOption is usually the pipe separated correct order "Item1|Item2"
                            // parsed is the shuffled list usually.
                            if (correctOption.includes("|")) {
                                orderItems = correctOption.split("|");
                            }
                        } else {
                            // MC
                            options = { ...options, ...parsed };
                        }
                    }
                } catch (e) {
                    console.log("Error parsing optionsJson", e);
                }

                return {
                    id: q.lessonQuestionId, // Mapping correct ID field from DTO
                    question: q.question,
                    questionType: q.questionType,
                    options,
                    pairs,
                    orderItems,
                    correctOption,
                    transcript: q.transcript || '',
                    explainAnswer: q.explainAnswer || '',
                    weight: q.weight?.toString() || '1',
                    mediaUrl: q.mediaUrl || ''
                };
            });
            // Sort by orderIndex if needed, though backend usually handles it
            setQuestions(mappedQuestions);
        }
    }, [isEditMode, questionsData]);


    // --- LOGIC HANDLERS ---

    const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

    const handleAddMedia = (id: string) => {
        setMediaUrls(prev => [...prev, formatDriveUrl(id)]);
    };

    const removeMedia = (index: number) => {
        setMediaUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveQuestion = () => {
        if (!currentQ.question) return Alert.alert("Error", "Enter a question prompt.");

        if (currentQ.questionType === QuestionType.MATCHING && currentQ.pairs.some(p => !p.key || !p.value)) {
            return Alert.alert("Error", "Fill all matching pairs.");
        }

        let finalQ = { ...currentQ };

        if (currentQ.questionType === QuestionType.TRUE_FALSE) {
            if (!['True', 'False'].includes(finalQ.correctOption)) finalQ.correctOption = 'True';
        }

        if (isEditingIndex !== null) {
            const updated = [...questions];
            updated[isEditingIndex] = finalQ;
            setQuestions(updated);
        } else {
            setQuestions([...questions, { ...finalQ, id: Date.now().toString() }]); // Temp ID for new
        }
        setModalVisible(false);
        setCurrentQ(defaultQ);
    };

    const handleSave = async () => {
        if (!lessonName) return Alert.alert("Error", "Lesson Name required");
        if (isMediaLesson && mediaUrls.length === 0) return Alert.alert("Error", `Upload at least one ${lessonType} file.`);
        if (!courseId) return Alert.alert("Error", "Course ID is missing.");

        setIsSubmitting(true);
        try {
            let targetLessonId = lessonId;

            const lessonPayload: LessonRequest = {
                lessonName,
                title: lessonName,
                creatorId: user?.userId || '',
                description,
                thumbnailUrl,
                lessonType,
                mediaUrls: mediaUrls, // Request DTO accepts mediaUrls
                skillType: 'READING',
                languageCode: 'vi',
                expReward: isMediaLesson ? 10 : 10 + (questions.length * 2),
                orderIndex: 0,
                isFree: true,
                difficultyLevel: DifficultyLevel.BEGINNER,
                durationSeconds: 300,
                passScorePercent: 80,
                shuffleQuestions: !isMediaLesson,
                allowedRetakeCount: 999,
                courseId: courseId
            };

            if (isEditMode && lessonId) {
                // UPDATE
                await updateLessonMutation.mutateAsync({ id: lessonId, req: lessonPayload });
            } else {
                // CREATE
                const newLesson = await createLessonMutation.mutateAsync(lessonPayload);
                targetLessonId = newLesson.lessonId;
            }

            // Handle Questions (Create or Update)
            if (targetLessonId) {
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    let optionsJson = "";

                    if (q.questionType === QuestionType.MATCHING) {
                        optionsJson = JSON.stringify(q.pairs);
                    } else if (q.questionType === QuestionType.ORDERING) {
                        const correctStr = q.orderItems.join("|");
                        q.correctOption = correctStr;
                        optionsJson = JSON.stringify([...q.orderItems].sort(() => Math.random() - 0.5));
                    } else {
                        optionsJson = JSON.stringify(q.options);
                    }

                    const qPayload: LessonQuestionRequest = {
                        lessonId: targetLessonId,
                        question: q.question,
                        questionType: q.questionType,
                        skillType: SkillType.READING,
                        languageCode: 'vi',
                        optionsJson: optionsJson,
                        optionA: q.options.A,
                        optionB: q.options.B,
                        optionC: q.options.C,
                        optionD: q.options.D,
                        correctOption: q.correctOption,
                        transcript: q.transcript,
                        mediaUrl: q.mediaUrl,
                        explainAnswer: q.explainAnswer,
                        weight: parseInt(q.weight) || 1,
                        orderIndex: i
                    };

                    // Check if ID is a real UUID (length > 20) or temp timestamp
                    if (q.id && q.id.length > 20) {
                        // Update existing
                        await updateQuestionMutation.mutateAsync({ id: q.id, req: qPayload });
                    } else {
                        // Create new
                        await createQuestionMutation.mutateAsync(qPayload);
                    }
                }
            }

            Alert.alert("Success", isEditMode ? "Lesson updated!" : "Lesson created!", [
                {
                    text: "OK",
                    onPress: () => navigation.goBack()
                }
            ]);

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save lesson");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderSpecificQuestionInputs = () => {
        switch (currentQ.questionType) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <View>
                        <Text style={styles.label}>Options & Correct Answer</Text>
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <View key={opt} style={styles.rowCenter}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 5 }]}
                                    placeholder={`Option ${opt}`}
                                    value={(currentQ.options as any)[opt]}
                                    onChangeText={t => setCurrentQ({ ...currentQ, options: { ...currentQ.options, [opt]: t } })}
                                />
                                <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, correctOption: opt })}>
                                    <Ionicons name={currentQ.correctOption === opt ? "radio-button-on" : "radio-button-off"} size={24} color="#4ECDC4" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                );

            case QuestionType.TRUE_FALSE:
                return (
                    <View style={styles.rowCenter}>
                        <Text style={styles.label}>Correct Answer: </Text>
                        <View style={{ flexDirection: 'row', gap: 20 }}>
                            <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, correctOption: 'True' })} style={styles.rowCenter}>
                                <Ionicons name={currentQ.correctOption === 'True' ? "radio-button-on" : "radio-button-off"} size={24} color="#4ECDC4" />
                                <Text>True</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, correctOption: 'False' })} style={styles.rowCenter}>
                                <Ionicons name={currentQ.correctOption === 'False' ? "radio-button-on" : "radio-button-off"} size={24} color="#FF6B6B" />
                                <Text>False</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case QuestionType.FILL_IN_THE_BLANK:
                return (
                    <View>
                        <Text style={styles.label}>Correct Answer(s) (use || for alternatives)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. going || to go"
                            value={currentQ.correctOption}
                            onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })}
                        />
                    </View>
                );

            case QuestionType.MATCHING:
                return (
                    <View>
                        <Text style={styles.label}>Matching Pairs (Left - Right)</Text>
                        {currentQ.pairs.map((pair, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 8 }]}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 5 }]}
                                    placeholder="Left (e.g. Dog)"
                                    value={pair.key}
                                    onChangeText={t => {
                                        const newPairs = [...currentQ.pairs];
                                        newPairs[idx].key = t;
                                        setCurrentQ({ ...currentQ, pairs: newPairs });
                                    }}
                                />
                                <Ionicons name="arrow-forward" size={16} color="#666" />
                                <TextInput
                                    style={[styles.input, { flex: 1, marginLeft: 5 }]}
                                    placeholder="Right (e.g. Chó)"
                                    value={pair.value}
                                    onChangeText={t => {
                                        const newPairs = [...currentQ.pairs];
                                        newPairs[idx].value = t;
                                        setCurrentQ({ ...currentQ, pairs: newPairs });
                                    }}
                                />
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}
                            style={styles.addSmallBtn}
                        >
                            <Text style={styles.addSmallText}>+ Add Pair</Text>
                        </TouchableOpacity>
                    </View>
                );

            case QuestionType.ORDERING:
                return (
                    <View>
                        <Text style={styles.label}>Correct Order (Top to Bottom)</Text>
                        {currentQ.orderItems.map((item, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <Text style={{ width: 20 }}>{idx + 1}.</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={item}
                                    onChangeText={t => {
                                        const newItems = [...currentQ.orderItems];
                                        newItems[idx] = t;
                                        setCurrentQ({ ...currentQ, orderItems: newItems });
                                    }}
                                />
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}
                            style={styles.addSmallBtn}
                        >
                            <Text style={styles.addSmallText}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>
                );

            case QuestionType.SPEAKING:
            case QuestionType.LISTENING:
                return (
                    <View>
                        <Text style={styles.label}>Transcript / Text to Read</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]} multiline
                            value={currentQ.transcript}
                            onChangeText={t => setCurrentQ({ ...currentQ, transcript: t })}
                            placeholder="User needs to read or listen to this..."
                        />
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditMode ? "Edit Lesson" : "Create Lesson"}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* 1. CONFIG */}
                <View style={styles.section}>
                    <Text style={styles.label}>Lesson Name</Text>
                    <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} />

                    <Text style={styles.label}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {Object.values(LessonType).map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.pill, lessonType === t && styles.pillActive]}
                                onPress={() => setLessonType(t)}
                            >
                                <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* 2. MEDIA UPLOAD */}
                <View style={styles.section}>
                    <Text style={styles.label}>Lesson Media {isMediaLesson ? "(Required)" : "(Optional Intro)"}</Text>

                    {mediaUrls.map((url, idx) => (
                        <View key={idx} style={styles.mediaItem}>
                            <Text numberOfLines={1} style={{ flex: 1 }}>{url.slice(-30)}</Text>
                            <TouchableOpacity onPress={() => removeMedia(idx)}>
                                <Ionicons name="trash" size={20} color="red" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <FileUploader
                        mediaType="all"
                        onUploadSuccess={(id) => handleAddMedia(id)}
                        style={styles.uploadBtn}
                    >
                        <Ionicons name="cloud-upload-outline" size={24} color="#333" />
                        <Text>Upload File</Text>
                    </FileUploader>
                </View>

                {/* 3. QUESTIONS */}
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
                        <TouchableOpacity onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setIsEditingIndex(null); }}>
                            <Ionicons name="add-circle" size={30} color="#4ECDC4" />
                        </TouchableOpacity>
                    </View>

                    {questions.map((q, i) => (
                        <TouchableOpacity
                            key={q.id || i}
                            style={styles.questionCard}
                            onPress={() => { setCurrentQ(q); setModalVisible(true); setIsEditingIndex(i); }}
                        >
                            <Text style={{ fontWeight: 'bold' }}>{q.questionType}</Text>
                            <Text numberOfLines={1}>{q.question}</Text>
                            <TouchableOpacity style={{ position: 'absolute', right: 10, top: 10 }} onPress={() => {
                                const newQs = [...questions]; newQs.splice(i, 1); setQuestions(newQs);
                            }}>
                                <Ionicons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{isEditMode ? "Update Lesson" : "Create Lesson"}</Text>}
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* MODAL QUESTION */}
            <Modal visible={modalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalContent}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.header}>Edit Question</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ color: 'blue' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Type</Text>
                            <ScrollView horizontal>
                                {Object.values(QuestionType).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.pillSmall, currentQ.questionType === t && styles.pillActive]}
                                        onPress={() => setCurrentQ({ ...currentQ, questionType: t })}
                                    >
                                        <Text style={[styles.pillTextSmall, currentQ.questionType === t && styles.textActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.label}>Prompt / Question</Text>
                            <TextInput
                                style={[styles.input, { height: 50 }]} multiline
                                value={currentQ.question}
                                onChangeText={t => setCurrentQ({ ...currentQ, question: t })}
                            />

                            {/* DYNAMIC INPUTS */}
                            <View style={styles.dynamicArea}>
                                {renderSpecificQuestionInputs()}
                            </View>

                            <Text style={styles.label}>Media Attachment (Optional)</Text>
                            <FileUploader mediaType="all" onUploadSuccess={(id) => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
                                <View style={styles.miniUpload}>
                                    <Text>{currentQ.mediaUrl ? "Media Attached" : "Upload Image/Audio"}</Text>
                                </View>
                            </FileUploader>

                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuestion}>
                                <Text style={styles.saveText}>Save Question</Text>
                            </TouchableOpacity>
                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    section: { marginBottom: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 10 },
    label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },

    pill: { padding: 8, backgroundColor: '#EEE', borderRadius: 20, marginRight: 8, marginBottom: 5 },
    pillSmall: { padding: 6, backgroundColor: '#EEE', borderRadius: 15, marginRight: 6 },
    pillActive: { backgroundColor: '#4ECDC4' },
    textActive: { color: '#FFF', fontWeight: 'bold' },
    pillText: { fontSize: 12 },
    pillTextSmall: { fontSize: 11 },

    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

    uploadBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#999', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 10 },
    mediaItem: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: 8, borderRadius: 5, marginBottom: 5, alignItems: 'center' },

    questionCard: { padding: 10, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, marginBottom: 8, backgroundColor: '#FAFAFA' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },

    saveBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
    saveText: { color: '#FFF', fontWeight: 'bold' },

    // Modal
    modalContent: { flex: 1, backgroundColor: '#FFF', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    dynamicArea: { marginVertical: 15, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 8 },
    addSmallBtn: { marginTop: 5 },
    addSmallText: { color: 'blue', fontSize: 12 },
    miniUpload: { padding: 10, backgroundColor: '#EEE', alignItems: 'center', borderRadius: 5, marginTop: 5 },
    modalSaveBtn: { backgroundColor: '#4ECDC4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }
});

export default CreateLessonScreen;