import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
    Alert, BackHandler, AppState
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSubmitTest } from "../../hooks/useTesting";
import { TestQuestionDto } from "../../types/dto";

type RouteParams = {
    sessionId: string;
    questions: TestQuestionDto[];
    durationSeconds: number;
    title: string;
};

const TestSessionScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { sessionId, questions, durationSeconds, title } = route.params as RouteParams;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [timeLeft, setTimeLeft] = useState(durationSeconds);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutateAsync: submitTest } = useSubmitTest();

    // 1. Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === 15) {
                    Alert.alert("⚠️ Warning", "Only 15 seconds remaining!");
                }
                if (prev <= 1) {
                    clearInterval(timer);
                    handleFinishTest(true); // Auto submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // 2. Prevent Back Button (Đã Sửa Lỗi removeEventListener)
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                Alert.alert(
                    "Exit Test?",
                    "Time will verify continue running. Are you sure you want to quit? Your progress will be lost.",
                    [
                        { text: "Cancel", style: "cancel", onPress: () => { } },
                        { text: "Quit", style: "destructive", onPress: () => navigation.goBack() }
                    ]
                );
                return true; // Prevent default behavior
            };

            // LƯU ĐỐI TƯỢNG SUBSCRIPTION TRẢ VỀ
            const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            // GỌI PHƯƠNG THỨC .remove() ĐỂ DỌN DẸP
            return () => backHandlerSubscription.remove();
        }, [])
    );

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (questionId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleFinishTest = async (isAutoSubmit = false) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const result = await submitTest({ sessionId, answers });

            (navigation as any).replace('TestResultScreen', {
                result: result,
                isJustFinished: true
            });
        } catch (error) {
            Alert.alert("Error", "Failed to submit test. Please try again.");
            setIsSubmitting(false);
        }
    };

    const confirmSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        Alert.alert(
            "Submit Test",
            `You have answered ${answeredCount}/${questions.length} questions. \nAre you sure you want to submit?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: () => handleFinishTest(false) }
            ]
        );
    };

    const currentQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <ScreenLayout style={styles.container}>
            {/* Custom Header with Timer */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.testTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.qCount}>Question {currentIndex + 1} of {questions.length}</Text>
                </View>
                <View style={[styles.timerBadge, timeLeft < 60 && styles.timerWarning]}>
                    <Icon name="timer" size={20} color={timeLeft < 60 ? "#EF4444" : "#4F46E5"} />
                    <Text style={[styles.timerText, timeLeft < 60 && styles.timerTextWarning]}>
                        {formatTime(timeLeft)}
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            {/* Question Content */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.questionCard}>
                    <Text style={styles.questionText}>
                        <Text style={styles.qIndex}>{currentIndex + 1}. </Text>
                        {currentQ.questionText}
                    </Text>

                    {currentQ.options.map((opt, idx) => {
                        const isSelected = answers[currentQ.questionId] === idx;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.option, isSelected && styles.optionSelected]}
                                onPress={() => handleAnswer(currentQ.questionId, idx)}
                            >
                                <View style={[styles.radioCircle, isSelected && styles.radioSelected]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Footer Navigation */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
                    onPress={handlePrev}
                    disabled={currentIndex === 0}
                >
                    <Icon name="chevron-left" size={24} color={currentIndex === 0 ? "#9CA3AF" : "#374151"} />
                    <Text style={[styles.navText, currentIndex === 0 && styles.disabledText]}>Prev</Text>
                </TouchableOpacity>

                {currentIndex === questions.length - 1 ? (
                    <TouchableOpacity style={styles.submitButton} onPress={confirmSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Finish & Submit</Text>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.navButton} onPress={handleNext}>
                        <Text style={styles.navText}>Next</Text>
                        <Icon name="chevron-right" size={24} color="#374151" />
                    </TouchableOpacity>
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, backgroundColor: '#FFF', elevation: 2
    },
    testTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', width: '60%' },
    qCount: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    timerBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    timerWarning: { backgroundColor: '#FEE2E2' },
    timerText: { marginLeft: 4, fontWeight: '700', color: '#4F46E5', fontVariant: ['tabular-nums'] },
    timerTextWarning: { color: '#EF4444' },
    progressTrack: { height: 4, backgroundColor: '#E5E7EB', width: '100%' },
    progressFill: { height: '100%', backgroundColor: '#4F46E5' },
    scrollContent: { padding: 16 },
    questionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 1 },
    questionText: { fontSize: 18, fontWeight: '500', color: '#1F2937', marginBottom: 24, lineHeight: 28 },
    qIndex: { fontWeight: 'bold', color: '#4F46E5' },
    option: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, backgroundColor: '#F9FAFB'
    },
    optionSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
    radioCircle: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#9CA3AF',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    radioSelected: { borderColor: '#4F46E5' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5' },
    optionText: { fontSize: 16, color: '#374151', flex: 1 },
    optionTextSelected: { color: '#4F46E5', fontWeight: '600' },
    footer: {
        flexDirection: 'row', justifyContent: 'space-between', padding: 16,
        backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E5E7EB'
    },
    navButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    navText: { fontSize: 16, fontWeight: '600', color: '#374151', marginHorizontal: 4 },
    disabledButton: { opacity: 0.5 },
    disabledText: { color: '#9CA3AF' },
    submitButton: {
        backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 8, flexDirection: 'row', alignItems: 'center'
    },
    submitText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default TestSessionScreen;