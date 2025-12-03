import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LessonQuestionResponse } from "../../types/dto";
import { QuestionType } from "../../types/enums";

interface LessonInputAreaProps {
    question: LessonQuestionResponse;
    isAnswered: boolean;
    selectedAnswer: string | null;
    isLoading: boolean;
    onAnswer: (answer: any) => void;
    onSkip: () => void;
    isRecording?: boolean;
    isStreaming?: boolean;
    onStartRecording?: () => void;
    onStopRecording?: () => void;
}

export const LessonInputArea = ({
    question,
    isAnswered,
    selectedAnswer,
    isLoading,
    onAnswer,
    onSkip,
    isRecording,
    isStreaming,
    onStartRecording,
    onStopRecording
}: LessonInputAreaProps) => {
    const [textInput, setTextInput] = useState("");

    const renderSkipButton = () => (
        <TouchableOpacity
            style={styles.skipBtn}
            onPress={onSkip}
            disabled={isAnswered || isLoading}
        >
            <Text style={styles.skipBtnText}>Bỏ qua</Text>
        </TouchableOpacity>
    );

    // --- 1. MULTIPLE CHOICE ---
    if (question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.FILL_IN_THE_BLANK) {
        const options = [
            { key: 'A', value: question.optionA },
            { key: 'B', value: question.optionB },
            { key: 'C', value: question.optionC },
            { key: 'D', value: question.optionD },
        ].filter(opt => opt.value);

        return (
            <View style={styles.container}>
                <View style={styles.optionsContainer}>
                    {options.map((opt) => {
                        let btnStyle = styles.optionBtn;
                        if (isAnswered) {
                            if (opt.key === question.correctOption)
                                btnStyle = styles.optionBtnCorrect as any;
                            else if (selectedAnswer === opt.key)
                                btnStyle = styles.optionBtnWrong as any;
                        } else if (selectedAnswer === opt.key) {
                            btnStyle = styles.optionBtnSelected as any;
                        }

                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={btnStyle}
                                onPress={() => onAnswer(opt.key)}
                                disabled={isAnswered || isLoading}
                            >
                                <View style={styles.optionKeyBadge}>
                                    <Text style={styles.optionKeyText}>{opt.key}</Text>
                                </View>
                                <Text style={styles.optionText}>{opt.value}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {!isAnswered && renderSkipButton()}
            </View>
        );
    }

    // --- 2. SPEAKING ---
    if (question.questionType === QuestionType.SPEAKING) {
        return (
            <View style={styles.container}>
                <View style={styles.speakingContainer}>
                    {isStreaming ? (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator color="#4F46E5" size="large" />
                            <Text style={styles.processingText}>AI đang chấm điểm...</Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <TouchableOpacity
                                style={[styles.recordBtn, isRecording && styles.recordingBtn]}
                                onPressIn={onStartRecording}
                                onPressOut={onStopRecording}
                                disabled={isAnswered}
                            >
                                <Icon name={isRecording ? "graphic-eq" : "mic"} size={40} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.hintText}>
                                {isRecording ? "Thả để gửi" : "Nhấn giữ để nói"}
                            </Text>
                        </View>
                    )}
                </View>
                {!isAnswered && !isRecording && !isStreaming && renderSkipButton()}
            </View>
        );
    }

    // --- 3. WRITING ---
    if (question.questionType === QuestionType.WRITING || question.questionType === QuestionType.ESSAY) {
        return (
            <View style={styles.container}>
                <View style={styles.writingContainer}>
                    <TextInput
                        style={styles.textInput}
                        multiline
                        placeholder="Nhập câu trả lời của bạn..."
                        value={textInput}
                        onChangeText={setTextInput}
                        editable={!isAnswered}
                    />
                    <View style={styles.actionRow}>
                        {!isAnswered && renderSkipButton()}
                        <TouchableOpacity
                            style={[styles.submitBtn, (!textInput.trim() || isLoading) && styles.disabledBtn]}
                            onPress={() => onAnswer(textInput)}
                            disabled={!textInput.trim() || isLoading || isAnswered}
                        >
                            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Gửi bài</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    container: { marginTop: 20 },
    optionsContainer: { gap: 12 },
    optionBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    optionBtnSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    optionBtnCorrect: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
    optionBtnWrong: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
    optionKeyBadge: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    optionKeyText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
    optionText: { fontSize: 16, color: '#1F2937', fontWeight: '500', flex: 1 },

    speakingContainer: { alignItems: 'center', marginTop: 12 },
    recordBtn: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5',
        justifyContent: 'center', alignItems: 'center', elevation: 6,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4
    },
    recordingBtn: { backgroundColor: '#EF4444', transform: [{ scale: 1.1 }] },
    hintText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
    processingContainer: { alignItems: 'center', padding: 20 },
    processingText: { marginTop: 8, color: '#4F46E5', fontWeight: '600' },

    writingContainer: { marginTop: 12 },
    textInput: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB',
        borderRadius: 12, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 16
    },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    submitBtn: {
        backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
        alignItems: 'center', flex: 1, marginLeft: 10
    },
    disabledBtn: { backgroundColor: '#A5B4FC' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    skipBtn: { padding: 12 },
    skipBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' }
});