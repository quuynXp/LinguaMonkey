import React, { useState, useMemo, useCallback } from "react"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useUsers } from "../../hooks/useUsers"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { CourseEnrollmentStatus } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"
import { getCourseImage, getSafeCourseSharePayload } from "../../utils/courseUtils"
import { CourseDiscount } from "../../types/entity"

const CourseDetailsScreen = ({ route, navigation }: any) => {
  const { courseId } = route.params
  const { t } = useTranslation()
  const { user } = useUserStore()
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false)

  const {
    useCourse,
    useEnrollments,
    useCreateEnrollment,
    useReviews,
    useDiscounts
  } = useCourses()

  const { useUser: useAuthor } = useUsers()

  const { data: course, isLoading: courseLoading } = useCourse(courseId)
  const { data: enrollments } = useEnrollments({ userId: user?.userId })
  const { data: reviewsData } = useReviews({ courseId })
  const { mutate: enroll, isPending: isEnrolling } = useCreateEnrollment()

  // Fetch active discounts for this course
  const { data: discountsData } = useDiscounts({ courseId, size: 1 })

  // 💡 FIX: Ép kiểu cho activeDiscount để TypeScript biết thuộc tính discountPercentage tồn tại.
  const activeDiscount = discountsData?.data?.[0] as CourseDiscount | undefined

  // Fetch Author Data
  const { data: author } = useAuthor(course?.creatorId)

  const isEnrolled = useMemo(() => {
    return enrollments?.data?.some((e: any) => e.courseId === courseId)
  }, [enrollments, courseId])

  const version = course?.latestPublicVersion
  const lessons = version?.lessons || []
  const reviews = (reviewsData?.data as any[]) || []

  // Price Calculation
  // Lỗi đã được khắc phục do activeDiscount có kiểu dữ liệu rõ ràng
  const originalPrice = course?.price || 0
  const discountPercent = activeDiscount ? activeDiscount.discountPercentage : 0
  const finalPrice = discountPercent > 0
    ? originalPrice * (1 - discountPercent / 100)
    : originalPrice

  const handleShare = useCallback(() => {
    if (!course) return
    const safePayload = getSafeCourseSharePayload(course, version)
    Alert.alert(
      t("course.shareTitle"),
      t("course.shareToGroupPrompt"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.share"),
          onPress: () => {
            console.log("Sharing Safe Payload:", JSON.stringify(safePayload))
            Alert.alert(t("success"), t("course.sharedSuccess"))
          }
        }
      ]
    )
  }, [course, version, t])

  const handleLessonPress = (lesson: any) => {
    if (isEnrolled || lesson.isFree) {
      navigation.navigate("LessonPlayerScreen", {
        lessonId: lesson.lessonId,
        courseId
      })
    } else {
      setPurchaseModalVisible(true)
    }
  }

  const handlePurchase = () => {
    if (!user?.userId || !version?.versionId) return

    setPurchaseModalVisible(false)
    enroll({
      userId: user.userId,
      courseVersionId: version.versionId,
      status: CourseEnrollmentStatus.ACTIVE
    }, {
      onSuccess: () => Alert.alert(t("success"), t("course.enrollmentSuccess")),
      onError: () => Alert.alert(t("error"), t("course.enrollmentFailed"))
    })
  }

  const handleAuthorPress = () => {
    if (course?.creatorId) {
      navigation.push("ProfileViewScreen", { userId: course.creatorId })
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Image
        source={getCourseImage(version?.thumbnailUrl)}
        style={styles.coverImage}
      />

      {/* Discount Badge on Cover */}
      {discountPercent > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>-{discountPercent}% SALE</Text>
        </View>
      )}

      <View style={styles.headerContent}>
        <Text style={styles.title}>{course?.title}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="star" size={16} color="#F59E0B" />
            <Text style={styles.statText}>4.8 (120)</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="translate" size={16} color="#6B7280" />
            <Text style={styles.statText}>{course?.languageCode}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="signal-cellular-alt" size={16} color="#6B7280" />
            <Text style={styles.statText}>{course?.difficultyLevel}</Text>
          </View>
        </View>

        {/* Author Section */}
        {author && (
          <TouchableOpacity style={styles.authorRow} onPress={handleAuthorPress}>
            <Image
              source={{ uri: author.avatarUrl || 'https://via.placeholder.com/40' }}
              style={styles.authorAvatar}
            />
            <View>
              <Text style={styles.authorLabel}>{t("course.createdBy")}</Text>
              <Text style={styles.authorName}>{author.fullname}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        <View style={styles.actionRow}>
          {!isEnrolled && (
            <View>
              {discountPercent > 0 ? (
                <View>
                  <Text style={styles.oldPriceText}>${originalPrice.toFixed(2)}</Text>
                  <Text style={styles.salePriceText}>
                    {finalPrice === 0 ? t("course.free") : `$${finalPrice.toFixed(2)}`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.priceText}>
                  {originalPrice === 0 ? t("course.free") : `$${originalPrice.toFixed(2)}`}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share" size={20} color="#4F46E5" />
            <Text style={styles.shareText}>{t("common.share")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>{t("course.description")}</Text>
        <Text style={styles.description}>{version?.description}</Text>

        <View style={styles.lessonHeaderRow}>
          <Text style={styles.sectionHeader}>{t("course.curriculum")}</Text>
          <Text style={styles.lessonCount}>{lessons.length} {t("course.lessons")}</Text>
        </View>
      </View>
    </View>
  )

  const renderLessonItem = ({ item, index }: any) => {
    const isLocked = !isEnrolled && !item.isFree
    return (
      <TouchableOpacity
        style={[styles.lessonItem, isLocked && styles.lessonItemLocked]}
        onPress={() => handleLessonPress(item)}
      >
        <View style={styles.lessonLeft}>
          <View style={styles.indexCircle}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View>
            <Text style={[styles.lessonTitle, isLocked && styles.textLocked]}>
              {item.title}
            </Text>
            <Text style={styles.lessonDuration}>
              {Math.ceil((item.durationSeconds || 0) / 60)} min
            </Text>
          </View>
        </View>
        {isLocked ? (
          <Icon name="lock" size={20} color="#9CA3AF" />
        ) : (
          <Icon name="play-circle-outline" size={24} color="#10B981" />
        )}
      </TouchableOpacity>
    )
  }

  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.reviewHeader}>
        <Text style={styles.sectionHeader}>{t("course.reviews")}</Text>
        {isEnrolled && (
          <TouchableOpacity onPress={() => navigation.navigate("WriteReviewScreen", { courseId })}>
            <Text style={styles.writeReviewText}>{t("course.writeReview")}</Text>
          </TouchableOpacity>
        )}
      </View>
      {reviews.length === 0 ? (
        <Text style={styles.noReviews}>{t("course.noReviewsYet")}</Text>
      ) : (
        reviews.map((r: any) => (
          <View key={r.reviewId} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewerName}>{r.userId}</Text>
              <View style={styles.ratingRow}>
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    size={14}
                    color={i < r.rating ? "#F59E0B" : "#E5E7EB"}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.reviewComment}>{r.comment}</Text>
          </View>
        ))
      )}
      <View style={{ height: 100 }} />
    </View>
  )

  if (courseLoading) return <ActivityIndicator style={styles.loading} size="large" color="#4F46E5" />

  return (
    <ScreenLayout>
      <FlatList
        data={lessons}
        renderItem={renderLessonItem}
        keyExtractor={(item) => item.lessonId}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      {!isEnrolled && (
        <View style={styles.floatingFooter}>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => setPurchaseModalVisible(true)}
            disabled={isEnrolling}
          >
            {isEnrolling ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.buyButtonText}>
                {t("course.enrollNow")} - {finalPrice === 0 ? t("course.free") : `$${finalPrice.toFixed(2)}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={purchaseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="shopping-cart" size={48} color="#4F46E5" />
            <Text style={styles.modalTitle}>{t("course.confirmPurchase")}</Text>
            <Text style={styles.modalText}>
              {t("course.purchaseDescription", { title: course?.title, price: finalPrice.toFixed(2) })}
            </Text>
            {discountPercent > 0 && (
              <Text style={styles.modalSavingText}>
                {t("course.youSave", { percent: discountPercent, amount: (originalPrice - finalPrice).toFixed(2) })}
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handlePurchase}
              >
                <Text style={styles.modalConfirmText}>{t("common.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  loading: { flex: 1, justifyContent: "center" },
  header: { backgroundColor: "#FFF" },
  coverImage: { width: "100%", height: 200, backgroundColor: "#E5E7EB" },
  discountBadge: {
    position: 'absolute',
    top: 160,
    right: 20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  headerContent: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1F2937", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: "#6B7280", fontSize: 14 },

  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  authorLabel: { fontSize: 12, color: '#6B7280' },
  authorName: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },

  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  priceText: { fontSize: 22, fontWeight: "bold", color: "#10B981" },
  oldPriceText: { fontSize: 14, color: "#9CA3AF", textDecorationLine: "line-through" },
  salePriceText: { fontSize: 22, fontWeight: "bold", color: "#EF4444" },
  shareButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEF2FF", padding: 8, borderRadius: 8 },
  shareText: { color: "#4F46E5", marginLeft: 6, fontWeight: "600" },
  sectionHeader: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 8, marginTop: 12 },
  description: { fontSize: 15, color: "#4B5563", lineHeight: 22 },

  lessonHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  lessonCount: { fontSize: 14, color: "#6B7280" },
  lessonItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#FFF" },
  lessonItemLocked: { backgroundColor: "#F9FAFB" },
  lessonLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  indexCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  indexText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  lessonTitle: { fontSize: 16, color: "#1F2937", marginBottom: 4, flex: 1 },
  textLocked: { color: "#9CA3AF" },
  lessonDuration: { fontSize: 12, color: "#9CA3AF" },

  footer: { padding: 20, backgroundColor: "#F9FAFB" },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  writeReviewText: { color: "#4F46E5", fontWeight: "600" },
  noReviews: { color: "#9CA3AF", fontStyle: "italic" },
  reviewCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  reviewerName: { fontWeight: "600", color: "#1F2937" },
  ratingRow: { flexDirection: "row" },
  reviewComment: { color: "#4B5563", fontSize: 14 },

  floatingFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  buyButton: { backgroundColor: "#4F46E5", padding: 16, borderRadius: 12, alignItems: "center" },
  buyButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFF", width: "85%", padding: 24, borderRadius: 16, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginVertical: 12 },
  modalText: { textAlign: "center", color: "#6B7280", marginBottom: 12 },
  modalSavingText: { color: '#059669', marginBottom: 24, fontWeight: 'bold' },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancel: { flex: 1, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, alignItems: "center" },
  modalConfirm: { flex: 1, padding: 12, backgroundColor: "#4F46E5", borderRadius: 8, alignItems: "center" },
  modalCancelText: { color: "#6B7280", fontWeight: "600" },
  modalConfirmText: { color: "#FFF", fontWeight: "600" },
})

export default CourseDetailsScreen