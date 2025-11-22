import { useState, useMemo } from "react"
import {
  Image,
  ScrollView,
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
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type {
  CourseResponse,
  CourseEnrollmentResponse,
  LessonSummaryResponse,
} from "../../types/dto"
import { DifficultyLevel } from "../../types/enums"

const CourseCard = ({ course, navigation, t, isEnrolled }: any) => {
  const version = course.latestPublicVersion
  const lessons = version?.lessons || []
  const progress = isEnrolled ? 30 : 0

  const handlePress = () => {
    navigation.navigate("CourseDetailsScreen", { courseId: course.courseId })
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image
        source={{ uri: version?.thumbnailUrl }}
        style={styles.thumbnail}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.lessonCount}>
          {t("course.totalLessons", { count: lessons.length })}
        </Text>

        {isEnrolled ? (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {t("course.progress", { progress: progress })}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <TouchableOpacity style={styles.continueButton}>
              <Text style={styles.continueButtonText}>
                {t("course.continue")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.priceSection}>
            <Text style={styles.price}>
              {course.price === 0 ? t("course.free") : `${course.price}đ`}
            </Text>
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

const StudentCoursesScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All") // "All" or a categoryCode string
  const [selectedLevel, setSelectedLevel] = useState("")
  const [sortBy, setSortBy] = useState("popular")

  const { user } = useUserStore()
  const userId = user?.userId

  const {
    useEnrollments,
    useAllCourses,
    useCourseCategories, // New hook for dynamic categories
    useCourseLevels,
  } = useCourses()

  // Fetch dynamic categories (no mocking)
  const { data: categoryCodes = [], isLoading: categoriesLoading } = useCourseCategories()
  const COURSE_CATEGORIES = useMemo(() => ["All", ...categoryCodes], [categoryCodes])

  // 1. Fetch Enrolled Courses
  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled,
  } = useEnrollments({ userId })
  const enrolledCourses = useMemo(() => {
    return (enrolledData?.data as CourseEnrollmentResponse[]) || []
  }, [enrolledData])

  // 2. Fetch All/Search Courses
  const isSearching = searchQuery.length > 0
  const searchParams = {
    title: debouncedSearchQuery,
    categoryCode: selectedCategory === "All" ? undefined : selectedCategory, // Use categoryCode filter
    level: selectedLevel || undefined,
    sortBy,
    page: 0,
    size: 20,
  }

  const {
    data: allCoursesData,
    isLoading: allCoursesLoading,
    refetch: refetchAllCourses,
  } = useAllCourses(searchParams)

  const courses: CourseResponse[] = useMemo(() => {
    return (allCoursesData?.data as CourseResponse[]) || []
  }, [allCoursesData])

  const filterCourses = useMemo(() => {
    const enrolledIds = new Set(enrolledCourses.map((e) => e.courseId))
    return courses.filter((c) => !enrolledIds.has(c.courseId))
  }, [courses, enrolledCourses])

  const isLoading = enrolledLoading || allCoursesLoading || categoriesLoading

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("student.searchCoursesPlaceholder")}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text)
            setDebouncedSearchQuery(text)
          }}
        />

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color="#4F46E5" style={styles.categoryLoader} />
            ) : (
              COURSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category &&
                    styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category &&
                      styles.categoryButtonTextActive,
                    ]}
                  >
                    {t(`categories.${category.toLowerCase()}`)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.courseListArea}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetchEnrolled()
                refetchAllCourses()
              }}
              tintColor="#4F46E5"
            />
          }
        >
          {/* Section 1: Enrolled Courses */}
          <Text style={styles.sectionTitle}>
            {t("student.enrolledCourses")}
          </Text>
          {enrolledLoading ? (
            <ActivityIndicator style={styles.loader} size="small" color="#4F46E5" />
          ) : enrolledCourses.length > 0 ? (
            enrolledCourses.map((enrollment) => (
              <CourseCard
                key={enrollment.enrollmentId}
                course={{
                  courseId: enrollment.courseId,
                  title: enrollment.courseTitle,
                  price: 0,
                  creatorId: "",
                  approvalStatus: 1,
                  createdAt: "",
                }}
                navigation={navigation}
                t={t}
                isEnrolled={true}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("student.notEnrolled")}
              </Text>
            </View>
          )}

          {/* Section 2: All/Recommended Courses */}
          <Text style={styles.sectionTitle}>
            {isSearching || selectedCategory !== "All"
              ? t("student.searchResults")
              : t("student.allCourses")}
          </Text>
          {allCoursesLoading ? (
            <ActivityIndicator style={styles.loader} size="small" color="#4F46E5" />
          ) : filterCourses.length > 0 ? (
            filterCourses.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
                navigation={navigation}
                t={t}
                isEnrolled={false}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("student.noCoursesFound")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    margin: 16,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
  },
  categoryLoader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  courseListArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    marginTop: 10,
  },
  loader: {
    paddingVertical: 20,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thumbnail: {
    width: 120,
    height: "100%",
    resizeMode: "cover",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  lessonCount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
    fontWeight: "600",
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
    paddingVertical: 10,
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
    marginTop: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4F46E5",
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
})

export default StudentCoursesScreen