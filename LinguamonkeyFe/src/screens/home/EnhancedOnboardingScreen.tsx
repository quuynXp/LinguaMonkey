"use client"

import { useEffect, useRef, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useToast } from "../../hooks/useToast"
import { createScaledSheet } from "../../utils/scaledStyles"

const { width } = Dimensions.get("window")

interface UserAssessment {
  personalInfo: {
    name: string
    age: string
    profession: string
    currentLevel: string
  }
  interests: string[]
  learningGoals: string[]
  timeframe: string
  dailyTime: string
  preferredTopics: string[]
  motivations: string[]
  challenges: string[]
}

const EnhancedOnboardingScreen = ({ navigation }: any) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [assessment, setAssessment] = useState<UserAssessment>({
    personalInfo: { name: "", age: "", profession: "", currentLevel: "" },
    interests: [],
    learningGoals: [],
    timeframe: "",
    dailyTime: "",
    preferredTopics: [],
    motivations: [],
    challenges: [],
  })

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const { showToast } = useToast()

  const steps = [
    "Personal Info",
    "Current Level",
    "Learning Goals",
    "Interests & Topics",
    "Time Commitment",
    "Motivations",
    "Challenges",
    "Summary",
  ]

  const professions = [
    { id: "student", name: "Student", icon: "school" },
    { id: "business", name: "Business Professional", icon: "business" },
    { id: "teacher", name: "Teacher/Educator", icon: "person" },
    { id: "engineer", name: "Engineer/Tech", icon: "computer" },
    { id: "healthcare", name: "Healthcare", icon: "local-hospital" },
    { id: "creative", name: "Creative/Arts", icon: "palette" },
    { id: "service", name: "Service Industry", icon: "room-service" },
    { id: "other", name: "Other", icon: "work" },
  ]

  const currentLevels = [
    { id: "beginner", name: "Beginner", description: "Just starting out", color: "#10B981" },
    { id: "elementary", name: "Elementary", description: "Basic understanding", color: "#3B82F6" },
    { id: "intermediate", name: "Intermediate", description: "Comfortable with basics", color: "#F59E0B" },
    { id: "upper-intermediate", name: "Upper Intermediate", description: "Good command", color: "#EF4444" },
    { id: "advanced", name: "Advanced", description: "Fluent speaker", color: "#8B5CF6" },
  ]

  const learningGoals = [
    {
      id: "conversation",
      name: "Daily Conversation",
      icon: "chat",
      description: "Speak fluently in everyday situations",
    },
    { id: "business", name: "Business English", icon: "business", description: "Professional communication" },
    { id: "academic", name: "Academic Study", icon: "school", description: "University or research purposes" },
    { id: "travel", name: "Travel & Tourism", icon: "flight", description: "Communicate while traveling" },
    { id: "certification", name: "Test Preparation", icon: "assignment", description: "IELTS, TOEFL, etc." },
    { id: "culture", name: "Cultural Understanding", icon: "public", description: "Learn about culture and customs" },
  ]

  const interests = [
    { id: "technology", name: "Technology", icon: "computer" },
    { id: "business", name: "Business & Finance", icon: "trending-up" },
    { id: "entertainment", name: "Movies & TV", icon: "movie" },
    { id: "sports", name: "Sports", icon: "sports-soccer" },
    { id: "music", name: "Music", icon: "music-note" },
    { id: "food", name: "Food & Cooking", icon: "restaurant" },
    { id: "travel", name: "Travel", icon: "flight" },
    { id: "science", name: "Science", icon: "science" },
    { id: "art", name: "Art & Design", icon: "palette" },
    { id: "health", name: "Health & Fitness", icon: "fitness-center" },
  ]

  const timeframes = [
    { id: "3months", name: "3 Months", description: "Intensive learning", color: "#EF4444" },
    { id: "6months", name: "6 Months", description: "Steady progress", color: "#F59E0B" },
    { id: "1year", name: "1 Year", description: "Comprehensive learning", color: "#10B981" },
    { id: "2years", name: "2+ Years", description: "Long-term mastery", color: "#3B82F6" },
  ]

  const dailyTimes = [
    { id: "15min", name: "15 minutes", description: "Quick daily practice" },
    { id: "30min", name: "30 minutes", description: "Focused learning" },
    { id: "1hour", name: "1 hour", description: "Intensive study" },
    { id: "2hours", name: "2+ hours", description: "Immersive learning" },
  ]

  const motivations = [
    { id: "career", name: "Career Advancement", icon: "trending-up" },
    { id: "education", name: "Educational Goals", icon: "school" },
    { id: "personal", name: "Personal Growth", icon: "person" },
    { id: "family", name: "Family/Relationships", icon: "family-restroom" },
    { id: "travel", name: "Travel Dreams", icon: "flight" },
    { id: "culture", name: "Cultural Interest", icon: "public" },
  ]

  const challenges = [
    { id: "time", name: "Limited Time", icon: "schedule" },
    { id: "confidence", name: "Lack of Confidence", icon: "psychology" },
    { id: "grammar", name: "Grammar Difficulties", icon: "spellcheck" },
    { id: "pronunciation", name: "Pronunciation", icon: "record-voice-over" },
    { id: "vocabulary", name: "Limited Vocabulary", icon: "book" },
    { id: "practice", name: "No Practice Partners", icon: "people" },
  ]

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [currentStep])

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        handleCompleteAssessment()
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        if (!assessment.personalInfo.name || !assessment.personalInfo.age || !assessment.personalInfo.profession) {
          Alert.alert("Required", "Please fill in all personal information")
          return false
        }
        break
      case 1:
        if (!assessment.personalInfo.currentLevel) {
          Alert.alert("Required", "Please select your current English level")
          return false
        }
        break
      case 2:
        if (assessment.learningGoals.length === 0) {
          Alert.alert("Required", "Please select at least one learning goal")
          return false
        }
        break
      case 3:
        if (assessment.interests.length === 0 || assessment.preferredTopics.length === 0) {
          Alert.alert("Required", "Please select your interests and preferred topics")
          return false
        }
        break
      case 4:
        if (!assessment.timeframe || !assessment.dailyTime) {
          Alert.alert("Required", "Please select your time commitment")
          return false
        }
        break
      case 5:
        if (assessment.motivations.length === 0) {
          Alert.alert("Required", "Please select at least one motivation")
          return false
        }
        break
      case 6:
        if (assessment.challenges.length === 0) {
          Alert.alert("Required", "Please select at least one challenge")
          return false
        }
        break
    }
    return true
  }

  const handleCompleteAssessment = async () => {
    try {
      // Save assessment data and create personalized learning path
      console.log("Assessment completed:", assessment)
      showToast({ message: "Assessment completed successfully!", type: "success" })
      navigation.navigate("Home")
    } catch (error) {
      showToast({ message: "Failed to save assessment. Please try again.", type: "error" })
    }
  }

  const toggleArraySelection = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter((i) => i !== item))
    } else {
      setter([...array, item])
    }
  }

  const renderPersonalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepDescription}>Help us create a personalized learning experience</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          value={assessment.personalInfo.name}
          onChangeText={(text) =>
            setAssessment({
              ...assessment,
              personalInfo: { ...assessment.personalInfo, name: text },
            })
          }
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Age Range *</Text>
        <View style={styles.ageGrid}>
          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((age) => (
            <TouchableOpacity
              key={age}
              style={[styles.ageCard, assessment.personalInfo.age === age && styles.selectedCard]}
              onPress={() =>
                setAssessment({
                  ...assessment,
                  personalInfo: { ...assessment.personalInfo, age },
                })
              }
            >
              <Text style={[styles.cardText, assessment.personalInfo.age === age && styles.selectedCardText]}>
                {age}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Profession *</Text>
        <View style={styles.professionGrid}>
          {professions.map((profession) => (
            <TouchableOpacity
              key={profession.id}
              style={[
                styles.professionCard,
                assessment.personalInfo.profession === profession.id && styles.selectedCard,
              ]}
              onPress={() =>
                setAssessment({
                  ...assessment,
                  personalInfo: { ...assessment.personalInfo, profession: profession.id },
                })
              }
            >
              <Icon
                name={profession.icon}
                size={24}
                color={assessment.personalInfo.profession === profession.id ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.professionText,
                  assessment.personalInfo.profession === profession.id && styles.selectedCardText,
                ]}
              >
                {profession.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )

  const renderCurrentLevel = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your current English level?</Text>
      <Text style={styles.stepDescription}>Be honest - this helps us create the right content for you</Text>

      <View style={styles.levelsContainer}>
        {currentLevels.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.levelCard,
              { borderColor: level.color },
              assessment.personalInfo.currentLevel === level.id && { backgroundColor: level.color },
            ]}
            onPress={() =>
              setAssessment({
                ...assessment,
                personalInfo: { ...assessment.personalInfo, currentLevel: level.id },
              })
            }
          >
            <Text
              style={[styles.levelName, assessment.personalInfo.currentLevel === level.id && styles.selectedCardText]}
            >
              {level.name}
            </Text>
            <Text
              style={[
                styles.levelDescription,
                assessment.personalInfo.currentLevel === level.id && styles.selectedCardText,
              ]}
            >
              {level.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderLearningGoals = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What are your learning goals?</Text>
      <Text style={styles.stepDescription}>Select all that apply to you</Text>

      <View style={styles.goalsContainer}>
        {learningGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.goalCard, assessment.learningGoals.includes(goal.id) && styles.selectedCard]}
            onPress={() =>
              toggleArraySelection(assessment.learningGoals, goal.id, (arr) =>
                setAssessment({ ...assessment, learningGoals: arr }),
              )
            }
          >
            <Icon
              name={goal.icon}
              size={32}
              color={assessment.learningGoals.includes(goal.id) ? "#FFFFFF" : "#6B7280"}
            />
            <Text style={[styles.goalName, assessment.learningGoals.includes(goal.id) && styles.selectedCardText]}>
              {goal.name}
            </Text>
            <Text
              style={[styles.goalDescription, assessment.learningGoals.includes(goal.id) && styles.selectedCardText]}
            >
              {goal.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderInterestsAndTopics = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What interests you?</Text>
      <Text style={styles.stepDescription}>We'll use this to personalize your learning content</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Your Interests</Text>
        <View style={styles.interestsGrid}>
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest.id}
              style={[styles.interestCard, assessment.interests.includes(interest.id) && styles.selectedCard]}
              onPress={() =>
                toggleArraySelection(assessment.interests, interest.id, (arr) =>
                  setAssessment({ ...assessment, interests: arr }),
                )
              }
            >
              <Icon
                name={interest.icon}
                size={24}
                color={assessment.interests.includes(interest.id) ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[styles.interestText, assessment.interests.includes(interest.id) && styles.selectedCardText]}
              >
                {interest.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Preferred Learning Topics</Text>
        <View style={styles.topicsGrid}>
          {["Grammar", "Vocabulary", "Pronunciation", "Listening", "Speaking", "Reading", "Writing", "Culture"].map(
            (topic) => (
              <TouchableOpacity
                key={topic}
                style={[styles.topicCard, assessment.preferredTopics.includes(topic) && styles.selectedCard]}
                onPress={() =>
                  toggleArraySelection(assessment.preferredTopics, topic, (arr) =>
                    setAssessment({ ...assessment, preferredTopics: arr }),
                  )
                }
              >
                <Text style={[styles.topicText, assessment.preferredTopics.includes(topic) && styles.selectedCardText]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>
    </View>
  )

  const renderTimeCommitment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Time Commitment</Text>
      <Text style={styles.stepDescription}>How much time can you dedicate to learning?</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Target Timeframe</Text>
        <View style={styles.timeframeContainer}>
          {timeframes.map((timeframe) => (
            <TouchableOpacity
              key={timeframe.id}
              style={[
                styles.timeframeCard,
                { borderColor: timeframe.color },
                assessment.timeframe === timeframe.id && { backgroundColor: timeframe.color },
              ]}
              onPress={() => setAssessment({ ...assessment, timeframe: timeframe.id })}
            >
              <Text style={[styles.timeframeName, assessment.timeframe === timeframe.id && styles.selectedCardText]}>
                {timeframe.name}
              </Text>
              <Text
                style={[styles.timeframeDescription, assessment.timeframe === timeframe.id && styles.selectedCardText]}
              >
                {timeframe.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Daily Study Time</Text>
        <View style={styles.dailyTimeContainer}>
          {dailyTimes.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[styles.dailyTimeCard, assessment.dailyTime === time.id && styles.selectedCard]}
              onPress={() => setAssessment({ ...assessment, dailyTime: time.id })}
            >
              <Text style={[styles.dailyTimeName, assessment.dailyTime === time.id && styles.selectedCardText]}>
                {time.name}
              </Text>
              <Text style={[styles.dailyTimeDescription, assessment.dailyTime === time.id && styles.selectedCardText]}>
                {time.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )

  const renderMotivations = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What motivates you?</Text>
      <Text style={styles.stepDescription}>Understanding your motivation helps us keep you engaged</Text>

      <View style={styles.motivationsContainer}>
        {motivations.map((motivation) => (
          <TouchableOpacity
            key={motivation.id}
            style={[styles.motivationCard, assessment.motivations.includes(motivation.id) && styles.selectedCard]}
            onPress={() =>
              toggleArraySelection(assessment.motivations, motivation.id, (arr) =>
                setAssessment({ ...assessment, motivations: arr }),
              )
            }
          >
            <Icon
              name={motivation.icon}
              size={32}
              color={assessment.motivations.includes(motivation.id) ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[styles.motivationName, assessment.motivations.includes(motivation.id) && styles.selectedCardText]}
            >
              {motivation.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderChallenges = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What challenges do you face?</Text>
      <Text style={styles.stepDescription}>We'll help you overcome these obstacles</Text>

      <View style={styles.challengesContainer}>
        {challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={[styles.challengeCard, assessment.challenges.includes(challenge.id) && styles.selectedCard]}
            onPress={() =>
              toggleArraySelection(assessment.challenges, challenge.id, (arr) =>
                setAssessment({ ...assessment, challenges: arr }),
              )
            }
          >
            <Icon
              name={challenge.icon}
              size={24}
              color={assessment.challenges.includes(challenge.id) ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[styles.challengeName, assessment.challenges.includes(challenge.id) && styles.selectedCardText]}
            >
              {challenge.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderSummary = () => (
    <View style={styles.stepContainer}>
      <Icon name="check-circle" size={120} color="#4F46E5" style={styles.completeIcon} />
      <Text style={styles.stepTitle}>Assessment Complete!</Text>
      <Text style={styles.stepDescription}>Here's your personalized learning profile</Text>

      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>👤 Personal Information</Text>
          <Text style={styles.summaryText}>Name: {assessment.personalInfo.name}</Text>
          <Text style={styles.summaryText}>Age: {assessment.personalInfo.age}</Text>
          <Text style={styles.summaryText}>
            Profession: {professions.find((p) => p.id === assessment.personalInfo.profession)?.name}
          </Text>
          <Text style={styles.summaryText}>
            Current Level: {currentLevels.find((l) => l.id === assessment.personalInfo.currentLevel)?.name}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>🎯 Learning Goals</Text>
          {assessment.learningGoals.map((goalId) => {
            const goal = learningGoals.find((g) => g.id === goalId)
            return goal ? (
              <Text key={goalId} style={styles.summaryText}>
                • {goal.name}
              </Text>
            ) : null
          })}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>⏰ Time Commitment</Text>
          <Text style={styles.summaryText}>Target: {timeframes.find((t) => t.id === assessment.timeframe)?.name}</Text>
          <Text style={styles.summaryText}>Daily: {dailyTimes.find((d) => d.id === assessment.dailyTime)?.name}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>💡 Interests</Text>
          {assessment.interests.map((interestId) => {
            const interest = interests.find((i) => i.id === interestId)
            return interest ? (
              <Text key={interestId} style={styles.summaryText}>
                • {interest.name}
              </Text>
            ) : null
          })}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>🚀 Motivations</Text>
          {assessment.motivations.map((motivationId) => {
            const motivation = motivations.find((m) => m.id === motivationId)
            return motivation ? (
              <Text key={motivationId} style={styles.summaryText}>
                • {motivation.name}
              </Text>
            ) : null
          })}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>⚠️ Challenges to Address</Text>
          {assessment.challenges.map((challengeId) => {
            const challenge = challenges.find((c) => c.id === challengeId)
            return challenge ? (
              <Text key={challengeId} style={styles.summaryText}>
                • {challenge.name}
              </Text>
            ) : null
          })}
        </View>
      </ScrollView>
    </View>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfo()
      case 1:
        return renderCurrentLevel()
      case 2:
        return renderLearningGoals()
      case 3:
        return renderInterestsAndTopics()
      case 4:
        return renderTimeCommitment()
      case 5:
        return renderMotivations()
      case 6:
        return renderChallenges()
      case 7:
        return renderSummary()
      default:
        return renderPersonalInfo()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={currentStep > 0 ? handleBack : () => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Assessment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{currentStep === steps.length - 1 ? "Complete Assessment" : "Next"}</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 24,
  },
  progressContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  ageCard: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  professionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  professionCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  professionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  selectedCard: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  cardText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedCardText: {
    color: "#FFFFFF",
  },
  levelsContainer: {
    width: "100%",
    gap: 12,
  },
  levelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  levelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  goalCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  goalName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  goalDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  sectionContainer: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  interestCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 8,
  },
  interestText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  topicCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  topicText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  timeframeContainer: {
    gap: 12,
  },
  timeframeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  timeframeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  timeframeDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  dailyTimeContainer: {
    gap: 12,
  },
  dailyTimeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  dailyTimeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  dailyTimeDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  motivationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  motivationCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  motivationName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  challengesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  challengeCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 8,
  },
  challengeName: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  completeIcon: {
    marginBottom: 24,
  },
  summaryContainer: {
    width: "100%",
    maxHeight: 400,
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  backButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default EnhancedOnboardingScreen
