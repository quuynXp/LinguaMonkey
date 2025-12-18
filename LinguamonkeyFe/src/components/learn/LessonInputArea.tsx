import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle
} from "react-native";
import { LessonQuestionResponse } from "../../types/dto";
import { QuestionType } from "../../types/enums";

interface LessonInputAreaProps {
    question: LessonQuestionResponse;
    isAnswered: boolean;
    selectedAnswer: any;
    isLoading: boolean;
    onAnswer: (answer: any) => void;
    onSkip: () => void;
    reviewMode?: boolean;
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
    reviewMode = false
}: LessonInputAreaProps) => {

    const [textInput, setTextInput] = useState("");
    const [orderedList, setOrderedList] = useState<string[]>([]);
    const [matches, setMatches] = useState<Record<string, string>>({});
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    const parsedOptions = useMemo(() => {
        if (!question.optionsJson) return [];
        try {
            return JSON.parse(question.optionsJson);
        } catch {
            return [];
        }
    }, [question.optionsJson]);

    useEffect(() => {
        if (reviewMode && selectedAnswer) {
            if (question.questionType === QuestionType.FILL_IN_THE_BLANK ||
                question.questionType === QuestionType.WRITING ||
                question.questionType === QuestionType.ESSAY) {
                setTextInput(String(selectedAnswer));
            } else if (question.questionType === QuestionType.ORDERING) {
                setTextInput("");
                setOrderedList(String(selectedAnswer).split(" "));
            } else if (question.questionType === QuestionType.MATCHING) {
                try {
                    const parsed = typeof selectedAnswer === 'string' ? JSON.parse(selectedAnswer) : selectedAnswer;
                    setMatches(parsed);
                } catch { }
            }
        } else {
            setTextInput("");
            setOrderedList([]);
            setMatches({});
            setSelectedLeft(null);
        }
    }, [question.lessonQuestionId, reviewMode, selectedAnswer]);


    const renderSubmitButton = (callback: () => void, disabled: boolean, label: string = "Check") => (
        <TouchableOpacity
            style={[styles.submitBtn, disabled && styles.disabledBtn]}
            onPress={callback}
            disabled={disabled || reviewMode}
        >
            {isLoading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.btnText}>{label}</Text>
            )}
        </TouchableOpacity>
    );

    const renderSkipButton = () => (
        <TouchableOpacity
            style={styles.skipBtn}
            onPress={onSkip}
            disabled={isAnswered || isLoading || reviewMode}
        >
            <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
    );

    if (question.questionType === QuestionType.MULTIPLE_CHOICE ||
        question.questionType === QuestionType.TRUE_FALSE ||
        question.questionType === QuestionType.SPEAKING) {

        const options = question.questionType === QuestionType.TRUE_FALSE
            ? [{ key: 'TRUE', value: 'True' }, { key: 'FALSE', value: 'False' }]
            : [
                { key: 'A', value: question.optionA },
                { key: 'B', value: question.optionB },
                { key: 'C', value: question.optionC },
                { key: 'D', value: question.optionD },
            ].filter(o => o.value);

        return (
            <View style={styles.container}>
                <View style={styles.optionsContainer}>
                    {options.map((opt) => {
                        const isSelected = selectedAnswer === `option${opt.key}` || selectedAnswer === opt.key;

                        const containerStyles: ViewStyle[] = [styles.optionBtn];
                        const textStyles: TextStyle[] = [styles.optionText];
                        const badgeStyles: ViewStyle[] = [styles.optionKeyBadge];
                        const badgeTextStyles: TextStyle[] = [styles.optionKeyText];

                        if (isAnswered) {
                            const correctKey = question.correctOption?.replace(/^option/i, '');
                            const isCorrectOption = opt.key === correctKey;

                            if (isCorrectOption) {
                                containerStyles.push(styles.optionBtnCorrect);
                                textStyles.push(styles.optionTextCorrect);
                                badgeStyles.push(styles.optionKeyBadgeCorrect);
                                badgeTextStyles.push(styles.optionKeyTextCorrect);
                            } else if (isSelected) {
                                containerStyles.push(styles.optionBtnWrong);
                                textStyles.push(styles.optionTextWrong);
                                badgeStyles.push(styles.optionKeyBadgeWrong);
                                badgeTextStyles.push(styles.optionKeyTextWrong);
                            }
                        } else if (isSelected) {
                            containerStyles.push(styles.optionBtnSelected);
                            textStyles.push(styles.optionTextSelected);
                            badgeStyles.push(styles.optionKeyBadgeSelected);
                            badgeTextStyles.push(styles.optionKeyTextSelected);
                        }

                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={containerStyles}
                                onPress={() => onAnswer(`option${opt.key}`)}
                                disabled={isAnswered || isLoading || reviewMode}
                            >
                                <View style={badgeStyles}>
                                    <Text style={badgeTextStyles}>{opt.key}</Text>
                                </View>
                                <Text style={textStyles}>{opt.value}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {!isAnswered && !reviewMode && (
                    <View style={styles.actionRowRight}>
                        {renderSkipButton()}
                    </View>
                )}
            </View>
        );
    }

    if (question.questionType === QuestionType.FILL_IN_THE_BLANK) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Type your answer:</Text>
                <TextInput
                    style={[styles.inputSingle, reviewMode && styles.inputReadOnly]}
                    placeholder="Enter text..."
                    value={textInput}
                    onChangeText={setTextInput}
                    editable={!isAnswered && !reviewMode}
                />

                {!isAnswered && !reviewMode && (
                    <View style={styles.actionRow}>
                        {renderSkipButton()}
                        {renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading)}
                    </View>
                )}

                {isAnswered && !reviewMode && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Correct Answer:</Text>
                        <Text style={styles.resultText}>
                            {question.correctAnswer ? question.correctAnswer.split('||').join(' or ') : 'N/A'}
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    if (question.questionType === QuestionType.ORDERING) {
        const fragments = parsedOptions;
        const currentList = reviewMode ? (String(selectedAnswer || "").split(" ")) : orderedList;

        const handleRemove = (word: string) => {
            if (!isAnswered && !reviewMode) {
                setOrderedList(prev => prev.filter(w => w !== word));
            }
        };

        const handleAdd = (word: string) => {
            if (!orderedList.includes(word) && !isAnswered && !reviewMode) {
                setOrderedList(prev => [...prev, word]);
            }
        };

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Arrange the sentence:</Text>

                <View style={styles.orderBox}>
                    {currentList.map((word, idx) => (
                        <TouchableOpacity
                            key={`${word}-${idx}`}
                            style={styles.chipSelected}
                            onPress={() => handleRemove(word)}
                            disabled={isAnswered || reviewMode}
                        >
                            <Text style={styles.chipTextSelected}>{word}</Text>
                        </TouchableOpacity>
                    ))}
                    {currentList.length === 0 && (
                        <Text style={styles.placeholderText}>Tap words below to arrange</Text>
                    )}
                </View>

                {!reviewMode && (
                    <View style={styles.chipContainer}>
                        {fragments.map((word: string, idx: number) => {
                            const isUsed = orderedList.includes(word);
                            if (isUsed) return <View key={idx} style={styles.chipPlaceholder} />;

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.chip}
                                    onPress={() => handleAdd(word)}
                                    disabled={isAnswered}
                                >
                                    <Text style={styles.chipText}>{word}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {!isAnswered && !reviewMode && (
                    <View style={styles.actionRow}>
                        {renderSkipButton()}
                        {renderSubmitButton(() => onAnswer(orderedList.join(" ")), orderedList.length === 0 || isLoading)}
                    </View>
                )}

                {isAnswered && !reviewMode && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Correct Order:</Text>
                        <Text style={styles.resultText}>{question.correctAnswer}</Text>
                    </View>
                )}
            </View>
        );
    }

    if (question.questionType === QuestionType.MATCHING) {
        const pairs = parsedOptions;
        const leftCol = pairs.map((p: any) => p.key);
        const rightCol = pairs.map((p: any) => p.value);

        const handleMatch = (rightVal: string) => {
            if (selectedLeft) {
                setMatches(prev => ({ ...prev, [selectedLeft]: rightVal }));
                setSelectedLeft(null);
            }
        };

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Match the pairs:</Text>
                <View style={styles.matchContainer}>
                    <View style={styles.matchCol}>
                        {leftCol.map((lKey: string) => {
                            const isMatched = !!matches[lKey];
                            const isSelected = selectedLeft === lKey;
                            return (
                                <TouchableOpacity
                                    key={lKey}
                                    style={[
                                        styles.matchItem,
                                        isSelected && styles.matchItemSelected,
                                        isMatched && styles.matchItemMatched
                                    ]}
                                    onPress={() => !isMatched && !isAnswered && setSelectedLeft(lKey)}
                                    disabled={isMatched || isAnswered || reviewMode}
                                >
                                    <Text style={[styles.matchText, isMatched && { color: '#FFF' }]}>{lKey}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.matchCol}>
                        {rightCol.map((rVal: string) => {
                            const isMatchedTo = Object.values(matches).includes(rVal);
                            return (
                                <TouchableOpacity
                                    key={rVal}
                                    style={[
                                        styles.matchItem,
                                        isMatchedTo && styles.matchItemMatchedTarget
                                    ]}
                                    onPress={() => handleMatch(rVal)}
                                    disabled={isMatchedTo || !selectedLeft || isAnswered || reviewMode}
                                >
                                    <Text style={styles.matchText}>{rVal}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {!isAnswered && !reviewMode && (
                    <View style={styles.actionRow}>
                        {renderSkipButton()}
                        {renderSubmitButton(
                            () => onAnswer(JSON.stringify(matches)),
                            Object.keys(matches).length !== leftCol.length || isLoading
                        )}
                    </View>
                )}

                {isAnswered && !reviewMode && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Correct Pairs:</Text>
                        {parsedOptions.map((p: any, i: number) => (
                            <Text key={i} style={styles.resultText}>{p.key} - {p.value}</Text>
                        ))}
                    </View>
                )}
            </View>
        );
    }

    if (question.questionType === QuestionType.WRITING || question.questionType === QuestionType.ESSAY) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Write your answer:</Text>
                <TextInput
                    style={[styles.inputMulti, reviewMode && styles.inputReadOnly]}
                    multiline
                    placeholder="Type here..."
                    value={textInput}
                    onChangeText={setTextInput}
                    editable={!isAnswered && !reviewMode}
                />

                {!isAnswered && !reviewMode && (
                    <View style={styles.actionRow}>
                        {renderSkipButton()}
                        {renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading, "Submit")}
                    </View>
                )}

                {isAnswered && !reviewMode && question.correctAnswer && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Suggested Answer:</Text>
                        <Text style={styles.resultText}>{question.correctAnswer}</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.center}>
            <Text style={{ color: 'red' }}>Unsupported Question Type: {question.questionType}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 10, width: '100%' },
    center: { alignItems: 'center', padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
    actionRowRight: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
    submitBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 14, borderRadius: 12, alignItems: 'center', marginLeft: 10 },
    disabledBtn: { backgroundColor: '#A5B4FC' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    skipBtn: { padding: 12 },
    skipBtnText: { color: '#6B7280', fontSize: 16, textDecorationLine: 'underline' },

    optionsContainer: { gap: 12 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    optionBtnSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    optionBtnCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5', borderWidth: 2 },
    optionBtnWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2', borderWidth: 2 },

    optionKeyBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    optionKeyBadgeSelected: { backgroundColor: '#C7D2FE' },
    optionKeyBadgeCorrect: { backgroundColor: '#34D399' },
    optionKeyBadgeWrong: { backgroundColor: '#FCA5A5' },

    optionKeyText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },
    optionKeyTextSelected: { color: '#4F46E5' },
    optionKeyTextCorrect: { color: '#FFF' },
    optionKeyTextWrong: { color: '#FFF' },

    optionText: { fontSize: 16, color: '#1F2937', fontWeight: '500', flex: 1 },
    optionTextSelected: { color: '#4F46E5', fontWeight: '700' },
    optionTextCorrect: { color: '#065F46', fontWeight: '700' },
    optionTextWrong: { color: '#991B1B', fontWeight: '700' },

    inputSingle: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16 },
    inputMulti: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
    inputReadOnly: { backgroundColor: '#F9FAFB', color: '#6B7280' },

    orderBox: { minHeight: 60, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, alignItems: 'center' },
    placeholderText: { color: '#9CA3AF' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    chip: { backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE' },
    chipSelected: { backgroundColor: '#4F46E5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    chipPlaceholder: { width: 40, height: 36, backgroundColor: '#F3F4F6', borderRadius: 20 },
    chipText: { color: '#4F46E5', fontWeight: '600' },
    chipTextSelected: { color: '#FFF', fontWeight: '600' },

    matchContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    matchCol: { flex: 1, gap: 10 },
    matchItem: { padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    matchItemSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', borderWidth: 2 },
    matchItemMatched: { borderColor: '#10B981', backgroundColor: '#10B981' },
    matchItemMatchedTarget: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
    matchText: { color: '#1F2937', fontWeight: '500', textAlign: 'center' },

    resultBox: { marginTop: 16, padding: 16, backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#10B981' },
    resultLabel: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 4 },
    resultText: { fontSize: 16, color: '#065F46' }
});