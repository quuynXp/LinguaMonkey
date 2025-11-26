import React, { useState, useMemo } from "react"
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter"

import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type {
  CourseResponse,
  CourseEnrollmentResponse,
} from "../../types/dto"
import { SupportedCurrency } from "../../utils/currency"
import { createScaledSheet } from "../../utils/scaledStyles"

// --- Components ---

const CourseCard = ({
  course,
  navigation,
  t,
  isEnrolled,
  targetCurrency = "USD"
}: {
  course: CourseResponse | any, // using any to support enrollment wrapper
  navigation: any,
  t: any,
  isEnrolled: boolean,
  targetCurrency?: SupportedCurrency
}) => {
  const { convert, isLoading: isRatesLoading } = useCurrencyConverter()

  const version = course.latestPublicVersion || course.courseVersion // Handle both DTO shapes
  const lessons = version?.lessons || []
  const progress = isEnrolled ? 30 : 0 // Real app would pull this from enrollment DTO

  const priceDisplay = useMemo(() => {
    if (course.price === 0) return t("course.free")

    // Base is VND, convert to target
    const convertedAmount = convert(course.price, targetCurrency)

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
    }).format(convertedAmount)
  }, [course.price, targetCurrency, convert])

  const handlePress = () => {
    navigation.navigate("CourseDetailsScreen", { courseId: course.courseId })
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image
        source={{ uri: version?.thumbnailUrl || "https://via.placeholder.com/150" }}
        style={styles.thumbnail}
      />
      <View style={styles.infoContainer}>
        <View>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.lessonCount}>
            {t("course.totalLessons", { count: lessons.length })} • {course.difficultyLevel || "Beginner"}
          </Text>
        </View>

        {isEnrolled ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {progress}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.priceSection}>
            {isRatesLoading ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.price}>{priceDisplay}</Text>
            )}
            <View style={styles.enrollButton}>
              <Text style={styles.enrollButtonText}>
                {t("course.enroll")}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const FilterChip = ({ label, isSelected, onPress }: any) => (
  <TouchableOpacity
    style={[styles.chip, isSelected && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

// --- Main Screen ---

const StudentCoursesScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const userId = user?.userId

  // -- State --
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined)
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined)

  // -- Hooks --
  const {
    useEnrollments,
    useAllCourses,
    useCourseCategories,
    useCourseLevels,
  } = useCourses()

  // -- Data Fetching --

  // 1. Metadata for Filters
  const { data: categories = [] } = useCourseCategories()
  const { data: levels = [] } = useCourseLevels()
  const languages = ["vi", "en", "ja", "ko", "zh"] // Hardcoded common languages as API doesn't provide list yet

  // 2. Enrolled Courses (User's P2P Library)
  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled,
  } = useEnrollments({ userId, size: 50 }) // Fetch enough to check IDs

  const enrolledCourses = useMemo(() => {
    return (enrolledData?.data as CourseEnrollmentResponse[]) || []
  }, [enrolledData])

  // 3. Public Marketplace Courses
  const searchParams = {
    title: debouncedSearchQuery || undefined,
    categoryCode: selectedCategory,
    // Backend filter likely expects strict types, ensure mapping matches backend DTOs
    // Assuming backend uses same query params as defined in useAllCourses hook
    languageCode: selectedLanguage,
    // Filter by level/difficulty if supported by backend API param (added in context as 'type', needs alignment)
    // Based on provided context `useAllCourses` accepts `type`, but Repository has `difficulty_level`. 
    // We will assume `type` in hook maps to Category or Type, and Level filtering might be client-side if API is limited,
    // BUT the provided Controller has `searchCourses` but `getAllCourses` only has title, lang, type.
    // We will do Client-Side filtering for Level if API doesn't strictly support it in `getAllCourses` param list.
    page: 0,
    size: 20,
  }

  const {
    data: allCoursesData,
    isLoading: allCoursesLoading,
    refetch: refetchAllCourses,
  } = useAllCourses(searchParams)

  // -- Derived State --

  const marketCourses = useMemo(() => {
    const rawCourses = (allCoursesData?.data as CourseResponse[]) || []
    const enrolledIds = new Set(enrolledCourses.map((e) => e.courseId))

    // P2P Logic:
    // 1. Filter out courses user already owns
    // 2. Filter by Level (Client side if API param missing)
    return rawCourses.filter((c) => {
      const isOwned = enrolledIds.has(c.courseId)
      const matchLevel = selectedLevel ? c.difficultyLevel === selectedLevel : true
      return !isOwned && matchLevel
    })
  }, [allCoursesData, enrolledCourses, selectedLevel])

  const isLoading = enrolledLoading || allCoursesLoading

  const handleRefresh = () => {
    refetchEnrolled()
    refetchAllCourses()
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.headerContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={t("student.searchCoursesPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text)
                // Simple debounce simulation
                setTimeout(() => setDebouncedSearchQuery(text), 500)
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(""); setDebouncedSearchQuery("") }}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters ScrollView */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Clear Filters */}
            {(selectedCategory || selectedLevel || selectedLanguage) && (
              <TouchableOpacity
                style={styles.clearFilter}
                onPress={() => {
                  setSelectedCategory(undefined)
                  setSelectedLevel(undefined)
                  setSelectedLanguage(undefined)
                }}
              >
                <Icon name="filter-list-off" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* Categories */}
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                label={t(`categories.${cat.toLowerCase()}`) || cat}
                isSelected={selectedCategory === cat}
                onPress={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
              />
            ))}

            <View style={styles.divider} />

            {/* Levels */}
            {levels.map((lvl) => (
              <FilterChip
                key={lvl}
                label={lvl}
                isSelected={selectedLevel === lvl}
                onPress={() => setSelectedLevel(selectedLevel === lvl ? undefined : lvl)}
              />
            ))}

            <View style={styles.divider} />

            {/* Languages */}
            {languages.map((lang) => (
              <FilterChip
                key={lang}
                label={lang.toUpperCase()}
                isSelected={selectedLanguage === lang}
                onPress={() => setSelectedLanguage(selectedLanguage === lang ? undefined : lang)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.contentArea}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#4F46E5" />
          }
        >
          {/* Section 1: My Learning (Enrolled) */}
          {!debouncedSearchQuery && !selectedCategory && !selectedLevel && !selectedLanguage && enrolledCourses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="school" size={24} color="#4F46E5" />
                <Text style={styles.sectionTitle}>{t("student.enrolledCourses")}</Text>
              </View>
              {enrolledCourses.map((enrollment) => (
                <CourseCard
                  key={enrollment.enrollmentId}
                  course={{
                    courseId: enrollment.courseId,
                    title: enrollment.courseTitle,
                    price: 0,
                    latestPublicVersion: enrollment.courseVersionId, // Map enrollment version to standard shape
                    difficultyLevel: "Enrolled" // Or fetch from details
                  }}
                  navigation={navigation}
                  t={t}
                  isEnrolled={true}
                />
              ))}
            </View>
          )}

          {/* Section 2: Marketplace (P2P Public Courses) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="public" size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>
                {debouncedSearchQuery ? t("student.searchResults") : t("student.exploreCourses")}
              </Text>
            </View>

            {allCoursesLoading ? (
              <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : marketCourses.length > 0 ? (
              marketCourses.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  navigation={navigation}
                  t={t}
                  isEnrolled={false}
                  targetCurrency="USD" // Demo: Show prices in USD using convert hook
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="search-off" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t("student.noCoursesFound")}</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  filterWrapper: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  chipTextActive: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  clearFilter: {
    padding: 6,
    marginRight: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  contentArea: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
  },
  // Card Styles
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    resizeMode: "cover",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 22,
  },
  lessonCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  // Progress Styles
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  // Price Styles
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  enrollButton: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enrollButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Empty States
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
  },
  loader: {
    marginTop: 20,
  }
})

export default StudentCoursesScreen