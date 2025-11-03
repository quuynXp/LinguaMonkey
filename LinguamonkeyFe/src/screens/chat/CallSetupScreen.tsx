// src/screens/CallSetupScreen.tsx
// (Hoàn chỉnh - Thay thế mock data bằng useQuery)

import React, { useRef, useState } from "react"
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppStore } from "../../stores/appStore"
import instance from "../../api/axiosInstance"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useUserStore } from "../../stores/UserStore"

interface CallPreferences {
  interests: string[]
  gender: "any" | "male" | "female"
  nativeLanguage: string
  learningLanguage: string
  ageRange: string
  callDuration: string
}

type ApiInterest = {
  interest_id: string;
  interest_name: string;
  icon: string;
  color: string;
};
type ApiLanguage = {
  language_code: string;
  language_name: string;
};

const languageFlags: { [key: string]: string } = {
  en: "🇺🇸",
  zh: "🇨🇳",
  vi: "🇻🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪",
};

const CallSetupScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation()
  const { user } = useUserStore(); 
  const { setCallPreferences } = useAppStore();

  const [preferences, setPreferences] = useState<CallPreferences>({
    interests: [],
    gender: "any",
    nativeLanguage: user?.nativeLanguageId || "en", // Lấy từ userStore
    learningLanguage: "vi",
    ageRange: "18-30",
    callDuration: "15",
  })

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // --- THAY THẾ MOCK BẰNG API ---
  const { data: interests = [], isLoading: isLoadingInterests } = useQuery<ApiInterest[]>({
    queryKey: ["interests"],
    queryFn: async () => {
      // API này đã có trong schema (bảng interests)
      const response = await instance.get("/api/v1/interests");
      return response.data.result; // Dựa theo AppApiResponse
    },
  });

  const { data: languages = [], isLoading: isLoadingLanguages } = useQuery<ApiLanguage[]>({
    queryKey: ["languages"],
    queryFn: async () => {
      // API này đã có trong schema (bảng languages)
      const response = await instance.get("/api/v1/languages");
      return response.data.result;
    },
  });
  
  // Xóa bỏ savePreferencesMutation, logic này sẽ nằm ở CallSearchScreen

  // Options (từ file cũ)
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
    // Lưu preferences vào appStore và điều hướng
    setCallPreferences(preferences); // Lưu vào Zustand
    navigation.navigate("CallSearch", { preferences }); // Truyền qua params
  }

  const renderInterestItem = (interest: ApiInterest) => {
    const isSelected = preferences.interests.includes(interest.interest_id)
    const color = interest.color || "#6B7280";
    return (
      <TouchableOpacity
        key={interest.interest_id}
        style={[
          styles.interestItem,
          isSelected && { backgroundColor: `${color}20`, borderColor: color },
        ]}
        onPress={() => toggleInterest(interest.interest_id)}
      >
        <Icon name={(interest.icon || "star") as any} size={20} color={isSelected ? color : "#6B7280"} />
        <Text style={[styles.interestText, isSelected && { color: color, fontWeight: "600" }]}>
          {interest.interest_name}
        </Text>
        {isSelected && <Icon name="check-circle" size={16} color={color} />}
      </TouchableOpacity>
    )
  }

  const renderLanguageOption = (
    language: ApiLanguage,
    selectedLanguage: string,
    onSelect: (code: string) => void,
  ) => (
    <TouchableOpacity
      key={language.language_code}
      style={[styles.languageOption, selectedLanguage === language.language_code && styles.selectedLanguageOption]}
      onPress={() => onSelect(language.language_code)}
    >
      <Text style={styles.languageFlag}>{languageFlags[language.language_code] || '🌐'}</Text>
      <Text style={[styles.languageText, selectedLanguage === language.language_code && styles.selectedLanguageText]}>
        {language.language_name}
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
            {isLoadingInterests ? <ActivityIndicator/> : 
              <View style={styles.interestsGrid}>{interests.map(renderInterestItem)}</View>
            }
          </View>

          {/* Gender Preference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerGender")}</Text>
            {renderOptionButton(genderOptions, preferences.gender, (value) => updatePreference("gender", value as any))}
          </View>

          {/* Native Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerNativeLanguage")}</Text>
            {isLoadingLanguages ? <ActivityIndicator/> :
              <View style={styles.languagesGrid}>
                {languages.map((lang) =>
                  renderLanguageOption(lang, preferences.nativeLanguage, (value) =>
                    updatePreference("nativeLanguage", value),
                  ),
                )}
              </View>
            }
          </View>

          {/* Learning Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("call.partnerLearningLanguage")}</Text>
            {isLoadingLanguages ? <ActivityIndicator/> :
              <View style={styles.languagesGrid}>
                {languages.map((lang) =>
                  renderLanguageOption(lang, preferences.learningLanguage, (value) =>
                    updatePreference("learningLanguage", value),
                  ),
                )}
              </View>
            }
          </View>

          {/* Age Range */}
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
                  {t("call.native")}:{" "}
                  {languages.find((l) => l.language_code === preferences.nativeLanguage)?.language_name}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="school" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  {t("call.learning")}: {languages.find((l) => l.language_code === preferences.learningLanguage)?.language_name}
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
            disabled={preferences.interests.length === 0}
          >
            <Icon name="search" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {t("call.startSearch")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// Dán styles từ file 'CallSetupScreen.ts' cũ của bạn vào đây
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
});

export default CallSetupScreen;