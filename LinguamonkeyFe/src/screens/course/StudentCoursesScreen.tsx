import { useState, useMemo } from "react"
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { createScaledSheet } from "../../utils/scaledStyles"

const StudentCoursesScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [sortBy, setSortBy] = useState("popular")

  const { usePurchasedCourses, useRecommendedCourses, useAllCourses } = useCourses()

  const { data: purchasedData, isLoading: purchasedLoading, refetch: refetchPurchased } = usePurchasedCourses(0, 20)
  const {
    data: recommendedCourses,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useRecommendedCourses("", 10) 

  const sortField = useMemo(() => {
    switch (sortBy) {
      case "newest":
        return "createdAt"
      case "price_low":
      case "price_high":
        return "price"
      case "rating":
        return "rating"
      default:
        return "popularity"
    }
  }, [sortBy])

  const sortOrder = useMemo(() => {
    if (sortBy === "price_high") return "desc"
    if (sortBy === "newest") return "desc"
    return "asc"
  }, [sortBy])

  const { data: allCoursesData, isLoading: allLoading, refetch: refetchAll } = useAllCourses({
    page: 0,
    size: 20,
    title: searchQuery || undefined,
    sortBy: sortField,
    sortOrder,
  })

  const purchasedCourses = purchasedData?.data || []
  const allCourses = allCoursesData?.data || []

  // Client-side filtering for category/level because backend hook signature differs
  const filteredCourses = allCourses.filter((c) => {
    const categoryMatches = selectedCategory === "All" || (c.category || c.tags || "").toString().includes(selectedCategory)
    const levelMatches =
      !selectedLevel ||
      (c.difficultyLevel || c.level || "").toString().toLowerCase().includes(selectedLevel.toLowerCase())
    return categoryMatches && levelMatches
  })

  const categories = ["All", "Business", "Conversation", "Grammar", "Vocabulary", "Pronunciation", "Technology"]
  const levels = ["", "Beginner", "Intermediate", "Advanced"]
  const sortOptions = [
    { value: "popular", label: t("courses.sortBy.popular") },
    { value: "newest", label: t("courses.sortBy.newest") },
    { value: "price_low", label: t("courses.sortBy.priceLow") },
    { value: "price_high", label: t("courses.sortBy.priceHigh") },
    { value: "rating", label: t("courses.sortBy.rating") },
  ]

  const isLoading = purchasedLoading || recommendedLoading || allLoading
  const isRefreshing = false

  const handleRefresh = () => {
    refetchPurchased()
    refetchRecommended()
    refetchAll()
  }

  const handleCoursePress = (course, isPurchased = false) => {
    const safeCourse = { ...course, courseId: course.courseId || course.id }
    navigation.navigate("CourseDetails", { course: safeCourse, isPurchased })
  }

  const mapCourseFields = (course) => ({
    id: course.courseId || course.id,
    title: course.title || course.name,
    image: course.thumbnailUrl || course.image || null,
    instructor: course.creatorName || course.instructor || "",
    isFree: course.type === "FREE" || course.isFree || false,
    price: course.price,
    originalPrice: course.originalPrice,
    rating: course.rating ?? 0,
    students: course.students ?? 0,
    level: course.difficultyLevel || course.level || "",
    duration: course.duration || "",
    progress: course.progress ?? 0,
    completedLessons: course.completedLessons ?? 0,
    totalLessons: course.totalLessons ?? 0,
    discount: course.discount,
  })

  const renderCourseCard = (rawCourse, isPurchased = false, isRecommended = false) => {
    const course = mapCourseFields(rawCourse)
    return (
      <TouchableOpacity
        key={course.id}
        style={[styles.courseCard, isPurchased && styles.purchasedCourseCard]}
        onPress={() => handleCoursePress(rawCourse, isPurchased)}
      >
        {course.image ? (
          <Image source={{ uri: course.image }} style={styles.courseImage} />
        ) : (
          <View style={[styles.courseImage, { justifyContent: "center", alignItems: "center" }]}>
            <Icon name="menu-book" size={40} color="#9CA3AF" />
          </View>
        )}

        {isPurchased && (
          <View style={styles.purchasedBadge}>
            <Icon name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.purchasedText}>{t("courses.purchased")}</Text>
          </View>
        )}

        {isRecommended && course.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{course.discount}% OFF</Text>
          </View>
        )}

        {course.isFree && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>{t("courses.free")}</Text>
          </View>
        )}

        <View style={styles.courseContent}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseInstructor}>by {course.instructor}</Text>

          <View style={styles.courseStats}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{course.rating}</Text>
              <Text style={styles.studentsText}>({(course.students || 0).toLocaleString()})</Text>
            </View>
            <View style={styles.courseMeta}>
              <Text style={styles.levelText}>{course.level}</Text>
              <Text style={styles.durationText}>{course.duration}</Text>
            </View>
          </View>

          {isPurchased ? (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {t("courses.progress")}: {course.progress || 0}%
                </Text>
                <Text style={styles.lessonsText}>
                  {course.completedLessons || 0}/{course.totalLessons || 0} {t("courses.lessons")}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${course.progress || 0}%` }]} />
              </View>
              <TouchableOpacity style={styles.continueButton}>
                <Text style={styles.continueButtonText}>{t("courses.continueLearning")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.priceSection}>
              {course.originalPrice && <Text style={styles.originalPrice}>${course.originalPrice}</Text>}
              <Text style={styles.price}>{course.isFree ? t("courses.free") : `$${course.price ?? 0}`}</Text>
              <TouchableOpacity
                style={styles.enrollButton}
                onPress={() => {
                  if (course.isFree) {
                    handleCoursePress(rawCourse, false)
                  } else {
                    navigation.navigate("PaymentScreen", { course: rawCourse })
                  }
                }}
              >
                <Text style={styles.enrollButtonText}>
                  {course.isFree ? t("courses.startLearning") : t("courses.enrollNow")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (isLoading && !purchasedCourses.length && !filteredCourses.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("courses.title")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("CourseFilters")}>
          <Icon name="filter-list" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("courses.searchPlaceholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.selectedCategoryChip]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>
              {t(`courses.categories.${category.toLowerCase()}`) || category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="sort" size={16} color="#6B7280" />
          <Text style={styles.filterButtonText}>{t("courses.sortBy.title")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => {}}>
          <Icon name="school" size={16} color="#6B7280" />
          <Text style={styles.filterButtonText}>{t("courses.level")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
        }
      >
        {purchasedCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.myPurchasedCourses")}</Text>
            {purchasedCourses.map((course) => renderCourseCard(course, true))}
          </View>
        )}

        {recommendedCourses && recommendedCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.recommendedForYou")}</Text>
            {recommendedCourses.map((course) => renderCourseCard(course, false, true))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("courses.allCourses")}</Text>
          {filteredCourses.map((course) => renderCourseCard(course))}
        </View>

        {!isLoading && filteredCourses.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="school" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t("courses.noCoursesFound")}</Text>
            <Text style={styles.emptyMessage}>{t("courses.tryDifferentSearch")}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  categoryContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedCategoryChip: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  purchasedCourseCard: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  courseImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
  },
  purchasedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  purchasedText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  freeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  courseContent: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  courseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 4,
  },
  studentsText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  courseMeta: {
    alignItems: "flex-end",
  },
  levelText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
  },
  durationText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  lessonsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  continueButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  originalPrice: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  enrollButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enrollButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
})

export default StudentCoursesScreen
