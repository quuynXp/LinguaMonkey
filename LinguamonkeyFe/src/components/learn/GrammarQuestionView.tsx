import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { createScaledSheet } from "../../utils/scaledStyles";
import { LessonQuestionResponse } from "../../types/dto";

interface GrammarQuestionViewProps {
    question: LessonQuestionResponse;
    selectedAnswer: string | null;
    onAnswer: (answer: string) => void;
    isAnswered: boolean;
    correctAnswer?: string; // Optional, for showing result state
}

export const GrammarQuestionView = ({
    question,
    selectedAnswer,
    onAnswer,
    isAnswered,
    correctAnswer,
}: GrammarQuestionViewProps) => {

    // Determine type: If options exist, it's Multiple Choice. Otherwise, Fill-in-blank.
    const isMultipleChoice = question.optionA || question.optionB;
    // Helper to construct options array from flat DTO if needed, or use existing array if provided
    const options = [question.optionA, question.optionB, question.optionC, question.optionD].filter(Boolean);

    const getOptionStyle = (opt: string) => {
        const isSelected = selectedAnswer === opt;
        const isCorrect = correctAnswer === opt;

        if (isAnswered) {
            if (isCorrect) return styles.optionButtonCorrect;
            if (isSelected && !isCorrect) return styles.optionButtonWrong;
        } else if (isSelected) {
            return styles.optionButtonSelected;
        }
        return styles.optionButton;
    };

    const getTextStyle = (opt: string) => {
        const isSelected = selectedAnswer === opt;
        const isCorrect = correctAnswer === opt;

        if (isAnswered) {
            if (isCorrect) return styles.optionTextCorrect;
            if (isSelected && !isCorrect) return styles.optionTextWrong;
        } else if (isSelected) {
            return styles.optionTextSelected;
        }
        return styles.optionText;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.questionText}>{question.question}</Text>

            {question.transcript && (
                <View style={styles.contextBox}>
                    <Text style={styles.contextText}>{question.transcript}</Text>
                </View>
            )}

            {isMultipleChoice ? (
                <View style={styles.optionsContainer}>
                    {options.map((opt, index) => (
                        <TouchableOpacity
                            key={`${index}-${opt}`}
                            style={[styles.baseOptionButton, getOptionStyle(opt as string)]}
                            onPress={() => !isAnswered && onAnswer(opt as string)}
                            disabled={isAnswered}
                        >
                            <Text style={getTextStyle(opt as string)}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <TextInput
                    style={[
                        styles.textInput,
                        isAnswered && (selectedAnswer === correctAnswer ? styles.textInputCorrect : styles.textInputWrong)
                    ]}
                    placeholder="Type your answer..."
                    placeholderTextColor="#9CA3AF"
                    value={selectedAnswer || ""}
                    onChangeText={(t) => !isAnswered && onAnswer(t)}
                    editable={!isAnswered}
                    multiline
                />
            )}
        </View>
    );
};

const styles = createScaledSheet({
    container: {
        width: "100%",
        marginBottom: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
        lineHeight: 26,
    },
    contextBox: {
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: "#6366F1",
    },
    contextText: {
        fontSize: 14,
        color: "#4B5563",
        fontStyle: "italic",
    },
    optionsContainer: {
        marginTop: 8,
    },
    baseOptionButton: {
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    optionButton: {
        backgroundColor: "#FFFFFF",
    },
    optionButtonSelected: {
        borderColor: "#6366F1",
        backgroundColor: "#EEF2FF",
    },
    optionButtonCorrect: {
        borderColor: "#10B981",
        backgroundColor: "#D1FAE5",
    },
    optionButtonWrong: {
        borderColor: "#EF4444",
        backgroundColor: "#FEE2E2",
    },
    optionText: {
        fontSize: 16,
        color: "#374151",
    },
    optionTextSelected: {
        color: "#4F46E5",
        fontWeight: "600",
    },
    optionTextCorrect: {
        color: "#065F46",
        fontWeight: "700",
    },
    optionTextWrong: {
        color: "#991B1B",
        fontWeight: "600",
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
        minHeight: 100,
        textAlignVertical: "top",
    },
    textInputCorrect: {
        borderColor: "#10B981",
        backgroundColor: "#ECFDF5",
    },
    textInputWrong: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
});