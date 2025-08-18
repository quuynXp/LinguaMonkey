"use client"

import * as Localization from "expo-localization"
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type SetupInitScreenProps = {
  navigation: NativeStackNavigationProp<any>
}

const SetupInitScreen = ({ navigation }: SetupInitScreenProps) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  // User customization data
  type Character = {
    id: number
    name: string
    avatar: string
    model: string
    personality: string
  }
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [accountName, setAccountName] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState("")
  const [targetLanguages, setTargetLanguages] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<number[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Available 3D characters
  const characters = [
    { id: 1, name: "Alex", avatar: "🦊", model: "fox-character.json", personality: "Adventurous" },
    { id: 2, name: "Luna", avatar: "🐨", model: "koala-character.json", personality: "Calm" },
    { id: 3, name: "Panda", avatar: "🐼", model: "panda-character.json", personality: "Friendly" },
    { id: 4, name: "Leo", avatar: "🦁", model: "lion-character.json", personality: "Confident" },
    { id: 5, name: "Sage", avatar: "🐸", model: "frog-character.json", personality: "Wise" },
    { id: 6, name: "Penny", avatar: "🐧", model: "penguin-character.json", personality: "Cheerful" },
    { id: 7, name: "Bella", avatar: "🦋", model: "butterfly-character.json", personality: "Creative" },
    { id: 8, name: "Ollie", avatar: "🐙", model: "octopus-character.json", personality: "Smart" },
    { id: 9, name: "Nova", avatar: "🦄", model: "unicorn-character.json", personality: "Magical" },
    { id: 10, name: "Drake", avatar: "🐲", model: "dragon-character.json", personality: "Powerful" },
  ]

  // Available languages
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ar", name: "Arabic", flag: "🇸🇦" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
    { code: "th", name: "Thai", flag: "🇹🇭" },
  ]

  // Interest categories
  const interests = [
    { id: 1, name: "Travel", icon: "flight", color: "#3B82F6" },
    { id: 2, name: "Business", icon: "business", color: "#1F2937" },
    { id: 3, name: "Technology", icon: "computer", color: "#8B5CF6" },
    { id: 4, name: "Food & Cooking", icon: "restaurant", color: "#F59E0B" },
    { id: 5, name: "Sports", icon: "sports-soccer", color: "#10B981" },
    { id: 6, name: "Music", icon: "music-note", color: "#EF4444" },
    { id: 7, name: "Movies & TV", icon: "movie", color: "#F97316" },
    { id: 8, name: "Science", icon: "science", color: "#06B6D4" },
    { id: 9, name: "Art & Design", icon: "palette", color: "#EC4899" },
    { id: 10, name: "Health & Fitness", icon: "fitness-center", color: "#84CC16" },
    { id: 11, name: "Education", icon: "school", color: "#6366F1" },
    { id: 12, name: "Gaming", icon: "sports-esports", color: "#A855F7" },
  ]

  useEffect(() => {
    // Auto-detect system language
    const systemLocale = Localization.getLocales()[0]
    const systemLang = languages.find((lang) => lang.code === systemLocale.languageCode)
    if (systemLang) {
      setNativeLanguage(systemLang.code)
    }

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleNext = () => {
    if (currentStep === 1 && !selectedCharacter) {
      Alert.alert("Character Required", "Please select a character to continue.")
      return
    }
    if (currentStep === 2 && (!accountName.trim() || !nativeLanguage || targetLanguages.length === 0)) {
      Alert.alert("Information Required", "Please fill in all required fields.")
      return
    }
    if (currentStep === 3 && selectedInterests.length === 0) {
      Alert.alert("Interests Required", "Please select at least one interest.")
      return
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      // Start proficiency test
      navigation.navigate("ProficiencyTest", {
        userData: {
          character: selectedCharacter,
          accountName,
          nativeLanguage,
          targetLanguages,
          interests: selectedInterests,
        },
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigation.goBack()
    }
  }

  const toggleTargetLanguage = (langCode: string) => {
    if (targetLanguages.includes(langCode)) {
      setTargetLanguages(targetLanguages.filter((code) => code !== langCode))
    } else {
      setTargetLanguages([...targetLanguages, langCode])
    }
  }

  const toggleInterest = (interestId: number) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter((id) => id !== interestId))
    } else {
      setSelectedInterests([...selectedInterests, interestId])
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepText, currentStep >= step && styles.stepTextActive]}>{step}</Text>
          </View>
          {step < 4 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  )

  const renderCharacterSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Your Learning Companion</Text>
      <Text style={styles.stepSubtitle}>Select a 3D character that will guide you through your learning journey</Text>

      <ScrollView style={styles.charactersGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.charactersRow}>
          {characters.map((character) => (
            <TouchableOpacity
              key={character.id}
              style={[styles.characterCard, selectedCharacter?.id === character.id && styles.characterCardSelected]}
              onPress={() => setSelectedCharacter(character)}
            >
              <Text style={styles.characterAvatar}>{character.avatar}</Text>
              <Text style={styles.characterName}>{character.name}</Text>
              <Text style={styles.characterPersonality}>{character.personality}</Text>
              {selectedCharacter?.id === character.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
      <Text style={styles.stepSubtitle}>Help us personalize your learning experience</Text>

      {/* Account Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Account Name *</Text>
        <TextInput
          style={styles.textInput}
          value={accountName}
          onChangeText={setAccountName}
          placeholder="Enter your preferred name"
          maxLength={20}
        />
      </View>

      {/* Native Language */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Native Language *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageChip, nativeLanguage === lang.code && styles.languageChipSelected]}
              onPress={() => setNativeLanguage(lang.code)}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={[styles.languageText, nativeLanguage === lang.code && styles.languageTextSelected]}>
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Target Languages */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Languages to Learn * ({targetLanguages.length} selected)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {languages
            .filter((lang) => lang.code !== nativeLanguage)
            .map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageChip, targetLanguages.includes(lang.code) && styles.languageChipSelected]}
                onPress={() => toggleTargetLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageText, targetLanguages.includes(lang.code) && styles.languageTextSelected]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  )

  const renderInterests = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What Are Your Interests?</Text>
      <Text style={styles.stepSubtitle}>
        We'll customize content based on your interests ({selectedInterests.length} selected)
      </Text>

      <View style={styles.interestsGrid}>
        {interests.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestCard,
              selectedInterests.includes(interest.id) && styles.interestCardSelected,
              { borderColor: interest.color },
            ]}
            onPress={() => toggleInterest(interest.id)}
          >
            <Icon
              name={interest.icon}
              size={24}
              color={selectedInterests.includes(interest.id) ? "#FFFFFF" : interest.color}
            />
            <Text style={[styles.interestText, selectedInterests.includes(interest.id) && styles.interestTextSelected]}>
              {interest.name}
            </Text>
            {selectedInterests.includes(interest.id) && (
              <View style={styles.interestSelectedIndicator}>
                <Icon name="check" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ready to Start Learning!</Text>
      <Text style={styles.stepSubtitle}>Review your choices before taking the proficiency test</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Character:</Text>
          <View style={styles.summaryValue}>
            <Text style={styles.summaryCharacter}>{selectedCharacter?.avatar}</Text>
            <Text style={styles.summaryText}>{selectedCharacter?.name}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryText}>{accountName}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Native Language:</Text>
          <Text style={styles.summaryText}>
            {languages.find((lang) => lang.code === nativeLanguage)?.flag}{" "}
            {languages.find((lang) => lang.code === nativeLanguage)?.name}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Learning:</Text>
          <View style={styles.summaryLanguages}>
            {targetLanguages.map((code) => {
              const lang = languages.find((l) => l.code === code)
              return (
                <Text key={code} style={styles.summaryLanguage}>
                  {lang?.flag} {lang?.name}
                </Text>
              )
            })}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Interests:</Text>
          <View style={styles.summaryInterests}>
            {selectedInterests.map((id) => {
              const interest = interests.find((i) => i.id === id)
              return (
                <Text key={id} style={styles.summaryInterest}>
                  {interest?.name}
                </Text>
              )
            })}
          </View>
        </View>
      </View>

      <View style={styles.nextStepInfo}>
        <Icon name="quiz" size={24} color="#4F46E5" />
        <Text style={styles.nextStepText}>Next: Take a quick proficiency test to determine your starting level</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Start Setup</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderCharacterSelection()}
          {currentStep === 2 && renderBasicInfo()}
          {currentStep === 3 && renderInterests()}
          {currentStep === 4 && renderSummary()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{currentStep === 4 ? "Take Proficiency Test" : "Continue"}</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#4F46E5",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  stepTextActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#4F46E5",
  },
  scrollContent: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  charactersGrid: {
    maxHeight: 400,
  },
  charactersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  characterCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  characterCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  characterAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  characterName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  characterPersonality: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  languageScroll: {
    flexDirection: "row",
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  languageChipSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  languageFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  languageText: {
    fontSize: 14,
    color: "#374151",
  },
  languageTextSelected: {
    color: "#FFFFFF",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  interestCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    position: "relative",
  },
  interestCardSelected: {
    backgroundColor: "#4F46E5",
  },
  interestText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  interestTextSelected: {
    color: "#FFFFFF",
  },
  interestSelectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    width: 100,
  },
  summaryValue: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryCharacter: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  summaryLanguages: {
    flex: 1,
  },
  summaryLanguage: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryInterests: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryInterest: {
    fontSize: 12,
    color: "#4F46E5",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  nextStepInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
  },
  nextStepText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  navigationButtons: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default SetupInitScreen
