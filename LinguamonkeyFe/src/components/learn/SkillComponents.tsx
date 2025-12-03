import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer } from 'expo-video';
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

    const handlePlay = () => {
        if (player) {
            player.replay();
        }
    };

    // FIX: Nếu không có Audio, chỉ hiển thị câu hỏi text bình thường (như trắc nghiệm)
    // Không hiển thị biểu tượng "volume-off" gây rối mắt
    if (!mediaUrl) {
        return (
            <View style={styles.container}>
                {/* Có thể thêm context transcript nếu có, nếu không chỉ hiện câu hỏi */}
                {question.transcript ? (
                    <View style={styles.readingPassageBox}>
                        <Text style={styles.readingPassageText}>{question.transcript}</Text>
                    </View>
                ) : null}
                <Text style={styles.questionText}>{question.question}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.audioButton} onPress={handlePlay}>
                <Icon name="volume-up" size={32} color="#FFF" />
                <Text style={styles.audioButtonText}>{t("quiz.listenAgain") || "Nghe lại"}</Text>
            </TouchableOpacity>

            <Text style={styles.audioLabel}>{t("quiz.listenCarefully") || "Nghe kỹ đoạn hội thoại"}</Text>
            <Text style={styles.questionText}>{question.question}</Text>
        </View>
    );
};

// --- 2. SPEAKING COMPONENT ---
export const SpeakingQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();
    const contentToSpeak = question.transcript || question.question;

    return (
        <View style={styles.container}>
            <View style={styles.speakingBox}>
                <Icon name="record-voice-over" size={48} color="#10B981" />
                <Text style={styles.transcriptText}>{contentToSpeak}</Text>
            </View>
            <Text style={styles.questionText}>{t("quiz.readAloud") || "Đọc to câu trên"}</Text>
        </View>
    );
};

// --- 3. READING COMPONENT ---
export const ReadingQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            {/* Chỉ render ảnh nếu có URL hợp lệ */}
            {question.mediaUrl && (
                <Image
                    source={getCourseImage(question.mediaUrl)}
                    style={styles.contextImage}
                    resizeMode="contain"
                />
            )}

            {/* Chỉ render transcript nếu có */}
            {question.transcript && (
                <View style={styles.readingPassageBox}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        <Text style={styles.readingPassageText}>{question.transcript}</Text>
                    </ScrollView>
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
                    resizeMode="contain"
                />
            )}

            <View style={styles.writingHeader}>
                <Icon name="edit" size={28} color="#F59E0B" />
                <Text style={styles.writingLabel}>{t("quiz.writingTask") || "Bài tập viết"}</Text>
            </View>

            <View style={styles.writingPromptBox}>
                <Text style={styles.writingPromptText}>{question.question}</Text>
            </View>
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
    // Listening Styles
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
        marginBottom: 12
    },
    audioButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8
    },
    audioLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8
    },
    // Speaking Styles
    speakingBox: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: '#10B981',
        borderStyle: 'dashed'
    },
    transcriptText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#065F46',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 32
    },
    // Reading Styles
    contextImage: {
        width: '100%',
        height: 220,
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
    // Writing Styles
    writingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        alignSelf: 'flex-start'
    },
    writingLabel: {
        fontSize: 16,
        color: '#F59E0B',
        fontWeight: '700',
        marginLeft: 8,
    },
    writingPromptBox: {
        width: '100%',
        padding: 16,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCD34D'
    },
    writingPromptText: {
        fontSize: 18,
        color: '#92400E',
        fontWeight: '600',
        textAlign: 'center'
    }
});