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
import { useUserStore } from "../../stores/UserStore"// Assuming you have an AuthContext

const StudentCoursesScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = searchQuery
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [sortBy, setSortBy] = useState("popular")

  const { user } = useUserStore() // Get current user
  const {
    useEnrolledCourses, // <-- Correct hook for user's purchased courses
    useRecommendedCourses,
    useAllCourses,
    useSearchCourses, // <-- Hook for Elasticsearch
    useOnSaleCourses, // <-- Hook for discounted courses
    useTeacherCourses, // <-- Hook for P2P courses
    useCourseCategories, // <-- Hook for dynamic categories
    useCourseLevels, // <-- Hook for dynamic levels
  } = useCourses()

  // 1. Fetch user's enrolled courses (My Purchased Courses)
  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled,
  } = useEnrolledCourses({ userId: user?.userId, page: 0, size: 20 })

  // 2. Fetch recommended courses
  const {
    data: recommendedCourses,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useRecommendedCourses(user?.userId, 10)

  // 3. Fetch courses on sale
  const {
    data: onSaleData,
    isLoading: onSaleLoading,
    refetch: refetchOnSale,
  } = useOnSaleCourses(0, 10)

  // 4. Fetch P2P courses (courses this user is selling)
  const {
    data: myP2PCoursesData,
    isLoading: myP2PLoading,
    refetch: refetchMyP2P,
  } = useTeacherCourses(user?.userId, 0, 10)

  // 5. Fetch dynamic filters
  const { data: categoriesData } = useCourseCategories()
  const { data: levelsData } = useCourseLevels()

  // --- Search Logic ---
  const isSearching = debouncedSearchQuery.length > 2

  // 6. Fetch search results (if user is searching)
  const {
    data: searchResultsData,
    isLoading: searchLoading,
    refetch: refetchSearch,
  } = useSearchCourses(debouncedSearchQuery, 0, 20, {
    enabled: isSearching,
  })

  // 7. Fetch all other courses (if not searching)
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
        return "popularity" // You might need a "popularity" field in BE
    }
  }, [sortBy])

  const sortOrder = useMemo(() => {
    if (sortBy === "price_high" || sortBy === "newest") return "desc"
    return "asc"
  }, [sortBy])

  const {
    data: allCoursesData,
    isLoading: allLoading,
    refetch: refetchAll,
  } = useAllCourses({
    page: 0,
    size: 20,
    // title: isSearching ? undefined : searchQuery, // <-- Removed, handled by useSearchCourses
    sortBy: sortField,
    sortOrder,
    // Add category/level filters if backend supports them
    // category: selectedCategory === "All" ? undefined : selectedCategory,
    // level: selectedLevel === "" ? undefined : selectedLevel,
  })
  
  // --- Processed Data Lists ---
  const enrolledCourses = enrolledData?.data || [] // These are CourseEnrollment objects
  const onSaleCourses = onSaleData?.data || [] // These are CourseDiscount objects
  const myP2PCourses = myP2PCoursesData?.data || [] // These are Course objects
  
  // Use search results if available, otherwise use all courses
  const allCourses = (isSearching ? searchResultsData?.data : allCoursesData?.data) || []

  // Client-side filtering (if BE doesn't support it on /api/courses)
  // This is less efficient but matches your old code logic
  const filteredCourses = allCourses.filter((c) => {
    const categoryMatches = selectedCategory === "All" || (c.category || "").includes(selectedCategory)
    const levelMatches = !selectedLevel || (c.difficultyLevel || "").toLowerCase() === selectedLevel.toLowerCase()
    return categoryMatches && levelMatches
  })

  // --- Dynamic Filter Options ---
  const categories = useMemo(() => ["All", ...(categoriesData || [])], [categoriesData])
  const levels = useMemo(() => ["", ...(levelsData || [])], [levelsData]) // "" for "All Levels"
  const sortOptions = [
    { value: "popular", label: t("courses.sortBy.popular") },
    { value: "newest", label: t("courses.sortBy.newest") },
    { value: "price_low", label: t("courses.sortBy.priceLow") },
    { value: "price_high", label: t("courses.sortBy.priceHigh") },
    { value: "rating", label: t("courses.sortBy.rating") },
  ]

  const isLoading = enrolledLoading || recommendedLoading || allLoading || onSaleLoading || myP2PLoading || (isSearching && searchLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchEnrolled(),
      refetchRecommended(),
      refetchOnSale(),
      refetchMyP2P(),
      isSearching ? refetchSearch() : refetchAll(),
    ])
    setIsRefreshing(false)
  }

  const handleCoursePress = (course, isPurchased = false) => {
    const safeCourse = { ...course, courseId: course.courseId || course.id }
    navigation.navigate("CourseDetails", { course: safeCourse, isPurchased })
  }

  // This function is now more of a safety/normalization layer
  const mapCourseFields = (course) => ({
    id: course.courseId,
    title: course.title,
    image: course.thumbnailUrl,
    instructor: course.creatorName || "N/A",
    isFree: course.type === "FREE",
    price: course.price,
    originalPrice: course.originalPrice,
    rating: course.rating ?? 0,
    students: course.students ?? 0,
    level: course.difficultyLevel || "",
    duration: course.duration || "",
    progress: course.progress ?? 0, // This data would come from the enrollment object
    completedLessons: course.completedLessons ?? 0,
    totalLessons: course.totalLessons ?? 0,
    discount: course.discount,
  })
  
  // --- Render Function ---
  const renderCourseCard = (rawCourse, isPurchased = false, isRecommended = false) => {
    // Normalize data
    const course = mapCourseFields(rawCourse)

    // Get progress if it's an enrolled course
    let progress = 0
    let completedLessons = 0
    let totalLessons = course.totalLessons || 0
    if (isPurchased && rawCourse.status) { // rawCourse is an Enrollment object
      // Assuming enrollment DTO has progress fields
      progress = rawCourse.progressPercent || 0 
      completedLessons = rawCourse.completedLessons || 0
    }
    
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

        {course.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{course.discount}% OFF</Text>
          </View>
        )}

        {course.isFree && !course.discount && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>{t("courses.free")}</Text>
          </View>
        )}

        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.courseInstructor}>by {course.instructor}</Text>

          <View style={styles.courseStats}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
              <Text style={styles.studentsText}>({(course.students || 0).toLocaleString()})</Text>
            </View>
            <View style={styles.courseMeta}>
              <Text style={styles.levelText}>{course.level}</Text>
            </View>
          </View>

          {isPurchased ? (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {t("courses.progress")}: {progress}%
                </Text>
                <Text style={styles.lessonsText}>
                  {completedLessons}/{totalLessons} {t("courses.lessons")}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
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

  if (isLoading && !enrolledCourses.length && !filteredCourses.length) {
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

      {/* TODO: Add components for selecting Level and SortBy */}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
        }
      >
        {/* 1. My Purchased Courses */}
        {enrolledCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.myPurchasedCourses")}</Text>
            {/* Note: We map enrollment.course */}
            {enrolledCourses.map((enrollment) => renderCourseCard(enrollment.course, true))}
          </View>
        )}

        {/* 2. My P2P Courses for Sale */}
        {myP2PCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.myP2PCourses")}</Text>
            {myP2PCourses.map((course) => renderCourseCard(course, false))}
          </View>
        )}

        {/* 3. Courses on Sale */}
        {onSaleCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.onSale")}</Text>
            {/* Note: We map discount.course */}
            {onSaleCourses.map((discount) => renderCourseCard(discount.course, false, true))}
          </View>
        )}

        {/* 4. Recommended Courses */}
        {recommendedCourses && recommendedCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("courses.recommendedForYou")}</Text>
            {recommendedCourses.map((course) => renderCourseCard(course, false, true))}
          </View>
        )}

        {/* 5. All Courses / Search Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSearching ? t("courses.searchResults") : t("courses.allCourses")}</Text>
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

// Styles (unchanged from your provided file)
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
    textTransform: "capitalize", // Added
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

function useDebounce(searchQuery: string, arg1: number) {
  throw new Error("Function not implemented.")
}
