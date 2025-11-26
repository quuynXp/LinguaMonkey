import { useState, useMemo } from "react"
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"

import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type {
  CourseResponse,
  CourseVersionResponse,
  CourseReviewResponse,
  CourseEnrollmentResponse,
} from "../../types/dto"
import {
  VersionStatus,
  CourseType,
  CourseEnrollmentStatus,
} from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

const LessonItem = ({ lesson, isExpanded, onToggle, isPurchased, navigation, courseId }: any) => {
  const { t } = useTranslation()
  const isFree = lesson.isFree

  return (
    <View style={styles.lessonCard}>
      <TouchableOpacity onPress={onToggle} style={styles.lessonHeader}>
        <Icon
          name={isExpanded ? "expand-less" : "expand-more"}
          size={24}
          color="#1F2937"
        />
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonInfo}>
          {lesson.durationSeconds
            ? `${Math.ceil(lesson.durationSeconds / 60)} ${t("common.minutes")}`
            : ""}
        </Text>
        {!isPurchased && !isFree && (
          <Icon name="lock" size={20} color="#9CA3AF" />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.lessonDetails}>
          <Text style={styles.lessonDescription}>
            {t("course.lessonDescriptionPlaceholder")}
          </Text>
          {(isPurchased || isFree) && (
            <TouchableOpacity
              style={styles.startLessonButton}
              onPress={() => navigation.navigate("LessonPlayerScreen", { lessonId: lesson.lessonId, courseId })}
            >
              <Text style={styles.startLessonButtonText}>
                {t("course.startLesson")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const ReviewItem = ({ review }: { review: CourseReviewResponse }) => {
  const { t } = useTranslation()
  const rating = Array.from({ length: 5 }, (_, i) => (
    <Icon
      key={i}
      name={i < review.rating ? "star" : "star-border"}
      size={16}
      color="#F59E0B"
    />
  ))

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>
          {review.userId}
        </Text>
        <View style={styles.ratingContainer}>{rating}</View>
      </View>
      <Text style={styles.reviewComment}>{review.comment || t("course.noComment")}</Text>
      <Text style={styles.reviewDate}>
        {t("course.reviewedOn", { date: new Date(review.reviewedAt).toLocaleDateString() })}
      </Text>
    </View>
  )
}

const CourseDetailsScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation()
  const { courseId } = route.params
  const { user } = useUserStore()

  const [selectedTab, setSelectedTab] = useState("overview")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  const {
    useCourse,
    useCreateEnrollment,
    useReviews,
    useEnrollments,
  } = useCourses()

  // 1. Fetch dữ liệu khóa học đầy đủ
  const {
    data: courseData,
    isLoading: courseLoading,
    error: courseError,
  } = useCourse(courseId)

  // 2. Fetch reviews
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
  } = useReviews({ courseId })

  // 3. Kiểm tra xem người dùng đã ghi danh chưa 
  const {
    data: enrollments,
    isLoading: enrollmentLoading
  } = useEnrollments({ userId: user?.userId })

  const isPurchased = useMemo(() => {
    return enrollments?.data?.some(
      (e: CourseEnrollmentResponse) => e.courseId === courseId,
    ) ?? false
  }, [enrollments, courseId])

  // FIXED: Access data directly (as hook result is CourseResponse)
  const fetchedCourse: CourseResponse = courseData

  // FIXED: Access the inner 'data' array and assert type to fix 2322
  const reviews: CourseReviewResponse[] = (reviewsData?.data as CourseReviewResponse[]) || []

  const courseVersion: CourseVersionResponse | undefined = fetchedCourse?.latestPublicVersion
  const lessons = courseVersion?.lessons || []
  const isFree = fetchedCourse?.price === 0

  const {
    mutate: createEnrollment,
    isPending: isEnrolling,
  } = useCreateEnrollment()

  const handleEnroll = () => {
    if (isPurchased) {
      Alert.alert(t("course.alreadyEnrolled"))
      return
    }

    if (isFree) {
      createEnrollment(
        {
          courseVersionId: courseVersion.versionId,
          userId: user.userId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
        {
          onSuccess: () => {
            Alert.alert(
              t("success"),
              t("course.enrollmentSuccessMessage"),
            )
          },
          onError: () => {
            Alert.alert(
              t("error"),
              t("course.enrollmentErrorMessage"),
            )
          },
        },
      )
    } else {
      setShowPaymentModal(true)
    }
  }

  const handleConfirmPayment = () => {
    setShowPaymentModal(false)
    Alert.alert(t("course.paymentSimulation"))

    createEnrollment(
      {
        courseVersionId: courseVersion.versionId,
        userId: user.userId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
      {
        onSuccess: () => {
          Alert.alert(
            t("success"),
            t("course.enrollmentSuccessMessage"),
          )
        },
        onError: () => {
          Alert.alert(
            t("error"),
            t("course.enrollmentErrorMessage"),
          )
        },
      },
    )
  }

  if (courseLoading || enrollmentLoading) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>
            {t("common.loadingData")}
          </Text>
        </View>
      </ScreenLayout>
    )
  }

  if (courseError || !fetchedCourse || courseVersion?.status !== VersionStatus.PUBLIC) {
    return (
      <ScreenLayout>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {t("course.courseNotFoundOrNotPublic")}
          </Text>
        </View>
      </ScreenLayout>
    )
  }

  const CourseOverview = (
    <>
      <Text style={styles.sectionTitle}>
        {t("course.description")}
      </Text>
      <Text style={styles.courseDescription}>
        {courseVersion?.description || t("course.noDescription")}
      </Text>

      <Text style={styles.sectionTitle}>
        {t("course.details")}
      </Text>
      <View style={styles.detailRow}>
        <Icon name="language" size={18} color="#4F46E5" />
        <Text style={styles.detailText}>
          {/* FIXED: DTO is updated to include languageCode */}
          {t("course.language", { lang: fetchedCourse.languageCode })}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Icon name="whatshot" size={18} color="#4F46E5" />
        <Text style={styles.detailText}>
          {/* FIXED: DTO is updated to include difficultyLevel */}
          {t("course.level", { level: fetchedCourse.difficultyLevel })}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Icon name="person" size={18} color="#4F46E5" />
        <Text style={styles.detailText}>
          {t("course.creatorId", { id: fetchedCourse.creatorId })}
        </Text>
      </View>
    </>
  )

  const CourseContent = (
    <View>
      <Text style={styles.sectionTitle}>
        {t("course.lessons")} ({lessons.length})
      </Text>
      {lessons.map((lesson) => (
        <LessonItem
          key={lesson.lessonId}
          lesson={lesson}
          isPurchased={isPurchased || isFree}
          isExpanded={expandedLesson === lesson.lessonId}
          onToggle={() =>
            setExpandedLesson(
              expandedLesson === lesson.lessonId ? null : lesson.lessonId,
            )
          }
          navigation={navigation}
          courseId={courseId}
        />
      ))}
    </View>
  )

  const CourseReviews = (
    <View>
      <Text style={styles.sectionTitle}>
        {t("course.reviews")} ({reviews.length})
      </Text>
      {reviewsLoading ? (
        <ActivityIndicator size="small" color="#4F46E5" />
      ) : reviews.length > 0 ? (
        reviews.map((review) => (
          <ReviewItem key={review.reviewId} review={review} />
        ))
      ) : (
        <Text style={styles.emptyText}>
          {t("course.noReviewsYet")}
        </Text>
      )}
      <TouchableOpacity
        style={styles.reviewButton}
        onPress={() =>
          navigation.navigate("WriteReviewScreen", { courseId })
        }
      >
        <Text style={styles.reviewButtonText}>
          {t("course.writeReview")}
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={{ uri: courseVersion?.thumbnailUrl }}
          style={styles.thumbnail}
        />
        <View style={styles.content}>
          <Text style={styles.courseTitle}>
            {fetchedCourse.title}
          </Text>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setSelectedTab("overview")}
              style={[
                styles.tabButton,
                selectedTab === "overview" && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "overview" && styles.tabTextActive,
                ]}
              >
                {t("course.tabOverview")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("content")}
              style={[
                styles.tabButton,
                selectedTab === "content" && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "content" && styles.tabTextActive,
                ]}
              >
                {t("course.tabContent")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("reviews")}
              style={[
                styles.tabButton,
                selectedTab === "reviews" && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "reviews" && styles.tabTextActive,
                ]}
              >
                {t("course.tabReviews")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {selectedTab === "overview" && CourseOverview}
            {selectedTab === "content" && CourseContent}
            {selectedTab === "reviews" && CourseReviews}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>
            {t("course.price")}
          </Text>
          <Text style={styles.priceValue}>
            {isFree ? t("course.free") : `${fetchedCourse.price}đ`}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.enrollButton,
            isPurchased && styles.enrollButtonDisabled,
          ]}
          onPress={handleEnroll}
          disabled={isPurchased || isEnrolling}
        >
          {isEnrolling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.enrollButtonText}>
              {isPurchased ? t("course.enrolled") : t("course.enrollNow")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("course.confirmPurchaseTitle")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.lockIconContainer}>
              <Icon name="credit-card" size={48} color="#4F46E5" />
            </View>
            <Text style={styles.modalText}>
              {t("course.confirmPurchaseMessage", {
                price: fetchedCourse.price,
              })}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmPayment}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {t("common.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    paddingBottom: 80,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4F46E5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  thumbnail: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  content: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  tabContent: {
    minHeight: 300,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    marginTop: 10,
  },
  courseDescription: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#374151",
  },
  lessonCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  lessonInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 8,
  },
  lessonDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  lessonDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  startLessonButton: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  startLessonButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  ratingContainer: {
    flexDirection: "row",
  },
  reviewComment: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontStyle: "italic",
    paddingVertical: 20,
  },
  reviewButton: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  priceContainer: {
    flexDirection: "column",
    marginRight: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  enrollButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  enrollButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 24,
    maxWidth: 400,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  lockIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default CourseDetailsScreen