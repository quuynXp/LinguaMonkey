import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter";
import ScreenLayout from "../../components/layout/ScreenLayout";
import ReviewSection from "../../components/reviews/ReviewSection";
import { CourseEnrollmentStatus } from "../../types/enums";
import { getCourseImage, getLessonImage } from "../../utils/courseUtils";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";
import { CourseDiscount } from "../../types/entity";

const CourseDetailsScreen = ({ route, navigation }: any) => {
  // FIX: Lấy courseId an toàn hơn, hỗ trợ trường hợp truyền params là 'id' hoặc 'courseId'
  const params = route.params || {};
  const courseId = params.courseId || params.id;

  const { t } = useTranslation();
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { convert } = useCurrencyConverter();

  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);

  const {
    useCourse,
    useEnrollments,
    useCreateEnrollment,
    useReviews,
    useDiscounts,
    useCreateReview
  } = useCourses();

  // Các hooks sẽ tự động disable nếu courseId không tồn tại (nhờ logic enabled trong useCourses)
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: enrollments } = useEnrollments({ userId: user?.userId });
  const { data: reviewsData, refetch: refetchReviews } = useReviews({ courseId, size: 5 });
  const { mutate: enroll, isPending: isEnrolling } = useCreateEnrollment();
  const { mutate: createReview, isPending: isCreatingReview } = useCreateReview();
  const { data: discountsData } = useDiscounts({ courseId, size: 1 });

  const activeDiscount = discountsData?.data?.[0] as CourseDiscount | undefined;

  const isEnrolled = useMemo(() => {
    return enrollments?.data?.some((e: any) => e.courseId === courseId);
  }, [enrollments, courseId]);

  const version = course?.latestPublicVersion;
  const allLessons = version?.lessons || [];
  const reviews = (reviewsData?.data as any[]) || [];

  const originalPrice = course?.price || 0;
  const discountPercent = activeDiscount ? activeDiscount.discountPercentage : 0;
  const priceAfterDiscount = discountPercent > 0
    ? originalPrice * (1 - discountPercent / 100)
    : originalPrice;

  const displayPrice = convert(priceAfterDiscount, 'VND');
  const displayOriginalPrice = convert(originalPrice, 'VND');

  const freeLessons = allLessons.filter(l => l.isFree);
  const paidLessons = allLessons.filter(l => !l.isFree);

  const handleLessonPress = (lesson: any) => {
    const isAccessible = isEnrolled || lesson.isFree;

    if (!isAccessible) {
      setPurchaseModalVisible(true);
      return;
    }

    if (lesson.videoUrls && lesson.videoUrls.length > 0) {
      navigation.navigate("LessonVideoScreen", {
        url: lesson.videoUrls[0],
        title: lesson.title,
        lessonId: lesson.lessonId
      });
    } else {
      navigation.navigate("LessonDocumentScreen", {
        url: "https://docs.google.com/viewer?embedded=true&url=" + (lesson.materialUrl || ""),
        title: lesson.title,
        lessonId: lesson.lessonId
      });
    }
  };

  const handlePurchase = () => {
    if (!user?.userId || !version?.versionId) return;

    setPurchaseModalVisible(false);
    enroll({
      userId: user.userId,
      courseVersionId: version.versionId,
      status: CourseEnrollmentStatus.ACTIVE
    }, {
      onSuccess: () => Alert.alert(t("success"), t("course.enrollmentSuccess")),
      onError: () => Alert.alert(t("error"), t("course.enrollmentFailed"))
    });
  };

  const handleAddReview = (content: string, parentId?: string) => {
    if (!user?.userId) {
      Alert.alert(t("auth.required"), t("auth.loginToReview"));
      return;
    }

    // FIX: Kiểm tra courseId trước khi gọi API để tránh lỗi Backend 400
    if (!courseId) {
      Alert.alert(t("error"), "Course ID is missing. Please reload the screen.");
      return;
    }

    createReview({
      courseId: courseId, // Đảm bảo biến này có giá trị (string UUID)
      userId: user.userId,
      rating: 5,
      comment: content,
      parentId: parentId
    }, {
      onSuccess: () => {
        refetchReviews();
      },
      onError: (error: any) => {
        console.error("Review Error:", error);
        Alert.alert(t("error"), t("course.reviewFailed"));
      }
    });
  };

  const handleLikeReview = (reviewId: string) => {
    console.log("Liked review:", reviewId);
  };

  const renderAuthorInfo = () => {
    if (!course) return null;

    const displayName = course.creatorName || course.creatorNickname || t("common.unknownUser");
    const avatarSource = getAvatarSource(course.creatorAvatar, "MALE");

    return (
      <TouchableOpacity
        style={styles.authorCard}
        onPress={() => navigation.push("ProfileViewScreen", { userId: course.creatorId })}
        activeOpacity={0.7}
      >
        <View style={styles.authorAvatarContainer}>
          <Image source={avatarSource} style={styles.authorAvatar} />
          <View style={styles.flagOverlay}>
            {getCountryFlag(course.creatorCountry, 14)}
          </View>
        </View>

        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName} numberOfLines={1}>{displayName}</Text>
            {course.creatorVip && (
              <View style={styles.vipBadge}>
                <Icon name="verified" size={10} color="#FFF" />
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.authorMeta}>
            Level {course.creatorLevel || 1} • {t("common.teacher")}
          </Text>
        </View>

        <View style={styles.viewProfileBtn}>
          <Text style={styles.viewProfileText}>{t("common.view")}</Text>
          <Icon name="chevron-right" size={16} color="#4F46E5" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLessonItem = (item: any, index: number, isLocked: boolean) => (
    <TouchableOpacity
      key={item.lessonId}
      style={[styles.lessonItem, isLocked && styles.lessonItemLocked]}
      onPress={() => handleLessonPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.lessonThumbContainer}>
        <Image source={getLessonImage(item.thumbnailUrl)} style={styles.lessonThumb} />
        <View style={styles.playIconOverlay}>
          <Icon name="play-arrow" size={20} color="#FFF" />
        </View>
      </View>

      <View style={styles.lessonContent}>
        <Text style={[styles.lessonTitle, isLocked && styles.textLocked]} numberOfLines={2}>
          {index + 1}. {item.title}
        </Text>
        <View style={styles.lessonMetaRow}>
          <Icon name="schedule" size={12} color="#9CA3AF" />
          <Text style={styles.lessonDuration}>
            {Math.ceil((item.durationSeconds || 0) / 60)} min • {item.lessonType}
          </Text>
        </View>
      </View>

      {isLocked ? (
        <Icon name="lock-outline" size={24} color="#9CA3AF" />
      ) : (
        <Icon name="check-circle-outline" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.coverContainer}>
        <Image source={getCourseImage(version?.thumbnailUrl)} style={styles.coverImage} resizeMode="cover" />
        <View style={styles.coverOverlay} />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>SALE -{discountPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.contentBody}>
        <Text style={styles.title}>{course?.title || t("common.loading")}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="star" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>({reviews.length})</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Icon name="signal-cellular-alt" size={16} color="#6B7280" />
            <Text style={styles.statValue}>{course?.difficultyLevel || "-"}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Icon name="translate" size={16} color="#6B7280" />
            <Text style={styles.statValue}>{course?.languageCode || "-"}</Text>
          </View>
        </View>

        {renderAuthorInfo()}

        {!isEnrolled && (
          <View style={styles.priceContainer}>
            {discountPercent > 0 ? (
              <View style={styles.priceRow}>
                <Text style={styles.salePriceText}>
                  {priceAfterDiscount === 0 ? t("course.free") : `${displayPrice.toLocaleString()} VND`}
                </Text>
                <Text style={styles.oldPriceText}>{displayOriginalPrice.toLocaleString()} VND</Text>
              </View>
            ) : (
              <Text style={styles.priceText}>
                {originalPrice === 0 ? t("course.free") : `${displayOriginalPrice.toLocaleString()} VND`}
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>{t("course.description")}</Text>
          <Text style={styles.description}>
            {version?.description || t("course.noDescription", "Chưa có mô tả cho khóa học này.")}
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>{t("course.curriculum")}</Text>

          {freeLessons.length > 0 && (
            <View style={styles.lessonGroup}>
              <Text style={styles.subSectionHeader}>{t("course.freeLessons")}</Text>
              {freeLessons.map((l, i) => renderLessonItem(l, i, false))}
            </View>
          )}

          {paidLessons.length > 0 ? (
            <View style={styles.lessonGroup}>
              <Text style={[styles.subSectionHeader, { marginTop: 12 }]}>{t("course.courseContent")}</Text>
              {paidLessons.map((l, i) => renderLessonItem(l, i, !isEnrolled))}
            </View>
          ) : (
            freeLessons.length === 0 && <Text style={styles.emptyText}>{t("course.noContent")}</Text>
          )}
        </View>
      </View>
    </View>
  );

  // Nếu không có courseId, hiển thị thông báo lỗi thay vì loading mãi mãi
  if (!courseId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'red' }}>Error: Course ID missing in navigation params.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: 'blue' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (courseLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {renderHeader()}
        <View style={styles.reviewsWrapper}>
          <ReviewSection
            entityId={courseId}
            reviews={reviews}
            onAddReview={handleAddReview}
            isAddingReview={isCreatingReview}
            onLikeReview={handleLikeReview}
          />
        </View>
      </ScrollView>

      {!isEnrolled && (
        <View style={styles.floatingFooter}>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => setPurchaseModalVisible(true)}
            disabled={isEnrolling}
            activeOpacity={0.8}
          >
            {isEnrolling ? <ActivityIndicator color="#FFF" /> : (
              <View style={styles.buyBtnContent}>
                <Text style={styles.buyButtonText}>{t("course.enrollNow")}</Text>
                <View style={styles.verticalDividerWhite} />
                <Text style={styles.buyButtonPrice}>
                  {priceAfterDiscount === 0 ? t("course.free") : `${displayPrice.toLocaleString()} VND`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={purchaseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="shopping-bag" size={32} color="#4F46E5" />
            </View>
            <Text style={styles.modalTitle}>{t("course.confirmPurchase")}</Text>
            <Text style={styles.modalText}>{course?.title}</Text>
            <Text style={styles.modalPrice}>{displayPrice.toLocaleString()} VND</Text>

            {discountPercent > 0 && (
              <View style={styles.modalSavingBadge}>
                <Text style={styles.modalSavingText}>
                  {t("course.youSave", { percent: discountPercent })}
                </Text>
              </View>
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
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#FFF' },
  headerContainer: { backgroundColor: "#FFF" },
  coverContainer: { height: 240, width: "100%", position: "relative" },
  coverImage: { width: "100%", height: "100%", backgroundColor: "#E5E7EB" },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backBtn: {
    position: 'absolute', left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8
  },
  discountBadge: {
    position: 'absolute', bottom: 16, left: 16,
    backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3
  },
  discountBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  contentBody: {
    padding: 20, marginTop: -20,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 12, lineHeight: 30 },
  statsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontWeight: '700', color: '#374151', fontSize: 14 },
  statLabel: { color: '#6B7280', fontSize: 13 },
  verticalDivider: { width: 1, height: 14, backgroundColor: '#D1D5DB', marginHorizontal: 12 },
  authorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24
  },
  authorAvatarContainer: { position: 'relative', marginRight: 12 },
  authorAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FFF' },
  flagOverlay: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#FFF', borderRadius: 8, padding: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2
  },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#1F2937', maxWidth: '70%' },
  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4
  },
  vipText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  authorMeta: { fontSize: 12, color: '#6B7280' },
  viewProfileBtn: { flexDirection: 'row', alignItems: 'center' },
  viewProfileText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  priceContainer: { marginBottom: 24 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  priceText: { fontSize: 26, fontWeight: "800", color: "#10B981" },
  salePriceText: { fontSize: 26, fontWeight: "800", color: "#EF4444" },
  oldPriceText: { fontSize: 16, color: "#9CA3AF", textDecorationLine: "line-through", marginBottom: 4 },
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  description: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  lessonGroup: { marginBottom: 8 },
  subSectionHeader: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  lessonItem: {
    flexDirection: "row", alignItems: "center",
    padding: 10, marginBottom: 10,
    backgroundColor: "#FFF", borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1
  },
  lessonItemLocked: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6", opacity: 0.8 },
  lessonThumbContainer: { position: 'relative', width: 60, height: 60, marginRight: 12 },
  lessonThumb: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: "#E5E7EB" },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center'
  },
  lessonContent: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lessonDuration: { fontSize: 12, color: "#9CA3AF" },
  textLocked: { color: "#9CA3AF" },
  emptyText: { fontStyle: "italic", color: "#9CA3AF", marginBottom: 10 },
  reviewsWrapper: { paddingHorizontal: 20 },
  floatingFooter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 10
  },
  buyButton: {
    backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 16,
    alignItems: "center",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  buyBtnContent: { flexDirection: 'row', alignItems: 'center' },
  buyButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  verticalDividerWhite: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },
  buyButtonPrice: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFF", width: "85%", padding: 24, borderRadius: 24, alignItems: "center" },
  modalIconContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: '#111827', marginBottom: 8 },
  modalText: { textAlign: "center", color: "#6B7280", marginBottom: 16, paddingHorizontal: 10 },
  modalPrice: { fontSize: 24, fontWeight: "800", color: "#4F46E5", marginBottom: 8 },
  modalSavingBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 24 },
  modalSavingText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancel: { flex: 1, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, alignItems: "center" },
  modalConfirm: { flex: 1, padding: 14, backgroundColor: "#4F46E5", borderRadius: 12, alignItems: "center" },
  modalCancelText: { color: "#6B7280", fontWeight: "600" },
  modalConfirmText: { color: "#FFF", fontWeight: "600" },
});

export default CourseDetailsScreen;