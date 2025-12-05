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

    // For ORDERING
    const [orderedList, setOrderedList] = useState<string[]>([]);

    // For MATCHING
    const [matches, setMatches] = useState<Record<string, string>>({});
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    useEffect(() => {
        resetState();
    }, [question.lessonQuestionId]);

    const resetState = () => {
        setTextInput("");
        setOrderedList([]);
        setMatches({});
        setSelectedLeft(null);
    };

    const renderSkipButton = () => (
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} disabled={isAnswered || isLoading}>
            <Text style={styles.skipBtnText}>Bỏ qua</Text>
        </TouchableOpacity>
    );

    const renderSubmitButton = (onSubmit: () => void, disabled: boolean, label: string = "Kiểm tra") => (
        <TouchableOpacity
            style={[styles.submitBtn, disabled && styles.disabledBtn]}
            onPress={onSubmit}
            disabled={disabled}
        >
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{label}</Text>}
        </TouchableOpacity>
    );

    // --- 1. MULTIPLE CHOICE / TRUE FALSE ---
    if (question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.TRUE_FALSE) {
        const options = question.questionType === QuestionType.TRUE_FALSE
            ? [{ key: 'TRUE', value: 'True' }, { key: 'FALSE', value: 'False' }, { key: 'NOT GIVEN', value: 'Not Given' }]
            : [
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
                            if (opt.key === question.correctOption) btnStyle = styles.optionBtnCorrect as any;
                            else if (selectedAnswer === opt.key) btnStyle = styles.optionBtnWrong as any;
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

    // --- 2. FILL IN THE BLANK ---
    if (question.questionType === QuestionType.FILL_IN_THE_BLANK) {
        return (
            <View style={styles.container}>
                <View style={styles.writingContainer}>
                    <Text style={styles.label}>Điền từ còn thiếu:</Text>
                    <TextInput
                        style={styles.singleLineInput}
                        placeholder="..."
                        value={textInput}
                        onChangeText={setTextInput}
                        editable={!isAnswered}
                    />
                    <View style={styles.actionRow}>
                        {!isAnswered && renderSkipButton()}
                        {!isAnswered && renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading)}
                    </View>
                </View>
                {isAnswered && (
                    <View style={styles.resultBox}>
                        <Text style={[styles.resultText, selectedAnswer?.toLowerCase() === question.correctOption?.toLowerCase() ? styles.textCorrect : styles.textWrong]}>
                            Đáp án của bạn: {selectedAnswer}
                        </Text>
                        <Text style={styles.correctText}>Đáp án đúng: {question.correctOption}</Text>
                    </View>
                )}
            </View>
        );
    }

    // --- 3. ORDERING (Sắp xếp câu) ---
    if (question.questionType === QuestionType.ORDERING) {
        // Assume options A,B,C,D hold the fragments
        const fragments = [
            { key: 'A', value: question.optionA },
            { key: 'B', value: question.optionB },
            { key: 'C', value: question.optionC },
            { key: 'D', value: question.optionD }
        ].filter(f => f.value);

        const handleSelectFragment = (key: string) => {
            if (orderedList.includes(key)) {
                setOrderedList(prev => prev.filter(k => k !== key));
            } else {
                setOrderedList(prev => [...prev, key]);
            }
        };

        const submitOrder = () => onAnswer(orderedList.join(","));

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Chọn từ/cụm từ theo đúng thứ tự:</Text>

                {/* Display Selected Order */}
                <View style={styles.orderDisplayArea}>
                    {orderedList.length === 0 && <Text style={styles.placeholderText}>Chạm vào các từ bên dưới</Text>}
                    {orderedList.map((key, index) => {
                        const frag = fragments.find(f => f.key === key);
                        return (
                            <TouchableOpacity key={key} onPress={() => !isAnswered && handleSelectFragment(key)} disabled={isAnswered}>
                                <View style={styles.chipSelected}>
                                    <Text style={styles.chipTextSelected}>{frag?.value}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Fragment Pool */}
                <View style={styles.chipContainer}>
                    {fragments.map((frag) => {
                        const isSelected = orderedList.includes(frag.key);
                        if (isSelected) return <View key={frag.key} style={styles.chipPlaceholder} />;

                        return (
                            <TouchableOpacity
                                key={frag.key}
                                style={styles.chip}
                                onPress={() => handleSelectFragment(frag.key)}
                                disabled={isAnswered}
                            >
                                <Text style={styles.chipText}>{frag.value}</Text>
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

    // --- 4. MATCHING (Nối từ) ---
    if (question.questionType === QuestionType.MATCHING) {
        // Left: A, B, C, D (Keys) -> Display Text implied? 
        // Assuming Question Options store the RIGHT side values.
        // We need the LEFT side values. Typically Matching questions have "pairs". 
        // For this generic structure, let's assume keys A,B,C,D are Left, and optionA, optionB... are Right values mixed up?
        // OR: A-B-C-D are Keys, and OptionValues are Values. User links Key to Value.

        const leftSide = ['A', 'B', 'C', 'D']; // Simplified keys
        const rightSide = [
            { id: '1', val: question.optionA },
            { id: '2', val: question.optionB },
            { id: '3', val: question.optionC },
            { id: '4', val: question.optionD }
        ].filter(r => r.val); // Assuming options are the targets

        const handleMatch = (rightId: string) => {
            if (selectedLeft) {
                setMatches(prev => ({ ...prev, [selectedLeft]: rightId }));
                setSelectedLeft(null);
            }
        };

        const submitMatching = () => {
            // Convert matches object to JSON string or simple format "A-1,B-2"
            onAnswer(JSON.stringify(matches));
        };

        return (
            <View style={styles.container}>
                <Text style={styles.label}>Chọn cặp tương ứng:</Text>
                <View style={styles.matchingRow}>
                    {/* Left Column */}
                    <View style={styles.matchingCol}>
                        {leftSide.slice(0, rightSide.length).map(leftKey => {
                            const isMatched = !!matches[leftKey];
                            return (
                                <TouchableOpacity
                                    key={leftKey}
                                    style={[
                                        styles.matchItem,
                                        selectedLeft === leftKey && styles.matchItemSelected,
                                        isMatched && styles.matchItemMatched
                                    ]}
                                    onPress={() => !isMatched && !isAnswered && setSelectedLeft(leftKey)}
                                    disabled={isMatched || isAnswered}
                                >
                                    <Text style={styles.matchItemText}>{leftKey}</Text>
                                    {isMatched && <Icon name="check" size={16} color="#FFF" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Right Column */}
                    <View style={styles.matchingCol}>
                        {rightSide.map(right => {
                            const isMatchedTo = Object.values(matches).includes(right.id);
                            return (
                                <TouchableOpacity
                                    key={right.id}
                                    style={[
                                        styles.matchItem,
                                        isMatchedTo && styles.matchItemMatchedTarget
                                    ]}
                                    onPress={() => !isAnswered && handleMatch(right.id)}
                                    disabled={isMatchedTo || !selectedLeft || isAnswered}
                                >
                                    <Text style={styles.matchItemText}>{right.val}</Text>
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

    // --- 5. SPEAKING ---
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
                                style={[styles.recordBtn, isRecording && styles.recordingBtn, isAnswered && styles.disabledRecordBtn]}
                                onPressIn={!isAnswered ? onStartRecording : undefined}
                                onPressOut={!isAnswered ? onStopRecording : undefined}
                                disabled={isAnswered}
                            >
                                <Icon name={isRecording ? "graphic-eq" : "mic"} size={40} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.hintText}>
                                {isAnswered ? "Đã trả lời" : isRecording ? "Thả để gửi" : "Nhấn giữ để nói"}
                            </Text>
                        </View>
                    )}
                </View>
                {!isAnswered && !isRecording && !isStreaming && renderSkipButton()}
            </View>
        );
    }

    // --- 6. WRITING / ESSAY ---
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
                        {!isAnswered && renderSubmitButton(() => onAnswer(textInput), !textInput.trim() || isLoading, "Gửi bài")}
                    </View>
                </View>
            </View>
        );
    }

    return <Text>Unsupported Question Type</Text>;
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

    // Speaking
    speakingContainer: { alignItems: 'center', marginTop: 12 },
    recordBtn: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5',
        justifyContent: 'center', alignItems: 'center', elevation: 6,
    },
    recordingBtn: { backgroundColor: '#EF4444', transform: [{ scale: 1.1 }] },
    disabledRecordBtn: { backgroundColor: '#9CA3AF' },
    hintText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
    processingContainer: { alignItems: 'center', padding: 20 },
    processingText: { marginTop: 8, color: '#4F46E5', fontWeight: '600' },

    // Writing & Fill Blank
    writingContainer: { marginTop: 12 },
    textInput: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB',
        borderRadius: 12, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 16
    },
    singleLineInput: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB',
        borderRadius: 12, padding: 12, fontSize: 16, marginTop: 8
    },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
    resultBox: { marginTop: 16, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 },
    resultText: { fontSize: 16, fontWeight: '600' },
    correctText: { fontSize: 14, color: '#10B981', marginTop: 4 },
    textCorrect: { color: '#10B981' },
    textWrong: { color: '#EF4444' },

    // Ordering
    orderDisplayArea: {
        minHeight: 60, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderWidth: 1, borderColor: '#E5E7EB',
        marginBottom: 16, alignItems: 'center'
    },
    placeholderText: { color: '#9CA3AF', fontStyle: 'italic' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    chip: { backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE' },
    chipSelected: { backgroundColor: '#4F46E5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    chipPlaceholder: { width: 40, height: 36, backgroundColor: '#F3F4F6', borderRadius: 20 },
    chipText: { color: '#4F46E5', fontWeight: '600' },
    chipTextSelected: { color: '#FFF', fontWeight: '600' },

    // Matching
    matchingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    matchingCol: { flex: 1, gap: 12 },
    matchItem: {
        padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
        alignItems: 'center', minHeight: 48, justifyContent: 'center'
    },
    matchItemSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', borderWidth: 2 },
    matchItemMatched: { borderColor: '#10B981', backgroundColor: '#10B981' },
    matchItemMatchedTarget: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
    matchItemText: { color: '#1F2937', fontWeight: '500' },

    // Shared Actions
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