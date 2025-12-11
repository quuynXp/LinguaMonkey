import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from "react-i18next";
import { LessonQuestionResponse } from "../../types/dto";
import { QuestionType } from "../../types/enums";
import { getDirectMediaUrl } from "../../utils/mediaUtils";
import MediaNotFound from "../common/MediaNotFound";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UniversalQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();
    const [imgError, setImgError] = useState(false);

    // Xử lý URL an toàn
    const rawMediaUrl = getDirectMediaUrl(question.mediaUrl);
    // Nếu URL rỗng thì coi như không có media
    const mediaUrl = rawMediaUrl || "";

    const isVideoOrAudio = mediaUrl && (
        mediaUrl.endsWith('.mp4') ||
        mediaUrl.endsWith('.mp3') ||
        mediaUrl.includes('export=view') ||
        mediaUrl.includes('export=download') // Google Drive stream link
    ) && (question.questionType === QuestionType.VIDEO || question.questionType === QuestionType.AUDIO);

    const isImage = mediaUrl && !isVideoOrAudio;

    // Cấu hình Player cho Video dài/Streaming
    const player = useVideoPlayer(isVideoOrAudio ? mediaUrl : "", (player) => {
        player.loop = false;
        // Video học tập dài không nên auto-play để tiết kiệm data, trừ khi user bấm
        // player.play(); 

        // Cho phép nghe tiếng khi tắt màn hình (quan trọng cho bài giảng dài)
        player.staysActiveInBackground = true;
    });

    const renderMedia = () => {
        if (!mediaUrl) return null;

        if (isVideoOrAudio) {
            return (
                <View style={styles.mediaContainer}>
                    <VideoView
                        player={player}
                        style={styles.videoView}
                        contentFit="contain"
                        allowsFullscreen={true}        // Cho phép phóng to
                        allowsPictureInPicture={true}  // Cho phép thu nhỏ xem khi làm việc khác
                        nativeControls={true}          // Hiển thị thanh tua (seek), volume chuẩn của máy
                    />

                    {/* Nút Replay chỉ hiện bổ trợ, vì native controls đã có nút tua lại */}
                    <TouchableOpacity style={styles.audioButton} onPress={() => player.replay()}>
                        <Icon name="replay" size={20} color="#FFF" />
                        <Text style={styles.audioButtonText}>{t("action.replay") || "Phát lại"}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isImage) {
            if (imgError) return <MediaNotFound type="Image" />;
            return (
                <Image
                    source={{ uri: mediaUrl }}
                    style={styles.contextImage}
                    resizeMode="contain"
                    onError={() => setImgError(true)}
                />
            );
        }
        return null;
    };

    const renderTranscript = () => {
        if (question.questionType === QuestionType.SPEAKING) {
            return (
                <View style={styles.speakingBox}>
                    <Icon name="record-voice-over" size={48} color="#10B981" />
                    <Text style={styles.transcriptText}>{question.transcript || question.question}</Text>
                </View>
            );
        }

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
            {renderMedia()}

            {renderTranscript()}

            {question.questionType !== QuestionType.SPEAKING && (
                <Text style={styles.questionText}>{question.question}</Text>
            )}

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
        width: '100%'
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 26,
        paddingHorizontal: 10
    },
    mediaContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#000', // Nền đen cho video trông chuyên nghiệp hơn
        borderRadius: 12,
        overflow: 'hidden'
    },
    videoView: {
        width: '100%',
        aspectRatio: 16 / 9, // Tỉ lệ chuẩn YouTube/Bài giảng
        height: undefined,   // Để aspectRatio tự tính chiều cao
    },
    audioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(79, 70, 229, 0.9)', // Màu trong suốt nhẹ
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        position: 'absolute',
        bottom: 10,
        right: 10
    },
    audioButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 4
    },
    contextImage: {
        width: '100%',
        height: 220, // Tăng chiều cao ảnh lên chút
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 12
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
        lineHeight: 24
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
        fontSize: 20,
        fontWeight: '700',
        color: '#065F46',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 30
    },
});