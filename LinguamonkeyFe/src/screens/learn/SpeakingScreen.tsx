import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
import { SkillType } from '../../types/enums';

interface SpeakingScreenProps {
    navigation: any;
    route: {
        params?: {
            lessonId?: string;
            lesson?: LessonResponse;
        };
    };
}

const SpeakingScreen = ({ navigation, route }: SpeakingScreenProps) => {
    const insets = useSafeAreaInsets();

    const paramLessonId = route.params?.lessonId || route.params?.lesson?.lessonId;
    const paramLesson = route.params?.lesson;

    const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(paramLessonId);

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
    const stopSignalRef = useRef(false);

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const { useStreamPronunciation } = useSkillLessons();
    const { useAllLessons, useLesson } = useLessons();
    const streamPronunciationMutation = useStreamPronunciation();

    const {
        data: speakingLessonsData,
        isLoading: isLoadingList,
        isError: isListError,
        error: listError,
        refetch: refetchList
    } = useAllLessons({
        skillType: SkillType.SPEAKING,
        page: 0,
        size: 50,
    });

    const {
        data: lessonDetailData,
        isLoading: isLoadingDetail,
        refetch: refetchDetail
    } = useLesson(currentLessonId || null);

    const activeLesson = lessonDetailData || paramLesson;
    const speakingLessonsList = (speakingLessonsData?.data || []) as LessonResponse[];

    useFocusEffect(
        useCallback(() => {
            if (!currentLessonId) {
                refetchList();
            } else {
                refetchDetail();
            }
        }, [currentLessonId, refetchList, refetchDetail])
    );

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        checkAndRequestMicrophonePermission();
    }, []);

    useEffect(() => {
        if (activeLesson && activeLesson.title) {
            setSelectedSentence({
                id: activeLesson.lessonId,
                text: activeLesson.title,
                translation: '',
                audioUrl: '',
                ipa: ''
            } as unknown as SpeakingSentence);
        }
    }, [activeLesson]);

    const checkAndRequestMicrophonePermission = async () => {
        const granted = await PermissionService.requestMicrophonePermission();
        setHasMicPermission(granted);
    };

    const handleSelectLesson = (lesson: LessonResponse) => {
        setCurrentLessonId(lesson.lessonId);
        setFinalResult(null);
        setWordFeedbacks([]);
        setStreamingChunks([]);
    };

    const handleBack = () => {
        if (currentLessonId && !paramLessonId) {
            setCurrentLessonId(undefined);
            setFinalResult(null);
        } else {
            navigation.goBack();
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
        if (!currentLessonId || !selectedSentence) return;

        if (!hasMicPermission) {
            const granted = await PermissionService.requestMicrophonePermission();
            setHasMicPermission(granted);
            if (!granted) return;
        }

        stopSignalRef.current = false;

        try {
            setIsRecording(true);
            startPulseAnimation();
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);

            if (stopSignalRef.current) {
                setIsRecording(false);
                stopPulseAnimation();
                return;
            }

            await recorder.record();

            if (stopSignalRef.current) {
                await stopRecording();
            }
        } catch (error) {
            console.error('Recording error:', error);
            setIsRecording(false);
            stopPulseAnimation();
        }
    };

    const stopRecording = async () => {
        if (!currentLessonId || !selectedSentence) return;

        stopSignalRef.current = true;

        try {
            if (recorder.isRecording) {
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
                        lessonId: currentLessonId,
                        languageCode: activeLesson?.languageCode || 'en',
                        referenceText: selectedSentence.text,
                        onChunk: handleStreamingChunk,
                    }, {
                        onSuccess: () => setIsStreaming(false),
                        onError: () => {
                            setIsStreaming(false);
                            Alert.alert(i18n.t('common.error'), i18n.t('speaking.error_analysis'));
                        },
                    });
                }
            } else {
                setIsRecording(false);
                stopPulseAnimation();
            }
        } catch (error) {
            console.error('Stop recording error handled:', error);
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
                    updated[lastIdx] = { ...updated[lastIdx], suggestion: chunk.feedback };
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
    };

    const renderLessonList = () => {
        if (isLoadingList) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
                </View>
            );
        }

        if (isListError) {
            return (
                <View style={styles.centerContainer}>
                    <Icon name="error-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{i18n.t('common.error_occurred')}</Text>
                    <Text style={[styles.errorText, { fontSize: 12, color: '#999' }]}>
                        {listError instanceof Error ? listError.message : 'Unknown error'}
                    </Text>
                    <TouchableOpacity style={styles.retryButtonSmall} onPress={() => refetchList()}>
                        <Text style={styles.retryButtonTextSmall}>{i18n.t('common.retry')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!speakingLessonsList || speakingLessonsList.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Icon name="sentiment-dissatisfied" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>{i18n.t('speaking.no_lessons_available') || "No speaking lessons found."}</Text>
                    <TouchableOpacity style={[styles.retryButtonSmall, { marginTop: 16 }]} onPress={() => refetchList()}>
                        <Text style={styles.retryButtonTextSmall}>{i18n.t('common.reload')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <FlatList
                data={speakingLessonsList}
                keyExtractor={(item) => item.lessonId}
                contentContainerStyle={styles.listContent}
                refreshing={isLoadingList}
                onRefresh={refetchList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.lessonItem}
                        onPress={() => handleSelectLesson(item)}
                    >
                        <View style={styles.lessonIcon}>
                            <Icon name="mic" size={24} color="#4F46E5" />
                        </View>
                        <View style={styles.lessonInfo}>
                            <Text style={styles.lessonTitle} numberOfLines={2}>{item.title || item.lessonName}</Text>
                            <Text style={styles.lessonExp}>{item.expReward || 10} XP</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            />
        );
    };

    const renderPracticeScreen = () => {
        if (isLoadingDetail && !activeLesson) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            );
        }

        if (!activeLesson) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{i18n.t('common.error_occurred')}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => setCurrentLessonId(undefined)}>
                        <Text style={styles.backButtonText}>{i18n.t('common.go_back')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View style={[{ opacity: fadeAnim }]}>
                    <View style={styles.sentenceCard}>
                        <Text style={styles.sentenceText}>{activeLesson.title}</Text>
                    </View>

                    <View style={styles.recordingSection}>
                        <Text style={styles.recordingTitle}>{i18n.t('speaking.ready_title')}</Text>

                        <Animated.View style={[styles.recordButton, isRecording && { transform: [{ scale: pulseAnim }] }]}>
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
                                <Icon name={isRecording ? 'stop' : 'mic'} size={32} color="#FFFFFF" />
                            </TouchableOpacity>
                        </Animated.View>

                        {isRecording ? (
                            <Text style={styles.recordingText}>{i18n.t('speaking.recording')}</Text>
                        ) : (
                            <Text style={styles.hintText}>{i18n.t('speaking.tap_hold_record')}</Text>
                        )}
                    </View>

                    {isStreaming && (
                        <View style={styles.streamingContainer}>
                            <ActivityIndicator size="small" color="#4F46E5" />
                            <Text style={styles.streamingText}>{i18n.t('speaking.analyzing')}</Text>
                            <View style={styles.chunksContainer}>
                                {streamingChunks.map((chunk, index) => {
                                    if (chunk.type === 'chunk' && chunk.word_analysis) {
                                        const w = chunk.word_analysis;
                                        return (
                                            <Text key={index} style={[styles.chunkWord, { color: w.is_correct ? '#10B981' : '#EF4444' }]}>
                                                {w.word}{' '}
                                            </Text>
                                        );
                                    }
                                    return null;
                                })}
                            </View>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>
        );
    };

    const renderResultModal = () => {
        if (!showResult || !finalResult) return null;

        return (
            <Modal visible={showResult} animationType="slide" transparent={false}>
                <View style={[styles.resultContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{i18n.t('speaking.result')}</Text>
                        <TouchableOpacity onPress={() => setShowResult(false)}>
                            <Icon name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.resultContent}>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreValue}>{finalResult.overall_score}</Text>
                            <Text style={styles.scoreLabel}>{i18n.t('speaking.score_overall')}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{finalResult.accuracy_score.toFixed(0)}%</Text>
                                <Text style={styles.statLabel}>{i18n.t('speaking.accuracy')}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{finalResult.fluency_score.toFixed(0)}%</Text>
                                <Text style={styles.statLabel}>{i18n.t('speaking.fluency')}</Text>
                            </View>
                        </View>

                        <View style={styles.analysisList}>
                            <Text style={styles.sectionTitle}>{i18n.t('speaking.detailed_analysis')}</Text>
                            {wordFeedbacks.map((item, index) => (
                                <View key={index} style={styles.wordResultItem}>
                                    <View style={styles.wordResultHeader}>
                                        <Text style={[styles.wordResultText, { color: item.isCorrect ? '#10B981' : '#EF4444' }]}>
                                            {item.word}
                                        </Text>
                                        <Text style={styles.wordResultScore}>{item.score}/100</Text>
                                    </View>
                                    <Text style={styles.wordResultSpoken}>{i18n.t('speaking.you_said')}: {item.spoken}</Text>
                                    {item.suggestion && (
                                        <View style={styles.suggestionBox}>
                                            <Icon name="lightbulb-outline" size={16} color="#B45309" />
                                            <Text style={styles.suggestionText}>{item.suggestion}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        <View style={styles.feedbackBox}>
                            <Text style={styles.sectionTitle}>{i18n.t('speaking.feedback')}</Text>
                            <Text style={styles.feedbackText}>{finalResult.feedback}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setShowResult(false);
                                setStreamingChunks([]);
                                setWordFeedbacks([]);
                            }}
                        >
                            <Text style={styles.retryButtonText}>{i18n.t('common.retry')}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {!currentLessonId ? i18n.t('speaking.select_lesson') : (activeLesson?.title || i18n.t('speaking.practice'))}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {!currentLessonId ? renderLessonList() : renderPracticeScreen()}
            {renderResultModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
    },
    emptyText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
    },
    lessonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    lessonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    lessonExp: {
        fontSize: 12,
        color: '#6B7280',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sentenceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sentenceText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 30,
    },
    recordingSection: {
        alignItems: 'center',
        marginTop: 20,
    },
    recordingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 20,
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
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    recordingActive: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444',
    },
    recordingText: {
        color: '#EF4444',
        fontWeight: '600',
    },
    hintText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    streamingContainer: {
        marginTop: 30,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    streamingText: {
        textAlign: 'center',
        color: '#4F46E5',
        marginBottom: 8,
        fontWeight: '500',
    },
    chunksContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    chunkWord: {
        fontSize: 16,
        fontWeight: '500',
        marginHorizontal: 2,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    resultContent: {
        padding: 20,
        paddingBottom: 40,
    },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        borderWidth: 4,
        borderColor: '#4F46E5',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    scoreValue: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        width: '45%',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    analysisList: {
        marginBottom: 24,
    },
    wordResultItem: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    wordResultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    wordResultText: {
        fontSize: 16,
        fontWeight: '600',
    },
    wordResultScore: {
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    wordResultSpoken: {
        fontSize: 14,
        color: '#6B7280',
    },
    suggestionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 8,
        borderRadius: 6,
        marginTop: 8,
        gap: 6,
    },
    suggestionText: {
        fontSize: 13,
        color: '#B45309',
        flex: 1,
    },
    feedbackBox: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    feedbackText: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
    retryButtonSmall: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonTextSmall: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default SpeakingScreen;