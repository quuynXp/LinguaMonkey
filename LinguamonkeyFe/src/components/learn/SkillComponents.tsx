import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from "react-i18next";
import { LessonQuestionResponse } from "../../types/dto";
import { getLessonImage } from "../../utils/courseUtils";
import { QuestionType } from "../../types/enums";

const MediaNotFound = ({ type }: { type: string }) => (
    <View style={styles.notFoundContainer}>
        <Icon name="broken-image" size={32} color="#EF4444" />
        <Text style={styles.notFoundText}>{type} Not Found</Text>
    </View>
);

export const UniversalQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();
    const [imgError, setImgError] = useState(false);
    const mediaUrl = question.mediaUrl;

    // Determine media type based on extension or context (simplification for this logic)
    const isVideoOrAudio = mediaUrl && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mp3') || mediaUrl.startsWith('http'));
    const isImage = mediaUrl && !isVideoOrAudio;

    const player = useVideoPlayer(isVideoOrAudio ? mediaUrl : "", (player) => {
        player.loop = false;
        // Auto play if it's audio/video context
        if (isVideoOrAudio) player.play();
    });

    const renderMedia = () => {
        if (!mediaUrl) return null;

        if (isVideoOrAudio) {
            // Simple Audio/Video Player wrapper
            return (
                <View style={styles.mediaContainer}>
                    <TouchableOpacity style={styles.audioButton} onPress={() => player.replay()}>
                        <Icon name="volume-up" size={32} color="#FFF" />
                        <Text style={styles.audioButtonText}>{t("quiz.playMedia") || "Phát Multimedia"}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isImage) {
            if (imgError) return <MediaNotFound type="Image" />;
            return (
                <Image
                    source={getLessonImage(mediaUrl)}
                    style={styles.contextImage}
                    resizeMode="contain"
                    onError={() => setImgError(true)}
                />
            );
        }
        return null;
    };

    const renderTranscript = () => {
        // For Speaking, the transcript IS the content to read
        if (question.questionType === QuestionType.SPEAKING) {
            return (
                <View style={styles.speakingBox}>
                    <Icon name="record-voice-over" size={48} color="#10B981" />
                    <Text style={styles.transcriptText}>{question.transcript || question.question}</Text>
                </View>
            );
        }

        // For others, transcript is supporting text (reading passage, etc.)
        if (question.transcript) {
            return (
                <View style={styles.readingPassageBox}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        <Text style={styles.readingPassageText}>{question.transcript}</Text>
                    </ScrollView>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            {/* 1. MEDIA (Highest Priority) */}
            {renderMedia()}

            {/* 2. TRANSCRIPT / CONTEXT */}
            {renderTranscript()}

            {/* 3. QUESTION TEXT (If not Speaking, as speaking usually embeds text in transcript box) */}
            {question.questionType !== QuestionType.SPEAKING && (
                <Text style={styles.questionText}>{question.question}</Text>
            )}

            {/* Speaking specific instruction */}
            {question.questionType === QuestionType.SPEAKING && (
                <Text style={styles.questionText}>{t("quiz.readAloud") || "Đọc to câu trên"}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 26,
    },
    mediaContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16
    },
    notFoundContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
        borderStyle: 'dashed'
    },
    notFoundText: {
        marginTop: 8,
        color: '#B91C1C',
        fontWeight: '600'
    },
    audioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 3,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    audioButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8
    },
    contextImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        marginBottom: 12,
    },
    readingPassageBox: {
        backgroundColor: '#FFF7ED',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#F97316'
    },
    readingPassageText: {
        fontSize: 15,
        color: '#431407',
        lineHeight: 24,
    },
    speakingBox: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: '#10B981',
        borderStyle: 'dashed',
        marginTop: 12
    },
    transcriptText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#065F46',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 32
    },
});