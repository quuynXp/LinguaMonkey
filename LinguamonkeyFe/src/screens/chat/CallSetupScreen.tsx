import React, { useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore } from "../../stores/appStore"
import { useToast } from "../../hooks/useToast"
import instance from "../../api/axiosInstance"
import { createScaledSheet } from "../../utils/scaledStyles"

interface CallPreferences {
  interests: string[]
  gender: "any" | "male" | "female"
  nativeLanguage: string
  learningLanguage: string
  ageRange: string
  callDuration: string
}

const CallSetupScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation()
  const { user, setCallPreferences } = useAppStore()
  const { showToast } = useToast()

  const [preferences, setPreferences] = useState<CallPreferences>({
    interests: [],
    gender: "any",
    nativeLanguage: "en",
    learningLanguage: "vi",
    ageRange: "18-30",
    callDuration: "15",
  })

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const { data: interests = [] } = useQuery({
    queryKey: ["call-interests"],
    queryFn: async () => {
      const response = await instance.get("/call/interests")
      return response.data.interests
    },
  })

  // Fetch supported languages
  const { data: languages = [] } = useQuery({
    queryKey: ["call-languages"],
    queryFn: async () => {
      const response = await instance.get("/call/languages")
      return response.data.languages
    },
  })

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: CallPreferences) => {
      const response = await instance.post("/call/preferences", {
        ...prefs,
        userId: user?.userId,
      })
      return response.data
    },
    onSuccess: () => {
      setCallPreferences(preferences)
      navigation.navigate("CallSearch", { preferences })
    },
    onError: () => {
      showToast(t("call.savePreferencesError"), "error")
    },
  })

  const defaultInterests = [
    { id: "travel", name: t("interests.travel"), icon: "flight", color: "#3B82F6" },
    { id: "food", name: t("interests.food"), icon: "restaurant", color: "#EF4444" },
    { id: "music", name: t("interests.music"), icon: "music-note", color: "#8B5CF6" },
    { id: "sports", name: t("interests.sports"), icon: "sports-soccer", color: "#10B981" },
    { id: "movies", name: t("interests.movies"), icon: "movie", color: "#F59E0B" },
    { id: "books", name: t("interests.books"), icon: "menu-book", color: "#6B7280" },
    { id: "technology", name: t("interests.technology"), icon: "computer", color: "#06B6D4" },
    { id: "art", name: t("interests.art"), icon: "palette", color: "#EC4899" },
    { id: "business", name: t("interests.business"), icon: "business", color: "#84CC16" },
    { id: "culture", name: t("interests.culture"), icon: "public", color: "#F97316" },
  ]

  const defaultLanguages = [
    { code: "en", name: t("call.languages.en"), flag: "🇺🇸" },
    { code: "zh", name: t("call.languages.zh"), flag: "🇨🇳" },
    { code: "vi", name: t("call.languages.vi"), flag: "🇻🇳" },
    { code: "ja", name: t("call.languages.ja"), flag: "🇯🇵" },
    { code: "ko", name: t("call.languages.ko"), flag: "🇰🇷" },
    { code: "fr", name: t("call.languages.fr"), flag: "🇫🇷" },
    { code: "es", name: t("call.languages.es"), flag: "🇪🇸" },
    { code: "de", name: t("call.languages.de"), flag: "🇩🇪" },
  ]

  const genderOptions = [
    { value: "any", label: t("call.genderAny"), icon: "people" },
    { value: "male", label: t("call.genderMale"), icon: "man" },
    { value: "female", label: t("call.genderFemale"), icon: "woman" },
  ]

  const ageRanges = [
    { value: "18-25", label: t("call.age18to25") },
    { value: "26-35", label: t("call.age26to35") },
    { value: "36-45", label: t("call.age36to45") },
    { value: "46+", label: t("call.age46plus") },
  ]

  const callDurations = [
    { value: "5", label: t("call.duration5min") },
    { value: "15", label: t("call.duration15min") },
    { value: "30", label: t("call.duration30min") },
    { value: "60", label: t("call.duration1hour") },
  ]

  React.useEffect(() => {
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
  }, [])

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

    savePreferencesMutation.mutate(preferences)
  }

  const renderInterestItem = (interest: { id: string; name: string; icon: string; color: string }) => {
    const isSelected = preferences.interests.includes(interest.id)
    return (
      <TouchableOpacity
        key={interest.id}
        style={[
          styles.interestItem,
          isSelected && { backgroundColor: `${interest.color}20`, borderColor: interest.color },
        ]}
        onPress={() => toggleInterest(interest.id)}
      >
        <Icon name={interest.icon as any} size={20} color={isSelected ? interest.color : "#6B7280"} />
        <Text style={[styles.interestText, isSelected && { color: interest.color, fontWeight: "600" }]}>
          {interest.name}
        </Text>
        {isSelected && <Icon name="check-circle" size={16} color={interest.color} />}
      </TouchableOpacity>
    )
  }

  const renderLanguageOption = (
    language: { code: string; name: string; flag: string },
    selectedLanguage: string,
    onSelect: (code: string) => void,
  ) => (
    <TouchableOpacity
      key={language.code}
      style={[styles.languageOption, selectedLanguage === language.code && styles.selectedLanguageOption]}
      onPress={() => onSelect(language.code)}
    >
      <Text style={styles.languageFlag}>{language.flag}</Text>
      <Text style={[styles.languageText, selectedLanguage === language.code && styles.selectedLanguageText]}>
        {language.name}
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

  const displayInterests = interests.length > 0 ? interests : defaultInterests
  const displayLanguages = languages.length > 0 ? languages : defaultLanguages

  return (
    <View style={styles.container}>
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
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>{t("call.findPartner")}</Text>
            <Text style={styles.welcomeText}>{t("call.setupDescription")}</Text>
          </View>

          {/* Interests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.commonInterests")}</Text>
            <Text style={styles.sectionSubtitle}>
              {t("call.selectTopics", { count: preferences.interests.length })}
            </Text>
            <View style={styles.interestsGrid}>{displayInterests.map(renderInterestItem)}</View>
          </View>

          {/* Gender Preference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerGender")}</Text>
            <Text style={styles.sectionSubtitle}>{t("call.selectPartnerGender")}</Text>
            {renderOptionButton(genderOptions, preferences.gender, (value) => updatePreference("gender", value))}
          </View>

          {/* Native Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerNativeLanguage")}</Text>
            <Text style={styles.sectionSubtitle}>{t("call.findNativeSpeaker")}</Text>
            <View style={styles.languagesGrid}>
              {displayLanguages.map((lang) =>
                renderLanguageOption(lang, preferences.nativeLanguage, (value) =>
                  updatePreference("nativeLanguage", value),
                ),
              )}
            </View>
          </View>

          {/* Learning Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerLearningLanguage")}</Text>
            <Text style={styles.sectionSubtitle}>{t("call.findLearner")}</Text>
            <View style={styles.languagesGrid}>
              {displayLanguages.map((lang) =>
                renderLanguageOption(lang, preferences.learningLanguage, (value) =>
                  updatePreference("learningLanguage", value),
                ),
              )}
            </View>
          </View>

          {/* Age Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.ageRange")}</Text>
            <Text style={styles.sectionSubtitle}>{t("call.selectAgeRange")}</Text>
            {renderOptionButton(ageRanges, preferences.ageRange, (value) => updatePreference("ageRange", value))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.duration")}</Text>
            <Text style={styles.sectionSubtitle}>{t("call.expectedDuration")}</Text>
            {renderOptionButton(callDurations, preferences.callDuration, (value) =>
              updatePreference("callDuration", value),
            )}
          </View>

          {/* Summary */}
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
                  {t("call.gender")}: {genderOptions.find((g) => g.value === preferences.gender)?.label}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="language" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.nativeLanguage")}:{" "}
                  {displayLanguages.find((l) => l.code === preferences.nativeLanguage)?.name}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="school" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.learning")}: {displayLanguages.find((l) => l.code === preferences.learningLanguage)?.name}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="schedule" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.time")}: {callDurations.find((d) => d.value === preferences.callDuration)?.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Start Search Button */}
          <TouchableOpacity
            style={[styles.startButton, preferences.interests.length === 0 && styles.startButtonDisabled]}
            onPress={startSearch}
            disabled={preferences.interests.length === 0 || savePreferencesMutation.isPending}
          >
            <Icon name="search" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {savePreferencesMutation.isPending ? t("call.saving") : t("call.startSearch")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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