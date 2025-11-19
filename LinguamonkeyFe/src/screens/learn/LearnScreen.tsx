import Icon from "react-native-vector-icons/MaterialIcons"
import { useEffect, useMemo } from "react"
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
import { useCertifications } from "../../hooks/useCertifications"
import { useGetLessonsBySkillType } from "../../hooks/useLessons"
import { createScaledSheet } from "../../utils/scaledStyles"

// Helper để map dữ liệu từ BE (CourseResponse) sang định dạng FE cần dùng
// Logic: Ưu tiên lấy trực tiếp từ course (nếu DTO đã flatten), nếu không thì lấy từ latestPublicVersion
const mapCourseFields = (course: any) => {
  if (!course) return null

  // Backend DTO thường trả về các trường này ở root
  const version = course.latestPublicVersion || {}

  return {
    id: course.courseId || course.id, // BE dùng courseId
    title: course.title || course.courseName || "Untitled Course",
    // Ưu tiên ảnh ở root (CourseResponse), fallback vào version
    image: course.thumbnailUrl || version.thumbnailUrl || null,
    // BE trả về creatorName hoặc thông qua object creator
    instructor: course.creatorName || course.creator?.fullname || "Unknown Teacher",
    isFree:
      course.type === "FREE" ||
      course.price === 0 ||
      (course.price === undefined && course.isFree),
    price: course.price ?? 0,
    originalPrice: course.originalPrice, // Có thể null
    rating: course.averageRating ?? 0, // BE: averageRating
    students: course.studentsCount ?? course.students ?? 0, // BE: studentsCount
    level: course.difficultyLevel || course.level || "BEGINNER",
    duration: course.duration || "0h", // Có thể cần format lại từ seconds nếu BE trả về int

    // Tiến độ (chỉ có nếu là purchased course/enrollment)
    progress: course.progress ?? 0,
    completedLessons: course.completedLessons ?? 0,

    // Tổng số bài học: Lấy từ root nếu có, không thì đếm trong version
    totalLessons: course.totalLessons ?? version.lessons?.length ?? 0,

    discount: course.discount,
  }
}

const LearnScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useUserStore()

  const {
    useEnrolledCourses,
    useAllCourses,
    useRecommendedCourses,
    useBilingualVideos,
  } = useCourses()

  // 1. Khóa học đã mua
  const {
    data: purchasedCoursesData,
    isLoading: purchasedLoading,
    refetch: refetchPurchased,
  } = useEnrolledCourses({
    userId: user?.userId,
    page: 0,
    size: 5,
  })

  // 2. Khóa học miễn phí
  const {
    data: freeCoursesData,
    isLoading: freeLoading,
    refetch: refetchFree,
  } = useAllCourses({
    type: "FREE",
    page: 0,
    size: 5,
  })

  // 3. Khóa học đề xuất
  const {
    data: recommendedCoursesData,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useRecommendedCourses(user?.userId, 5)

  // 4. Video song ngữ
  const {
    data: videosData,
    isLoading: videosLoading,
    refetch: refetchVideos,
  } = useBilingualVideos({
    page: 0,
    size: 5,
  })

  // 5. Chứng chỉ
  const {
    data: certifications,
    isLoading: certificationsLoading,
    refetch: refetchCertifications,
  } = useCertifications().useAvailableCertifications(user?.languages)

  // --- Xử lý dữ liệu (Memoization) ---

  const purchasedCourses = useMemo(() => {
    // API EnrolledCourses trả về danh sách Enrollment
    // Cấu trúc: { course: {...}, progress: number, completedLessons: number }
    const list = purchasedCoursesData?.data || []
    return list.map((enrollment: any) => {
      // Gộp thông tin tiến độ vào object course để tiện map
      const courseWithProgress = {
        ...enrollment.course,
        progress: enrollment.progress ?? 0, // BE: progress hoặc progressPercent
        completedLessons: enrollment.completedLessons ?? 0,
      }
      return mapCourseFields(courseWithProgress)
    }).filter(Boolean)
  }, [purchasedCoursesData])

  const freeCourses = useMemo(() => {
    const list = freeCoursesData?.data || []
    return list.map(mapCourseFields).filter(Boolean)
  }, [freeCoursesData])

  const recommendedCourses = useMemo(() => {
    // Recommended API trả về List<CourseResponse> trực tiếp (không phân trang)
    const list = Array.isArray(recommendedCoursesData) ? recommendedCoursesData : []
    return list.map(mapCourseFields).filter(Boolean)
  }, [recommendedCoursesData])

  const videos = useMemo(() => {
    return videosData?.data || []
  }, [videosData])

  // --- Fetch Lessons theo Skill ---
  const { data: listeningData, isLoading: loadListen } = useGetLessonsBySkillType("LISTENING", { page: 0, size: 3 })
  const { data: speakingData, isLoading: loadSpeak } = useGetLessonsBySkillType("SPEAKING", { page: 0, size: 3 })
  const { data: readingData, isLoading: loadRead } = useGetLessonsBySkillType("READING", { page: 0, size: 3 })
  const { data: writingData, isLoading: loadWrite } = useGetLessonsBySkillType("WRITING", { page: 0, size: 3 })

  const listeningLessons = useMemo(() => listeningData?.data || [], [listeningData])
  const speakingLessons = useMemo(() => speakingData?.data || [], [speakingData])
  const readingLessons = useMemo(() => readingData?.data || [], [readingData])
  const writingLessons = useMemo(() => writingData?.data || [], [writingData])

  const isLoading =
    purchasedLoading ||
    freeLoading ||
    recommendedLoading ||
    videosLoading ||
    certificationsLoading ||
    loadListen ||
    loadSpeak ||
    loadRead ||
    loadWrite

  // --- Handlers ---

  const handleRefresh = () => {
    refetchPurchased()
    refetchFree()
    refetchRecommended()
    refetchVideos()
    refetchCertifications()
  }

  const handleCoursePress = (rawCourse: any, isPurchased = false) => {
    // Cần đảm bảo truyền object course gốc (raw) hoặc object đã map nhưng đủ ID
    // Ở đây ta truyền course đã map bởi mapCourseFields
    navigation.navigate("CourseDetailsScreen", {
      course: rawCourse, // rawCourse ở đây là item đã qua hàm mapCourseFields
      isPurchased,
    })
  }

  const handleVideoPress = (video: any, mode = "bilingual") => {
    navigation.navigate("BilingualVideoScreen", { selectedVideo: video, mode })
  }

  const handleViewAllCourses = () => navigation.navigate("StudentCoursesScreen")
  const handleViewAllVideos = () => navigation.navigate("BilingualVideoScreen")
  const handleViewAllCertifications = () => navigation.navigate("CertificationLearning")

  const handleViewAllLessons = (skillType: string) => {
    // Điều hướng tới màn hình list bài học tương ứng
    // Bạn cần đảm bảo các màn hình này đã được khai báo trong Navigator
    const screens: Record<string, string> = {
      LISTENING: "ListeningScreen", // Hoặc màn hình danh sách bài nghe
      SPEAKING: "SpeakingScreen",
      READING: "ReadingScreen",
      WRITING: "WritingScreen"
    }
    // Nếu chưa có màn hình list riêng, có thể dẫn tới một màn hình chung kèm param
    navigation.navigate(screens[skillType] || "FreeLessonScreen", { skillType })
  }

  const handleNavigation = (screenName: string) => {
    navigation.navigate(screenName)
  }

  // --- Render Items ---

  const renderCourseCardItem = (course: any, isPurchased = false) => {
    if (!course) return null;
    return (
      <TouchableOpacity
        key={course.id}
        style={[styles.courseCard, isPurchased && styles.purchasedCourseCard]}
        onPress={() => handleCoursePress(course, isPurchased)}
      >
        {course.image ? (
          <Image source={{ uri: course.image }} style={styles.courseImage} resizeMode="cover" />
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

        {course.isFree && !isPurchased && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>{t("courses.free")}</Text>
          </View>
        )}

        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.courseInstructor} numberOfLines={1}>by {course.instructor}</Text>

          <View style={styles.courseStats}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
              <Text style={styles.studentsText}>
                ({(course.students || 0).toLocaleString()})
              </Text>
            </View>
            <View style={styles.courseMeta}>
              <Text style={styles.levelText}>{course.level}</Text>
              {/* <Text style={styles.durationText}>{course.duration}</Text> */}
            </View>
          </View>

          {isPurchased ? (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {t("courses.progress")}: {Math.round(course.progress)}%
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
              {course.originalPrice && course.originalPrice > course.price && (
                <Text style={styles.originalPrice}>${course.originalPrice}</Text>
              )}
              <Text style={styles.price}>
                {course.isFree ? t("courses.free") : `$${course.price ?? 0}`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderVideoCard = (rawVideo: any) => {
    const video = {
      id: rawVideo.videoId || rawVideo.id,
      title: rawVideo.title,
      thumbnail: rawVideo.thumbnailUrl || rawVideo.thumbnail || null,
      duration: rawVideo.duration || "",
      description: rawVideo.description || "",
      level: rawVideo.level,
      category: rawVideo.category,
      progress: rawVideo.progress,
    }

    return (
      <TouchableOpacity
        key={video.id}
        style={styles.videoCard}
        onPress={() => handleVideoPress(rawVideo, "bilingual")}
      >
        <View style={styles.videoThumbnail}>
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={styles.thumbnailImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.9)" />
            </View>
          )}

          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>

          {/* Control overlay */}
          <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 }}>
            {/* Nút này có thể gây khó bấm trên card nhỏ, cân nhắc bỏ hoặc làm to hơn */}
          </View>
        </View>

        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
          <Text style={styles.videoDescription} numberOfLines={1}>{video.category}</Text>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(video.level), alignSelf: 'flex-start', marginTop: 4 }]}>
            <Text style={[styles.levelText, { color: '#fff', fontSize: 10 }]}>
              {video.level}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const getLevelColor = (level: string) => {
    switch ((level || "").toLowerCase()) {
      case "beginner": return "#4CAF50"
      case "intermediate": return "#FF9800"
      case "advanced": return "#F44336"
      default: return "#757575"
    }
  }

  const renderLessonCard = (lesson: any) => {
    return (
      <TouchableOpacity
        key={lesson.lessonId}
        style={styles.lessonCard}
        onPress={() => navigation.navigate("LessonScreen", { lesson })} // Fix tên màn hình
      >
        <View style={styles.lessonImagePlaceholder}>
          {/* Nếu có ảnh bài học thì hiện, không thì hiện icon */}
          <Icon name="auto-stories" size={40} color="#9CA3AF" />
        </View>
        <View style={styles.lessonContent}>
          <Text style={styles.lessonTitle} numberOfLines={2}>
            {lesson.title || lesson.lessonName}
          </Text>
          <View style={styles.lessonStats}>
            <View style={styles.expContainer}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.expText}>{lesson.expReward} EXP</Text>
            </View>
            <Text style={styles.skillText}>{lesson.skillType}</Text>
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

  // --- Main Render ---

  if (isLoading && !purchasedCourses.length && !freeCourses.length && !listeningLessons.length) {
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
        <RefreshControl
          refreshing={false} // Có thể bind với isRefetching của react-query
          onRefresh={handleRefresh}
          colors={["#4F46E5"]}
          tintColor="#4F46E5"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t("learn.title")}</Text>
      </View>

      {/* Welcome Section */}
      {isAuthenticated && user && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {t("learn.welcome", {
              name: user.fullname || user.nickname || t("learn.defaultName"),
            })}
          </Text>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Icon name="trending-up" size={16} color="#10B981" />
              <Text style={styles.statText}>
                {t("learn.level")} {user.level || 1}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="local-fire-department" size={16} color="#F59E0B" />
              <Text style={styles.statText}>
                {user.streak || 0} {t("learn.dayStreak")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* My Courses (Purchased) */}
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

      {/* Learning Tools */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("learn.learningTools")}</Text>
        </View>
        <View style={styles.toolGrid}>
          {learningTools.map(renderLearningToolCard)}
        </View>
      </View>

      {/* Skill Lessons: Listening */}
      {listeningLessons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.listeningLessons")}</Text>
            <TouchableOpacity onPress={() => handleViewAllLessons("LISTENING")}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {listeningLessons.map(renderLessonCard)}
          </ScrollView>
        </View>
      )}

      {/* Skill Lessons: Speaking */}
      {speakingLessons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.speakingLessons")}</Text>
            <TouchableOpacity onPress={() => handleViewAllLessons("SPEAKING")}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {speakingLessons.map(renderLessonCard)}
          </ScrollView>
        </View>
      )}

      {/* Recommended Courses */}
      {recommendedCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
          </View>
          {/* Render Vertical List cho Recommended */}
          <View style={{ gap: 16 }}>
            {recommendedCourses.map((c: any) => renderCourseCardItem(c, false))}
          </View>
        </View>
      )}

      {/* Free Courses */}
      {freeCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.freeCourses")}</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {freeCourses.map((c: any) => renderCourseCardItem(c, false))}
          </ScrollView>
        </View>
      )}

      {/* Videos */}
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

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("learn.certifications")}</Text>
            <TouchableOpacity onPress={handleViewAllCertifications}>
              <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {certifications.map((c: any) => (
              <View key={c.id} style={styles.certificationCard}>
                <Text style={styles.certificationName}>{c.name}</Text>
                <Text style={styles.certificationLanguage}>{c.languageCode}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  )
}

// Styles giữ nguyên như cũ, chỉ đảm bảo createScaledSheet hoạt động
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
    borderColor: "#4F46E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificationName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  certificationLanguage: {
    fontSize: 12,
    color: "#6B7280",
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    width: 260, // Fixed width for horizontal scroll
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    marginBottom: 8, // add margin bottom for shadow visibility
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
  freeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
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
    height: 44, // limit height for 2 lines
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
    color: "#FFFFFF",
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
    marginBottom: 5,
  },
  videoThumbnail: {
    height: 135,
    backgroundColor: "#000",
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
    backgroundColor: "#1F2937",
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
  videoProgressIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  videoProgressBar: {
    height: "100%",
    backgroundColor: "#EF4444", // Youtube red style
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
    marginBottom: 4,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    color: "#9CA3AF",
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
    height: 40, // fixed height for title
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
    fontWeight: '600'
  },
  skillText: {
    fontSize: 10,
    color: "#4F46E5",
    fontWeight: "bold",
    textTransform: 'uppercase',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
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
    width: "48%", // 2 cột
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