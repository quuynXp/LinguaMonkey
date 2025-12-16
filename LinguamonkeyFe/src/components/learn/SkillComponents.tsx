import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from "react-i18next";
import { LessonQuestionResponse } from "../../types/dto";
import { QuestionType } from "../../types/enums";
import { getDirectMediaUrl } from "../../utils/mediaUtils";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UniversalQuestionView = ({ question }: { question: LessonQuestionResponse }) => {
    const { t } = useTranslation();
    const [imgError, setImgError] = useState(false);

    const rawMediaUrl = getDirectMediaUrl(question.mediaUrl);
    const mediaUrl = rawMediaUrl || "";

    const isVideoOrAudio = mediaUrl && (
        mediaUrl.endsWith('.mp4') ||
        mediaUrl.endsWith('.mp3') ||
        mediaUrl.includes('export=view') ||
        mediaUrl.includes('export=download')
    ) && (question.questionType === QuestionType.VIDEO || question.questionType === QuestionType.AUDIO);

    const isImage = mediaUrl && !isVideoOrAudio;

    const player = useVideoPlayer(isVideoOrAudio ? mediaUrl : "", (player) => {
        player.loop = false;
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
                        allowsFullscreen={true}
                        allowsPictureInPicture={true}
                        nativeControls={true}
                    />
                    <TouchableOpacity style={styles.audioButton} onPress={() => player.replay()}>
                        <Icon name="replay" size={20} color="#FFF" />
                        <Text style={styles.audioButtonText}>{t("action.replay") || "Replay"}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isImage) {
            if (imgError) return <View style={[styles.contextImage, styles.center]}><Text>Image unavailable</Text></View>;
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
                <Text style={styles.questionText}>{t("quiz.readAloud") || "Read aloud"}</Text>
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
    center: { justifyContent: 'center', alignItems: 'center' },
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
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden'
    },
    videoView: {
        width: '100%',
        aspectRatio: 16 / 9,
        height: undefined,
    },
    audioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(79, 70, 229, 0.9)',
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
        height: 220,
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