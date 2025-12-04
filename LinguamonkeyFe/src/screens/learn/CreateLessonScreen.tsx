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
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useLessons } from '../../hooks/useLessons';
import { useUserStore } from '../../stores/UserStore';
import { LessonRequest, LessonQuestionRequest } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import { gotoTab } from '../../utils/navigationRef';
import FileUploader from '../../components/common/FileUploader';
import { uploadTemp } from '../../services/cloudinary'; // Direct upload for voice

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
    mediaUrl: string;
}

// --- SUB-COMPONENT: MINI VOICE RECORDER ---

const MiniVoiceRecorder = ({ onRecordingComplete }: { onRecordingComplete: (url: string) => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handleStart = async () => {
        try {
            await setAudioModeAsync({ allowsRecording: true });
            await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
            await recorder.record();
            setIsRecording(true);
            setDuration(0);
            setRecordedUri(null);
        } catch (error) {
            Alert.alert("Error", "Could not start recording.");
        }
    };

    const handleStop = async () => {
        try {
            await recorder.stop();
            setIsRecording(false);
            setRecordedUri(recorder.uri);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async () => {
        if (!recordedUri) return;
        setIsUploading(true);
        try {
            // Upload as audio type
            const file = {
                uri: recordedUri,
                name: `voice_q_${Date.now()}.m4a`,
                type: 'audio/m4a'
            };
            const response = await uploadTemp(file);
            // Assuming response is the ID or URL. If ID, format it.
            // Adjust based on your cloud service return. Assuming it returns ID here:
            const finalUrl = `https://drive.google.com/uc?export=download&id=${response}`;
            onRecordingComplete(finalUrl);
            Alert.alert("Success", "Voice recorded and uploaded!");
        } catch (error) {
            Alert.alert("Error", "Failed to upload recording");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={styles.recorderContainer}>
            {!recordedUri ? (
                <TouchableOpacity
                    style={[styles.recordBtn, isRecording && styles.recordingBtnActive]}
                    onPress={isRecording ? handleStop : handleStart}
                >
                    <Ionicons name={isRecording ? "stop" : "mic"} size={20} color="#FFF" />
                    <Text style={styles.recordBtnText}>
                        {isRecording ? `Stop (${duration}s)` : "Record Voice"}
                    </Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>Recorded: {duration}s</Text>
                    <View style={styles.previewActions}>
                        <TouchableOpacity onPress={() => setRecordedUri(null)} disabled={isUploading}>
                            <Ionicons name="trash" size={20} color="#FF6B6B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.uploadVoiceBtn}
                            onPress={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload" size={16} color="#FFF" />
                                    <Text style={styles.uploadVoiceText}>Save Audio</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

// --- MAIN SCREEN ---

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
    const [lessonType, setLessonType] = useState<string>('VOCABULARY');
    const [languageCode, setLanguageCode] = useState<string>('vi');
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [lessonMediaUrl, setLessonMediaUrl] = useState<string>('');

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
        mediaUrl: '',
    };
    const [currentQuestion, setCurrentQuestion] = useState<LocalQuestionState>(defaultQuestionState);
    const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);
    const [isUploadingQMedia, setIsUploadingQMedia] = useState(false);

    const LANGUAGES = [
        { code: 'vi', name: 'Vietnamese' },
        { code: 'en', name: 'English' },
        { code: 'zh', name: 'China' },
    ];

    const LESSON_TYPES = ['VOCABULARY', 'GRAMMAR_PRACTICE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'QUIZ'];
    const JUST_MEDIA_TYPES = ['VIDEO', 'AUDIO', 'DOCUMENT'];

    const isJustMedia = JUST_MEDIA_TYPES.includes(lessonType);

    // --- HELPERS ---
    const formatDriveUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

    // --- HANDLERS ---

    const handleMainMediaSuccess = (id: string, type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT', size?: number) => {
        // Validation logic for "Just Media" spam prevention (Mocking size check if not passed directly, but FileUploader validates maxMB)
        // If FileUploader passed validation, we assume it's good.
        setLessonMediaUrl(formatDriveUrl(id));
    };

    const handleAddOrUpdateQuestion = () => {
        if (!currentQuestion.question.trim() && !currentQuestion.mediaUrl) {
            Alert.alert("Missing Info", "Question must have text or media/audio.");
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
        if (isJustMedia && !lessonMediaUrl) return Alert.alert('Required', `Please upload the ${lessonType} file.`);
        if (!user?.userId) return Alert.alert('Error', 'User invalid. Login again.');

        setIsSubmitting(true);
        setLoadingMessage('Creating Lesson...');

        try {
            // Append Media URL to description for "Just Media" types so frontend can find it easily
            // Logic: If [Media] tag exists, frontend will parse it.
            const finalDescription = lessonMediaUrl
                ? `${description || ''}\n\n[Media]: ${lessonMediaUrl}`
                : (description || '');

            // 1. Create Lesson Request
            const lessonPayload: LessonRequest = {
                lessonName: lessonName.trim(),
                title: lessonName.trim(),
                creatorId: user.userId,
                description: finalDescription,
                thumbnailUrl: thumbnailUrl,
                skillType: skillType as any,
                languageCode: languageCode,
                courseId: courseId ? (courseId as any) : undefined,
                lessonCategoryId: lessonCategoryId ? (lessonCategoryId as any) : undefined,
                lessonSubCategoryId: lessonSubCategoryId ? (lessonSubCategoryId as any) : undefined,
                expReward: isJustMedia ? 10 : 10 + (questions.length * 2),
                orderIndex: 0,
                isFree: true,
                lessonType: lessonType as any,
                lessonSeriesId: '',
                difficultyLevel: 'BEGINNER' as any,
                durationSeconds: isJustMedia ? 300 : questions.length * 60, // Default 5 mins for media
                certificateCode: '',
                passScorePercent: 80,
                shuffleQuestions: !isJustMedia,
                allowedRetakeCount: 999
            };

            const newLesson = await createLessonMutation.mutateAsync(lessonPayload);
            const newLessonId = newLesson.lessonId;

            // 2. Create Questions Loop (Skip if Just Media, user said "khỏi question")
            if (!isJustMedia && questions.length > 0) {
                setLoadingMessage(`Creating ${questions.length} Questions...`);

                for (let i = 0; i < questions.length; i++) {
                    const qLocal = questions[i];
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
                        languageCode: languageCode,
                        skillType: skillType as any,
                        optionsJson: optionsJson,
                        optionA: qLocal.options.A,
                        optionB: qLocal.options.B,
                        optionC: qLocal.options.C,
                        optionD: qLocal.options.D,
                        correctOption: qLocal.correctOption,
                        transcript: qLocal.transcript || undefined,
                        weight: parseInt(qLocal.weight) || 1,
                        orderIndex: i,
                        mediaUrl: qLocal.mediaUrl,
                        explainAnswer: qLocal.explainAnswer,
                        isDeleted: false
                    };

                    await createQuestionMutation.mutateAsync(qPayload);
                }
            }

            Alert.alert('Success', 'Lesson created successfully!', [
                { text: 'Finish', onPress: () => navigation.goBack() },
            ]);

        } catch (error) {
            console.error('Creation Error:', error);
            Alert.alert('Error', 'Failed to create lesson.');
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
                <Text style={styles.headerTitle}>Create Smart Lesson</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- CONFIG SECTION --- */}
                <Text style={styles.sectionTitle}>1. Lesson Configuration</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lesson Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Daily Conversation / Intro Video"
                        value={lessonName}
                        onChangeText={setLessonName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lesson Type (Determines Structure)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {LESSON_TYPES.map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.pill, lessonType === type && styles.pillActive]}
                                onPress={() => setLessonType(type)}
                            >
                                <Text style={[styles.pillText, lessonType === type && styles.pillTextActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {isJustMedia && (
                        <Text style={styles.infoText}>
                            * This type is Just Media. Users will simply watch/listen/read. No questions required.
                        </Text>
                    )}
                </View>

                {/* --- MEDIA SECTION --- */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Media & Assets</Text>
                    <View style={styles.mediaRow}>
                        {/* Always show Thumbnail Uploader */}
                        <FileUploader
                            mediaType="image"
                            style={styles.mediaBtn}
                            onUploadSuccess={(id) => setThumbnailUrl(formatDriveUrl(id))}
                        >
                            <Ionicons name="image-outline" size={24} color={thumbnailUrl ? "#4ECDC4" : "#666"} />
                            <Text style={styles.mediaText}>{thumbnailUrl ? "Thumb Uploaded" : "Thumbnail"}</Text>
                        </FileUploader>

                        {/* Smart Media Uploader based on Lesson Type */}
                        <FileUploader
                            mediaType={lessonType === 'VIDEO' ? 'video' : lessonType === 'AUDIO' ? 'audio' : lessonType === 'DOCUMENT' ? 'document' : 'video'}
                            style={[styles.mediaBtn, isJustMedia && styles.mediaBtnHighlight]}
                            onUploadSuccess={(id, type) => handleMainMediaSuccess(id, type)}
                            maxSizeMB={20} // Higher limit for main lesson media
                        >
                            <Ionicons
                                name={lessonType === 'AUDIO' ? 'musical-note' : lessonType === 'DOCUMENT' ? 'document-text' : 'videocam'}
                                size={24}
                                color={lessonMediaUrl ? "#4ECDC4" : isJustMedia ? "#333" : "#666"}
                            />
                            <Text style={[styles.mediaText, isJustMedia && { fontWeight: '700', color: '#333' }]}>
                                {lessonMediaUrl ? "Media Ready" : isJustMedia ? `Upload ${lessonType}` : "Intro Video (Opt)"}
                            </Text>
                        </FileUploader>
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

                <View style={styles.divider} />

                {/* --- QUESTIONS SECTION (Hidden if Just Media) --- */}
                {!isJustMedia && (
                    <>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>2. Questions ({questions.length})</Text>
                            <TouchableOpacity onPress={openNewQuestionModal} style={styles.addQBtn}>
                                <Ionicons name="add" size={20} color="#FFF" />
                                <Text style={styles.addQText}>Add Question</Text>
                            </TouchableOpacity>
                        </View>

                        {questions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No questions yet. Add one to make this lesson interactive.</Text>
                            </View>
                        ) : (
                            questions.map((q, index) => (
                                <View key={q.id} style={styles.questionCard}>
                                    <View style={styles.qCardHeader}>
                                        <Text style={styles.qTypeBadge}>{q.questionType}</Text>
                                        <View style={styles.qActions}>
                                            <TouchableOpacity onPress={() => editQuestion(index)} style={{ marginRight: 10 }}>
                                                <Ionicons name="pencil" size={20} color="#666" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => deleteQuestion(index)}>
                                                <Ionicons name="trash" size={20} color="#FF6B6B" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={styles.qText} numberOfLines={2}>{q.question}</Text>
                                    {q.mediaUrl ? (
                                        <View style={styles.mediaTag}>
                                            <Ionicons name="attach" size={12} color="#666" />
                                            <Text style={styles.mediaTagText}>Media Attached</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ))
                        )}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createButton, isSubmitting && styles.disabledButton]}
                    onPress={handleCreateFullLesson}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="#FFF" />
                            <Text style={[styles.createButtonText, { marginLeft: 10 }]}>{loadingMessage}</Text>
                        </View>
                    ) : (
                        <Text style={styles.createButtonText}>
                            {isJustMedia ? "Create Media Lesson" : "Create Lesson & Questions"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* --- MODAL --- */}
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
                            <Text style={styles.label}>Question Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {['MULTIPLE_CHOICE', 'SPEAKING', 'WRITING', 'FILL_IN_THE_BLANK'].map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.pillSmall, currentQuestion.questionType === t && styles.pillActive]}
                                        onPress={() => setCurrentQuestion({ ...currentQuestion, questionType: t })}
                                    >
                                        <Text style={[styles.pillTextSmall, currentQuestion.questionType === t && styles.pillTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={styles.label}>Question Text</Text>
                            <TextInput
                                style={[styles.input, { height: 60 }]}
                                multiline
                                value={currentQuestion.question}
                                onChangeText={t => setCurrentQuestion({ ...currentQuestion, question: t })}
                                placeholder="Enter question..."
                            />

                            <View style={styles.mediaSection}>
                                <Text style={styles.label}>Attachment (Image/Voice)</Text>
                                <View style={styles.mediaRow}>
                                    <FileUploader
                                        mediaType="image"
                                        style={styles.modalMediaBtn}
                                        onUploadSuccess={(id) => setCurrentQuestion({ ...currentQuestion, mediaUrl: formatDriveUrl(id) })}
                                    >
                                        <Ionicons name="image" size={20} color={currentQuestion.mediaUrl?.includes('jpeg') || currentQuestion.mediaUrl?.includes('png') ? "#4ECDC4" : "#999"} />
                                        <Text style={styles.modalMediaText}>Image</Text>
                                    </FileUploader>

                                    {/* Voice Recorder Integration */}
                                    <View style={{ flex: 2, marginLeft: 10 }}>
                                        <MiniVoiceRecorder
                                            onRecordingComplete={(url) => setCurrentQuestion({ ...currentQuestion, mediaUrl: url })}
                                        />
                                    </View>
                                </View>
                                {currentQuestion.mediaUrl ? (
                                    <Text style={styles.attachedText} numberOfLines={1}>Attached: {currentQuestion.mediaUrl.slice(-20)}</Text>
                                ) : null}
                            </View>

                            {/* Conditional Inputs based on Type */}
                            {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                                <View>
                                    <Text style={styles.label}>Options</Text>
                                    {['A', 'B', 'C', 'D'].map((optKey) => (
                                        <View key={optKey} style={styles.optionRow}>
                                            <Text style={styles.optLabel}>{optKey}</Text>
                                            <TextInput
                                                style={[styles.input, { flex: 1, marginBottom: 5 }]}
                                                value={(currentQuestion.options as any)[optKey]}
                                                onChangeText={(t) => setCurrentQuestion({
                                                    ...currentQuestion,
                                                    options: { ...currentQuestion.options, [optKey]: t }
                                                })}
                                                placeholder={`Option ${optKey}`}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setCurrentQuestion({ ...currentQuestion, correctOption: optKey })}
                                                style={styles.radio}
                                            >
                                                <Ionicons name={currentQuestion.correctOption === optKey ? "radio-button-on" : "radio-button-off"} size={24} color="#4ECDC4" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View style={{ height: 20 }} />
                            <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddOrUpdateQuestion}>
                                <Text style={styles.saveModalText}>Save Question</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
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
    infoText: { fontSize: 12, color: '#F97316', marginTop: 5, fontStyle: 'italic' },

    inputGroup: { marginBottom: 15 },
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
    required: { color: 'red' },
    input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15 },
    textArea: { height: 80, textAlignVertical: 'top' },

    // Pills
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EEE', marginRight: 8, marginBottom: 8 },
    pillActive: { backgroundColor: '#4ECDC4' },
    pillText: { fontSize: 12, color: '#666' },
    pillTextActive: { color: '#FFF', fontWeight: '700' },
    pillSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: '#F0F0F0', marginRight: 6, marginBottom: 6 },
    pillTextSmall: { fontSize: 11, color: '#666' },

    // Media
    mediaRow: { flexDirection: 'row', justifyContent: 'space-between' },
    mediaBtn: { flex: 0.48, height: 80, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    mediaBtnHighlight: { borderColor: '#4ECDC4', backgroundColor: '#E0F7FA' },
    mediaText: { marginTop: 6, color: '#666', fontSize: 12 },

    // Questions
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    addQBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addQText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
    emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE', borderRadius: 8 },
    emptyStateText: { color: '#888', fontStyle: 'italic' },
    questionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
    qCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    qTypeBadge: { fontSize: 10, fontWeight: '700', color: '#4ECDC4', backgroundColor: '#E0F7FA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    qActions: { flexDirection: 'row' },
    qText: { fontSize: 14, color: '#333', fontWeight: '500' },
    mediaTag: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    mediaTagText: { fontSize: 10, color: '#666', marginLeft: 2 },

    // Footer
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    createButton: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#A0E6E1' },
    createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalBody: { padding: 20 },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    optLabel: { width: 25, fontWeight: '700', fontSize: 14 },
    radio: { marginLeft: 10 },
    saveModalBtn: { backgroundColor: '#333', padding: 14, borderRadius: 10, alignItems: 'center' },
    saveModalText: { color: '#FFF', fontWeight: '700' },

    // Modal Media & Recorder
    mediaSection: { marginBottom: 15 },
    modalMediaBtn: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEE' },
    modalMediaText: { fontSize: 10, color: '#999', marginTop: 2 },
    recorderContainer: { flexDirection: 'row', alignItems: 'center', height: 60, backgroundColor: '#F8F9FA', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#EEE' },
    recordBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    recordingBtnActive: { backgroundColor: '#B91C1C' },
    recordBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 6 },
    previewContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    previewText: { fontSize: 12, color: '#333', fontWeight: '600' },
    previewActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    uploadVoiceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    uploadVoiceText: { color: '#FFF', fontSize: 10, marginLeft: 4, fontWeight: '600' },
    attachedText: { fontSize: 10, color: '#4ECDC4', marginTop: 4 }
});

export default CreateLessonScreen;