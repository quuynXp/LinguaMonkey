
import Icon from "react-native-vector-icons/MaterialIcons"
import { useEffect } from "react"
import {
  ScrollView,
  StyleSheet,
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
import { useCertifications } from "../../hooks/useCertifications"

const LearnScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useUserStore()

  const { usePurchasedCourses, useFreeCourses, useRecommendedCourses, useBilingualVideos } = useCourses()
  const { useAvailableCertifications } = useCertifications()

  const {
    data: purchasedCoursesData,
    isLoading: purchasedLoading,
    refetch: refetchPurchased,
  } = usePurchasedCourses(1, 5)
  const { data: freeCoursesData, isLoading: freeLoading, refetch: refetchFree } = useFreeCourses(1, 5)
  const {
    data: recommendedCourses,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useRecommendedCourses(5)
  const { data: videosData, isLoading: videosLoading, refetch: refetchVideos } = useBilingualVideos({ limit: 5 })
  const {
    data: certifications,
    isLoading: certificationsLoading,
    refetch: refetchCertifications,
  } = useAvailableCertifications(user?.learningLanguages)

  const purchasedCourses = purchasedCoursesData?.data || []
  const freeCourses = freeCoursesData?.data || []
  const videos = videosData?.data || []

  const isLoading = purchasedLoading || freeLoading || recommendedLoading || videosLoading || certificationsLoading
  const isRefreshing = false

  useEffect(() => {
    console.log("LearnScreen - User:", user)
    console.log("LearnScreen - Courses:", { purchasedCourses, freeCourses, recommendedCourses })
    console.log("LearnScreen - Certifications:", certifications)
  }, [user, purchasedCourses, freeCourses, recommendedCourses, certifications])

  const handleRefresh = () => {
    refetchPurchased()
    refetchFree()
    refetchRecommended()
    refetchVideos()
    refetchCertifications()
  }

  const handleCoursePress = (course, isPurchased = false) => {
    navigation.navigate("CourseDetails", { course, isPurchased })
  }

  const handleVideoPress = (video) => {
    navigation.navigate("BilingualVideo", { selectedVideo: video })
  }

  const handleViewAllCourses = () => {
    navigation.navigate("StudentCourses")
  }

  const handleViewAllVideos = () => {
    navigation.navigate("BilingualVideo")
  }

  const handleViewAllCertifications = () => {
    navigation.navigate("CertificationLearning")
  }

  const renderCourseCard = (course, isPurchased = false) => (
    <TouchableOpacity
      key={course.id}
      style={[styles.courseCard, isPurchased && styles.purchasedCourseCard]}
      onPress={() => handleCoursePress(course, isPurchased)}
    >
      <Image source={{ uri: course.image }} style={styles.courseImage} />

      {isPurchased && (
        <View style={styles.purchasedBadge}>
          <Icon name="check-circle" size={16} color="#FFFFFF" />
          <Text style={styles.purchasedText}>{t("courses.purchased")}</Text>
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
            <Text style={styles.studentsText}>({course.students.toLocaleString()})</Text>
          </View>
          <View style={styles.courseMeta}>
            <Text style={styles.levelText}>{course.level}</Text>
            <Text style={styles.durationText}>{course.duration}</Text>
          </View>
        </View>

        {isPurchased && course.progress !== undefined ? (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {t("courses.progress")}: {course.progress}%
              </Text>
              <Text style={styles.lessonsText}>
                {course.completedLessons}/{course.totalLessons} {t("courses.lessons")}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${course.progress}%` }]} />
            </View>
          </View>
        ) : (
          <View style={styles.priceSection}>
            {course.originalPrice && <Text style={styles.originalPrice}>${course.originalPrice}</Text>}
            <Text style={styles.price}>{course.isFree ? t("courses.free") : `$${course.price}`}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderVideoCard = (video) => (
    <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => handleVideoPress(video)}>
      <View style={styles.videoThumbnail}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.9)" />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
        {video.progress && video.progress > 0 && (
          <View style={styles.videoProgressIndicator}>
            <View style={[styles.videoProgressBar, { width: `${video.progress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {video.description}
        </Text>
        <View style={styles.videoMeta}>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(video.level) }]}>
            <Text style={styles.levelText}>{t(`videos.levels.${video.level}`)}</Text>
          </View>
          <Text style={styles.categoryText}>{video.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderCertificationCard = (certification) => (
    <TouchableOpacity
      key={certification.id}
      style={[styles.certificationCard, { borderLeftColor: certification.color }]}
      onPress={() => navigation.navigate("CertificationLearning", { selectedCertification: certification })}
    >
      <View style={styles.certificationHeader}>
        <Text style={styles.certificationIcon}>{certification.icon}</Text>
        <View style={styles.certificationInfo}>
          <Text style={styles.certificationLevel}>{certification.level}</Text>
          <Text style={styles.certificationLanguage}>{certification.language}</Text>
        </View>
        {certification.userProgress?.status === "completed" && (
          <View style={styles.completedBadge}>
            <Icon name="verified" size={16} color="#10B981" />
          </View>
        )}
      </View>
      <Text style={styles.certificationName} numberOfLines={2}>
        {certification.name}
      </Text>
      <View style={styles.certificationStats}>
        <View style={styles.certificationStat}>
          <Icon name="schedule" size={14} color="#6B7280" />
          <Text style={styles.certificationStatText}>{certification.duration}min</Text>
        </View>
        <View style={styles.certificationStat}>
          <Icon name="quiz" size={14} color="#6B7280" />
          <Text style={styles.certificationStatText}>{certification.totalQuestions}</Text>
        </View>
      </View>
      {certification.userProgress?.bestScore && (
        <Text style={styles.bestScore}>
          {t("certifications.bestScore")}: {certification.userProgress.bestScore}%
        </Text>
      )}
    </TouchableOpacity>
  )

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "#4CAF50"
      case "intermediate":
        return "#FF9800"
      case "advanced":
        return "#F44336"
      default:
        return "#757575"
    }
  }

  if (isLoading && !purchasedCourses.length && !freeCourses.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t("learn.title")}</Text>
      </View>

      {/* User Welcome Section */}
      {isAuthenticated && user && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {t("learn.welcome", { name: user.fullname || user.nickname || t("learn.defaultName") })}
          </Text>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Icon name="trending-up" size={16} color="#10B981" />
              <Text style={styles.statText}>
                {t("learn.level")} {user.level}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="local-fire-department" size={16} color="#F59E0B" />
              <Text style={styles.statText}>
                {user.streak} {t("learn.dayStreak")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Certifications Section */}
      {certifications && certifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.certifications")}</Text>
            <TouchableOpacity onPress={handleViewAllCertifications}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {certifications.slice(0, 5).map(renderCertificationCard)}
          </ScrollView>
        </View>
      )}

      {/* Bilingual Videos Section */}
      {videos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.bilingualVideos")}</Text>
            <TouchableOpacity onPress={handleViewAllVideos}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {videos.map(renderVideoCard)}
          </ScrollView>
        </View>
      )}

      {/* My Courses Section */}
      {purchasedCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.myCourses")}</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {purchasedCourses.map((course) => renderCourseCard(course, true))}
          </ScrollView>
        </View>
      )}

      {/* Free Courses Section */}
      {freeCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.freeCourses")}</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {freeCourses.map((course) => renderCourseCard(course, false))}
          </ScrollView>
        </View>
      )}

      {/* Learning Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("learn.categories")}</Text>
        <View style={styles.categoryGrid}>
          {[
            { id: "listening", name: t("learn.categories.listening"), icon: "hearing", screen: "ListeningScreen" },
            {
              id: "speaking",
              name: t("learn.categories.speaking"),
              icon: "record-voice-over",
              screen: "SpeakingScreen",
            },
            { id: "reading", name: t("learn.categories.reading"), icon: "menu-book", screen: "ReadingScreen" },
            { id: "writing", name: t("learn.categories.writing"), icon: "edit", screen: "WritingScreen" },
            { id: "grammar", name: t("learn.categories.grammar"), icon: "school", screen: "GrammarLearning" },
            { id: "vocabulary", name: t("learn.categories.vocabulary"), icon: "style", screen: "VocabularyFlashcards" },
          ].map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate(category.screen)}
            >
              <View style={styles.categoryIcon}>
                <Icon name={category.icon} size={24} color="#4F46E5" />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recommended Courses */}
      {recommendedCourses && recommendedCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          {recommendedCourses.map((course) => renderCourseCard(course, false))}
        </View>
      )}

      {/* View All Courses Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.viewAllCoursesButton} onPress={handleViewAllCourses}>
          <Icon name="school" size={24} color="#FFFFFF" />
          <Text style={styles.viewAllCoursesText}>{t("learn.viewAllCourses")}</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {!isLoading && purchasedCourses.length === 0 && freeCourses.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="school" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{t("learn.noContent")}</Text>
          <Text style={styles.emptyMessage}>{t("learn.noContentMessage")}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
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
    fontSize: 18,
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
  certificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 16,
    width: 200,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  certificationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  certificationInfo: {
    flex: 1,
  },
  certificationLevel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  certificationLanguage: {
    fontSize: 12,
    color: "#6B7280",
  },
  completedBadge: {
    padding: 4,
  },
  certificationName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 12,
    lineHeight: 18,
  },
  certificationStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  certificationStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  certificationStatText: {
    fontSize: 12,
    color: "#6B7280",
  },
  bestScore: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    width: 280,
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
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
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
  videoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 16,
    width: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  videoThumbnail: {
    height: 135,
    backgroundColor: "#F3F4F6",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  videoProgressIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  videoProgressBar: {
    height: "100%",
    backgroundColor: "#2196F3",
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#EEF2FF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  viewAllCoursesButton: {
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewAllCoursesText: {
    fontSize: 16,
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
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default LearnScreen
