"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useGrammar } from "../hooks/useGrammar"
import { useAppStore } from "../stores/appStore"
import type { GrammarExercise, GrammarRule, GrammarTopic } from "../types/api"
import { grammarExerciseSchema, validateData } from "../utils/validation"

const GrammarLearningScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { selectedGrammarTopic, setSelectedGrammarTopic } = useAppStore()
  const [selectedRule, setSelectedRule] = useState<GrammarRule | null>(null)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [exerciseScore, setExerciseScore] = useState(0)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const { useGrammarTopics, useGrammarTopic, useGrammarRule, useSubmitGrammarExercise, useUpdateGrammarProgress } =
    useGrammar()

  // Fetch grammar topics
  const { data: topicsResponse, error: topicsError, isLoading: topicsLoading } = useGrammarTopics()
  const topics = topicsResponse?.data || []

  // Fetch selected topic
  const { data: topicResponse, isLoading: topicLoading } = useGrammarTopic(selectedGrammarTopic?.id || null)
  const topicData = topicResponse?.data

  // Fetch selected rule
  const { data: ruleResponse, isLoading: ruleLoading } = useGrammarRule(selectedRule?.id || null)
  const ruleData = ruleResponse?.data

  // Mutations
  const { submitExercise, isSubmitting } = useSubmitGrammarExercise()
  const { updateProgress, isUpdating } = useUpdateGrammarProgress()

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#757575"
    }
  }

  const handleTopicPress = (topic: GrammarTopic) => {
    setSelectedGrammarTopic(topic)
  }

  const handleRulePress = (rule: GrammarRule) => {
    setSelectedRule(rule)
    setShowRuleModal(true)
    setUserAnswers({})
    setShowResults(false)
    setValidationErrors({})
  }

  const handleAnswerChange = (exerciseId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [exerciseId]: answer,
    }))

    // Clear validation error for this exercise
    if (validationErrors[exerciseId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[exerciseId]
        return newErrors
      })
    }
  }

  const checkAnswers = async () => {
    if (!selectedRule) return

    try {
      // Validate answers
      await validateData(grammarExerciseSchema, {
        ruleId: selectedRule.id,
        answers: userAnswers,
      })

      const result = await submitExercise(selectedRule.id, userAnswers)

      if (result?.data) {
        setExerciseScore(result.data.score)
        setShowResults(true)

        // Update progress
        if (selectedGrammarTopic) {
          await updateProgress(selectedGrammarTopic.id, selectedRule.id, result.data.score)
        }

        if (result.data.score >= 70) {
          Alert.alert(t("common.success"), t("success.exerciseCompleted"), [{ text: t("common.confirm") }])
        }
      }
    } catch (error: any) {
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors)
      } else {
        Alert.alert(t("common.error"), error.message || t("errors.unknown"))
      }
    }
  }

  const renderTopicCard = (topic: GrammarTopic) => (
    <TouchableOpacity
      key={topic.id}
      style={[styles.topicCard, { borderLeftColor: topic.color }]}
      onPress={() => handleTopicPress(topic)}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(topic.level) }]}>
          <Text style={styles.levelText}>{t(`lessons.difficulty.${topic.level}`)}</Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${topic.progress}%`, backgroundColor: topic.color }]} />
        </View>
        <Text style={styles.progressText}>{topic.progress}%</Text>
      </View>
      <Text style={styles.ruleCount}>
        {topic.rules.length} {t("grammar.rules").toLowerCase()}
      </Text>
    </TouchableOpacity>
  )

  const renderRuleItem = (rule: GrammarRule) => (
    <TouchableOpacity key={rule.id} style={styles.ruleItem} onPress={() => handleRulePress(rule)}>
      <View style={styles.ruleIcon}>
        <Icon name="school" size={24} color="#2196F3" />
      </View>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleTitle}>{rule.title}</Text>
        <Text style={styles.rulePreview} numberOfLines={2}>
          {rule.explanation}
        </Text>
        <Text style={styles.exerciseCount}>
          {rule.exercises.length} {t("grammar.exercises").toLowerCase()}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  )

  const renderExercise = (exercise: GrammarExercise, index: number) => {
    switch (exercise.type) {
      case "fill-blank":
        return (
          <View key={exercise.id} style={styles.exerciseContainer}>
            <Text style={styles.exerciseNumber}>
              {t("grammar.exercises")} {index + 1}
            </Text>
            <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
            {validationErrors[exercise.id] && <Text style={styles.errorText}>{validationErrors[exercise.id][0]}</Text>}
            <TextInput
              style={styles.textInput}
              placeholder={t("common.search")}
              value={userAnswers[exercise.id] || ""}
              onChangeText={(text) => handleAnswerChange(exercise.id, text)}
            />
            {showResults && (
              <View style={styles.resultContainer}>
                <Text
                  style={[
                    styles.resultText,
                    {
                      color:
                        userAnswers[exercise.id]?.toLowerCase().trim() === exercise.correct.toLowerCase().trim()
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {userAnswers[exercise.id]?.toLowerCase().trim() === exercise.correct.toLowerCase().trim()
                    ? t("grammar.correct")
                    : t("grammar.incorrect", { answer: exercise.correct })}
                </Text>
                <Text style={styles.explanationText}>{exercise.explanation}</Text>
              </View>
            )}
          </View>
        )

      case "multiple-choice":
        return (
          <View key={exercise.id} style={styles.exerciseContainer}>
            <Text style={styles.exerciseNumber}>
              {t("grammar.exercises")} {index + 1}
            </Text>
            <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
            {validationErrors[exercise.id] && <Text style={styles.errorText}>{validationErrors[exercise.id][0]}</Text>}
            {exercise.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, userAnswers[exercise.id] === option && styles.selectedOption]}
                onPress={() => handleAnswerChange(exercise.id, option)}
              >
                <Text style={[styles.optionText, userAnswers[exercise.id] === option && styles.selectedOptionText]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            {showResults && (
              <View style={styles.resultContainer}>
                <Text
                  style={[
                    styles.resultText,
                    { color: userAnswers[exercise.id] === exercise.correct ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {userAnswers[exercise.id] === exercise.correct
                    ? t("grammar.correct")
                    : t("grammar.incorrect", { answer: exercise.correct })}
                </Text>
                <Text style={styles.explanationText}>{exercise.explanation}</Text>
              </View>
            )}
          </View>
        )

      case "transformation":
        return (
          <View key={exercise.id} style={styles.exerciseContainer}>
            <Text style={styles.exerciseNumber}>
              {t("grammar.exercises")} {index + 1}
            </Text>
            <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
            {validationErrors[exercise.id] && <Text style={styles.errorText}>{validationErrors[exercise.id][0]}</Text>}
            <TextInput
              style={styles.textInput}
              placeholder="Write the transformed sentence..."
              value={userAnswers[exercise.id] || ""}
              onChangeText={(text) => handleAnswerChange(exercise.id, text)}
              multiline
            />
            {showResults && (
              <View style={styles.resultContainer}>
                <Text
                  style={[
                    styles.resultText,
                    {
                      color:
                        userAnswers[exercise.id]?.toLowerCase().trim() === exercise.correct.toLowerCase().trim()
                          ? "#4CAF50"
                          : "#F44336",
                    },
                  ]}
                >
                  {userAnswers[exercise.id]?.toLowerCase().trim() === exercise.correct.toLowerCase().trim()
                    ? t("grammar.correct")
                    : t("grammar.incorrect", { answer: exercise.correct })}
                </Text>
                <Text style={styles.explanationText}>{exercise.explanation}</Text>
              </View>
            )}
          </View>
        )

      default:
        return null
    }
  }

  if (topicsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (topicsError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.network")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("grammar.title")}</Text>
        <TouchableOpacity>
          <Icon name="bookmark" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {!selectedGrammarTopic ? (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>{t("grammar.topics")}</Text>
          <Text style={styles.sectionSubtitle}>{t("grammar.subtitle")}</Text>
          {topics.map(renderTopicCard)}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <View style={styles.topicDetailHeader}>
            <TouchableOpacity onPress={() => setSelectedGrammarTopic(null)}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.selectedTopicTitle}>{selectedGrammarTopic.title}</Text>
            <View style={styles.headerRight} />
          </View>
          {topicLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <ScrollView>
              <Text style={styles.rulesTitle}>{t("grammar.rules")}</Text>
              {(topicData?.rules || selectedGrammarTopic.rules).map(renderRuleItem)}
            </ScrollView>
          )}
        </View>
      )}

      <Modal visible={showRuleModal} animationType="slide" onRequestClose={() => setShowRuleModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRuleModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedRule?.title}</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {ruleLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
              </View>
            ) : (
              ruleData && (
                <>
                  <View style={styles.explanationSection}>
                    <Text style={styles.explanationTitle}>{t("grammar.explanation")}</Text>
                    <Text style={styles.explanationText}>{ruleData.explanation}</Text>
                  </View>

                  <View style={styles.examplesSection}>
                    <Text style={styles.examplesTitle}>{t("grammar.examples")}</Text>
                    {ruleData.examples.map((example, index) => (
                      <View key={index} style={styles.exampleItem}>
                        <Text style={styles.exampleText}>• {example}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.exercisesSection}>
                    <Text style={styles.exercisesTitle}>{t("grammar.exercises")}</Text>
                    {ruleData.exercises.map(renderExercise)}

                    {!showResults && (
                      <TouchableOpacity
                        style={[styles.checkButton, isSubmitting && styles.disabledButton]}
                        onPress={checkAnswers}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.checkButtonText}>{t("grammar.checkAnswers")}</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {showResults && (
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreText}>{t("grammar.score", { score: exerciseScore })}</Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setUserAnswers({})
                            setShowResults(false)
                            setValidationErrors({})
                          }}
                        >
                          <Text style={styles.retryButtonText}>{t("grammar.retryExercises")}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
  },
  topicCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },
  ruleCount: {
    fontSize: 12,
    color: "#999",
  },
  topicDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectedTopicTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  rulesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  rulePreview: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 12,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  explanationSection: {
    marginBottom: 25,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  examplesSection: {
    marginBottom: 25,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  exampleItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
  },
  exercisesSection: {
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  exerciseContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 8,
  },
  exerciseQuestion: {
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  selectedOption: {
    borderColor: "#2196F3",
    backgroundColor: "#e3f2fd",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedOptionText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  resultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 12,
    color: "#666",
  },
  checkButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scoreContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    textAlign: "center",
    marginVertical: 10,
  },
})

export default GrammarLearningScreen
