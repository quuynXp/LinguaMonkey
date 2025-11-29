import React, { useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTestResult } from "../../hooks/useTesting";
import { TestResultResponse } from "../../types/dto";
import { TestStatus } from "../../types/enums";
import { getTestThumbnail } from "../../utils/imageUtil";

const TestResultScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const params = route.params as { result: TestResultResponse; isJustFinished?: boolean };

    // Use the hook for polling (it auto-polls if status is PENDING/GRADING)
    const { data: latestResult, isLoading } = useTestResult(params.result.sessionId);
    const result = latestResult || params.result;

    const isGrading = result.status === TestStatus.REVIEW_PENDING || result.status === 'GRADING';

    return (
        <ScreenLayout style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Status Header */}
                <View style={styles.headerCard}>
                    {isGrading ? (
                        <View style={styles.gradingContainer}>
                            <View style={styles.pulseIcon}>
                                <Icon name="access-time" size={60} color="#F59E0B" />
                                <ActivityIndicator size="small" color="#F59E0B" style={styles.spinner} />
                            </View>
                            <Text style={styles.statusTitle}>AI is Grading...</Text>
                            <Text style={styles.statusDesc}>
                                We are analyzing your performance. This typically takes less than a minute.
                                You can leave this screen; the result will be saved in History.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.finishedContainer}>
                            <Image source={require('../../assets/images/ImagePlacehoderCourse.png')} style={styles.trophyImage} />
                            <Text style={styles.scoreText}>{result.proficiencyEstimate}</Text>
                            <Text style={styles.scoreSubText}>Proficiency Level</Text>

                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{result.score}/{result.totalQuestions}</Text>
                                    <Text style={styles.statLabel}>Correct</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{Math.round(result.percentage)}%</Text>
                                    <Text style={styles.statLabel}>Accuracy</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => (navigation as any).navigate('ProficiencyTestScreen')}
                >
                    <Text style={styles.buttonText}>Back to Test List</Text>
                </TouchableOpacity>

                {/* Detailed breakdown (Only if finished) */}
                {!isGrading && result.questions && (
                    <View style={styles.detailsContainer}>
                        <Text style={styles.detailsTitle}>Detailed Review</Text>
                        {result.questions.map((q, index) => (
                            <View key={q.questionId} style={[styles.qResultCard, q.isCorrect ? styles.correctCard : styles.wrongCard]}>
                                <View style={styles.qHeader}>
                                    <Icon name={q.isCorrect ? "check-circle" : "cancel"} size={20} color={q.isCorrect ? "#059669" : "#EF4444"} />
                                    <Text style={styles.qIndex}> Question {index + 1}</Text>
                                </View>
                                <Text style={styles.qText}>{q.questionText}</Text>
                                <Text style={styles.explanation}>
                                    <Text style={{ fontWeight: 'bold' }}>Explanation: </Text>{q.explanation}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    scrollContent: { padding: 16 },
    headerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, elevation: 2 },
    gradingContainer: { alignItems: 'center' },
    pulseIcon: { marginBottom: 16, position: 'relative' },
    spinner: { position: 'absolute', bottom: -10, alignSelf: 'center' },
    statusTitle: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B', marginBottom: 8 },
    statusDesc: { textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 20 },
    finishedContainer: { alignItems: 'center', width: '100%' },
    trophyImage: { width: 100, height: 100, marginBottom: 10 }, // You can replace with a trophy asset
    scoreText: { fontSize: 48, fontWeight: '900', color: '#4F46E5' },
    scoreSubText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
    statRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 16 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    statLabel: { fontSize: 12, color: '#9CA3AF' },
    divider: { width: 1, height: '100%', backgroundColor: '#E5E7EB' },
    primaryButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
    buttonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    detailsContainer: { marginTop: 10 },
    detailsTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
    qResultCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
    correctCard: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
    wrongCard: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
    qHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    qIndex: { fontWeight: '600', marginLeft: 4 },
    qText: { fontSize: 15, color: '#1F2937', marginBottom: 8 },
    explanation: { fontSize: 13, color: '#4B5563', fontStyle: 'italic' },
});

export default TestResultScreen;