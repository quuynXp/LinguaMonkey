import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from "react-i18next";
import { LessonQuestionResponse } from "../../types/dto";
import { getCourseImage } from "../../utils/courseUtils";

// --- 1. LISTENING COMPONENT ---
export const ListeningQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();
    const mediaUrl = question.mediaUrl || "";

    const player = useVideoPlayer(mediaUrl, (player) => {
        player.loop = false;
        if (mediaUrl) {
            player.play();
        }
    });

    if (!mediaUrl) {
        return (
            <View style={styles.container}>
                <View style={styles.placeholderBox}>
                    <Icon name="volume-off" size={48} color="#9CA3AF" />
                    <Text style={styles.placeholderText}>{t("quiz.noAudioAvailable")}</Text>
                </View>
                <Text style={styles.questionText}>{question.question}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.audioContainer}>
                <Icon name="volume-up" size={32} color="#4F46E5" style={{ marginRight: 10 }} />
                <VideoView
                    player={player}
                    style={{ width: 0, height: 0 }}
                />
                <Text style={styles.audioLabel}>{t("quiz.listenCarefully")}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
        </View>
    );
};

// --- 2. SPEAKING COMPONENT ---
export const SpeakingQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <View style={styles.speakingBox}>
                <Icon name="record-voice-over" size={48} color="#10B981" />
                <Text style={styles.transcriptText}>{"{question.transcript || question.question}"}</Text>
            </View>
            <Text style={styles.questionText}>{t("quiz.chooseBestAnswer")}</Text>
        </View>
    );
};

// --- 3. READING COMPONENT ---
export const ReadingQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            {question.mediaUrl && (
                <Image
                    source={getCourseImage(question.mediaUrl)}
                    style={styles.contextImage}
                    resizeMode="cover"
                />
            )}
            {question.transcript && (
                <View style={styles.readingPassageBox}>
                    <Text style={styles.readingPassageText}>{question.transcript}</Text>
                </View>
            )}
            <Text style={styles.questionText}>{question.question}</Text>
        </View>
    );
};

// --- 4. WRITING COMPONENT ---
export const WritingQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            {question.mediaUrl && (
                <Image
                    source={getCourseImage(question.mediaUrl)}
                    style={styles.contextImage}
                    resizeMode="cover"
                />
            )}
            <View style={styles.writingBox}>
                <Icon name="edit" size={32} color="#F59E0B" />
                <Text style={styles.writingPrompt}>{t("quiz.writingPrompt")}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
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
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 28,
    },
    audioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        justifyContent: 'center',
    },
    audioLabel: {
        fontSize: 16,
        color: '#4F46E5',
        fontWeight: '600',
    },
    placeholderBox: {
        width: '100%',
        height: 150,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#9CA3AF',
    },
    speakingBox: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: '#10B981',
    },
    transcriptText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#065F46',
        marginTop: 12,
        textAlign: 'center',
    },
    contextImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        marginBottom: 12,
    },
    readingPassageBox: {
        backgroundColor: '#FFF7ED',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#F97316'
    },
    readingPassageText: {
        fontSize: 14,
        color: '#431407',
        lineHeight: 20,
    },
    writingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    writingPrompt: {
        fontSize: 14,
        color: '#F59E0B',
        fontWeight: '600',
        marginLeft: 8,
    },
});