import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useLessons } from "../../hooks/useLessons";
import { useUserStore } from "../../stores/UserStore";
import { LessonResponse, LessonQuestionResponse, LessonProgressRequest, LessonProgressWrongItemRequest } from "../../types/dto";
import { SkillType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import {
    ListeningQuestionView,
    SpeakingQuestionView,
    ReadingQuestionView,
    WritingQuestionView
} from "../../components/learn/SkillComponents";

const QUESTION_TIME_LIMIT = 15; // 15 giây

// Định nghĩa kiểu cho style options chỉ chứa các thuộc tính cần override
type OptionStyleOverride = Pick<ViewStyle, 'borderColor' | 'backgroundColor'>;

export const LessonQuizScreen = ({ lesson, onComplete }: { lesson: LessonResponse, onComplete: () => void }) => {
    const { t } = useTranslation();
    const userStore = useUserStore();
    const userId = userStore.user?.userId;
    const { useAllQuestions, useUpdateProgress, useCreateWrongItem } = useLessons();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null); // FIX 1: Correct type for setInterval return value

    const updateProgressMutation = useUpdateProgress();
    const createWrongItemMutation = useCreateWrongItem();

    // Fetch câu hỏi
    const { data: questionsData, isLoading } = useAllQuestions({
        lessonId: lesson.lessonId,
        size: 50,
    });

    const questions: LessonQuestionResponse[] = useMemo(() => (questionsData?.data || []) as LessonQuestionResponse[], [questionsData]);
    const currentQuestion = questions[currentQuestionIndex];

    // Logic đếm ngược
    useEffect(() => {
        if (!currentQuestion || isAnswered) return;

        setTimeLeft(QUESTION_TIME_LIMIT);

        if (timerRef.current) clearInterval(timerRef.current); // Clear any existing timer

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentQuestionIndex, isAnswered]);

    const handleTimeout = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        saveProgressAndNext(currentQuestion.lessonQuestionId, false, "TIMEOUT");
    };

    const saveProgressAndNext = useCallback((questionId: string, isCorrect: boolean, answer: string) => {
        setIsAnswered(true);

        // 1. Lưu Wrong Item
        if (!isCorrect && userId) {
            const wrongItemReq: LessonProgressWrongItemRequest = {
                lessonId: lesson.lessonId,
                userId: userId,
                lessonQuestionId: questionId,
                wrongAnswer: answer
            };
            createWrongItemMutation.mutate(wrongItemReq);
        }

        // 2. Lưu Progress (Cập nhật điểm)
        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        setCorrectCount(newCorrectCount);

        if (userId) {
            const progressReq: LessonProgressRequest = {
                lessonId: lesson.lessonId,
                userId: userId,
                score: newCorrectCount,
                maxScore: questions.length,
                attemptNumber: 1,
                completedAt: new Date().toISOString(),
                needsReview: !isCorrect,
                answersJson: JSON.stringify({ [questionId]: answer })
            };
            updateProgressMutation.mutate({ lessonId: lesson.lessonId, userId, req: progressReq });
        }

        // 3. Chuyển câu hỏi sau 1.5s
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
                setIsAnswered(false);
                setSelectedAnswer(null);
            } else {
                Alert.alert("Hoàn thành", `Kết quả: ${newCorrectCount}/${questions.length}`, [
                    { text: "OK", onPress: onComplete }
                ]);
            }
        }, 1500);
    }, [userId, lesson, currentQuestionIndex, questions.length, correctCount]);

    const handleAnswer = (optionKey: string) => {
        if (isAnswered) return;
        if (timerRef.current) clearInterval(timerRef.current);

        setSelectedAnswer(optionKey);
        const isCorrect = optionKey === currentQuestion.correctOption;
        saveProgressAndNext(currentQuestion.lessonQuestionId, isCorrect, optionKey);
    };

    // Render Component dựa trên Skill Type
    const renderSkillContent = () => {
        // Ưu tiên check skillType của câu hỏi, nếu null thì lấy của lesson
        const type = currentQuestion.skillType || lesson.skillTypes;

        switch (type) {
            case SkillType.LISTENING:
                return <ListeningQuestionView question={currentQuestion} />;
            case SkillType.SPEAKING:
                return <SpeakingQuestionView question={currentQuestion} />;
            case SkillType.READING:
                return <ReadingQuestionView question={currentQuestion} />;
            case SkillType.WRITING:
                return <WritingQuestionView question={currentQuestion} />;
            default:
                // Mặc định dùng Reading view nếu không xác định
                return <ReadingQuestionView question={currentQuestion} />;
        }
    };

    if (isLoading || !currentQuestion) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <View style={styles.container}>
            {/* Header Progress */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onComplete} style={styles.closeBtn}>
                    <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <View style={styles.timerBadge}>
                    <Icon name="timer" size={16} color={timeLeft < 5 ? "#EF4444" : "#4F46E5"} />
                    <Text style={[styles.timerText, { color: timeLeft < 5 ? "#EF4444" : "#4F46E5" }]}>{timeLeft}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Render nội dung đề bài (tùy chỉnh theo skill) */}
                {renderSkillContent()}

                {/* 4 Options Buttons */}
                <View style={styles.optionsContainer}>
                    {[
                        { key: 'A', val: currentQuestion.optionA },
                        { key: 'B', val: currentQuestion.optionB },
                        { key: 'C', val: currentQuestion.optionC },
                        { key: 'D', val: currentQuestion.optionD }
                    ].map((opt) => {
                        if (!opt.val) return null; // Bỏ qua nếu option null

                        let overrideStyle: StyleProp<ViewStyle> = {}; // FIX 2: Use StyleProp<ViewStyle> to correctly merge styles

                        if (isAnswered) {
                            if (opt.key === currentQuestion.correctOption) overrideStyle = styles.optionBtnCorrect;
                            else if (opt.key === selectedAnswer) overrideStyle = styles.optionBtnWrong;
                        } else if (selectedAnswer === opt.key) {
                            overrideStyle = styles.optionBtnSelected;
                        }

                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.optionBtn, overrideStyle]} // FIX 2: Merge base style with override style
                                onPress={() => handleAnswer(opt.key)}
                                disabled={isAnswered}
                            >
                                <View style={styles.optionKeyBadge}>
                                    <Text style={styles.optionKeyText}>{opt.key}</Text>
                                </View>
                                <Text style={styles.optionText}>{opt.val}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

// FIX 2: Cập nhật styles để chỉ chứa các thuộc tính cần thiết.
// Vì đã dùng Array Styling, nên optionBtnSelected, Correct, Wrong không cần
// định nghĩa lại tất cả thuộc tính của optionBtn, chỉ cần những thuộc tính bị override.
// Tuy nhiên, do `createScaledSheet` có thể tạo ra kiểu nghiêm ngặt (strict type),
// ta sẽ giữ nguyên các style định nghĩa ở dưới, nhưng đảm bảo khi dùng
// chúng ta dùng array styling để style base là optionBtn được áp dụng trước.

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        gap: 12
    },
    closeBtn: { padding: 4 },
    progressBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
        borderRadius: 4,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    timerText: { fontWeight: 'bold', fontSize: 14 },
    content: { padding: 20, paddingBottom: 40 },

    optionsContainer: { gap: 12, marginTop: 24 },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    // FIX 2: Chỉ giữ lại các style override
    optionBtnSelected: {
        borderColor: '#4F46E5',
        backgroundColor: '#EEF2FF'
    } as OptionStyleOverride,
    optionBtnCorrect: {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5',
    } as OptionStyleOverride,
    optionBtnWrong: {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
    } as OptionStyleOverride,
    optionKeyBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    optionKeyText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
    optionText: { fontSize: 16, color: '#1F2937', fontWeight: '500', flex: 1 },
});