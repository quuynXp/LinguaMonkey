import React, { useRef, useState, useEffect } from "react"
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Image } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore, CallPreferences } from "../../stores/appStore"
import instance from "../../api/axiosClient"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { AgeRange } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

// Assuming you have a logo asset, if not, replace with Icon or text
// import Logo from "../../assets/images/logo.png" 

const languageFlags: Record<string, string> = {
  en: "🇺🇸",
  zh: "🇨🇳",
  vi: "🇻🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪",
}

const CallSetupScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { callPreferences: savedPreferences, setCallPreferences } = useAppStore()

  const defaultPreferences: CallPreferences = {
    interests: [],
    gender: "any",
    nativeLanguage: user?.languages?.[0] || "en",
    learningLanguage: user?.nativeLanguageCode || "vi",
    ageRange: (user?.ageRange || AgeRange.AGE_18_24) as string,
    callDuration: "15",
  }

  const [preferences, setPreferences] = useState(
    savedPreferences || defaultPreferences
  )

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const { data: interestsData, isLoading: isLoadingInterests } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/interests")
      return response.data.result
    },
  })

  const interests = Array.isArray(interestsData) ? interestsData : []

  const { data: languagesData, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const response = await instance.get("/api/v1/languages")
      return response.data.result
    },
  })

  const languages = Array.isArray(languagesData) ? languagesData : []

  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences)
    } else {
      setPreferences((prev) => ({
        ...prev,
        nativeLanguage: user?.languages?.[0] || "en",
        learningLanguage: user?.nativeLanguageCode || "vi",
        ageRange: (user?.ageRange || AgeRange.AGE_18_24),
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

  const toggleInterest = (interestId) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const startSearch = () => {
    if (preferences.interests.length === 0) {
      Alert.alert(t("call.selectInterests"), t("call.selectInterestsMessage"));
      return;
    }

    setCallPreferences(preferences);

    navigation.navigate("CallSearchScreen", { preferences });
  }

  const renderInterestItem = (interest) => {
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
        <Icon name={(interest.icon || "star")} size={20} color={isSelected ? color : "#6B7280"} />
        <Text style={[styles.interestText, isSelected && { color: color, fontWeight: "600" }]}>
          {interest.interestName}
        </Text>
        {isSelected && <Icon name="check-circle" size={16} color={color} />}
      </TouchableOpacity>
    )
  }

  const renderLanguageOption = (
    language,
    selectedLanguage,
    onSelect,
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
    options,
    selectedValue,
    onSelect,
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

  const selectedNativeLanguageFlag = languageFlags[preferences.nativeLanguage] || '🌐'
  const selectedLearningLanguageFlag = languageFlags[preferences.learningLanguage] || '🌐'

  return (
    <ScreenLayout style={styles.container}>
      {/* Clean Header with Logo only */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="language" size={32} color="#4F46E5" />
          <Text style={styles.logoText}>MonkeyLingua</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
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
          <Text style={styles.pageTitle}>{t("call.setupTitle")}</Text>
          <Text style={styles.pageSubtitle}>{t("call.setupDescription")}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.commonInterests")}</Text>
            {isLoadingInterests ? <ActivityIndicator /> :
              <View style={styles.interestsGrid}>{interests.map(renderInterestItem)}</View>
            }
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerGender")}</Text>
            {renderOptionButton(genderOptions, preferences.gender, (value) => updatePreference("gender", value))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("call.partnerNativeLanguage")}
              {` (${selectedNativeLanguageFlag} ${selectedNativeLanguageName})`}
            </Text>
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
            <Text style={styles.sectionTitle}>
              {t("call.partnerLearningLanguage")}
              {` (${selectedLearningLanguageFlag} ${selectedLearningLanguageName})`}
            </Text>
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

          <TouchableOpacity
            style={[styles.startButton, preferences.interests.length === 0 && styles.startButtonDisabled]}
            onPress={startSearch}
            disabled={preferences.interests.length === 0}
          >
            <Icon name="search" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {t("call.startSearch")}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  interestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  interestText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  languagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  selectedLanguageOption: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  languageFlag: {
    fontSize: 18,
  },
  languageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedLanguageText: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  selectedOptionButton: {
    borderColor: "#4F46E5",
    backgroundColor: "#4F46E5",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  selectedOptionButtonText: {
    color: "#FFFFFF",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 16,
  },
  startButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})

export default CallSetupScreen