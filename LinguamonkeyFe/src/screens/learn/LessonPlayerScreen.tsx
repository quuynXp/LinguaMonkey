import React, { useState, useMemo, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useLessons } from "../../hooks/useLessons"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type { LessonResponse, LessonSummaryResponse } from "../../types/dto"

const { width } = Dimensions.get("window")

const LessonPlayerScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { user } = useUserStore()
  const { lessonId: initialLessonId, courseId } = route.params

  const [currentLessonId, setCurrentLessonId] = useState<string>(initialLessonId)

  const { useLesson, useCompleteLesson } = useLessons()
  const { useCourse } = useCourses()

  const { data: lesson, isLoading: isLessonLoading } = useLesson(currentLessonId)
  const { data: course, isLoading: isCourseLoading } = useCourse(courseId)

  const { mutate: completeLesson, isPending: isCompleting } = useCompleteLesson()

  useEffect(() => {
    if (initialLessonId) {
      setCurrentLessonId(initialLessonId)
    }
  }, [initialLessonId])

  const playlist = useMemo(() => {
    return course?.latestPublicVersion?.lessons || []
  }, [course])

  const currentIndex = useMemo(() => {
    return playlist.findIndex((l: LessonSummaryResponse) => l.lessonId === currentLessonId)
  }, [playlist, currentLessonId])

  const nextLessonId = useMemo(() => {
    if (currentIndex === -1 || currentIndex === playlist.length - 1) return null
    return playlist[currentIndex + 1].lessonId
  }, [playlist, currentIndex])

  const prevLessonId = useMemo(() => {
    if (currentIndex <= 0) return null
    return playlist[currentIndex - 1].lessonId
  }, [playlist, currentIndex])

  const handleNext = () => {
    if (nextLessonId) setCurrentLessonId(nextLessonId)
  }

  const handlePrev = () => {
    if (prevLessonId) setCurrentLessonId(prevLessonId)
  }

  const handleComplete = () => {
    completeLesson(
      { lessonId: currentLessonId, userId: user.userId, score: 100 },
      {
        onSuccess: () => {
          Alert.alert(t("common.success"), t("lessons.lessonCompleted"))
          if (nextLessonId) {
            handleNext()
          } else {
            navigation.goBack()
          }
        },
        onError: () => {
          Alert.alert(t("common.error"), t("lessons.completionFailed"))
        },
      }
    )
  }

  const handleWriteReview = () => {
    navigation.navigate("WriteReviewScreen", { lessonId: currentLessonId })
  }

  if (isLessonLoading || isCourseLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  if (!lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t("lessons.notFound")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t("common.goBack")}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScreenLayout>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
        <View style={styles.placeholderIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.videoContainer}>
          {lesson.videoUrls && lesson.videoUrls.length > 0 ? (
            <View style={styles.videoPlaceholder}>
              <Icon name="play-circle-filled" size={64} color="#FFFFFF" />
              <Text style={styles.videoUrlText}>{t("lessons.tapToPlay")}</Text>
            </View>
          ) : (
            <View style={styles.noVideoContainer}>
              <Icon name="ondemand-video" size={48} color="#9CA3AF" />
              <Text style={styles.noVideoText}>{t("lessons.noVideoContent")}</Text>
            </View>
          )}
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            onPress={handlePrev}
            disabled={!prevLessonId}
            style={[styles.controlButton, !prevLessonId && styles.disabledButton]}
          >
            <Icon name="skip-previous" size={28} color={!prevLessonId ? "#D1D5DB" : "#4F46E5"} />
            <Text style={[styles.controlText, !prevLessonId && styles.disabledText]}>
              {t("common.previous")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={!nextLessonId}
            style={[styles.controlButton, !nextLessonId && styles.disabledButton]}
          >
            <Text style={[styles.controlText, !nextLessonId && styles.disabledText]}>
              {t("common.next")}
            </Text>
            <Icon name="skip-next" size={28} color={!nextLessonId ? "#D1D5DB" : "#4F46E5"} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaContainer}>
          <Text style={styles.courseTitle}>
            {t("lessons.fromCourse")}: {course?.title}
          </Text>
          <Text style={styles.lessonTitle}>{lesson.lessonName}</Text>

        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>{t("lessons.markAsComplete")}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.reviewButton} onPress={handleWriteReview}>
            <Icon name="rate-review" size={20} color="#4F46E5" />
            <Text style={styles.reviewButtonText}>{t("reviews.writeReview")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  iconButton: {
    padding: 8,
  },
  placeholderIcon: {
    width: 40,
  },
  content: {
    paddingBottom: 40,
  },
  videoContainer: {
    width: "100%",
    height: width * 0.5625, // 16:9 aspect ratio
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  videoUrlText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  noVideoText: {
    marginTop: 8,
    color: "#9CA3AF",
    fontSize: 14,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  controlText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4F46E5",
  },
  disabledText: {
    color: "#9CA3AF",
  },
  metaContainer: {
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  courseTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  actionContainer: {
    padding: 24,
    gap: 16,
  },
  completeButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewButton: {
    backgroundColor: "#EEF2FF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  reviewButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  backButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
})

export default LessonPlayerScreen