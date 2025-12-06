import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, LayoutAnimation } from "react-native";
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
    question, isAnswered, selectedAnswer, isLoading,
    onAnswer, onSkip, isRecording, isStreaming,
    onStartRecording, onStopRecording
}: LessonInputAreaProps) => {
    const [textInput, setTextInput] = useState("");
    const [orderedList, setOrderedList] = useState<string[]>([]);
    const [matches, setMatches] = useState<Record<string, string>>({});
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    const fragments = React.useMemo(() => {
        if (question.questionType !== QuestionType.ORDERING) return [];
        try { return JSON.parse(question.optionsJson || "[]"); } catch { return []; }
    }, [question.optionsJson, question.questionType]);

    const pairs = React.useMemo(() => {
        if (question.questionType !== QuestionType.MATCHING) return [];
        try { return JSON.parse(question.optionsJson || "[]"); } catch { return []; }
    }, [question.optionsJson, question.questionType]);

    const leftSide = pairs.map((p: any) => p.key);
    const rightSide = pairs.map((p: any) => p.value);

    useEffect(() => { resetState(); }, [question.lessonQuestionId]);

    const resetState = () => {
        setTextInput("");
        setOrderedList([]);
        setMatches({});
        setSelectedLeft(null);
    };

    const renderSkipButton = () => (
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} disabled={isAnswered || isLoading}>
            <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
    );

    const renderSubmitButton = (onSubmit: () => void, disabled: boolean, label: string = "Check") => (
        <TouchableOpacity style={[styles.submitBtn, disabled && styles.disabledBtn]} onPress={onSubmit} disabled={disabled}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{label}</Text>}
        </TouchableOpacity>
    );

    if (question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.TRUE_FALSE) {
        const options = question.questionType === QuestionType.TRUE_FALSE
            ? [{ key: 'TRUE', value: 'True' }, { key: 'FALSE', value: 'False' }]
            : [
                { key: 'A', value: question.optionA }, { key: 'B', value: question.optionB },
                { key: 'C', value: question.optionC }, { key: 'D', value: question.optionD },
            ].filter(opt => opt.value);

        return (
            <View style={styles.container}>
                <View style={styles.optionsContainer}>
                    {options.map((opt) => {
                        const isSelected = selectedAnswer && (selectedAnswer === opt.key || selectedAnswer === `option${opt.key}`);
                        let btnStyle = styles.optionBtn;
                        let textStyle = styles.optionText;

                        if (isAnswered) {
                            const correctKey = question.correctOption?.replace(/^option/i, '');
                            if (opt.key === correctKey) {
                                btnStyle = styles.optionBtnCorrect as any;
                                textStyle = styles.optionTextCorrect as any;
                            } else if (isSelected) {
                                btnStyle = styles.optionBtnWrong as any;
                                textStyle = styles.optionTextWrong as any;
                            }
                        } else if (isSelected) {
                            btnStyle = styles.optionBtnSelected as any;
                            textStyle = styles.optionTextSelected as any;
                        }

                        return (
                            <TouchableOpacity key={opt.key} style={btnStyle} onPress={() => onAnswer(`option${opt.key}`)} disabled={isAnswered || isLoading}>
                                <View style={[styles.optionKeyBadge, isAnswered && opt.key === question.correctOption?.replace(/^option/i, '') && { backgroundColor: '#10B981' }]}>
                                    <Text style={[styles.optionKeyText, isAnswered && opt.key === question.correctOption?.replace(/^option/i, '') && { color: '#FFF' }]}>{opt.key}</Text>
                                </View>
                                <Text style={textStyle}>{opt.value}</Text>
                                {isAnswered && opt.key === question.correctOption?.replace(/^option/i, '') && <Icon name="check-circle" size={24} color="#10B981" />}
                                {isAnswered && isSelected && opt.key !== question.correctOption?.replace(/^option/i, '') && <Icon name="cancel" size={24} color="#EF4444" />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {!isAnswered && renderSkipButton()}
            </View>
        );
    }

    if (question.questionType === QuestionType.FILL_IN_THE_BLANK) {
        return (
            <View style={styles.container}>
                <View style={styles.writingContainer}>
                    <Text style={styles.label}>Fill in the blank:</Text>
                    <TextInput style={styles.singleLineInput} placeholder="Type your answer here..." value={textInput} onChangeText={setTextInput} editable={!isAnswered} />
                    <View style={styles.actionRow}>
                        {!isAnswered && renderSkipButton()}
                        {!isAnswered && renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading)}
                    </View>
                </View>
                {isAnswered && (
                    <View style={styles.resultBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.textLabel}>Your Answer: </Text>
                            <Text style={[styles.resultText, selectedAnswer === question.correctOption ? styles.textCorrect : styles.textWrong]}>{selectedAnswer}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <Text style={styles.textLabel}>Correct Answer: </Text>
                            <Text style={styles.textCorrect}>{question.correctOption}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    if (question.questionType === QuestionType.ORDERING) {
        const handleSelectFragment = (val: string) => {
            if (orderedList.includes(val)) setOrderedList(prev => prev.filter(k => k !== val));
            else setOrderedList(prev => [...prev, val]);
        };

        const submitOrder = () => {
            const sentence = orderedList.join(" ");
            onAnswer(sentence);
        };

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Order the sentence:</Text>
                <View style={styles.orderDisplayArea}>
                    {orderedList.map((val, index) => (
                        <TouchableOpacity key={index} onPress={() => !isAnswered && handleSelectFragment(val)} disabled={isAnswered}>
                            <View style={styles.chipSelected}><Text style={styles.chipTextSelected}>{val}</Text></View>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.chipContainer}>
                    {fragments.map((val: string, idx: number) => {
                        const isSelected = orderedList.includes(val);
                        if (isSelected) return <View key={idx} style={styles.chipPlaceholder} />;
                        return (
                            <TouchableOpacity key={idx} style={styles.chip} onPress={() => handleSelectFragment(val)} disabled={isAnswered}>
                                <Text style={styles.chipText}>{val}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={styles.actionRow}>
                    {!isAnswered && renderSkipButton()}
                    {!isAnswered && renderSubmitButton(submitOrder, orderedList.length === 0 || isLoading)}
                </View>
            </View>
        );
    }

    if (question.questionType === QuestionType.MATCHING) {
        const handleMatch = (rightVal: string) => {
            if (selectedLeft) {
                setMatches(prev => ({ ...prev, [selectedLeft]: rightVal }));
                setSelectedLeft(null);
            }
        };

        const submitMatching = () => {
            onAnswer(JSON.stringify(matches));
        };

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Match pairs:</Text>
                <View style={styles.matchingRow}>
                    <View style={styles.matchingCol}>
                        {leftSide.map((leftKey: string) => {
                            const isMatched = !!matches[leftKey];
                            return (
                                <TouchableOpacity key={leftKey}
                                    style={[styles.matchItem, selectedLeft === leftKey && styles.matchItemSelected, isMatched && styles.matchItemMatched]}
                                    onPress={() => !isMatched && !isAnswered && setSelectedLeft(leftKey)}
                                    disabled={isMatched || isAnswered}
                                >
                                    <Text style={[styles.matchItemText, isMatched && { color: '#FFF' }]}>{leftKey}</Text>
                                    {isMatched && <Icon name="check" size={16} color="#FFF" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={styles.matchingCol}>
                        {rightSide.map((rightVal: string) => {
                            const isMatchedTo = Object.values(matches).includes(rightVal);
                            return (
                                <TouchableOpacity key={rightVal}
                                    style={[styles.matchItem, isMatchedTo && styles.matchItemMatchedTarget]}
                                    onPress={() => !isAnswered && handleMatch(rightVal)}
                                    disabled={isMatchedTo || !selectedLeft || isAnswered}
                                >
                                    <Text style={styles.matchItemText}>{rightVal}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
                <View style={styles.actionRow}>
                    {!isAnswered && renderSkipButton()}
                    {!isAnswered && renderSubmitButton(submitMatching, Object.keys(matches).length === 0 || isLoading)}
                </View>
            </View>
        );
    }

    if (question.questionType === QuestionType.SPEAKING) {
        return (
            <View style={styles.container}>
                <View style={styles.speakingContainer}>
                    {isStreaming ? (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator color="#4F46E5" size="large" />
                            <Text style={styles.processingText}>AI Judging...</Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <TouchableOpacity style={[styles.recordBtn, isRecording && styles.recordingBtn, isAnswered && styles.disabledRecordBtn]}
                                onPressIn={!isAnswered ? onStartRecording : undefined}
                                onPressOut={!isAnswered ? onStopRecording : undefined}
                                disabled={isAnswered}
                            >
                                <Icon name={isRecording ? "graphic-eq" : "mic"} size={40} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.hintText}>{isAnswered ? "Answered" : isRecording ? "Release to send" : "Hold to speak"}</Text>
                        </View>
                    )}
                </View>
                {!isAnswered && !isRecording && !isStreaming && renderSkipButton()}
            </View>
        );
    }

    if (question.questionType === QuestionType.WRITING || question.questionType === QuestionType.ESSAY) {
        return (
            <View style={styles.container}>
                <View style={styles.writingContainer}>
                    <TextInput style={styles.textInput} multiline placeholder="Type your answer..." value={textInput} onChangeText={setTextInput} editable={!isAnswered} />
                    <View style={styles.actionRow}>
                        {!isAnswered && renderSkipButton()}
                        {!isAnswered && renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading, "Submit")}
                    </View>
                </View>
            </View>
        );
    }

    return <Text>Unsupported Type</Text>;
};

const styles = StyleSheet.create({
    container: { marginTop: 20 },
    optionsContainer: { gap: 12 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    optionBtnSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    optionBtnCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5', borderWidth: 2 },
    optionBtnWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2', borderWidth: 2 },
    optionKeyBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    optionKeyText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
    optionText: { fontSize: 16, color: '#1F2937', fontWeight: '500', flex: 1 },
    optionTextSelected: { color: '#4F46E5', fontWeight: '700' },
    optionTextCorrect: { color: '#065F46', fontWeight: '700' },
    optionTextWrong: { color: '#991B1B', fontWeight: '700' },
    speakingContainer: { alignItems: 'center', marginTop: 12 },
    recordBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 6 },
    recordingBtn: { backgroundColor: '#EF4444', transform: [{ scale: 1.1 }] },
    disabledRecordBtn: { backgroundColor: '#9CA3AF' },
    hintText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
    processingContainer: { alignItems: 'center', padding: 20 },
    processingText: { marginTop: 8, color: '#4F46E5', fontWeight: '600' },
    writingContainer: { marginTop: 12 },
    textInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 16 },
    singleLineInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 16, marginTop: 8 },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
    resultBox: { marginTop: 16, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    textLabel: { fontWeight: '600', color: '#6B7280' },
    resultText: { fontSize: 16, fontWeight: '600' },
    textCorrect: { color: '#10B981', fontWeight: 'bold' },
    textWrong: { color: '#EF4444', fontWeight: 'bold', textDecorationLine: 'line-through' },
    orderDisplayArea: { minHeight: 60, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, alignItems: 'center' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    chip: { backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE' },
    chipSelected: { backgroundColor: '#4F46E5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    chipPlaceholder: { width: 40, height: 36, backgroundColor: '#F3F4F6', borderRadius: 20 },
    chipText: { color: '#4F46E5', fontWeight: '600' },
    chipTextSelected: { color: '#FFF', fontWeight: '600' },
    matchingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    matchingCol: { flex: 1, gap: 12 },
    matchItem: { padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
    matchItemSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', borderWidth: 2 },
    matchItemMatched: { borderColor: '#10B981', backgroundColor: '#10B981' },
    matchItemMatchedTarget: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
    matchItemText: { color: '#1F2937', fontWeight: '500' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', flex: 1, marginLeft: 10 },
    disabledBtn: { backgroundColor: '#A5B4FC' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    skipBtn: { padding: 12 },
    skipBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' }
});