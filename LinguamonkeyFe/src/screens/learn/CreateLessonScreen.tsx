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
    CreateLesson: { courseId: string; versionId: string; lessonId?: string };
};

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'CreateLesson'>>();
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
    const { data: lessonData } = useLesson(lessonId || null);
    const { data: questionsData } = useAllQuestions(lessonId ? { lessonId, size: 100 } : {});

    const [lessonName, setLessonName] = useState('');
    const [description, setDescription] = useState('');
    const [lessonType, setLessonType] = useState<LessonType>(LessonType.VOCABULARY);
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [questions, setQuestions] = useState<LocalQuestionState[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);

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

    const isMediaLesson = [LessonType.VIDEO, LessonType.AUDIO, LessonType.DOCUMENT].includes(lessonType);

    useEffect(() => {
        if (isEditMode && lessonData) {
            setLessonName(lessonData.title);
            setDescription(lessonData.description || '');
            setLessonType(lessonData.lessonType || LessonType.VOCABULARY);
            setThumbnailUrl(lessonData.thumbnailUrl || '');
            setMediaUrls(lessonData.videoUrls || []);
        }
    }, [isEditMode, lessonData]);

    useEffect(() => {
        if (isEditMode && questionsData?.data) {
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
                            orderItems = Array.isArray(parsed) ? parsed : orderItems;
                        } else if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
                            options = { ...options, ...parsed };
                        }
                    }
                } catch (e) {
                    console.log("Error parsing optionsJson", e);
                }

                return {
                    id: q.lessonQuestionId,
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
            setQuestions(mappedQuestions);
        }
    }, [isEditMode, questionsData]);

    const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

    const handleSaveQuestion = () => {
        if (!currentQ.question && !currentQ.mediaUrl) return Alert.alert("Error", "Enter a question or attach media.");

        const finalQ = { ...currentQ };

        if (currentQ.questionType === QuestionType.TRUE_FALSE) {
            if (!['True', 'False'].includes(finalQ.correctOption)) finalQ.correctOption = 'True';
        }

        if (isEditingIndex !== null) {
            const updated = [...questions];
            updated[isEditingIndex] = finalQ;
            setQuestions(updated);
        } else {
            setQuestions([...questions, { ...finalQ, id: Date.now().toString() }]);
        }
        setModalVisible(false);
        setCurrentQ(defaultQ);
    };

    const handleSave = async () => {
        if (!lessonName) return Alert.alert("Error", "Lesson Name required");
        if (isMediaLesson && mediaUrls.length === 0) return Alert.alert("Error", `Upload at least one ${lessonType} file.`);

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
                mediaUrls: mediaUrls,
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
                courseId: courseId || ''
            };

            if (isEditMode && lessonId) {
                await updateLessonMutation.mutateAsync({ id: lessonId, req: lessonPayload });
            } else {
                const newLesson = await createLessonMutation.mutateAsync(lessonPayload);
                targetLessonId = newLesson.lessonId;
            }

            if (targetLessonId) {
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    let optionsJson = "";
                    let finalCorrectOption = q.correctOption;

                    if (q.questionType === QuestionType.MATCHING) {
                        optionsJson = JSON.stringify(q.pairs);
                        const correctMap = q.pairs.reduce((acc, pair) => ({ ...acc, [pair.key]: pair.value }), {});
                        finalCorrectOption = JSON.stringify(correctMap);
                    } else if (q.questionType === QuestionType.ORDERING) {
                        optionsJson = JSON.stringify(q.orderItems);
                        finalCorrectOption = q.orderItems.join(" ");
                    } else if (q.questionType === QuestionType.MULTIPLE_CHOICE) {
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
                        correctOption: finalCorrectOption,
                        transcript: q.transcript,
                        mediaUrl: q.mediaUrl,
                        explainAnswer: q.explainAnswer,
                        weight: parseInt(q.weight) || 1,
                        orderIndex: i
                    };

                    if (q.id && q.id.length > 20) {
                        await updateQuestionMutation.mutateAsync({ id: q.id, req: qPayload });
                    } else {
                        await createQuestionMutation.mutateAsync(qPayload);
                    }
                }
            }

            Alert.alert("Success", "Lesson Saved Successfully", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save lesson");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDynamicInputs = () => {
        switch (currentQ.questionType) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <View>
                        <Text style={styles.label}>Options</Text>
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
                        <Text style={styles.label}>Answer: </Text>
                        {['True', 'False'].map(val => (
                            <TouchableOpacity key={val} onPress={() => setCurrentQ({ ...currentQ, correctOption: val })} style={[styles.rowCenter, { marginRight: 15 }]}>
                                <Ionicons name={currentQ.correctOption === val ? "radio-button-on" : "radio-button-off"} size={24} color="#4ECDC4" />
                                <Text>{val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                return (
                    <View>
                        <Text style={styles.label}>Correct Answer (use || for variations)</Text>
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
                        <Text style={styles.label}>Pairs (Left - Right)</Text>
                        {currentQ.pairs.map((pair, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 8 }]}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} placeholder="Left" value={pair.key}
                                    onChangeText={t => { const p = [...currentQ.pairs]; p[idx].key = t; setCurrentQ({ ...currentQ, pairs: p }) }}
                                />
                                <Ionicons name="arrow-forward" size={16} style={{ marginHorizontal: 5 }} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} placeholder="Right" value={pair.value}
                                    onChangeText={t => { const p = [...currentQ.pairs]; p[idx].value = t; setCurrentQ({ ...currentQ, pairs: p }) }}
                                />
                                <TouchableOpacity onPress={() => { const p = currentQ.pairs.filter((_, i) => i !== idx); setCurrentQ({ ...currentQ, pairs: p }) }}>
                                    <Ionicons name="trash" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}>
                            <Text style={{ color: 'blue' }}>+ Add Pair</Text>
                        </TouchableOpacity>
                    </View>
                );
            case QuestionType.ORDERING:
                return (
                    <View>
                        <Text style={styles.label}>Correct Sequence (Top to Bottom)</Text>
                        {currentQ.orderItems.map((item, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <Text style={{ width: 20 }}>{idx + 1}.</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} value={item}
                                    onChangeText={t => { const i = [...currentQ.orderItems]; i[idx] = t; setCurrentQ({ ...currentQ, orderItems: i }) }}
                                />
                                <TouchableOpacity onPress={() => { const i = currentQ.orderItems.filter((_, n) => n !== idx); setCurrentQ({ ...currentQ, orderItems: i }) }}>
                                    <Ionicons name="close" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}>
                            <Text style={{ color: 'blue' }}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <ScreenLayout style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditMode ? "Edit Lesson" : "Create Lesson"}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} />
                    <Text style={styles.label}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {Object.values(LessonType).map(t => (
                            <TouchableOpacity key={t} style={[styles.pill, lessonType === t && styles.pillActive]} onPress={() => setLessonType(t)}>
                                <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
                        <TouchableOpacity onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setIsEditingIndex(null); }}>
                            <Ionicons name="add-circle" size={30} color="#4ECDC4" />
                        </TouchableOpacity>
                    </View>
                    {questions.map((q, i) => (
                        <TouchableOpacity key={i} style={styles.questionCard} onPress={() => { setCurrentQ(q); setModalVisible(true); setIsEditingIndex(i); }}>
                            <Text style={{ fontWeight: 'bold' }}>{q.questionType}</Text>
                            <Text numberOfLines={1}>{q.question}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Lesson</Text>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalContent}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.header}>Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: 'blue' }}>Close</Text></TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text style={styles.label}>Type</Text>
                            <ScrollView horizontal>
                                {Object.values(QuestionType).map(t => (
                                    <TouchableOpacity key={t} style={[styles.pillSmall, currentQ.questionType === t && styles.pillActive]} onPress={() => setCurrentQ({ ...currentQ, questionType: t })}>
                                        <Text style={[styles.pillTextSmall, currentQ.questionType === t && styles.textActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.label}>Question Prompt</Text>
                            <TextInput style={[styles.input, { height: 50 }]} multiline value={currentQ.question} onChangeText={t => setCurrentQ({ ...currentQ, question: t })} />

                            <Text style={styles.label}>Media</Text>
                            <FileUploader mediaType="all" onUploadSuccess={(id) => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
                                <View style={styles.miniUpload}><Text>{currentQ.mediaUrl ? "Media Attached" : "Upload Media"}</Text></View>
                            </FileUploader>

                            <Text style={styles.label}>Explain Answer (Optional)</Text>
                            <TextInput style={styles.input} multiline value={currentQ.explainAnswer} onChangeText={t => setCurrentQ({ ...currentQ, explainAnswer: t })} />

                            <View style={styles.dynamicArea}>{renderDynamicInputs()}</View>

                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuestion}>
                                <Text style={styles.saveText}>Confirm Question</Text>
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
    label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: '600', marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },
    pill: { padding: 8, backgroundColor: '#EEE', borderRadius: 20, marginRight: 8, marginBottom: 5 },
    pillSmall: { padding: 6, backgroundColor: '#EEE', borderRadius: 15, marginRight: 6 },
    pillActive: { backgroundColor: '#4ECDC4' },
    textActive: { color: '#FFF', fontWeight: 'bold' },
    pillText: { fontSize: 12 },
    pillTextSmall: { fontSize: 11 },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    questionCard: { padding: 10, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, marginBottom: 8, backgroundColor: '#FAFAFA' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
    saveText: { color: '#FFF', fontWeight: 'bold' },
    modalContent: { flex: 1, backgroundColor: '#FFF', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    dynamicArea: { marginVertical: 15, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 8 },
    miniUpload: { padding: 10, backgroundColor: '#EEE', alignItems: 'center', borderRadius: 5, marginTop: 5 },
    modalSaveBtn: { backgroundColor: '#4ECDC4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }
});

export default CreateLessonScreen;