import React, { useRef, useState, useEffect } from "react"
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore, CallPreferences } from "../../stores/appStore" // IMPORT CallPreferences type từ store
import instance from "../../api/axiosClient"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { InterestResponse, LanguageResponse } from "../../types/dto"
import { AgeRange } from "../../types/enums"

const languageFlags: { [key: string]: string } = {
  en: "🇺🇸",
  zh: "🇨🇳",
  vi: "🇻🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪",
}

const CallSetupScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { callPreferences: savedPreferences, setCallPreferences } = useAppStore()

  const defaultPreferences: CallPreferences = {
    interests: [],
    gender: "any",
    nativeLanguage: user?.nativeLanguageCode || "en",
    learningLanguage: user?.languages?.[0] || "vi",
    ageRange: (user?.ageRange || AgeRange.AGE_18_24) as AgeRange,
    callDuration: "15",
  }

  const [preferences, setPreferences] = useState<CallPreferences>(
    savedPreferences || defaultPreferences
  )

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const { data: interestsData, isLoading: isLoadingInterests } = useQuery<InterestResponse[]>({
    queryKey: ["interests"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/interests")
      return response.data.result
    },
  })

  const interests = interestsData || []

  const { data: languagesData, isLoading: isLoadingLanguages } = useQuery<LanguageResponse[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/languages")
      return response.data.result
    },
  })

  const languages = languagesData || []

  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences)
    } else {
      setPreferences((prev) => ({
        ...prev,
        nativeLanguage: user?.nativeLanguageCode || "en",
        learningLanguage: user?.languages?.[0] || "vi",
        ageRange: (user?.ageRange || AgeRange.AGE_18_24) as AgeRange,
      }))
    }
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
  }, [savedPreferences, user, fadeAnim, slideAnim])


  const genderOptions = [
    { value: "any", label: t("call.genderAny"), icon: "people" },
    { value: "male", label: t("call.genderMale"), icon: "man" },
    { value: "female", label: t("call.genderFemale"), icon: "woman" },
  ]
  const ageRanges = [
    { value: AgeRange.AGE_18_24, label: t("call.age18to25") },
    { value: AgeRange.AGE_25_34, label: t("call.age26to35") },
    { value: AgeRange.AGE_35_44, label: t("call.age36to45") },
    { value: AgeRange.AGE_45_54, label: t("call.age46plus") },
  ]
  const callDurations = [
    { value: "5", label: t("call.duration5min") },
    { value: "15", label: t("call.duration15min") },
    { value: "30", label: t("call.duration30min") },
    { value: "60", label: t("call.duration1hour") },
  ]

  const toggleInterest = (interestId: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  const updatePreference = (key: keyof CallPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const startSearch = () => {
    if (preferences.interests.length === 0) {
      Alert.alert(t("call.selectInterests"), t("call.selectInterestsMessage"))
      return
    }
    setCallPreferences(preferences)
    navigation.navigate("CallSearchScreen", { preferences })
  }

  const renderInterestItem = (interest: InterestResponse) => {
    const isSelected = preferences.interests.includes(interest.interestId)
    const color = interest.color || "#6B7280"
    return (
      <TouchableOpacity
        key={interest.interestId}
        style={[
          styles.interestItem,
          isSelected && { backgroundColor: `${color}20`, borderColor: color },
        ]}
        onPress={() => toggleInterest(interest.interestId)}
      >
        <Icon name={(interest.icon || "star") as any} size={20} color={isSelected ? color : "#6B7280"} />
        <Text style={[styles.interestText, isSelected && { color: color, fontWeight: "600" }]}>
          {interest.interestName}
        </Text>
        {isSelected && <Icon name="check-circle" size={16} color={color} />}
      </TouchableOpacity>
    )
  }

  const renderLanguageOption = (
    language: LanguageResponse,
    selectedLanguage: string,
    onSelect: (code: string) => void,
  ) => (
    <TouchableOpacity
      key={language.languageCode}
      style={[styles.languageOption, selectedLanguage === language.languageCode && styles.selectedLanguageOption]}
      onPress={() => onSelect(language.languageCode)}
    >
      <Text style={styles.languageFlag}>{languageFlags[language.languageCode] || '🌐'}</Text>
      <Text style={[styles.languageText, selectedLanguage === language.languageCode && styles.selectedLanguageText]}>
        {language.languageName}
      </Text>
    </TouchableOpacity>
  )

  const renderOptionButton = (
    options: Array<{ [key: string]: any; label: string; icon?: string }>,
    selectedValue: string,
    onSelect: (value: string) => void,
    keyExtractor = "value",
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option[keyExtractor]}
          style={[styles.optionButton, selectedValue === option[keyExtractor] && styles.selectedOptionButton]}
          onPress={() => onSelect(option[keyExtractor])}
        >
          {option.icon && (
            <Icon name={option.icon} size={18} color={selectedValue === option[keyExtractor] ? "#FFFFFF" : "#6B7280"} />
          )}
          <Text
            style={[styles.optionButtonText, selectedValue === option[keyExtractor] && styles.selectedOptionButtonText]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const selectedNativeLanguageName = languages.find((l) => l.languageCode === preferences.nativeLanguage)?.languageName || preferences.nativeLanguage
  const selectedLearningLanguageName = languages.find((l) => l.languageCode === preferences.learningLanguage)?.languageName || preferences.learningLanguage
  const selectedGenderLabel = genderOptions.find((g) => g.value === preferences.gender)?.label
  const selectedDurationLabel = callDurations.find((d) => d.value === preferences.callDuration)?.label

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("call.setupTitle")}</Text>
        <View style={styles.placeholder} />
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
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>{t("call.findPartner")}</Text>
            <Text style={styles.welcomeText}>{t("call.setupDescription")}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.commonInterests")}</Text>
            <Text style={styles.sectionSubtitle}>
              {t("call.selectTopics", { count: preferences.interests.length })}
            </Text>
            {isLoadingInterests ? <ActivityIndicator /> :
              <View style={styles.interestsGrid}>{interests.map(renderInterestItem)}</View>
            }
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerGender")}</Text>
            {renderOptionButton(genderOptions, preferences.gender, (value) => updatePreference("gender", value))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerNativeLanguage")}</Text>
            {isLoadingLanguages ? <ActivityIndicator /> :
              <View style={styles.languagesGrid}>
                {languages.map((lang) =>
                  renderLanguageOption(lang, preferences.nativeLanguage, (value) =>
                    updatePreference("nativeLanguage", value),
                  ),
                )}
              </View>
            }
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerLearningLanguage")}</Text>
            {isLoadingLanguages ? <ActivityIndicator /> :
              <View style={styles.languagesGrid}>
                {languages.map((lang) =>
                  renderLanguageOption(lang, preferences.learningLanguage, (value) =>
                    updatePreference("learningLanguage", value),
                  ),
                )}
              </View>
            }
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.ageRange")}</Text>
            {renderOptionButton(ageRanges, preferences.ageRange, (value) => updatePreference("ageRange", value))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.duration")}</Text>
            {renderOptionButton(callDurations, preferences.callDuration, (value) =>
              updatePreference("callDuration", value),
            )}
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>{t("call.searchSummary")}</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Icon name="interests" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.interestsSelected", { count: preferences.interests.length })}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="person" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.gender")}: {selectedGenderLabel}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="language" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.native")}:{" "}
                  {selectedNativeLanguageName}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="school" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.learning")}: {selectedLearningLanguageName}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="schedule" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.time")}: {selectedDurationLabel}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startButton, preferences.interests.length === 0 && styles.startButtonDisabled]}
            onPress={startSearch}
            disabled={preferences.interests.length === 0}
          >
            <Icon name="search" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {t("call.startSearch")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 6,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
    color: "#374151",
  },
  languagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 6,
    marginBottom: 8,
  },
  selectedLanguageOption: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedLanguageText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 6,
    marginBottom: 8,
  },
  selectedOptionButton: {
    borderColor: "#4F46E5",
    backgroundColor: "#4F46E5",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedOptionButtonText: {
    color: "#FFFFFF",
  },
  summarySection: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 12,
  },
  summaryContent: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default CallSetupScreen