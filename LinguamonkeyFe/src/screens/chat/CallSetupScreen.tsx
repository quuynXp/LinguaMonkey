"use client"

import React, { useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
interface CallPreferences {
  interests: string[]
  gender: "any" | "male" | "female"
  nativeLanguage: string
  learningLanguage: string
  ageRange: string
  callDuration: string
}

const CallSetupScreen = ({ navigation }: { navigation: any }) => {
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

  const interests = [
    { id: "travel", name: "Du lịch", icon: "flight", color: "#3B82F6" },
    { id: "food", name: "Ẩm thực", icon: "restaurant", color: "#EF4444" },
    { id: "music", name: "Âm nhạc", icon: "music-note", color: "#8B5CF6" },
    { id: "sports", name: "Thể thao", icon: "sports-soccer", color: "#10B981" },
    { id: "movies", name: "Phim ảnh", icon: "movie", color: "#F59E0B" },
    { id: "books", name: "Sách", icon: "menu-book", color: "#6B7280" },
    { id: "technology", name: "Công nghệ", icon: "computer", color: "#06B6D4" },
    { id: "art", name: "Nghệ thuật", icon: "palette", color: "#EC4899" },
    { id: "business", name: "Kinh doanh", icon: "business", color: "#84CC16" },
    { id: "culture", name: "Văn hóa", icon: "public", color: "#F97316" },
  ]

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
  ]

  const genderOptions = [
    { value: "any", label: "Bất kỳ", icon: "people" },
    { value: "male", label: "Nam", icon: "man" },
    { value: "female", label: "Nữ", icon: "woman" },
  ]

  const ageRanges = [
    { value: "18-25", label: "18-25 tuổi" },
    { value: "26-35", label: "26-35 tuổi" },
    { value: "36-45", label: "36-45 tuổi" },
    { value: "46+", label: "46+ tuổi" },
  ]

  const callDurations = [
    { value: "5", label: "5 phút" },
    { value: "15", label: "15 phút" },
    { value: "30", label: "30 phút" },
    { value: "60", label: "1 giờ" },
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
      Alert.alert("Chọn sở thích", "Vui lòng chọn ít nhất một sở thích để tìm đối tác phù hợp.")
      return
    }

    navigation.navigate("CallSearch", { preferences })
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
        <Icon name={interest.MaterialIcons as any} size={20} color={isSelected ? interest.color : "#6B7280"} />
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
    onSelect: (code: string) => void
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
    keyExtractor: string = "value"
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option[keyExtractor]}
          style={[styles.optionButton, selectedValue === option[keyExtractor] && styles.selectedOptionButton]}
          onPress={() => onSelect(option[keyExtractor])}
        >
          {option.MaterialIcons && (
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
        <Text style={styles.headerTitle}>Thiết lập cuộc gọi</Text>
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
           
            <Text style={styles.welcomeTitle}>Tìm đối tác trò chuyện</Text>
            <Text style={styles.welcomeText}>Thiết lập thông tin để tìm người phù hợp cho cuộc gọi video</Text>
          </View>

          {/* Interests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sở thích chung</Text>
            <Text style={styles.sectionSubtitle}>
              Chọn các chủ đề bạn muốn trò chuyện ({preferences.interests.length} đã chọn)
            </Text>
            <View style={styles.interestsGrid}>{interests.map(renderInterestItem)}</View>
          </View>

          {/* Gender Preference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giới tính đối tác</Text>
            <Text style={styles.sectionSubtitle}>Chọn giới tính đối tác bạn muốn trò chuyện</Text>
            {renderOptionButton(genderOptions, preferences.gender, (value) => updatePreference("gender", value))}
          </View>

          {/* Native Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngôn ngữ mẹ đẻ của đối tác</Text>
            <Text style={styles.sectionSubtitle}>Tìm người có ngôn ngữ mẹ đẻ là ngôn ngữ bạn đang học</Text>
            <View style={styles.languagesGrid}>
              {languages.map((lang) =>
                renderLanguageOption(lang, preferences.nativeLanguage, (value) =>
                  updatePreference("nativeLanguage", value),
                ),
              )}
            </View>
          </View>

          {/* Learning Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngôn ngữ đối tác đang học</Text>
            <Text style={styles.sectionSubtitle}>Tìm người đang học cùng ngôn ngữ với bạn</Text>
            <View style={styles.languagesGrid}>
              {languages.map((lang) =>
                renderLanguageOption(lang, preferences.learningLanguage, (value) =>
                  updatePreference("learningLanguage", value),
                ),
              )}
            </View>
          </View>

          {/* Age Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Độ tuổi</Text>
            <Text style={styles.sectionSubtitle}>Chọn độ tuổi phù hợp</Text>
            {renderOptionButton(ageRanges, preferences.ageRange, (value) => updatePreference("ageRange", value))}
          </View>

          {/* Call Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thời gian cuộc gọi</Text>
            <Text style={styles.sectionSubtitle}>Thời gian dự kiến cho cuộc gọi</Text>
            {renderOptionButton(callDurations, preferences.callDuration, (value) =>
              updatePreference("callDuration", value),
            )}
          </View>

          {/* Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Tóm tắt tìm kiếm</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Icon name="interests" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>{preferences.interests.length} sở thích đã chọn</Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="person" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  Giới tính: {genderOptions.find((g) => g.value === preferences.gender)?.label}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="language" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  Ngôn ngữ mẹ đẻ: {languages.find((l) => l.code === preferences.nativeLanguage)?.name}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="school" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  Đang học: {languages.find((l) => l.code === preferences.learningLanguage)?.name}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Icon name="schedule" size={16} color="#4F46E5" />
                <Text style={styles.summaryText}>
                  Thời gian: {callDurations.find((d) => d.value === preferences.callDuration)?.label}
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
            <Text style={styles.startButtonText}>Bắt đầu tìm kiếm</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
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
  welcomeAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
