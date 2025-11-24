import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Animated,
    Modal,
    ActivityIndicator,
    FlatList,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PermissionService from '../../services/permissionService';
import i18n from '../../i18n';
import { useSkillLessons } from '../../hooks/useSkillLessons';
import { useLessons } from '../../hooks/useLessons';
import {
    StreamingChunk,
    WordFeedback,
    FinalResult,
    SpeakingSentence,
    LessonResponse,
} from '../../types/dto';

interface SpeakingScreenProps {
    navigation: any;
    route: {
        params?: {
            lessonId?: string;
            lesson?: LessonResponse; // Added lesson object
            categoryId?: string;
        };
    };
}

const SpeakingScreen = ({ navigation, route }: SpeakingScreenProps) => {
    const insets = useSafeAreaInsets();
    const lessonId = route.params?.lessonId || route.params?.lesson?.lessonId;
    const passedLesson = route.params?.lesson;

    const [selectedSentence, setSelectedSentence] = useState<SpeakingSentence | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingChunks, setStreamingChunks] = useState<StreamingChunk[]>([]);
    const [wordFeedbacks, setWordFeedbacks] = useState<WordFeedback[]>([]);
    const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const { useStreamPronunciation } = useSkillLessons();
    const { useLesson } = useLessons();
    const streamPronunciationMutation = useStreamPronunciation();

    // Fetch fresh data, but we can use passedLesson while loading
    const { data: fetchedLessonData, isLoading: isLoadingLesson } = useLesson(lessonId || null);

    // Prioritize fetched data, fallback to passed params
    const activeLessonData = fetchedLessonData || passedLesson;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        checkAndRequestMicrophonePermission();
    }, []);

    useEffect(() => {
        // Initialize sentence data from either fetched or passed lesson
        if (activeLessonData && activeLessonData.title) {
            setSelectedSentence({
                id: activeLessonData.lessonId || activeLessonData.courseId || 'default',
                text: activeLessonData.title,
                translation: '', // Add translation if available in LessonResponse
                audioUrl: '', // Add audioUrl if available
                ipa: ''
            } as unknown as SpeakingSentence);
        }
    }, [activeLessonData]);

    const checkAndRequestMicrophonePermission = async () => {
        const granted = await PermissionService.requestMicrophonePermission();
        setHasMicPermission(granted);
        if (!granted) {
            Alert.alert(
                i18n.t('speaking.mic_permission_title'),
                i18n.t('speaking.mic_permission_message'),
            );
        }
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopPulseAnimation = () => {
        pulseAnim.stopAnimation();
        Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const startRecording = async () => {
        if (!selectedSentence) {
            Alert.alert(i18n.t('common.error'), i18n.t('speaking.select_sentence_first'));
            return;
        }
        if (!hasMicPermission) {
            checkAndRequestMicrophonePermission();
            return;
        }
        if (!lessonId) {
            Alert.alert(i18n.t('common.error'), i18n.t('speaking.lesson_required'));
            return;
        }

        try {
            setIsRecording(true);
            startPulseAnimation();

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
            await recorder.record();
        } catch (error) {
            console.error('Recording error:', error);
            setIsRecording(false);
            stopPulseAnimation();
            Alert.alert(i18n.t('common.error'), i18n.t('speaking.error_start_recording'));
        }
    };

    const stopRecording = async () => {
        if (!lessonId || !selectedSentence) return;

        try {
            await recorder.stop();
            const uri = recorder.uri;

            if (uri) {
                setIsRecording(false);
                stopPulseAnimation();
                setIsStreaming(true);
                setStreamingChunks([]);
                setWordFeedbacks([]);
                setFinalResult(null);

                const fileUri = Platform.OS === 'ios' ? uri : `file://${uri}`;

                streamPronunciationMutation.mutate({
                    audioUri: fileUri,
                    lessonId,
                    languageCode: activeLessonData?.languageCode || 'en',
                    referenceText: selectedSentence.text,
                    onChunk: handleStreamingChunk,
                }, {
                    onSuccess: () => {
                        setIsStreaming(false);
                    },
                    onError: (error: any) => {
                        console.error('Streaming error:', error);
                        setIsStreaming(false);
                        Alert.alert(i18n.t('common.error'), i18n.t('speaking.error_analysis'));
                    },
                });
            }
        } catch (error) {
            console.error('Stop recording error:', error);
            setIsRecording(false);
            stopPulseAnimation();
        }
    };

    const handleStreamingChunk = (chunk: StreamingChunk) => {
        setStreamingChunks((prev) => [...prev, chunk]);

        if (chunk.type === 'chunk' && chunk.word_analysis) {
            setWordFeedbacks((prev) => [
                ...prev,
                {
                    word: chunk.word_analysis!.word,
                    spoken: chunk.word_analysis!.spoken,
                    score: chunk.word_analysis!.word_score,
                    isCorrect: chunk.word_analysis!.is_correct,
                },
            ]);
        }

        if (chunk.type === 'suggestion') {
            setWordFeedbacks((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0) {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        suggestion: chunk.feedback,
                    };
                }
                return updated;
            });
        }

        if (chunk.type === 'final') {
            setFinalResult({
                overall_score: chunk.score || 0,
                accuracy_score: chunk.metadata?.accuracy_score || 0,
                fluency_score: chunk.metadata?.fluency_score || 0,
                error_count: chunk.metadata?.error_count || 0,
                feedback: chunk.feedback,
            });
            setShowResult(true);
        }

        if (chunk.type === 'error') {
            Alert.alert(i18n.t('common.error'), chunk.feedback);
        }
    };

    const renderStreamingChunks = () => {
        return (
            <View>
                <FlatList
                    data={streamingChunks}
                    keyExtractor={(_, idx) => idx.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                        if (item.type === 'chunk' && item.word_analysis) {
                            return (
                                <View
                                    style={[
                                        styles.wordBadge,
                                        {
                                            backgroundColor: item.word_analysis.is_correct
                                                ? '#ECFDF5'
                                                : '#FEF2F2',
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.wordText,
                                            {
                                                color: item.word_analysis.is_correct
                                                    ? '#10B981'
                                                    : '#EF4444',
                                            },
                                        ]}
                                    >
                                        {item.word_analysis.word}: {item.word_analysis.word_score}/100
                                    </Text>
                                </View>
                            );
                        }

                        if (item.type === 'suggestion') {
                            return (
                                <View>
                                    <Icon name="lightbulb" size={14} color="#F59E0B" />
                                    <Text style={styles.suggestionText}>{item.feedback}</Text>
                                </View>
                            );
                        }

                        return null;
                    }}
                />
            </View>
        );
    };

    const renderFinalResult = () => {
        if (!showResult || !finalResult) return null;

        const scoreColor =
            finalResult.overall_score >= 80
                ? '#10B981'
                : finalResult.overall_score >= 60
                    ? '#F59E0B'
                    : '#EF4444';

        return (
            <Modal visible={showResult} animationType="slide">
                <View
                    style={[
                        styles.resultContainer,
                        { paddingTop: insets.top },
                    ]}
                >
                    <View>
                        <Text style={styles.resultTitle}>{i18n.t('speaking.result_title')}</Text>
                        <TouchableOpacity onPress={() => setShowResult(false)}>
                            <Icon name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.resultContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
                        <View>
                            <Text style={styles.scoreLabel}>{i18n.t('speaking.score_overall')}</Text>
                            <Text
                                style={[
                                    styles.overallScore,
                                    { color: scoreColor },
                                ]}
                            >
                                {finalResult.overall_score}/100
                            </Text>

                            <View >
                                <View>
                                    <Text style={styles.scoreItemLabel}>{i18n.t('speaking.score_accuracy')}</Text>
                                    <Text style={styles.scoreItemValue}>
                                        {finalResult.accuracy_score.toFixed(1)}%
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.scoreItemLabel}>{i18n.t('speaking.score_fluency')}</Text>
                                    <Text style={styles.scoreItemValue}>
                                        {finalResult.fluency_score.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.wordAnalysisCard}>
                            <Text style={styles.cardTitle}>{i18n.t('speaking.word_analysis_title')}</Text>
                            {wordFeedbacks.map((wf, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.wordItem,
                                        {
                                            backgroundColor: wf.isCorrect ? '#ECFDF5' : '#FEF2F2',
                                            borderColor: wf.isCorrect ? '#10B981' : '#EF4444',
                                            borderWidth: 1,
                                        },
                                    ]}
                                >
                                    <View style={styles.wordInfo}>
                                        <Text style={[styles.wordLabel, { color: wf.isCorrect ? '#10B981' : '#EF4444' }]}>
                                            {wf.word} {wf.isCorrect ? '✅' : '❌'}
                                        </Text>
                                        <Text style={styles.wordSpoken}>{i18n.t('speaking.word_spoken', { spoken: wf.spoken })}</Text>
                                    </View>
                                    <Text style={styles.wordScore}>{wf.score}/100</Text>
                                    {wf.suggestion && (
                                        <Text style={styles.wordSuggestion}>💡 {wf.suggestion}</Text>
                                    )}
                                </View>
                            ))}
                        </View>

                        <View style={styles.feedbackCard}>
                            <Text style={styles.cardTitle}>{i18n.t('speaking.feedback_title')}</Text>
                            <Text style={styles.feedbackText}>{finalResult.feedback}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setShowResult(false);
                                setStreamingChunks([]);
                                setWordFeedbacks([]);
                                setFinalResult(null);
                            }}
                        >
                            <Icon name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.retryButtonText}>{i18n.t('common.retry')}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        );
    };

    // Only show loading if we have NO data (neither passed nor fetched)
    if (isLoadingLesson && !activeLessonData) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
            </View>
        );
    }

    if (!activeLessonData) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="error-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{i18n.t('speaking.lesson_not_found')}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>{i18n.t('common.go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{activeLessonData.title || i18n.t('speaking.screen_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View style={[{ opacity: fadeAnim }]}>
                    {activeLessonData.title && (
                        <View style={styles.sentenceCard}>
                            <Text style={styles.sentenceText}>{activeLessonData.title}</Text>
                        </View>
                    )}

                    <View>
                        <Text style={styles.recordingTitle}>{i18n.t('speaking.ready_title')}</Text>
                        <Text style={styles.recordingInstruction}>
                            {i18n.t('speaking.record_instruction')}
                        </Text>

                        <Animated.View
                            style={[
                                styles.recordButton,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.recordButtonInner,
                                    isRecording && styles.recordingActive,
                                    (!hasMicPermission || isStreaming) && { backgroundColor: '#9CA3AF' }
                                ]}
                                onPressIn={startRecording}
                                onPressOut={stopRecording}
                                disabled={!hasMicPermission || isStreaming}
                            >
                                <Icon
                                    name={isRecording ? 'stop' : 'mic'}
                                    size={32}
                                    color="#FFFFFF"
                                />
                            </TouchableOpacity>
                        </Animated.View>

                        {isRecording && (
                            <Text style={styles.recordingText}>{i18n.t('speaking.recording_status')}</Text>
                        )}
                        {!hasMicPermission && (
                            <TouchableOpacity onPress={checkAndRequestMicrophonePermission}>
                                <Text style={[styles.recordingText, { textDecorationLine: 'underline', marginTop: 10, color: '#F59E0B' }]}>
                                    {i18n.t('speaking.request_mic_tap')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {isStreaming && (
                        <View>
                            <ActivityIndicator size="large" color="#4F46E5" />
                            <Text style={styles.streamingText}>{i18n.t('speaking.analyzing_status')}</Text>
                            {renderStreamingChunks()}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {renderFinalResult()}
        </View>
    );
};

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: '#1F2937',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sentenceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sentenceText: {
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 24,
    },
    recordingSection: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginVertical: 20,
    },
    recordingTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: '#1F2937',
        marginBottom: 8,
    },
    recordingInstruction: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center' as const,
    },
    recordButton: {
        marginBottom: 16,
    },
    recordButtonInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingActive: {
        backgroundColor: '#EF4444',
    },
    recordingText: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '500' as const,
        textAlign: 'center' as const,
    },
    streamingContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginVertical: 20,
    },
    streamingText: {
        fontSize: 14,
        color: '#4F46E5',
        marginTop: 8,
    },
    chunksList: {
        marginTop: 12,
        width: '100%',
    },
    wordBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginVertical: 4,
    },
    wordText: {
        fontSize: 14,
        fontWeight: '600' as const,
    },
    suggestionBox: {
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'center',
    },
    suggestionText: {
        fontSize: 12,
        color: '#B45309',
        flex: 1,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    resultHeader: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: '#1F2937',
    },
    resultContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    overallScoreCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginVertical: 24,
    },
    scoreLabel: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 8,
    },
    overallScore: {
        fontSize: 48,
        fontWeight: 'bold' as const,
        marginBottom: 16,
    },
    scoreBreakdown: {
        flexDirection: 'row' as const,
        width: '100%',
        gap: 16,
    },
    scoreItem: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    scoreItemLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    scoreItemValue: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        color: '#1F2937',
    },
    wordAnalysisCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#1F2937',
        marginBottom: 12,
    },
    wordItem: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    wordInfo: {
        marginBottom: 8,
    },
    wordLabel: {
        fontSize: 14,
        fontWeight: '600' as const,
        marginBottom: 4,
    },
    wordSpoken: {
        fontSize: 12,
        color: '#6B7280',
    },
    wordScore: {
        fontSize: 12,
        fontWeight: 'bold' as const,
        color: '#4F46E5',
    },
    wordSuggestion: {
        fontSize: 11,
        marginTop: 8,
        color: '#6B7280',
    },
    feedbackCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    feedbackText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    retryButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        marginBottom: 20,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600' as const,
        fontSize: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginTop: 12,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontWeight: '600' as const,
        fontSize: 16,
    },
};

export default SpeakingScreen;