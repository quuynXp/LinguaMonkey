import { useEffect, useRef } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import {create} from "zustand" 
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../api/axiosInstance"
import { User, UserGoal, UserLanguage } from "../../types/api"
import { createScaledSheet } from "../../utils/scaledStyles";

// Types
interface SetupData {
  email: string
  password: string
  name: string
  nativeLanguage: string
  targetLanguages: string[]
  certifications: string[]
  ageRange: string
  interests: string[]
  learningGoals: string[]
  learningPace: "slow" | "maintain" | "fast" | "accelerated" | ""
}

interface SetupState {
  currentStep: number
  setupData: SetupData
  setCurrentStep: (step: number) => void
  setSetupData: (data: Partial<SetupData>) => void
  resetSetup: () => void
}

// Zustand store
const useSetupStore = create<SetupState>((set) => ({
  currentStep: 0,
  setupData: {
    email: "",
    password: "",
    name: "",
    nativeLanguage: "",
    targetLanguages: [],
    certifications: [],
    ageRange: "",
    interests: [],
    learningGoals: [],
    learningPace: "",
  },
  setCurrentStep: (step) => set({ currentStep: step }),
  setSetupData: (data) => set((state) => ({ setupData: { ...state.setupData, ...data } })),
  resetSetup: () =>
    set({
      currentStep: 0,
      setupData: {
        email: "",
        password: "",
        name: "",
        nativeLanguage: "",
        targetLanguages: [],
        certifications: [],
        ageRange: "",
        interests: [],
        learningGoals: [],
        learningPace: "",
      },
    }),
}))

// SWR fetcher
const fetcher = async (url: string) => {
  const response = await axiosInstance.get(url)
  return response.data
}

const AccountSetupScreen = ({ navigation }) => {
  const { currentStep, setupData, setCurrentStep, setSetupData, resetSetup } = useSetupStore()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Fetch available languages from API
  const { data: languagesData, error: languagesError } = useSWR("/languages", fetcher, {
    suspense: false,
    revalidateOnFocus: false,
  })

  const steps = [
    "Account Info",
    "Languages",
    "Certifications",
    "Personal Info",
    "Interests",
    "Learning Goals",
    "Learning Pace",
    "Complete",
  ]

  const languages = languagesData?.data || [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  ]

  const certifications = [
    { id: "toefl", name: "TOEFL", description: "Test of English as a Foreign Language" },
    { id: "ielts", name: "IELTS", description: "International English Language Testing System" },
    { id: "hsk", name: "HSK", description: "Hanyu Shuiping Kaoshi (Chinese)" },
    { id: "jlpt", name: "JLPT", description: "Japanese Language Proficiency Test" },
    { id: "topik", name: "TOPIK", description: "Test of Proficiency in Korean" },
    { id: "dalf", name: "DALF", description: "Diplôme Approfondi de Langue Française" },
    { id: "dele", name: "DELE", description: "Diplomas de Español como Lengua Extranjera" },
    { id: "goethe", name: "Goethe", description: "German Language Certificate" },
  ]

  const interests = [
    { id: "business", name: "Business", icon: "business" },
    { id: "travel", name: "Travel", icon: "flight" },
    { id: "technology", name: "Technology", icon: "computer" },
    { id: "culture", name: "Culture", icon: "public" },
    { id: "entertainment", name: "Entertainment", icon: "movie" },
    { id: "sports", name: "Sports", icon: "sports-soccer" },
    { id: "food", name: "Food & Cooking", icon: "restaurant" },
    { id: "science", name: "Science", icon: "science" },
    { id: "art", name: "Art & Design", icon: "palette" },
    { id: "music", name: "Music", icon: "music-note" },
  ]

  const learningGoals = [
    { id: "conversation", name: "Daily Conversation", icon: "chat" },
    { id: "business", name: "Business Communication", icon: "work" },
    { id: "academic", name: "Academic Study", icon: "school" },
    { id: "travel", name: "Travel Communication", icon: "luggage" },
    { id: "certification", name: "Test Preparation", icon: "assignment" },
    { id: "culture", name: "Cultural Understanding", icon: "explore" },
  ]

  const learningPaces = [
    {
      id: "slow",
      name: "Slow & Steady",
      description: "10-15 min/day • Relaxed pace",
      icon: "directions-walk",
      color: "#10B981",
    },
    {
      id: "maintain",
      name: "Maintain Skills",
      description: "15-30 min/day • Keep current level",
      icon: "trending-flat",
      color: "#3B82F6",
    },
    {
      id: "fast",
      name: "Fast Progress",
      description: "30-45 min/day • Quick improvement",
      icon: "directions-run",
      color: "#F59E0B",
    },
    {
      id: "accelerated",
      name: "Accelerated",
      description: "45+ min/day • Intensive learning",
      icon: "rocket-launch",
      color: "#EF4444",
    },
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

  const handleNext = async () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        await handleCompleteSetup()
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
        if (!setupData.email || !setupData.password || !setupData.name) {
          Alert.alert("Error", "Please fill in all required fields")
          return false
        }
        break
      case 1:
        if (!setupData.nativeLanguage || setupData.targetLanguages.length === 0) {
          Alert.alert("Error", "Please select your native language and at least one target language")
          return false
        }
        break
      case 3:
        if (!setupData.ageRange) {
          Alert.alert("Error", "Please select your age range")
          return false
        }
        break
      case 4:
        if (setupData.interests.length === 0) {
          Alert.alert("Error", "Please select at least one interest")
          return false
        }
        break
      case 5:
        if (setupData.learningGoals.length === 0) {
          Alert.alert("Error", "Please select at least one learning goal")
          return false
        }
        break
      case 6:
        if (!setupData.learningPace) {
          Alert.alert("Error", "Please select your learning pace")
          return false
        }
        break
    }
    return true
  }

  const handleCompleteSetup = async () => {
    try {
      // Create user
      const userResponse = await axiosInstance.post<User>("/auth/register", {
        email: setupData.email,
        password: setupData.password,
        fullname: setupData.name,
        native_language_code: setupData.nativeLanguage,
      })

      if (!userResponse.data.success) {
        throw new Error(userResponse.data.message || "Failed to create account")
      }

      const userId = userResponse.data.data.user_id

      // Save target languages
      const languagePromises = setupData.targetLanguages.map((langCode) =>
        axiosInstance.post<UserLanguage>("/user-languages", {
          user_id: userId,
          language_code: langCode,
        }),
      )

      // Save learning goals
      const goalPromises = setupData.learningGoals.map((goal) =>
        axiosInstance.post<UserGoal>("/user-goals", {
          user_id: userId,
          goal_type: goal,
          target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        }),
      )

      await Promise.all([...languagePromises, ...goalPromises])

      Alert.alert("Welcome!", "Your account has been created successfully!", [
        {
          text: "Get Started",
          onPress: () => {
            resetSetup()
            navigation.navigate("DailyWelcome")
          },
        },
      ])
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to create account. Please try again.")
    }
  }

  const toggleArraySelection = (array: string[], item: string, key: keyof SetupData) => {
    const newArray = array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
    setSetupData({ [key]: newArray })
  }

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
      </Text>
    </View>
  )

  const renderAccountInfo = () => (
    <View style={styles.stepContainer}>
      
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepDescription}>Let's start with your basic information</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your full name"
          value={setupData.name}
          onChangeText={(text) => setSetupData({ name: text })}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your email"
          value={setupData.email}
          onChangeText={(text) => setSetupData({ email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Create a secure password"
          value={setupData.password}
          onChangeText={(text) => setSetupData({ password: text })}
          secureTextEntry
        />
      </View>
    </View>
  )

  const renderLanguages = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Language Preferences</Text>
      <Text style={styles.stepDescription}>Select your native language and languages you want to learn</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Native Language *</Text>
        <View style={styles.languagesGrid}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={`native-${lang.code}`}
              style={[styles.languageCard, setupData.nativeLanguage === lang.code && styles.selectedLanguageCard]}
              onPress={() => setSetupData({ nativeLanguage: lang.code })}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={styles.languageName}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Target Languages * (Select multiple)</Text>
        <View style={styles.languagesGrid}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={`target-${lang.code}`}
              style={[
                styles.languageCard,
                setupData.targetLanguages.includes(lang.code) && styles.selectedLanguageCard,
              ]}
              onPress={() => toggleArraySelection(setupData.targetLanguages, lang.code, "targetLanguages")}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={styles.languageName}>{lang.name}</Text>
              {setupData.targetLanguages.includes(lang.code) && (
                <Icon name="check-circle" size={16} color="#4F46E5" style={styles.selectedIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )

  const renderCertifications = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Certification Goals</Text>
      <Text style={styles.stepDescription}>Which certifications are you interested in? (Optional)</Text>

      <View style={styles.certificationsList}>
        {certifications.map((cert) => (
          <TouchableOpacity
            key={cert.id}
            style={[
              styles.certificationCard,
              setupData.certifications.includes(cert.id) && styles.selectedCertificationCard,
            ]}
            onPress={() => toggleArraySelection(setupData.certifications, cert.id, "certifications")}
          >
            <View style={styles.certificationInfo}>
              <Text style={styles.certificationName}>{cert.name}</Text>
              <Text style={styles.certificationDescription}>{cert.description}</Text>
            </View>
            {setupData.certifications.includes(cert.id) && <Icon name="check-circle" size={20} color="#4F46E5" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderPersonalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Help us personalize your learning experience</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Age Range *</Text>
        <View style={styles.ageGrid}>
          {["13-17", "18-24", "25-34", "35-44", "45-54", "55+"].map((age) => (
            <TouchableOpacity
              key={age}
              style={[styles.ageCard, setupData.ageRange === age && styles.selectedAgeCard]}
              onPress={() => setSetupData({ ageRange: age })}
            >
              <Text style={[styles.ageText, setupData.ageRange === age && styles.selectedAgeText]}>{age}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )

  const renderInterests = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepDescription}>What topics interest you? This helps us personalize content</Text>

      <View style={styles.interestsGrid}>
        {interests.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[styles.interestCard, setupData.interests.includes(interest.id) && styles.selectedInterestCard]}
            onPress={() => toggleArraySelection(setupData.interests, interest.id, "interests")}
          >
            <Icon
              name={interest.icon}
              size={32}
              color={setupData.interests.includes(interest.id) ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[styles.interestName, setupData.interests.includes(interest.id) && styles.selectedInterestName]}
            >
              {interest.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderLearningGoals = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Learning Goals</Text>
      <Text style={styles.stepDescription}>What do you want to achieve? (Select multiple)</Text>

      <View style={styles.goalsList}>
        {learningGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.goalCard, setupData.learningGoals.includes(goal.id) && styles.selectedGoalCard]}
            onPress={() => toggleArraySelection(setupData.learningGoals, goal.id, "learningGoals")}
          >
            <View style={styles.goalIcon}>
              <Icon
                name={goal.icon}
                size={24}
                color={setupData.learningGoals.includes(goal.id) ? "#4F46E5" : "#6B7280"}
              />
            </View>
            <Text style={[styles.goalName, setupData.learningGoals.includes(goal.id) && styles.selectedGoalName]}>
              {goal.name}
            </Text>
            {setupData.learningGoals.includes(goal.id) && <Icon name="check-circle" size={20} color="#4F46E5" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderLearningPace = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Learning Pace</Text>
      <Text style={styles.stepDescription}>How much time can you dedicate to learning?</Text>

      <View style={styles.paceContainer}>
        {learningPaces.map((pace) => (
          <TouchableOpacity
            key={pace.id}
            style={[styles.paceCard, setupData.learningPace === pace.id && styles.selectedPaceCard]}
            onPress={() => setSetupData({ learningPace: pace.id as any })}
          >
            <View style={[styles.paceIcon, { backgroundColor: `${pace.color}20` }]}>
              <Icon name={pace.icon} size={32} color={pace.color} />
            </View>
            <Text style={styles.paceName}>{pace.name}</Text>
            <Text style={styles.paceDescription}>{pace.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <Icon name="check-circle" size={120} color="#4F46E5" style={styles.completeIcon} />
      <Text style={styles.completeTitle}>Setup Complete!</Text>
      <Text style={styles.completeDescription}>Your personalized learning journey is ready to begin</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Your Learning Profile</Text>
        <View style={styles.summaryItem}>
          <Icon name="person" size={16} color="#6B7280" />
          <Text style={styles.summaryText}>{setupData.name}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="language" size={16} color="#6B7280" />
          <Text style={styles.summaryText}>{setupData.targetLanguages.length} target languages</Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="school" size={16} color="#6B7280" />
          <Text style={styles.summaryText}>{setupData.learningGoals.length} learning goals</Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="schedule" size={16} color="#6B7280" />
          <Text style={styles.summaryText}>
            {learningPaces.find((p) => p.id === setupData.learningPace)?.name} pace
          </Text>
        </View>
      </View>
    </View>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderAccountInfo()
      case 1:
        return renderLanguages()
      case 2:
        return renderCertifications()
      case 3:
        return renderPersonalInfo()
      case 4:
        return renderInterests()
      case 5:
        return renderLearningGoals()
      case 6:
        return renderLearningPace()
      case 7:
        return renderComplete()
      default:
        return renderAccountInfo()
    }
  }

  if (languagesError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load languages: {languagesError.message}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={currentStep > 0 ? handleBack : () => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Setup</Text>
        <View style={styles.placeholder} />
      </View>

      {renderProgressBar()}

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
          <Text style={styles.nextButtonText}>{currentStep === steps.length - 1 ? "Get Started" : "Next"}</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 50,
    paddingBottom: 16,
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
    backgroundColor: "#4F46E5",
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
  stepAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  sectionContainer: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  languagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 8,
    minWidth: "45%",
    position: "relative",
  },
  selectedLanguageCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  selectedIcon: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  certificationsList: {
    width: "100%",
    gap: 12,
  },
  certificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedCertificationCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  certificationDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  ageCard: {
    flex: 1,
    minWidth: "30%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  selectedAgeCard: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  ageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedAgeText: {
    color: "#FFFFFF",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  interestCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  selectedInterestCard: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  interestName: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  selectedInterestName: {
    color: "#FFFFFF",
  },
  goalsList: {
    width: "100%",
    gap: 12,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedGoalCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  goalName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  selectedGoalName: {
    color: "#4F46E5",
  },
  paceContainer: {
    width: "100%",
    gap: 16,
  },
  paceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  selectedPaceCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  paceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  paceDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  completeAnimation: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  completeDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
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
    color: "#374151",
    fontWeight: "500",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
})

export default AccountSetupScreen