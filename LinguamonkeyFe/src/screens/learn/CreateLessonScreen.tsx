import React, { useState, useRef } from 'react';
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
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLessons } from '../../hooks/useLessons';
import { useUserStore } from '../../stores/UserStore';
import { uploadTemp } from '../../services/cloudinary';
import { LessonRequest, LessonQuestionRequest } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { gotoTab } from '../../utils/navigationRef';
import { SkillType, QuestionType } from '../../types/enums'; 

// --- TYPES ---

type RouteParams = {
    versionId?: string; 
    courseId?: string;
    lessonCategoryId?: string;
    lessonSubCategoryId?: string;
};

interface LocalQuestionState {
    id: string; 
    question: string;
    questionType: string; 
    options: { A: string; B: string; C: string; D: string };
    correctOption: string;
    transcript: string;
    explainAnswer: string;
    weight: string; 
    mediaFile: DocumentPicker.DocumentPickerAsset | null;
}

const CreateLessonScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
    const { courseId, lessonCategoryId, lessonSubCategoryId } = route.params || {};

    const user = useUserStore(state => state.user);
    const { useCreateLesson, useCreateQuestion } = useLessons();
    const createLessonMutation = useCreateLesson();
    const createQuestionMutation = useCreateQuestion();

    // --- LESSON STATE ---
    const [lessonName, setLessonName] = useState('');
    const [description, setDescription] = useState('');
    const [skillType, setSkillType] = useState<string>('READING'); 
    const [languageCode, setLanguageCode] = useState<string>('vi'); // NEW FIELD
    const [thumbnailAsset, setThumbnailAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [lessonMediaFile, setLessonMediaFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

    // --- QUESTIONS STATE ---
    const [questions, setQuestions] = useState<LocalQuestionState[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // --- QUESTION FORM STATE (In Modal) ---
    const defaultQuestionState: LocalQuestionState = {
        id: '',
        question: '',
        questionType: 'MULTIPLE_CHOICE',
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        transcript: '',
        explainAnswer: '',
        weight: '1',
        mediaFile: null,
    };
    const [currentQuestion, setCurrentQuestion] = useState<LocalQuestionState>(defaultQuestionState);
    const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);

    const LANGUAGES = [
        { code: 'vi', name: 'Vietnamese' },
        { code: 'en', name: 'English' },
        { code: 'jp', name: 'Japanese' },
        { code: 'kr', name: 'Korean' }
    ];

    const SKILL_TYPES = ['READING', 'SPEAKING', 'LISTENING', 'WRITING', 'VOCABULARY'];

    // --- HELPERS ---

    const pickImage = async (setter: (asset: ImagePicker.ImagePickerAsset) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
        if (!result.canceled) setter(result.assets[0]);
    };

    const pickDocument = async (setter: (asset: DocumentPicker.DocumentPickerAsset) => void) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['video/*', 'audio/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled) setter(result.assets[0]);
        } catch (err) { console.warn(err); }
    };

    const uploadFileToDrive = async (file: DocumentPicker.DocumentPickerAsset | ImagePicker.ImagePickerAsset, isImage = false): Promise<string> => {
        const payload = {
            uri: file.uri,
            type: (file as any).mimeType || (isImage ? 'image/jpeg' : 'video/mp4'),
            name: (file as any).name || (isImage ? 'image.jpg' : 'video.mp4'),
        };
        const id = await uploadTemp(payload as any);
        return `https://drive.google.com/uc?export=download&id=${id}`;
    };

    // --- HANDLERS ---

    const handleAddOrUpdateQuestion = () => {
        if (!currentQuestion.question.trim()) {
            Alert.alert("Missing Info", "Please enter a question text.");
            return;
        }

        if (isEditingIndex !== null) {
            const updated = [...questions];
            updated[isEditingIndex] = currentQuestion;
            setQuestions(updated);
        } else {
            setQuestions([...questions, { ...currentQuestion, id: Date.now().toString() }]);
        }
        closeModal();
    };

    const editQuestion = (index: number) => {
        setCurrentQuestion(questions[index]);
        setIsEditingIndex(index);
        setModalVisible(true);
    };

    const deleteQuestion = (index: number) => {
        const updated = [...questions];
        updated.splice(index, 1);
        setQuestions(updated);
    };

    const openNewQuestionModal = () => {
        setCurrentQuestion(defaultQuestionState);
        setIsEditingIndex(null);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setCurrentQuestion(defaultQuestionState);
    };

    // --- SUBMISSION LOGIC ---

    const handleCreateFullLesson = async () => {
        if (!lessonName.trim()) return Alert.alert('Required', 'Please enter a Lesson Name.');
        if (!user?.userId) return Alert.alert('Error', 'User invalid. Login again.');

        setIsSubmitting(true);
        setLoadingMessage('Uploading Lesson Media...');

        try {
            // 1. Upload Lesson Media
            let lessonThumbUrl = '';
            let lessonMediaUrl = '';

            if (thumbnailAsset) lessonThumbUrl = await uploadFileToDrive(thumbnailAsset, true);
            if (lessonMediaFile) lessonMediaUrl = await uploadFileToDrive(lessonMediaFile);

            const finalDescription = lessonMediaUrl
                ? `${description || ''}\n\n[Media]: ${lessonMediaUrl}`
                : (description || '');

            // 2. Create Lesson Request
            const lessonPayload: LessonRequest = {
                lessonName: lessonName.trim(),
                title: lessonName.trim(),
                creatorId: user.userId,
                description: finalDescription,
                thumbnailUrl: lessonThumbUrl,
                skillType: skillType as any,
                
                // NEW FIELD
                languageCode: languageCode,

                // Context Props
                courseId: courseId ? (courseId as any) : undefined, 
                lessonCategoryId: lessonCategoryId ? (lessonCategoryId as any) : undefined,
                lessonSubCategoryId: lessonSubCategoryId ? (lessonSubCategoryId as any) : undefined,
                
                // Defaults
                expReward: 10 + (questions.length * 2), 
                orderIndex: 0,
                isFree: true,
                lessonType: 'VOCABULARY' as any, 
                lessonSeriesId: '',
                difficultyLevel: 'BEGINNER' as any,
                durationSeconds: questions.length * 60, 
                certificateCode: '',
                passScorePercent: 80,
                shuffleQuestions: true,
                allowedRetakeCount: 999
            };

            setLoadingMessage('Creating Lesson...');
            const newLesson = await createLessonMutation.mutateAsync(lessonPayload);
            const newLessonId = newLesson.lessonId;

            // 3. Create Questions Loop
            setLoadingMessage(`Creating ${questions.length} Questions...`);
            
            for (let i = 0; i < questions.length; i++) {
                const qLocal = questions[i];
                let qMediaUrl = '';

                if (qLocal.mediaFile) {
                    setLoadingMessage(`Uploading media for question ${i + 1}...`);
                    qMediaUrl = await uploadFileToDrive(qLocal.mediaFile);
                }

                // TẠO optionsJson cho các câu hỏi có options
                const optionsJson = JSON.stringify({
                    A: qLocal.options.A,
                    B: qLocal.options.B,
                    C: qLocal.options.C,
                    D: qLocal.options.D
                });

                const qPayload: LessonQuestionRequest = {
                    lessonId: newLessonId,
                    question: qLocal.question,
                    questionType: qLocal.questionType as any,
                    
                    // FIXED: Thêm các trường bị thiếu
                    languageCode: languageCode, 
                    skillType: skillType as any,
                    optionsJson: optionsJson, 

                    // Options Mapping
                    optionA: qLocal.options.A,
                    optionB: qLocal.options.B,
                    optionC: qLocal.options.C,
                    optionD: qLocal.options.D,
                    correctOption: qLocal.correctOption,
                    
                    // Extra Fields
                    transcript: qLocal.transcript || undefined,
                    weight: parseInt(qLocal.weight) || 1,
                    orderIndex: i,
                    mediaUrl: qMediaUrl,
                    explainAnswer: qLocal.explainAnswer,
                    isDeleted: false
                };
                
                await createQuestionMutation.mutateAsync(qPayload);
            }

            Alert.alert('Success', 'Lesson and Questions created!', [
                {
                    text: 'Finish',
                    onPress: () => navigation.goBack()
                },
                {
                    text: 'Open Lesson',
                    onPress: () => {
                         gotoTab("LearnStack",'VocabularyFlashcardsScreen', {
                            lessonId: newLesson.lessonId,
                            lessonName: newLesson.lessonName
                        });
                    }
                }
            ]);

        } catch (error) {
            console.error('Creation Error:', error);
            Alert.alert('Error', 'Failed to create lesson process.');
        } finally {
            setIsSubmitting(false);
            setLoadingMessage('');
        }
    };

    // --- RENDER ---

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Lesson Content</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>1. Lesson Details</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lesson Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Pronunciation Practice"
                        value={lessonName}
                        onChangeText={setLessonName}
                    />
                </View>

                {/* NEW FIELD: Language Code */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Language Code</Text>
                    <View style={styles.rowWrap}>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity 
                                key={lang.code}
                                style={[styles.pill, languageCode === lang.code && styles.pillActive]}
                                onPress={() => setLanguageCode(lang.code)}
                            >
                                <Text style={[styles.pillText, languageCode === lang.code && styles.pillTextActive]}>{lang.name} ({lang.code.toUpperCase()})</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                
                {/* Skill Type (Cập nhật vị trí) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Primary Skill Type</Text>
                    <View style={styles.rowWrap}>
                        {SKILL_TYPES.map((skill) => (
                            <TouchableOpacity 
                                key={skill}
                                style={[styles.pill, skillType === skill && styles.pillActive]}
                                onPress={() => setSkillType(skill)}
                            >
                                <Text style={[styles.pillText, skillType === skill && styles.pillTextActive]}>{skill}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>

                <View style={styles.mediaRow}>
                    <TouchableOpacity style={styles.mediaBtn} onPress={() => pickImage(setThumbnailAsset)}>
                        <Ionicons name="image-outline" size={24} color={thumbnailAsset ? "#4ECDC4" : "#666"} />
                        <Text style={styles.mediaText}>{thumbnailAsset ? "Thumb Selected" : "Add Thumbnail"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.mediaBtn} onPress={() => pickDocument(setLessonMediaFile)}>
                        <Ionicons name="videocam-outline" size={24} color={lessonMediaFile ? "#4ECDC4" : "#666"} />
                        <Text style={styles.mediaText}>{lessonMediaFile ? "Media Selected" : "Add Intro Video"}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* --- Section 2: Questions --- */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>2. Questions ({questions.length})</Text>
                    <TouchableOpacity onPress={openNewQuestionModal} style={styles.addQBtn}>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addQText}>Add Question</Text>
                    </TouchableOpacity>
                </View>

                {questions.map((q, index) => (
                    <View key={q.id} style={styles.questionCard}>
                        <View style={styles.qCardHeader}>
                            <Text style={styles.qTypeBadge}>{q.questionType}</Text>
                            <View style={styles.qActions}>
                                <TouchableOpacity onPress={() => editQuestion(index)} style={{marginRight: 10}}>
                                    <Ionicons name="pencil" size={20} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteQuestion(index)}>
                                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.qText} numberOfLines={2}>{q.question}</Text>
                        {q.mediaFile && <Text style={styles.qMediaBadge}>Has Media Attachment</Text>}
                    </View>
                ))}

                <View style={{height: 100}} /> 
            </ScrollView>

            {/* --- Footer Submit --- */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createButton, isSubmitting && styles.disabledButton]}
                    onPress={handleCreateFullLesson}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <ActivityIndicator color="#FFF" />
                            <Text style={[styles.createButtonText, {marginLeft: 10}]}>{loadingMessage}</Text>
                        </View>
                    ) : (
                        <Text style={styles.createButtonText}>Create Lesson & Questions</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* --- Question Modal --- */}
            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditingIndex !== null ? 'Edit Question' : 'New Question'}</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalBody}>
                            {/* Question Type */}
                            <Text style={styles.label}>Question Type</Text>
                            <View style={styles.rowWrap}>
                                {['MULTIPLE_CHOICE', 'SPEAKING', 'WRITING', 'FILL_IN_THE_BLANK', 'ESSAY', 'ORDERING'].map(t => (
                                    <TouchableOpacity 
                                        key={t}
                                        style={[styles.pillSmall, currentQuestion.questionType === t && styles.pillActive]}
                                        onPress={() => setCurrentQuestion({...currentQuestion, questionType: t})}
                                    >
                                        <Text style={[styles.pillTextSmall, currentQuestion.questionType === t && styles.pillTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Question Text */}
                            <Text style={styles.label}>Question / Prompt <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={[styles.input, {height: 60}]}
                                multiline
                                value={currentQuestion.question}
                                onChangeText={t => setCurrentQuestion({...currentQuestion, question: t})}
                                placeholder="Enter the question here..."
                            />

                            {/* Conditional Fields based on Type */}
                            {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                                <View>
                                    <Text style={styles.label}>Options</Text>
                                    {['A', 'B', 'C', 'D'].map((optKey) => (
                                        <View key={optKey} style={styles.optionRow}>
                                            <Text style={styles.optLabel}>{optKey}</Text>
                                            <TextInput 
                                                style={[styles.input, {flex: 1, marginBottom: 5}]} 
                                                value={(currentQuestion.options as any)[optKey]}
                                                onChangeText={(t) => setCurrentQuestion({
                                                    ...currentQuestion,
                                                    options: { ...currentQuestion.options, [optKey]: t }
                                                })}
                                                placeholder={`Option ${optKey}`}
                                            />
                                            <TouchableOpacity 
                                                onPress={() => setCurrentQuestion({...currentQuestion, correctOption: optKey})}
                                                style={styles.radio}
                                            >
                                                {currentQuestion.correctOption === optKey ? (
                                                    <Ionicons name="radio-button-on" size={24} color="#4ECDC4" />
                                                ) : (
                                                    <Ionicons name="radio-button-off" size={24} color="#ccc" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {(currentQuestion.questionType === 'SPEAKING' || currentQuestion.questionType === 'LISTENING') && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Transcript (Reference Text)</Text>
                                    <TextInput
                                        style={[styles.input, {height: 60}]}
                                        multiline
                                        value={currentQuestion.transcript}
                                        onChangeText={t => setCurrentQuestion({...currentQuestion, transcript: t})}
                                        placeholder="Expected speech text or audio script..."
                                    />
                                </View>
                            )}
                            
                            {currentQuestion.questionType === 'FILL_IN_THE_BLANK' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Correct Answer (Use || for multiple valid answers)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={currentQuestion.correctOption}
                                        onChangeText={t => setCurrentQuestion({...currentQuestion, correctOption: t})}
                                        placeholder="e.g. apple || banana"
                                    />
                                </View>
                            )}

                            {/* Common Fields */}
                            <View style={styles.row}>
                                <View style={{flex: 1, marginRight: 10}}>
                                    <Text style={styles.label}>Weight (Score)</Text>
                                    <TextInput 
                                        style={styles.input} 
                                        keyboardType="numeric"
                                        value={currentQuestion.weight}
                                        onChangeText={t => setCurrentQuestion({...currentQuestion, weight: t})}
                                    />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.label}>Media (Audio/Video/Image)</Text>
                                    <TouchableOpacity 
                                        style={[styles.input, {justifyContent: 'center', alignItems: 'center'}]}
                                        onPress={() => pickDocument(asset => setCurrentQuestion({...currentQuestion, mediaFile: asset}))}
                                    >
                                        <Text style={{fontSize: 12, color: currentQuestion.mediaFile ? '#4ECDC4' : '#999'}}>
                                            {currentQuestion.mediaFile ? 'File Selected' : 'Tap to Upload'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.label}>Explanation (Optional)</Text>
                            <TextInput
                                style={[styles.input, {height: 50}]}
                                multiline
                                value={currentQuestion.explainAnswer}
                                onChangeText={t => setCurrentQuestion({...currentQuestion, explainAnswer: t})}
                                placeholder="Why is this answer correct?"
                            />
                            
                            <View style={{height: 20}}/>
                            <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddOrUpdateQuestion}>
                                <Text style={styles.saveModalText}>Save Question</Text>
                            </TouchableOpacity>
                            <View style={{height: 40}}/>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', marginTop: Platform.OS === 'android' ? 30 : 0 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
    backButton: { padding: 4 },
    scrollContent: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 20 },
    
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
    required: { color: 'red' },
    input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15 },
    textArea: { height: 80, textAlignVertical: 'top' },
    
    row: { flexDirection: 'row' },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EEE', marginRight: 8, marginBottom: 8 },
    pillActive: { backgroundColor: '#4ECDC4' },
    pillText: { fontSize: 12, color: '#666' },
    pillTextActive: { color: '#FFF', fontWeight: '700' },
    pillSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: '#F0F0F0', marginRight: 6, marginBottom: 6 },
    pillTextSmall: { fontSize: 11, color: '#666' },

    mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    mediaBtn: { flex: 0.48, height: 80, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    mediaText: { marginTop: 6, color: '#666', fontSize: 12 },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    addQBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addQText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },

    questionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
    qCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    qTypeBadge: { fontSize: 10, fontWeight: '700', color: '#4ECDC4', backgroundColor: '#E0F7FA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    qActions: { flexDirection: 'row' },
    qText: { fontSize: 14, color: '#333', fontWeight: '500' },
    qMediaBadge: { marginTop: 6, fontSize: 10, color: '#999', fontStyle: 'italic' },

    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    createButton: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#A0E6E1' },
    createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalBody: { padding: 20 },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    optLabel: { width: 25, fontWeight: '700', fontSize: 14 },
    radio: { marginLeft: 10 },
    saveModalBtn: { backgroundColor: '#333', padding: 14, borderRadius: 10, alignItems: 'center' },
    saveModalText: { color: '#FFF', fontWeight: '700' },
});

export default CreateLessonScreen;