import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet, // Import StyleSheet to access flatten
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useGrammar } from "../../hooks/useGrammar";
import { useAppStore } from "../../stores/appStore";
import type {
  GrammarExerciseResponse,
  GrammarRuleResponse,
  GrammarTopicResponse,
  SubmitExerciseResponse,
} from "../../types/dto";
import { SubmitExerciseRequest } from "../../types/dto";
import { grammarExerciseSchema, validateData } from "../../utils/validation";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from "../../utils/scaledStyles";

const GrammarLearningScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { selectedGrammarTopic, setSelectedGrammarTopic } = useAppStore();

  // Local State
  const [selectedRule, setSelectedRule] = useState<GrammarRuleResponse | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [exerciseScore, setExerciseScore] = useState<number>(0);
  const [submissionDetails, setSubmissionDetails] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const {
    useGrammarTopics,
    useGrammarTopic,
    useGrammarRule,
    useSubmitGrammarExercise,
  } = useGrammar();

  const currentUser = useUserStore().user;
  const userId = currentUser?.userId ?? null;

  // Queries
  const topicsQuery = useGrammarTopics();
  const topics = topicsQuery.data ?? [];

  // Fetch Topic Details (Rules list) when a topic is selected
  const topicQuery = useGrammarTopic(selectedGrammarTopic?.topicId ?? null, userId ?? undefined);
  const topicData = topicQuery.data ?? null;

  // Fetch Full Rule Details (including Exercises) when a rule is clicked
  const ruleQuery = useGrammarRule(selectedRule?.ruleId ?? null);
  const ruleData = ruleQuery.data ?? null;

  const submitMut = useSubmitGrammarExercise();

  // Reset state when modal closes
  useEffect(() => {
    if (!showRuleModal) {
      setUserAnswers({});
      setShowResults(false);
      setExerciseScore(0);
      setSubmissionDetails({});
      setValidationErrors({});
    }
  }, [showRuleModal]);

  const getLevelColor = (level?: string) => {
    switch (level) {
      case "A1": return "#4CAF50";
      case "A2": return "#8BC34A";
      case "B1": return "#FFC107";
      case "B2": return "#FF9800";
      case "C1": return "#FF5722";
      case "C2": return "#F44336";
      default: return "#757575";
    }
  };

  const handleTopicPress = (topic: GrammarTopicResponse) => {
    setSelectedGrammarTopic(topic);
  };

  const handleRulePress = (rule: GrammarRuleResponse) => {
    setSelectedRule(rule);
    setShowRuleModal(true);
  };

  const handleAnswerChange = (exerciseId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [exerciseId]: answer }));
    if (validationErrors[exerciseId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[exerciseId];
        return copy;
      });
    }
  };

  const checkAnswers = async () => {
    if (!selectedRule || !ruleData) return;
    if (!userId) {
      Alert.alert(t("common.error"), t("errors.notAuthenticated"));
      return;
    }

    try {
      // 1. Client-side Validation
      await validateData(grammarExerciseSchema, {
        ruleId: selectedRule.ruleId,
        answers: userAnswers,
      });

      // 2. Prepare Payload
      const payload: SubmitExerciseRequest = {
        ruleId: selectedRule.ruleId,
        userId,
        answers: userAnswers,
      };

      // 3. Submit to Backend
      const result = (await submitMut.submitExercise(payload)) as SubmitExerciseResponse;

      if (result) {
        setExerciseScore(result.score ?? 0);
        setSubmissionDetails(result.details ?? {}); // Use server validation results
        setShowResults(true);

        if (result.score >= 80) {
          Alert.alert("🎉 " + t("common.congratulations"), t("success.exerciseCompleted"));
        }
      }
    } catch (err: any) {
      if (err.validationErrors) {
        setValidationErrors(err.validationErrors);
      } else {
        Alert.alert(t("common.error"), err.message || t("errors.unknown"));
      }
    }
  };

  const renderTopicCard = (topic: GrammarTopicResponse) => (
    <TouchableOpacity
      key={topic.topicId}
      style={[styles.topicCard, { borderLeftColor: getLevelColor(topic.languageCode) }]}
      onPress={() => handleTopicPress(topic)}
    >
      <View style={styles.topicHeader}>
        <View style={styles.topicTitleContainer}>
          <Text style={styles.topicTitle}>{topic.topicName}</Text>
          <Text style={styles.topicDesc} numberOfLines={1}>{topic.description}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(topic.languageCode) }]}>
          <Text style={styles.levelText}>{topic.languageCode}</Text>
        </View>
      </View>
      <View style={styles.topicFooter}>
        <Text style={styles.ruleCount}>
          <Icon name="library-books" size={14} /> {topic.rules ? topic.rules.length : 0} {t("grammar.rules")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRuleItem = (rule: GrammarRuleResponse) => (
    <TouchableOpacity
      key={rule.ruleId}
      style={styles.ruleItem}
      onPress={() => handleRulePress(rule)}
    >
      <View style={styles.ruleIcon}>
        <Icon name="article" size={24} color="#2196F3" />
      </View>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleTitle}>{rule.title}</Text>
        <Text style={styles.rulePreview} numberOfLines={2}>
          {rule.explanation || ""}
        </Text>
        {/* If userScore is present, show it */}
        {(rule.userScore !== undefined && rule.userScore !== null) && (
          <Text style={[styles.ruleScore, { color: rule.userScore >= 80 ? '#4CAF50' : '#FF9800' }]}>
            {t("common.score")}: {rule.userScore}%
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const renderExercise = (exercise: GrammarExerciseResponse, index: number) => {
    const exId = exercise.exerciseId;
    const isCorrect = submissionDetails[exId] === true;
    const isWrong = showResults && submissionDetails[exId] === false;

    return (
      <View key={exId} style={[
        styles.exerciseContainer,
        isCorrect && styles.exerciseContainerCorrect,
        isWrong && styles.exerciseContainerWrong
      ]}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseNumber}>{t("grammar.exercises")} {index + 1}</Text>
          {isCorrect && <Icon name="check-circle" size={20} color="#4CAF50" />}
          {isWrong && <Icon name="cancel" size={20} color="#F44336" />}
        </View>

        <Text style={styles.exerciseQuestion}>{exercise.question}</Text>

        {validationErrors[exId] && (
          <Text style={styles.errorText}>{validationErrors[exId][0]}</Text>
        )}

        {/* Input Handling based on Type */}
        {exercise.type === "multiple-choice" ? (
          <View style={styles.optionsContainer}>
            {(exercise.options ?? []).map((option) => {
              const isSelected = (userAnswers[exId] ?? "") === option;

              const buttonStyles = [styles.optionButton];
              const textStyles = [styles.optionText];

              if (showResults) {
                if (option === exercise.correct) {
                  textStyles.push(styles.optionTextCorrect);
                }
              } else if (isSelected) {
                textStyles.push(styles.optionTextSelected);
              }

              return (
                <TouchableOpacity
                  key={option}
                  style={StyleSheet.flatten(buttonStyles)}
                  onPress={() => !showResults && handleAnswerChange(exId, option)}
                  disabled={showResults}
                >
                  <Text style={StyleSheet.flatten(textStyles)}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TextInput
            style={StyleSheet.flatten([
              styles.textInput,
              exercise.type === "transformation" && styles.textInputMultiline,
              isCorrect && styles.textInputCorrect,
              isWrong && styles.textInputWrong
            ])}
            placeholder={t("common.typeAnswer")}
            value={userAnswers[exId] ?? ""}
            onChangeText={(t) => handleAnswerChange(exId, t)}
            editable={!showResults}
            multiline={exercise.type === "transformation"}
          />
        )}

        {/* Explanation / Result */}
        {showResults && (
          <View style={styles.resultDetails}>
            {!isCorrect && (
              <Text style={styles.correctAnswerText}>
                {t("grammar.correctAnswer")}: <Text style={{ fontWeight: 'bold' }}>{exercise.correct}</Text>
              </Text>
            )}
            {exercise.explanation && (
              <View style={styles.explanationBox}>
                <Icon name="info" size={16} color="#666" style={{ marginRight: 5, marginTop: 2 }} />
                <Text style={styles.explanationText}>{exercise.explanation}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (topicsQuery.isPending) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (topicsQuery.isError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{t("errors.network")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => topicsQuery.refetch()}>
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("grammar.title")}</Text>
        <View style={styles.headerRight} />
      </View>

      {!selectedGrammarTopic ? (
        // TOPIC LIST
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.sectionTitle}>{t("grammar.topics")}</Text>
          <Text style={styles.sectionSubtitle}>{t("grammar.subtitle")}</Text>
          {topics.map(renderTopicCard)}
        </ScrollView>
      ) : (
        // RULES LIST
        <View style={styles.content}>
          <View style={styles.topicDetailHeader}>
            <TouchableOpacity onPress={() => setSelectedGrammarTopic(null)} style={styles.backToTopicButton}>
              <Icon name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedTopicTitle}>{selectedGrammarTopic.topicName}</Text>
              <Text style={styles.selectedTopicLang}>{selectedGrammarTopic.languageCode}</Text>
            </View>
          </View>

          {topicQuery.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.rulesTitle}>{t("grammar.rulesList")}</Text>
              {(topicData?.rules ?? []).length === 0 ? (
                <Text style={styles.emptyText}>{t("common.noData")}</Text>
              ) : (
                (topicData?.rules ?? []).map(renderRuleItem)
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* RULE MODAL (Learning & Exercises) */}
      <Modal
        visible={showRuleModal}
        animationType="slide"
        onRequestClose={() => setShowRuleModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRuleModal(false)} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedRule?.title}</Text>
            <View style={styles.headerRight} />
          </View>

          {ruleQuery.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : ruleData ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Theory Section */}
                <View style={styles.theoryCard}>
                  <Text style={styles.explanationTitle}>{t("grammar.explanation")}</Text>
                  <Text style={styles.explanationText}>
                    {ruleData.explanation}
                  </Text>

                  {(ruleData.examples ?? []).length > 0 && (
                    <View style={styles.examplesSection}>
                      <Text style={styles.examplesTitle}>{t("grammar.examples")}:</Text>
                      {ruleData.examples?.map((example, index) => (
                        <View key={index} style={styles.exampleItem}>
                          <Text style={styles.exampleText}>• {example}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Exercises Section */}
                <View style={styles.exercisesSection}>
                  <Text style={styles.sectionHeader}>{t("grammar.practice")}</Text>
                  {(ruleData.exercises ?? []).length > 0 ? (
                    ruleData.exercises!.map(renderExercise)
                  ) : (
                    <Text style={styles.emptyText}>{t("grammar.noExercises")}</Text>
                  )}
                </View>

                {/* Submit / Score Area */}
                {(ruleData.exercises ?? []).length > 0 && (
                  <View style={styles.footerAction}>
                    {!showResults ? (
                      <TouchableOpacity
                        style={[
                          styles.checkButton,
                          submitMut.isSubmitting && styles.disabledButton,
                        ]}
                        onPress={checkAnswers}
                        disabled={submitMut.isSubmitting}
                      >
                        {submitMut.isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.checkButtonText}>{t("grammar.checkAnswers")}</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreTitle}>{t("grammar.result")}</Text>
                        <Text style={[styles.scoreValue, { color: exerciseScore >= 50 ? '#4CAF50' : '#F44336' }]}>
                          {exerciseScore}/100
                        </Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setShowResults(false);
                            setUserAnswers({});
                            setSubmissionDetails({});
                            setValidationErrors({});
                          }}
                        >
                          <Icon name="refresh" size={20} color="#fff" />
                          <Text style={styles.retryButtonText}>{t("grammar.retry")}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t("errors.notFound")}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 20,
  },
  topicCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  topicTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: 13,
    color: "#757575",
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "800",
  },
  ruleCount: {
    fontSize: 12,
    color: "#9E9E9E",
    fontWeight: "500",
  },

  // Topic Detail
  topicDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  backToTopicButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  selectedTopicTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  selectedTopicLang: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginTop: 2,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  rulePreview: {
    fontSize: 12,
    color: "#757575",
  },
  ruleScore: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontStyle: 'italic',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  modalContent: {
    flex: 1,
  },
  theoryCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    color: "#424242",
    lineHeight: 24,
  },
  examplesSection: {
    marginTop: 20,
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 12,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  exampleItem: {
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 20,
  },

  // Exercises
  exercisesSection: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333'
  },
  exerciseContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseContainerCorrect: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  exerciseContainerWrong: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2196F3",
    textTransform: 'uppercase',
  },
  exerciseQuestion: {
    fontSize: 16,
    color: "#1A1A1A",
    marginBottom: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: '#333',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Sử dụng spread syntax trong array style cần dùng StyleSheet.flatten
  // Các style này là override, không cần chứa tất cả thuộc tính của style gốc
  textInputCorrect: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  textInputWrong: {
    borderColor: "#F44336",
    backgroundColor: "#FFEBEE",
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionButtonSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  optionButtonCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionButtonWrong: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 15,
    color: "#333",
  },
  optionTextSelected: {
    fontSize: 15, // Fix: Ensure fontSize exists to avoid error 2741
    color: "#1976D2",
    fontWeight: "600",
  },
  optionTextCorrect: {
    fontSize: 15, // Fix: Ensure fontSize exists to avoid error 2741
    color: '#2E7D32',
    fontWeight: '700'
  },

  // Results
  resultDetails: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  correctAnswerText: {
    fontSize: 14,
    color: '#D32F2F',
    marginBottom: 8,
  },
  explanationBox: {
    flexDirection: 'row',
  },

  // Footer / Actions
  footerAction: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  checkButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#BDBDBD",
    elevation: 0,
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  scoreContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  scoreTitle: {
    fontSize: 14,
    color: '#757575',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#D32F2F",
    marginTop: 4,
    marginBottom: 8,
  },
});

export default GrammarLearningScreen;