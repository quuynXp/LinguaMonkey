import Icon from "react-native-vector-icons/MaterialIcons"
import { useMemo } from "react"
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native"
import { useTranslation } from "react-i18next"
import { useUserStore } from "../../stores/UserStore"
import { useCourses } from "../../hooks/useCourses"
import { useLessons } from "../../hooks/useLessons"
import { createScaledSheet } from "../../utils/scaledStyles"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse, LessonResponse } from "../../types/dto"
import { CourseType, SkillType } from "../../types/enums"

const LearnScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useUserStore()

  const {
    useAllCourses,
    useEnrollments,
    useRecommendedCourses,
  } = useCourses()

  const {
    useAllLessons,
  } = useLessons()

  const {
    data: enrolledData,
    isLoading: enrolledLoading,
    refetch: refetchEnrolled,
  } = useEnrollments({
    userId: user?.userId,
    page: 0,
    size: 5,
  })

  const {
    data: allCoursesData,
    isLoading: allCoursesLoading,
    refetch: refetchAllCourses,
  } = useAllCourses({
    page: 0,
    size: 10,
    type: CourseType.FREE,
  })

  const {
    data: recommendedData,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useRecommendedCourses(user?.userId, 5)

  const {
    data: listeningData,
    isLoading: listeningLoading,
    refetch: refetchListening,
  } = useAllLessons({
    skillType: SkillType.LISTENING,
    page: 0,
    size: 3,
  })

  const {
    data: speakingData,
    isLoading: speakingLoading,
    refetch: refetchSpeaking,
  } = useAllLessons({
    skillType: SkillType.SPEAKING,
    page: 0,
    size: 3,
  })

  const {
    data: readingData,
    isLoading: readingLoading,
    refetch: refetchReading,
  } = useAllLessons({
    skillType: SkillType.READING,
    page: 0,
    size: 3,
  })

  const {
    data: writingData,
    isLoading: writingLoading,
    refetch: refetchWriting,
  } = useAllLessons({
    skillType: SkillType.WRITING,
    page: 0,
    size: 3,
  })

  const purchasedCourses = useMemo(() => {
    const enrollments = enrolledData?.data || []
    return enrollments.map((enrollment: any) => ({
      ...enrollment.course,
      progress: enrollment.progress ?? 0,
      completedLessons: enrollment.completedLessons ?? 0,
    })).filter(Boolean)
  }, [enrolledData])

  const freeCourses = useMemo(() => {
    return allCoursesData?.data || []
  }, [allCoursesData])

  const recommendedCourses = useMemo(() => {
    return recommendedData || []
  }, [recommendedData])

  const listeningLessons = useMemo(() => {
    return listeningData?.data || []
  }, [listeningData])

  const speakingLessons = useMemo(() => {
    return speakingData?.data || []
  }, [speakingData])

  const readingLessons = useMemo(() => {
    return readingData?.data || []
  }, [readingData])

  const writingLessons = useMemo(() => {
    return writingData?.data || []
  }, [writingData])

  const isLoading =
    enrolledLoading ||
    allCoursesLoading ||
    recommendedLoading ||
    listeningLoading ||
    speakingLoading ||
    readingLoading ||
    writingLoading

  const learningTools = [
    { name: t("learn.vocabularyFlashcards"), icon: "style", screen: "VocabularyFlashcardsScreen" },
    { name: t("learn.listening"), icon: "volume-up", screen: "ListeningScreen" },
    { name: t("learn.speaking"), icon: "mic", screen: "SpeakingScreen" },
    { name: t("learn.reading"), icon: "menu-book", screen: "ReadingScreen" },
    { name: t("learn.writing"), icon: "edit", screen: "WritingScreen" },
    { name: t("learn.ipaPronunciation"), icon: "record-voice-over", screen: "IPAScreen" },
    { name: t("learn.notes"), icon: "notes", screen: "NotesScreen" },
    { name: t("learn.soloQuiz"), icon: "quiz", screen: "SoloQuizScreen" },
    { name: t("learn.teamQuiz"), icon: "people", screen: "TeamQuizRoom" },
    { name: t("learn.bilingual"), icon: "language", screen: "BilingualVideoScreen" },
    { name: t("learn.certifications"), icon: "card-membership", screen: "CertificationLearningScreen" },
  ]

  const handleRefresh = () => {
    refetchEnrolled()
    refetchAllCourses()
    refetchRecommended()
    refetchListening()
    refetchSpeaking()
    refetchReading()
    refetchWriting()
  }

  const handleCoursePress = (course: CourseResponse, isPurchased = false) => {
    navigation.navigate("CourseDetailsScreen", {
      course,
      isPurchased,
    })
  }

  const handleViewAllCourses = () => navigation.navigate("StudentCoursesScreen")

  const handleNavigation = (screenName: string) => {
    navigation.navigate(screenName)
  }

  const renderCourseCardItem = (course: CourseResponse, isPurchased = false) => {
    if (!course) return null

    const version = course.latestPublicVersion
    const rating = 0
    const students = 0
    const level = "B1"
    const title = course.title || "Untitled"
    const instructor = "Instructor"
    const progress = (course as any).progress ?? 0
    const completedLessons = (course as any).completedLessons ?? 0
    const totalLessons = version?.lessons?.length ?? 0
    const thumbnailUrl = version?.thumbnailUrl

    return (
      <TouchableOpacity
        key={course.courseId}
        style={[styles.courseCard, isPurchased && styles.purchasedCourseCard]}
        onPress={() => handleCoursePress(course, isPurchased)}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.courseImage} resizeMode="cover" />
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

        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.courseInstructor} numberOfLines={1}>by {instructor}</Text>

          <View style={styles.courseStats}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              <Text style={styles.studentsText}>({students.toLocaleString()})</Text>
            </View>
            <View style={styles.courseMeta}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
          </View>

          {isPurchased ? (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {t("courses.progress")}: {Math.round(progress)}%
                </Text>
                <Text style={styles.lessonsText}>
                  {completedLessons}/{totalLessons} {t("courses.lessons")}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.priceSection}>
              <Text style={styles.price}>
                {course.price === 0 ? t("courses.free") : `$${course.price}`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderLessonCard = (lesson: LessonResponse) => {
    if (!lesson) return null

    // Determine target screen based on skill type
    const handlePress = () => {
      if (lesson.skillTypes === SkillType.SPEAKING) {
        navigation.navigate("SpeakingScreen", {
          lessonId: lesson.lessonId,
          lesson: lesson // Pass the full lesson object
        })
      } else {
        navigation.navigate("LessonScreen", { lesson })
      }
    }

    return (
      <TouchableOpacity
        key={lesson.lessonId}
        style={styles.lessonCard}
        onPress={handlePress}
      >
        <View style={styles.lessonImagePlaceholder}>
          <Icon name="auto-stories" size={40} color="#9CA3AF" />
        </View>
        <View style={styles.lessonContent}>
          <Text style={styles.lessonTitle} numberOfLines={2}>
            {lesson.lessonName || "Lesson"}
          </Text>
          <View style={styles.lessonStats}>
            <View style={styles.expContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.expText}>{lesson.expReward || 10} XP</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderLearningToolCard = (tool: any) => (
    <TouchableOpacity
      key={tool.screen}
      style={styles.toolCard}
      onPress={() => handleNavigation(tool.screen)}
    >
      <View style={styles.toolIconContainer}>
        <Icon name={tool.icon} size={24} color="#4F46E5" />
      </View>
      <Text style={styles.toolName}>{tool.name}</Text>
    </TouchableOpacity>
  )

  if (isLoading && !purchasedCourses.length && !freeCourses.length) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={["#4F46E5"]}
            tintColor="#4F46E5"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("learn.title")}</Text>
        </View>

        {isAuthenticated && user && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              {t("learn.welcome", {
                name: user.fullname || user.nickname || t("learn.defaultName"),
              })}
            </Text>
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Icon name="trending-up" size={18} color="#10B981" />
                <Text style={styles.statText}>
                  {t("learn.level")} {user.level || 1}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="local-fire-department" size={18} color="#F59E0B" />
                <Text style={styles.statText}>
                  {user.streak || 0} {t("learn.dayStreak")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {purchasedCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.myCourses")}</Text>
              <TouchableOpacity onPress={handleViewAllCourses}>
                <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {purchasedCourses.map((c: any) => renderCourseCardItem(c, true))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.learningTools")}</Text>
          </View>
          <View style={styles.toolGrid}>
            {learningTools.map(renderLearningToolCard)}
          </View>
        </View>

        {listeningLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.listeningLessons")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {listeningLessons.map(renderLessonCard)}
            </ScrollView>
          </View>
        )}

        {speakingLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.speakingLessons")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {speakingLessons.map(renderLessonCard)}
            </ScrollView>
          </View>
        )}

        {readingLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.readingLessons")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {readingLessons.map(renderLessonCard)}
            </ScrollView>
          </View>
        )}

        {writingLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.writingLessons")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {writingLessons.map(renderLessonCard)}
            </ScrollView>
          </View>
        )}

        {recommendedCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {recommendedCourses.map((c: any) => renderCourseCardItem(c, false))}
            </ScrollView>
          </View>
        )}

        {freeCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("learn.freeCourses")}</Text>
              <TouchableOpacity onPress={handleViewAllCourses}>
                <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {freeCourses.slice(0, 5).map((c: any) => renderCourseCardItem(c, false))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </ScreenLayout>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    color: "#1F2937",
    marginBottom: 12,
  },
  userStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    width: 260,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  purchasedCourseCard: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  courseImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#E5E7EB",
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
    zIndex: 1,
  },
  purchasedText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  courseContent: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    height: 44,
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
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
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
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  lessonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  lessonImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  lessonContent: {
    padding: 12,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    height: 40,
  },
  lessonStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#EEF2FF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
})

export default LearnScreen