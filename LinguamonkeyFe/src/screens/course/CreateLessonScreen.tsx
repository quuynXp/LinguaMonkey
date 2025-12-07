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
    Image,
    Dimensions
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLessons } from '../../hooks/useLessons';
import { useUserStore } from '../../stores/UserStore';
import { LessonRequest, LessonQuestionRequest, LessonQuestionResponse } from '../../types/dto';
import ScreenLayout from '../../components/layout/ScreenLayout';
import FileUploader from '../../components/common/FileUploader';
import { DifficultyLevel, LessonType, QuestionType, SkillType } from '../../types/enums';

const { width } = Dimensions.get('window');

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

const MediaPreviewItem = ({
    url,
    onDelete,
    style,
    containerStyle
}: {
    url: string;
    onDelete?: () => void;
    style?: any;
    containerStyle?: any;
}) => {
    const isImage = url ? (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('googleusercontent')) : false;

    // SỬA LỖI 2: Thêm logic để kiểm tra nếu mediaUrl là THUMBNAIL_URL (ảnh đại diện) thì LUÔN LUÔN hiển thị Image
    // Do component này được dùng cho cả thumbnailUrl và mediaUrls của Question
    // Nếu url null/undefined, coi như không phải ảnh

    // LOGIC: Nếu url kết thúc bằng extension video/audio, hoặc không có extension nhưng không phải ảnh: Coi là video/audio
    const isVideoOrAudio = url ? (
        url.match(/\.(mp4|mov|avi|webm|m4a|mp3|wav|ogg)$/i) != null ||
        !isImage
    ) : false;

    // Nếu là ảnh, CHẮC CHẮN hiển thị <Image>
    // Nếu là video/audio, hiển thị <VideoView>
    // Component này đã được gọi ở 2 vị trí khác nhau:
    // 1. Thumbnail Lesson (thumbnailUrl) -> LUÔN LUÔN phải là Ảnh. 
    //    Ở vị trí này, chúng ta cần đảm bảo FileUploader chỉ cho phép tải ảnh (đã được định nghĩa là mediaType="image" ở dưới).
    //    Tuy nhiên, nếu link đã có sẵn từ backend (ví dụ từ Google Drive link không có extension rõ ràng), 
    //    thì logic `isImage` ở trên có thể bị sai.
    // 2. Media Question (q.mediaUrl) -> Có thể là Ảnh, Audio, hoặc Video.

    // Tinh chỉnh logic: Nếu url có chứa domain video/audio thường gặp mà không có extension rõ ràng, thì dùng VideoView.
    // Vì component này được dùng cho cả Thumbnail (luôn là ảnh) và Question Media (có thể là video/audio), 
    // việc dựa vào extension là cách tốt nhất. Nếu url cho thumbnail có vẻ không phải ảnh (theo extension)
    // thì vẫn nên hiển thị Image vì mục đích của nó là thumbnail.

    const isMediaFile = url ? !isImage : false;

    const videoSource = (url && isMediaFile) ? url : null;

    const player = useVideoPlayer(videoSource, (player) => {
        player.loop = false;
    });

    if (!url) return null;

    // Đảm bảo Thumbnail (được gọi ở trên) luôn hiển thị ảnh
    // và Media Question (được gọi trong Modal) hiển thị đúng loại.
    const shouldRenderImage = isImage;
    const shouldRenderVideo = !isImage && isMediaFile; // Chỉ render video nếu không phải ảnh và có vẻ là file media

    return (
        <View style={[styles.mediaItemContainer, containerStyle]}>
            {shouldRenderImage ? (
                <Image source={{ uri: url }} style={[styles.imagePreview, style]} resizeMode="contain" />
            ) : shouldRenderVideo ? (
                <View style={[styles.videoContainer, style]}>
                    <VideoView
                        player={player}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        nativeControls={true}
                    />
                </View>
            ) : (
                // Fallback nếu không phải ảnh, cũng không phải video/audio rõ ràng (ví dụ: file document)
                <View style={[styles.imagePreview, style, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="document-text-outline" size={30} color="#777" />
                    <Text style={{ fontSize: 12, color: '#777', marginTop: 5 }}>File Preview</Text>
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
    const user = useUserStore(state => state.user);

    const {
        useCreateLesson,
        useUpdateLesson,
        useCreateQuestion,
        useUpdateQuestion,
        useLesson,
        useAllQuestions,
        useDeleteQuestion
    } = useLessons();

    const createLessonMutation = useCreateLesson();
    const updateLessonMutation = useUpdateLesson();
    const createQuestionMutation = useCreateQuestion();
    const updateQuestionMutation = useUpdateQuestion();
    const deleteQuestionMutation = useDeleteQuestion();

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
                    // console.log("Error parsing optionsJson", e);
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

    const handleDeleteQuestion = async (index: number) => {
        const q = questions[index];
        if (q.id && q.id.length > 20) {
            Alert.alert("Confirm", "Delete this question permanently?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        await deleteQuestionMutation.mutateAsync(q.id);
                        const updated = questions.filter((_, i) => i !== index);
                        setQuestions(updated);
                    }
                }
            ]);
        } else {
            const updated = questions.filter((_, i) => i !== index);
            setQuestions(updated);
        }
    };

    const handleSave = async () => {
        if (!lessonName) return Alert.alert("Error", "Lesson Name required");
        if (isMediaLesson && mediaUrls.length === 0) return Alert.alert("Error", `Upload at least one ${lessonType} file.`);

        setIsSubmitting(true);
        try {
            let targetLessonId = lessonId;

            // LỖI 1: SkillType trong LessonRequest không thay đổi theo LessonType
            // Cần cập nhật SkillType nếu LessonType là Speaking
            let skillType: SkillType = SkillType.READING;
            if (lessonType === LessonType.SPEAKING) {
                skillType = SkillType.SPEAKING;
            } else if (lessonType === LessonType.AUDIO) {
                skillType = SkillType.LISTENING;
            } else if (lessonType === LessonType.VOCABULARY) {
                skillType = SkillType.VOCABULARY;
            }

            const lessonPayload: LessonRequest = {
                lessonName,
                title: lessonName,
                creatorId: user?.userId || '',
                description,
                thumbnailUrl,
                lessonType,
                mediaUrls: mediaUrls,
                skillType: skillType, // ĐÃ SỬA: Cập nhật SkillType
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

                    // LỖI 1: Cập nhật SkillType cho Question
                    let questionSkillType = SkillType.READING;
                    if (q.questionType === QuestionType.SPEAKING) {
                        questionSkillType = SkillType.SPEAKING;
                    } else if (q.questionType === QuestionType.LISTENING) {
                        questionSkillType = SkillType.LISTENING;
                    }
                    // Các loại câu hỏi khác giữ nguyên READING/VOCABULARY

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
                        skillType: questionSkillType, // ĐÃ SỬA: Cập nhật SkillType cho Question
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
                        orderIndex: i,
                        isDeleted: false
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
            // console.error(e);
            Alert.alert("Error", "Failed to save lesson");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDynamicInputs = () => {
        // Thêm trường Transcript nếu QuestionType là SPEAKING
        const transcriptInput = (
            <View>
                <Text style={styles.label}>Transcript (Correct Answer Text)</Text>
                <TextInput
                    style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                    multiline
                    value={currentQ.transcript}
                    onChangeText={t => setCurrentQ({ ...currentQ, transcript: t })}
                    placeholder="Enter the correct transcript for the speaking question..."
                />
            </View>
        );

        switch (currentQ.questionType) {
            case QuestionType.SPEAKING:
                // SỬA LỖI 1: Hiển thị ô nhập Transcript khi chọn Speaking
                return transcriptInput;
            case QuestionType.LISTENING:
                return (
                    <View>
                        {transcriptInput}
                        <View style={styles.divider} />
                        {/* Listening có thể có thêm Multiple Choice, nếu cần thì thêm logic ở đây. */}
                        {/* Hiện tại, giữ nguyên như Multiple Choice nếu có. */}
                        {renderOptionsInputs()}
                    </View>
                );
            case QuestionType.MULTIPLE_CHOICE:
                return renderOptionsInputs();
            case QuestionType.TRUE_FALSE:
                return (
                    <View>
                        <Text style={styles.label}>Correct Answer</Text>
                        <View style={styles.rowCenter}>
                            {['True', 'False'].map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.choiceCard, currentQ.correctOption === val && styles.choiceCardActive]}
                                    onPress={() => setCurrentQ({ ...currentQ, correctOption: val })}
                                >
                                    <Ionicons
                                        name={val === 'True' ? 'checkmark-circle' : 'close-circle'}
                                        size={24}
                                        color={currentQ.correctOption === val ? '#FFF' : '#666'}
                                    />
                                    <Text style={[styles.choiceText, currentQ.correctOption === val && styles.textActive]}>{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case QuestionType.MATCHING:
                return (
                    <View>
                        <Text style={styles.label}>Matching Pairs (Left - Right)</Text>
                        {currentQ.pairs.map((pair, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 8 }]}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} placeholder="Key" value={pair.key}
                                    onChangeText={t => { const p = [...currentQ.pairs]; p[idx].key = t; setCurrentQ({ ...currentQ, pairs: p }) }}
                                />
                                <Ionicons name="swap-horizontal" size={20} color="#999" style={{ marginHorizontal: 5 }} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} placeholder="Value" value={pair.value}
                                    onChangeText={t => { const p = [...currentQ.pairs]; p[idx].value = t; setCurrentQ({ ...currentQ, pairs: p }) }}
                                />
                                <TouchableOpacity onPress={() => { const p = currentQ.pairs.filter((_, i) => i !== idx); setCurrentQ({ ...currentQ, pairs: p }) }}>
                                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" style={{ marginLeft: 5 }} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addBtnSmall} onPress={() => setCurrentQ({ ...currentQ, pairs: [...currentQ.pairs, { key: '', value: '' }] })}>
                            <Text style={styles.addBtnText}>+ Add Pair</Text>
                        </TouchableOpacity>
                    </View>
                );
            case QuestionType.ORDERING:
                return (
                    <View>
                        <Text style={styles.label}>Correct Sequence (Top to Bottom)</Text>
                        {currentQ.orderItems.map((item, idx) => (
                            <View key={idx} style={[styles.rowCenter, { marginBottom: 5 }]}>
                                <Text style={styles.indexBadge}>{idx + 1}</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]} value={item}
                                    onChangeText={t => { const i = [...currentQ.orderItems]; i[idx] = t; setCurrentQ({ ...currentQ, orderItems: i }) }}
                                />
                                <TouchableOpacity onPress={() => { const i = currentQ.orderItems.filter((_, n) => n !== idx); setCurrentQ({ ...currentQ, orderItems: i }) }}>
                                    <Ionicons name="close-circle" size={24} color="#FF6B6B" style={{ marginLeft: 5 }} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addBtnSmall} onPress={() => setCurrentQ({ ...currentQ, orderItems: [...currentQ.orderItems, ''] })}>
                            <Text style={styles.addBtnText}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                return (
                    <View>
                        <Text style={styles.label}>Answer (Use || for variations)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. going || to go"
                            value={currentQ.correctOption}
                            onChangeText={t => setCurrentQ({ ...currentQ, correctOption: t })}
                        />
                    </View>
                );
            default: return null;
        }
    };

    // Tách riêng phần render Options cho Multiple Choice
    const renderOptionsInputs = () => (
        <View>
            <Text style={styles.label}>Options & Correct Answer</Text>
            {['A', 'B', 'C', 'D'].map(opt => (
                <View key={opt} style={styles.rowCenter}>
                    <TouchableOpacity
                        style={[styles.radioBtn, currentQ.correctOption === opt && styles.radioBtnActive]}
                        onPress={() => setCurrentQ({ ...currentQ, correctOption: opt })}
                    >
                        <Text style={[styles.radioText, currentQ.correctOption === opt && styles.textActive]}>{opt}</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { flex: 1, marginLeft: 10 }]}
                        placeholder={`Option ${opt}`}
                        value={(currentQ.options as any)[opt]}
                        onChangeText={t => setCurrentQ({ ...currentQ, options: { ...currentQ.options, [opt]: t } })}
                    />
                </View>
            ))}
        </View>
    );

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditMode ? "Edit Lesson" : "Create Lesson"}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Basic Information</Text>
                    <Text style={styles.label}>Thumbnail</Text>
                    <View style={styles.rowCenter}>
                        {/* LỖI 2: Dùng MediaPreviewItem cho Thumbnail. 
                            MediaPreviewItem hiện tại coi mọi thứ không có extension ảnh là video/audio. 
                            Nếu thumbnail không có đuôi rõ ràng, nó sẽ hiển thị VideoView.
                            Đã sửa logic trong MediaPreviewItem để xử lý tốt hơn,
                            nhưng để an toàn, có thể dùng trực tiếp <Image> ở đây vì thumbnailUrl luôn là ảnh.
                            Tuy nhiên, sửa MediaPreviewItem là giải pháp tốt hơn cho toàn bộ ứng dụng. */}
                        {thumbnailUrl ? <MediaPreviewItem url={thumbnailUrl} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 10 }} /> : null}
                        <View style={{ flex: 1 }}>
                            <FileUploader mediaType="image" onUploadSuccess={(id) => setThumbnailUrl(formatDriveUrl(id))}>
                                <View style={styles.uploadBtn}>
                                    <Ionicons name="image-outline" size={20} color="#FFF" />
                                    <Text style={styles.uploadBtnText}>{thumbnailUrl ? "Change" : "Upload Thumbnail"}</Text>
                                </View>
                            </FileUploader>
                        </View>
                    </View>

                    <Text style={styles.label}>Lesson Name</Text>
                    <TextInput style={styles.input} value={lessonName} onChangeText={setLessonName} placeholder="Enter lesson title" />

                    <Text style={styles.label}>Lesson Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {Object.values(LessonType).map(t => (
                            <TouchableOpacity key={t} style={[styles.pill, lessonType === t && styles.pillActive]} onPress={() => setLessonType(t)}>
                                <Text style={[styles.pillText, lessonType === t && styles.textActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Lesson Media (Video/Audio)</Text>
                    {mediaUrls.map((url, idx) => (
                        <MediaPreviewItem
                            key={idx}
                            url={url}
                            style={{ height: 180, borderRadius: 8 }}
                            containerStyle={{ marginBottom: 15 }}
                            onDelete={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
                        />
                    ))}
                    <FileUploader mediaType="all" onUploadSuccess={(id) => setMediaUrls([...mediaUrls, formatDriveUrl(id)])}>
                        <View style={styles.uploadBtnOutline}>
                            <Ionicons name="cloud-upload-outline" size={20} color="#4ECDC4" />
                            <Text style={{ color: '#4ECDC4', marginLeft: 5 }}>Add Video/Audio</Text>
                        </View>
                    </FileUploader>
                </View>

                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionHeader}>Questions ({questions.length})</Text>
                        <TouchableOpacity
                            style={styles.addIconBtn}
                            onPress={() => { setCurrentQ(defaultQ); setModalVisible(true); setIsEditingIndex(null); }}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {questions.map((q, i) => (
                        <View key={i} style={styles.questionCard}>
                            <View style={styles.qHeader}>
                                <View style={[styles.qTypeTag, { backgroundColor: '#E0F7FA' }]}>
                                    <Text style={{ color: '#006064', fontSize: 10, fontWeight: 'bold' }}>{q.questionType}</Text>
                                </View>
                                <View style={{ flexDirection: 'row' }}>
                                    <TouchableOpacity style={styles.actionIcon} onPress={() => { setCurrentQ(q); setModalVisible(true); setIsEditingIndex(i); }}>
                                        <Ionicons name="create-outline" size={20} color="#4ECDC4" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteQuestion(i)}>
                                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.qText} numberOfLines={2}>{q.question || "(No text content)"}</Text>
                            {q.mediaUrl ? (
                                <View style={{ marginTop: 10 }}>
                                    <MediaPreviewItem url={q.mediaUrl} style={{ width: 120, height: 80, borderRadius: 5, backgroundColor: '#000' }} />
                                </View>
                            ) : null}
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveMainText}>SAVE LESSON</Text>}
                </TouchableOpacity>
                <View style={{ height: 50 }} />
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <ScreenLayout style={{ backgroundColor: '#FFF' }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={{ color: '#666', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{isEditingIndex !== null ? 'Edit Question' : 'New Question'}</Text>
                        <TouchableOpacity onPress={handleSaveQuestion}>
                            <Text style={{ color: '#4ECDC4', fontSize: 16, fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            <Text style={styles.label}>Question Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
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

                            <Text style={styles.label}>Question Text</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                                multiline
                                value={currentQ.question}
                                onChangeText={t => setCurrentQ({ ...currentQ, question: t })}
                                placeholder="Type question here..."
                            />

                            <Text style={styles.label}>Attachment</Text>
                            {currentQ.mediaUrl ? (
                                <MediaPreviewItem
                                    url={currentQ.mediaUrl}
                                    style={{ height: 200, width: '100%', borderRadius: 8, backgroundColor: '#000' }}
                                    containerStyle={{ marginTop: 5 }}
                                    onDelete={() => setCurrentQ({ ...currentQ, mediaUrl: '' })}
                                />
                            ) : (
                                <FileUploader mediaType="all" onUploadSuccess={(id) => setCurrentQ({ ...currentQ, mediaUrl: formatDriveUrl(id) })}>
                                    <View style={styles.uploadPlaceholder}>
                                        <Ionicons name="cloud-upload" size={30} color="#CCC" />
                                        <Text style={{ color: '#999', marginTop: 5 }}>Upload Image/Audio/Video</Text>
                                    </View>
                                </FileUploader>
                            )}

                            <View style={styles.divider} />
                            {renderDynamicInputs()}

                            <View style={styles.divider} />
                            <Text style={styles.label}>Explanation (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                multiline
                                value={currentQ.explainAnswer}
                                onChangeText={t => setCurrentQ({ ...currentQ, explainAnswer: t })}
                                placeholder="Why is this the correct answer?"
                            />
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </ScreenLayout>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    content: { padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF' },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    section: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
    label: { fontSize: 13, color: '#7F8C8D', marginBottom: 6, fontWeight: '600', marginTop: 12 },
    input: { borderWidth: 1, borderColor: '#ECF0F1', borderRadius: 8, padding: 12, backgroundColor: '#FAFAFA', fontSize: 14, color: '#333' },
    pill: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F0F2F5', borderRadius: 20, marginRight: 8 },
    pillSmall: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F0F2F5', borderRadius: 16, marginRight: 6 },
    pillActive: { backgroundColor: '#4ECDC4' },
    textActive: { color: '#FFF', fontWeight: 'bold' },
    pillText: { fontSize: 13, color: '#555' },
    pillTextSmall: { fontSize: 12, color: '#555' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    uploadBtn: { backgroundColor: '#4ECDC4', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, justifyContent: 'center' },
    uploadBtnOutline: { borderWidth: 1, borderColor: '#4ECDC4', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, justifyContent: 'center', marginTop: 10 },
    uploadBtnText: { color: '#FFF', fontWeight: '600', marginLeft: 5 },
    saveMainBtn: { backgroundColor: '#2C3E50', padding: 16, borderRadius: 10, alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 } },
    saveMainText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    questionCard: { padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    qTypeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    actionIcon: { marginLeft: 10, padding: 4 },
    qText: { fontSize: 14, color: '#333', fontWeight: '500' },
    addIconBtn: { backgroundColor: '#4ECDC4', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    mediaItemContainer: { position: 'relative', overflow: 'hidden' },
    deleteOverlayBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 12, padding: 6, zIndex: 10 },
    uploadPlaceholder: { height: 100, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
    radioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    radioBtnActive: { backgroundColor: '#4ECDC4' },
    radioText: { fontWeight: 'bold', color: '#555' },
    choiceCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, backgroundColor: '#F0F2F5', marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent' },
    choiceCardActive: { backgroundColor: '#4ECDC4', borderColor: '#3EBDB4' },
    choiceText: { marginLeft: 8, fontWeight: 'bold', color: '#555' },
    addBtnSmall: { marginTop: 10, alignSelf: 'flex-start' },
    addBtnText: { color: '#4ECDC4', fontWeight: '600' },
    indexBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#DDD', textAlign: 'center', textAlignVertical: 'center', marginRight: 8, fontSize: 12, fontWeight: 'bold' },
    imagePreview: { backgroundColor: '#F0F0F0', borderRadius: 8 },
    videoContainer: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }
});

export default CreateLessonScreen;