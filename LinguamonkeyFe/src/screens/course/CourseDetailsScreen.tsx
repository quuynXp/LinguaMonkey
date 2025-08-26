import { useState, useEffect } from "react"
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"

const CourseDetailsScreen = ({ navigation, route }) => {
  const { t } = useTranslation()
  const { course: initialCourse, isPurchased = false } = route.params
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [expandedLesson, setExpandedLesson] = useState(null)

  const { useCourse, usePurchaseCourse } = useCourses()
  const { data: courseData, isLoading: courseLoading, error: courseError } = useCourse(initialCourse?.id)
  const { purchaseCourse, isPurchasing } = usePurchaseCourse()

  const course = courseData || initialCourse

  const tabs = [
    { id: "overview", label: t("courses.tabs.overview"), icon: "info" },
    { id: "curriculum", label: t("courses.tabs.curriculum"), icon: "list" },
    { id: "reviews", label: t("courses.tabs.reviews"), icon: "star" },
    { id: "instructor", label: t("courses.tabs.instructor"), icon: "person" },
  ]

  useEffect(() => {
    if (courseError) {
      Alert.alert(t("common.error"), t("errors.loadCourseDetailsFailed"))
    }
  }, [courseError, t])

  const handleLessonPress = (lesson) => {
    if (lesson.isPreview || isPurchased) {
      navigation.navigate("LessonPlayer", { lesson, course })
    } else {
      setShowPaymentModal(true)
    }
  }

  const handlePurchase = async () => {
    try {
      setShowPaymentModal(false)
      const result = await purchaseCourse(course.id)
      if (result?.paymentUrl) {
        navigation.navigate("PaymentScreen", { course, paymentUrl: result.paymentUrl })
      } else {
        navigation.navigate("PaymentScreen", { course })
      }
    } catch (error) {
      Alert.alert(t("common.error"), error.message || t("errors.purchaseFailed"))
    }
  }

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <Text style={styles.description}>{course.description || t("courses.defaultDescription")}</Text>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>{t("courses.whatYouWillLearn")}:</Text>
        {course.features?.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        )) || [
          <View key="1" style={styles.featureItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>{t("courses.defaultFeature1")}</Text>
          </View>,
          <View key="2" style={styles.featureItem}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>{t("courses.defaultFeature2")}</Text>
          </View>,
        ]}
      </View>

      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>{t("courses.requirements")}:</Text>
        {course.requirements?.map((requirement, index) => (
          <Text key={index} style={styles.requirementText}>
            • {requirement}
          </Text>
        )) || [
          <Text key="1" style={styles.requirementText}>
            • {t("courses.defaultRequirement1")}
          </Text>,
          <Text key="2" style={styles.requirementText}>
            • {t("courses.defaultRequirement2")}
          </Text>,
        ]}
      </View>
    </View>
  )

  const renderCurriculum = () => (
    <View style={styles.tabContent}>
      <Text style={styles.curriculumTitle}>{t("courses.courseContent")}</Text>
      <Text style={styles.curriculumSubtitle}>
        {course.lessons?.length || course.totalLessons || 0} {t("courses.lessons")} • {course.duration}
      </Text>

      {course.lessons?.map((lesson, index) => (
        <TouchableOpacity key={lesson.id} style={styles.lessonItem} onPress={() => handleLessonPress(lesson)}>
          <View style={styles.lessonHeader}>
            <View style={styles.lessonInfo}>
              <View style={styles.lessonTitleRow}>
                <Text style={styles.lessonNumber}>{index + 1}.</Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.isPreview && (
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewText}>{t("courses.preview")}</Text>
                  </View>
                )}
                {!lesson.isPreview && !isPurchased && <Icon name="lock" size={16} color="#6B7280" />}
              </View>
              <View style={styles.lessonMeta}>
                <Icon name={lesson.type === "video" ? "play-circle-outline" : "quiz"} size={16} color="#6B7280" />
                <Text style={styles.lessonDuration}>{lesson.duration}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}>
              <Icon name={expandedLesson === lesson.id ? "expand-less" : "expand-more"} size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {expandedLesson === lesson.id && (
            <View style={styles.lessonDescription}>
              <Text style={styles.lessonDescriptionText}>{lesson.description}</Text>
            </View>
          )}
        </TouchableOpacity>
      )) || (
        <View style={styles.emptyLessons}>
          <Text style={styles.emptyLessonsText}>{t("courses.noLessonsAvailable")}</Text>
        </View>
      )}
    </View>
  )

  const renderReviews = () => (
    <View style={styles.tabContent}>
      <View style={styles.reviewsHeader}>
        <View style={styles.ratingOverview}>
          <Text style={styles.overallRating}>{course.rating || "N/A"}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name="star"
                size={20}
                color={star <= Math.floor(course.rating || 0) ? "#F59E0B" : "#E5E7EB"}
              />
            ))}
          </View>
          <Text style={styles.reviewCount}>
            {course.students?.toLocaleString() || 0} {t("courses.reviews")}
          </Text>
        </View>

        {isPurchased && (
          <TouchableOpacity style={styles.writeReviewButton}>
            <Text style={styles.writeReviewText}>{t("courses.writeReview")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {course.reviews?.map((review) => (
        <View key={review.id} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewAvatar}>{review.avatar}</Text>
            <View style={styles.reviewInfo}>
              <Text style={styles.reviewUser}>{review.user}</Text>
              <View style={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon key={star} name="star" size={14} color={star <= review.rating ? "#F59E0B" : "#E5E7EB"} />
                ))}
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.reviewComment}>{review.comment}</Text>
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.helpfulButton}>
              <Icon name="thumb-up" size={16} color="#6B7280" />
              <Text style={styles.helpfulText}>
                {t("courses.helpful")} ({review.helpful})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )) || (
        <View style={styles.emptyReviews}>
          <Text style={styles.emptyReviewsText}>{t("courses.noReviewsYet")}</Text>
        </View>
      )}
    </View>
  )

  const renderInstructor = () => (
    <View style={styles.tabContent}>
      <View style={styles.instructorCard}>
        <Image
          source={{ uri: course.instructorAvatar || "/placeholder.svg?height=80&width=80" }}
          style={styles.instructorAvatar}
        />
        <View style={styles.instructorInfo}>
          <Text style={styles.instructorName}>{course.instructor}</Text>
          <Text style={styles.instructorTitle}>{course.instructorTitle || t("courses.defaultInstructorTitle")}</Text>
          <View style={styles.instructorStats}>
            <View style={styles.statItem}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.statText}>
                {course.instructorRating || course.rating || "N/A"} {t("courses.rating")}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="people" size={16} color="#6B7280" />
              <Text style={styles.statText}>
                {course.instructorStudents || course.students || 0}+ {t("courses.students")}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="school" size={16} color="#6B7280" />
              <Text style={styles.statText}>
                {course.instructorCourses || 1} {t("courses.courses")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.instructorBio}>
        {course.instructorBio || t("courses.defaultInstructorBio", { instructor: course.instructor })}
      </Text>
    </View>
  )

  if (courseLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    )
  }

  if (!course) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>{t("common.error")}</Text>
        <Text style={styles.errorMessage}>{t("courses.courseNotFound")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="favorite-border" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Hero */}
        <View style={styles.heroSection}>
          <Image source={{ uri: course.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseInstructor}>by {course.instructor}</Text>
            <View style={styles.courseStats}>
              <View style={styles.statItem}>
                <Icon name="star" size={16} color="#F59E0B" />
                <Text style={styles.statText}>{course.rating || "N/A"}</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="people" size={16} color="#FFFFFF" />
                <Text style={styles.statText}>{course.students?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="schedule" size={16} color="#FFFFFF" />
                <Text style={styles.statText}>{course.duration}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, selectedTab === tab.id && styles.activeTab]}
                onPress={() => setSelectedTab(tab.id)}
              >
                <Icon name={tab.icon} size={20} color={selectedTab === tab.id ? "#4F46E5" : "#6B7280"} />
                <Text style={[styles.tabText, selectedTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {selectedTab === "overview" && renderOverview()}
        {selectedTab === "curriculum" && renderCurriculum()}
        {selectedTab === "reviews" && renderReviews()}
        {selectedTab === "instructor" && renderInstructor()}
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        {isPurchased ? (
          <TouchableOpacity style={styles.continueButton}>
            <Text style={styles.continueButtonText}>{t("courses.continueLearning")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.purchaseSection}>
            <View style={styles.priceInfo}>
              {course.originalPrice && <Text style={styles.originalPrice}>${course.originalPrice}</Text>}
              <Text style={styles.price}>{course.isFree ? t("courses.free") : `$${course.price}`}</Text>
            </View>
            <TouchableOpacity
              style={[styles.enrollButton, isPurchasing && styles.enrollButtonDisabled]}
              onPress={() => (course.isFree ? handleLessonPress(course.lessons?.[0]) : setShowPaymentModal(true))}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.enrollButtonText}>
                  {course.isFree ? t("courses.startLearning") : t("courses.enrollNow")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("courses.purchaseRequired")}</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.lockIconContainer}>
              <Icon name="lock" size={64} color="#6B7280" />
            </View>

            <Text style={styles.modalText}>{t("courses.purchaseModalText")}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
                <Text style={styles.purchaseButtonText}>
                  {t("courses.purchase")} ${course.price}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    position: "relative",
    height: 250,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 24,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  courseInstructor: {
    fontSize: 16,
    color: "#E5E7EB",
    marginBottom: 12,
  },
  courseStats: {
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
    color: "#FFFFFF",
  },
  tabsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  tabContent: {
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#374151",
  },
  requirementsContainer: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  curriculumTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  curriculumSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  lessonItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  lessonNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
  },
  previewBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lessonDuration: {
    fontSize: 14,
    color: "#6B7280",
  },
  lessonDescription: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  lessonDescriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  emptyLessons: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyLessonsText: {
    fontSize: 16,
    color: "#6B7280",
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  ratingOverview: {
    alignItems: "center",
  },
  overallRating: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  writeReviewButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  writeReviewText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  reviewAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewUser: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: "row",
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyReviews: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyReviewsText: {
    fontSize: 16,
    color: "#6B7280",
  },
  instructorCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  instructorTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  instructorStats: {
    gap: 8,
  },
  instructorBio: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  bottomAction: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  continueButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  purchaseSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceInfo: {
    alignItems: "flex-start",
  },
  originalPrice: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  enrollButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
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
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  purchaseButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default CourseDetailsScreen
