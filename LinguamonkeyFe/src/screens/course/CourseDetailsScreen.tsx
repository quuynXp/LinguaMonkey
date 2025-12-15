import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Modal,
  TextInput,
  ScrollView
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import { useLessons } from "../../hooks/useLessons";
import { useRooms } from "../../hooks/useRoom";
import { useUserStore } from "../../stores/UserStore";
import { useCurrencyConverter } from "../../hooks/useCurrencyConverter";
import { useTransactionsApi } from "../../hooks/useTransaction";
import ScreenLayout from "../../components/layout/ScreenLayout";
import ReviewSection from "../../components/reviews/ReviewSection";
import CoursePurchaseModal from "../../components/modals/CoursePurchaseModal";
import { CourseVersionEnrollmentStatus } from "../../types/enums";
import { getCourseImage, getLessonImage } from "../../utils/courseUtils";
import { getCountryFlag } from "../../utils/flagUtils";
import { getAvatarSource } from "../../utils/avatarUtils";
import {
  CourseVersionDiscountResponse,
  CourseVersionEnrollmentResponse,
  CourseVersionReviewResponse,
  CourseResponse,
  LessonResponse,
  CourseVersionResponse
} from "../../types/dto";
import { gotoTab } from "../../utils/navigationRef";
import dayjs from "dayjs";

interface RefundReason {
  label: string;
  value: string;
}

const REFUND_REASONS: RefundReason[] = [
  { label: "Accidental Purchase", value: "[ACCIDENTAL_PURCHASE]" },
  { label: "Content Mismatch", value: "[CONTENT_MISMATCH]" },
  { label: "Technical/Quality Issue", value: "[TECHNICAL_ISSUE]" },
  { label: "Other (Describe below)", value: "OTHER" },
];

const CourseDetailsScreen = ({ route, navigation }: any) => {
  const params = route.params || {};
  const courseId = params.courseId || params.id;

  const { t } = useTranslation();
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { convert } = useCurrencyConverter();

  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [versionHistoryModalVisible, setVersionHistoryModalVisible] = useState(false);

  const [selectedRefundReason, setSelectedRefundReason] = useState(REFUND_REASONS[0].value);
  const [refundOtherText, setRefundOtherText] = useState("");

  const {
    useCourse,
    useEnrollments,
    useCreateEnrollment,
    useReviews,
    useDiscounts,
    useCreateReview,
    useInfiniteLessonsByVersion,
    useCourseVersions,
    useGetVersion
  } = useCourses();

  const { useLessonProgresses } = useLessons();
  const { useCreateTransaction } = useTransactionsApi();
  const { mutate: requestRefund, isPending: isRequestingRefund } = useCreateTransaction();
  const { useCourseRoom } = useRooms();

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: enrollments, refetch: refetchEnrollments } = useEnrollments({ userId: user?.userId });
  const { data: roomData, isLoading: roomLoading } = useCourseRoom(courseId);

  const { data: versionHistory } = useCourseVersions(courseId);
  const { data: userProgressData, refetch: refetchUserProgress } = useLessonProgresses({ userId: user?.userId, size: 1000 });

  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);

  const isCreator = user?.userId === course?.creatorId;

  const handleLessonComplete = useCallback(() => {
    setTimeout(() => {
      refetchUserProgress();
      refetchEnrollments();
    }, 500);
  }, [refetchUserProgress, refetchEnrollments]);

  useFocusEffect(
    useCallback(() => {
      if (user?.userId) {
        refetchEnrollments();
        refetchUserProgress();
      }
    }, [user?.userId, refetchEnrollments, refetchUserProgress])
  );

  useEffect(() => {
    if (course && !viewingVersionId) {
      if (course.latestPublicVersion?.versionId) {
        setViewingVersionId(course.latestPublicVersion.versionId);
      } else if (isCreator && course.latestDraftVersion?.versionId) {
        setViewingVersionId(course.latestDraftVersion.versionId);
      }
    }
  }, [course, isCreator, viewingVersionId]);

  const { data: selectedVersionData, isLoading: versionMetaLoading } = useGetVersion(viewingVersionId || "");

  const activeVersion = selectedVersionData
    || course?.latestPublicVersion
    || (isCreator ? course?.latestDraftVersion : null);

  const activeVersionId = activeVersion?.versionId;
  const isViewingArchived = activeVersion?.status === "ARCHIVED";
  const isViewingDraft = activeVersion?.status === "DRAFT";

  const {
    data: lessonsInfinite,
    isLoading: lessonsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteLessonsByVersion({
    versionId: activeVersionId,
    size: 20
  });

  const displayLessons = useMemo(() => {
    if (!lessonsInfinite) return [];
    const allLessons: LessonResponse[] = lessonsInfinite.pages.flatMap((page: any) => page.data || []);
    return allLessons.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [lessonsInfinite]);

  const activeEnrollment = useMemo(() => {
    return enrollments?.data?.find((e: any) =>
      e.courseVersion?.courseId === courseId ||
      e.courseVersion?.course?.courseId === courseId
    ) as CourseVersionEnrollmentResponse | undefined;
  }, [enrollments, courseId]);

  const completedLessonIdsSet = useMemo(() => {
    const ids = (activeEnrollment as any)?.completedLessonIds || [];
    return new Set(ids.map((id: any) => String(id)));
  }, [activeEnrollment]);

  const progressMap = useMemo(() => {
    const map: Record<string, { score: number; completedAt: string | null }> = {};
    if (!userProgressData?.data) return map;

    userProgressData.data.forEach((p: any) => {
      const rawId = p.lessonId || p.id?.lessonId;
      if (rawId) {
        map[String(rawId)] = {
          score: p.score,
          completedAt: p.completedAt
        };
      }
    });
    return map;
  }, [userProgressData]);

  const displayPriceRaw = activeVersion?.price ?? 0;

  const { data: discountsData } = useDiscounts({ versionId: activeVersionId, size: 1 });
  const activeDiscount = discountsData?.data?.[0] as CourseVersionDiscountResponse | undefined;

  const discountPercent = activeDiscount ? activeDiscount.discountPercentage : 0;
  const priceAfterDiscount = discountPercent > 0 ? displayPriceRaw * (1 - discountPercent / 100) : displayPriceRaw;

  const isFreeCourse = priceAfterDiscount <= 0;
  const isPaidCourse = !isFreeCourse;

  const { data: reviewsData, refetch: refetchReviews } = useReviews({
    courseId, userId: user?.userId, size: 5
  });

  const { mutateAsync: enrollAsync, isPending: isEnrolling } = useCreateEnrollment();
  const { mutateAsync: createReviewAsync, isPending: isCreatingReview } = useCreateReview();

  const isEnrolled = !!activeEnrollment;

  const progressPercent = useMemo(() => {
    if (!activeEnrollment) return 0;
    return activeEnrollment.progress || 0;
  }, [activeEnrollment]);

  const hasAccess = isEnrolled || isCreator || isFreeCourse;
  const reviews = (reviewsData?.data as any[]) || [];

  const displayThumbnail = activeVersion?.thumbnailUrl;
  const displayLanguage = activeVersion?.languageCode;
  const displayDifficulty = activeVersion?.difficultyLevel;
  const displayDescription = activeVersion?.description;
  const originalPrice = displayPriceRaw;

  const canReview = useMemo(() => {
    return isFreeCourse || isEnrolled;
  }, [isFreeCourse, isEnrolled]);

  const displayPriceStr = convert(priceAfterDiscount, 'VND');
  const displayOriginalPriceStr = convert(originalPrice, 'VND');

  const handleLessonPress = async (lesson: LessonResponse, isLessonCompleted: boolean) => {
    const isAccessible = hasAccess || lesson.isFree;

    const progressItem = progressMap[String(lesson.lessonId)];
    const latestScore = progressItem?.score;

    if (isLessonCompleted && isAccessible) {
      gotoTab("CourseStack", "LessonScreen", {
        lesson: lesson,
        onComplete: handleLessonComplete,
        isCompleted: true,
        latestScore: latestScore
      });
      return;
    }

    if (!isAccessible) {
      if (isPaidCourse) {
        setPurchaseModalVisible(true);
      } else {
        await handleFreeEnrollAndNavigate(lesson);
      }
      return;
    }

    if (isFreeCourse && !isEnrolled && !isCreator) {
      await handleFreeEnrollAndNavigate(lesson);
      return;
    }

    gotoTab("CourseStack", "LessonScreen", {
      lesson: lesson,
      onComplete: handleLessonComplete,
      isCompleted: false,
      latestScore: latestScore
    });
  };

  const handleFreeEnrollAndNavigate = async (lesson: LessonResponse) => {
    if (!user?.userId || !activeVersionId) return;
    try {
      await enrollAsync({
        userId: user.userId,
        courseVersionId: activeVersionId,
        status: CourseVersionEnrollmentStatus.ACTIVE
      });
      await refetchEnrollments();
      gotoTab("CourseStack", "LessonScreen", {
        lesson: lesson,
        onComplete: handleLessonComplete,
        isCompleted: false
      });
    } catch (error) {
      Alert.alert(t("error"), t("course.enrollmentFailed"));
    }
  };

  const handlePurchaseSuccess = () => {
    refetchEnrollments();
  };

  const handleAddReview = async (content: string, rating: number, parentId?: string, onSuccess?: (newReview: CourseVersionReviewResponse) => void) => {
    if (!user?.userId) {
      Alert.alert(t("auth.required"), t("auth.loginToReview"));
      return;
    }
    if (!canReview) {
      Alert.alert(t("notice"), t("course.reviewNotAllowed", "Bạn chưa đủ điều kiện để đánh giá khóa học này."));
      return;
    }
    if (!courseId) return;
    try {
      const newReview = await createReviewAsync({
        courseId: courseId, userId: user.userId, rating: rating, comment: content, parentId: parentId
      });
      if (!parentId) {
        refetchReviews();
      } else if (onSuccess) {
        onSuccess(newReview);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || t("course.reviewFailed");
      Alert.alert(t("error"), msg);
    }
  };

  const handleLikeReview = (reviewId: string) => {
    console.log("Liked review:", reviewId);
  };

  const handleJoinRoom = () => {
    const targetRoomId = course?.roomId || roomData?.roomId;
    const targetRoomName = course?.title || roomData?.roomName;

    if (targetRoomId) {
      gotoTab("Chat", "GroupChatScreen", {
        roomId: targetRoomId,
        roomName: targetRoomName
      });
    } else {
      if (roomLoading || courseLoading) {
        Alert.alert(t("common.loading"), t("course.roomLoading", "Đang kết nối phòng chat..."));
      } else {
        Alert.alert(t("notice"), t("course.noRoomAvailable", "Phòng chat chưa sẵn sàng. Vui lòng thử lại sau."));
      }
    }
  };

  const handleOpenSettings = () => setSettingsModalVisible(true);

  const handleNavigateToNotes = () => {
    setSettingsModalVisible(false);
    const prefillContent = `Study Notes for: ${course?.title || 'Course'} (v${activeVersion?.versionNumber})`;
    gotoTab("ProfileStack", "NotesScreen", {
      prefillContent: prefillContent,
      courseId: courseId
    });
  };

  const handleOpenRefund = () => {
    setSettingsModalVisible(false);
    setRefundModalVisible(true);
  };

  const handleOpenVersionHistory = () => {
    setSettingsModalVisible(false);
    setVersionHistoryModalVisible(true);
  };

  const handleSwitchVersion = (v: CourseVersionResponse) => {
    setViewingVersionId(v.versionId);
    setVersionHistoryModalVisible(false);
  };

  const handleSubmitRefund = () => {
    const finalDescription = selectedRefundReason === "OTHER"
      ? refundOtherText
      : `${selectedRefundReason} ${refundOtherText}`;

    if (!finalDescription.trim()) {
      Alert.alert("Required", "Please provide a reason for the refund.");
      return;
    }
    Alert.alert("Refund Requested", "Your request has been sent for analysis.");
    setRefundModalVisible(false);
    setRefundOtherText("");
  };

  const renderAuthorInfo = () => {
    if (!course) return null;
    const displayName = course.creatorName || course.creatorNickname || t("common.unknownUser");
    const avatarSource = getAvatarSource(course.creatorAvatar, "MALE");

    return (
      <TouchableOpacity
        style={styles.authorCard}
        onPress={() => gotoTab("ProfileStack", "UserProfileViewScreen", { userId: course.creatorId })}
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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.coverContainer}>
        <Image source={getCourseImage(displayThumbnail)} style={styles.coverImage} resizeMode="cover" />
        <View style={styles.coverOverlay} />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        {isEnrolled && (
          <TouchableOpacity
            style={[styles.settingsBtn, { top: insets.top + 10 }]}
            onPress={handleOpenSettings}
          >
            <Icon name="settings" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        {discountPercent > 0 && !isViewingArchived && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>SALE -{discountPercent}%</Text>
          </View>
        )}
        {isViewingArchived && (
          <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]}>
            <Icon name="history" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.statusBadgeText}>Archived Version {activeVersion?.versionNumber}</Text>
          </View>
        )}
        {isViewingDraft && (
          <View style={[styles.statusBadge, { backgroundColor: '#F59E0B' }]}>
            <Icon name="edit" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.statusBadgeText}>Draft Preview</Text>
          </View>
        )}
      </View>

      <View style={styles.contentBody}>
        <Text style={styles.title}>{course?.title || t("common.loading")}</Text>
        <View style={styles.statsWrapper}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.statValue}>{course?.averageRating?.toFixed(1) || "0.0"}</Text>
              <Text style={styles.statLabel}>({course?.reviewCount || 0})</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Icon name="signal-cellular-alt" size={16} color="#6B7280" />
              <Text style={styles.statValue}>{displayDifficulty || "-"}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Icon name="translate" size={16} color="#6B7280" />
              <Text style={styles.statValue}>{displayLanguage || "-"}</Text>
            </View>
          </View>
          {hasAccess ? (
            <TouchableOpacity style={styles.headerBuyBtn} onPress={handleJoinRoom}>
              <Text style={styles.headerBuyText}>{t('chat.join_room', 'Join Room')}</Text>
              <Icon name="chat" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : isPaidCourse ? (
            <TouchableOpacity style={styles.headerBuyBtn} onPress={() => setPurchaseModalVisible(true)}>
              <Text style={styles.headerBuyText}>{t('common.buy')}</Text>
              <Icon name="shopping-cart" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : isCreator && (
            <View style={[styles.headerBuyBtn, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.headerBuyText, { color: '#4F46E5' }]}>Creator View</Text>
            </View>
          )}
        </View>

        {renderAuthorInfo()}

        {isEnrolled && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                {progressPercent >= 100 ? "Completed!" : "Your Progress"}
              </Text>
              <Text style={styles.progressValueText}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSubtitle}>
              {progressPercent >= 100
                ? "You have finished this course."
                : `${Math.round((progressPercent / 100) * (displayLessons.length || 0))} / ${displayLessons.length || '?'} lessons completed`
              }
            </Text>
          </View>
        )}

        {!hasAccess && (
          <View style={styles.priceContainer}>
            {discountPercent > 0 ? (
              <View style={styles.priceRow}>
                <Text style={styles.salePriceText}>
                  {priceAfterDiscount === 0 ? t("course.free") : `${displayPriceStr.toLocaleString()} VND`}
                </Text>
                <Text style={styles.oldPriceText}>{displayOriginalPriceStr.toLocaleString()} VND</Text>
              </View>
            ) : (
              <Text style={styles.priceText}>
                {originalPrice === 0 ? t("course.free") : `${displayOriginalPriceStr.toLocaleString()} VND`}
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>{t("course.description")}</Text>
          <Text style={styles.description}>
            {displayDescription || t("course.noDescription", "Chưa có mô tả.")}
          </Text>
        </View>

        {activeVersion?.reasonForChange && (
          <View style={styles.updateNoteContainer}>
            <Text style={styles.updateNoteTitle}>Version {activeVersion.versionNumber} Update:</Text>
            <Text style={styles.updateNoteText}>{activeVersion.reasonForChange}</Text>
          </View>
        )}

        {activeVersion?.isSystemReviewed && (
          <View style={styles.systemReviewContainer}>
            <View style={styles.systemReviewHeader}>
              <Icon name="verified-user" size={20} color="#3B82F6" />
              <Text style={styles.systemReviewTitle}>System AI Analysis</Text>
            </View>
            <Text style={styles.systemReviewText}>
              This content has been verified by our quality system.
            </Text>
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>{t("course.curriculum")}</Text>
          {(lessonsLoading || versionMetaLoading) && !displayLessons.length ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 20 }} />
          ) : displayLessons.length === 0 ? (
            <Text style={styles.emptyText}>{t("course.noContent")}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderLessonItem: ListRenderItem<LessonResponse> = ({ item, index }) => {
    const isUnlocked = hasAccess || item.isFree;
    const isLocked = !isUnlocked;

    const progressItem = progressMap[String(item.lessonId)];
    const score = progressItem?.score;

    const isCompletedInEnrollment = completedLessonIdsSet.has(String(item.lessonId));
    const hasPassingScore = score !== undefined && score >= 50;
    const isLessonCompleted = isCompletedInEnrollment || hasPassingScore;

    let isOutdated = false;
    if (progressItem?.completedAt && item.updatedAt) {
      isOutdated = dayjs(item.updatedAt).isAfter(dayjs(progressItem.completedAt));
    }

    return (
      <View style={{ paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={[styles.lessonItem, isLocked && styles.lessonItemLocked]}
          onPress={() => handleLessonPress(item, isLessonCompleted)}
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
              {item.orderIndex !== undefined ? item.orderIndex + 1 : index + 1}. {item.lessonName || item.title}
            </Text>
            <View style={styles.lessonMetaRow}>
              <Icon name="schedule" size={12} color="#9CA3AF" />
              <Text style={styles.lessonDuration}>
                {Math.ceil((item.durationSeconds || 0) / 60)} min • {item.lessonType || 'LESSON'}
              </Text>

              {isOutdated && (
                <View style={[styles.progressTag, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1 }]}>
                  <Icon name="update" size={10} color="#F97316" />
                  <Text style={[styles.progressTagText, { color: "#F97316" }]}>Updated</Text>
                </View>
              )}

              {score !== undefined && (
                <View style={[styles.progressTag, { backgroundColor: isLessonCompleted ? '#ECFDF5' : '#FEF2F2' }]}>
                  <Icon name={isLessonCompleted ? "check-circle" : "cancel"} size={12} color={isLessonCompleted ? "#10B981" : "#EF4444"} />
                  <Text style={[styles.progressTagText, { color: isLessonCompleted ? "#10B981" : "#EF4444" }]}>
                    {Math.round(score)}%
                  </Text>
                </View>
              )}

              {item.isFree && isPaidCourse && !isLessonCompleted && (
                <View style={styles.freeTag}>
                  <Text style={styles.freeTagText}>FREE</Text>
                </View>
              )}
            </View>
          </View>

          {isLocked ? (
            <Icon name="lock-outline" size={24} color="#9CA3AF" />
          ) : isLessonCompleted ? (
            <Icon name="check-circle" size={24} color="#10B981" />
          ) : isOutdated ? (
            <Icon name="published-with-changes" size={24} color="#F59E0B" />
          ) : (
            <Icon name="radio-button-unchecked" size={24} color="#D1D5DB" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {isFetchingNextPage && (
        <ActivityIndicator size="small" color="#4F46E5" style={{ marginBottom: 20 }} />
      )}
      <View style={styles.reviewsWrapper}>
        <ReviewSection
          entityId={courseId}
          reviews={reviews}
          onAddReview={handleAddReview}
          isAddingReview={isCreatingReview}
          onLikeReview={handleLikeReview}
          canReview={canReview}
        />
      </View>
    </View>
  );

  if (!courseId) return null;

  if (courseLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!activeVersion && !isCreator) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Course version unavailable.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 10 }}>
          <Text style={{ color: '#4F46E5' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        data={displayLessons}
        extraData={[progressMap, completedLessonIdsSet]}
        renderItem={renderLessonItem}
        keyExtractor={(item) => item.lessonId || String(item.orderIndex)}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: "#FFF" }}
      />

      {isEnrolling && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Joining Course...</Text>
          </View>
        </View>
      )}

      {activeVersion && (
        <CoursePurchaseModal
          visible={purchaseModalVisible}
          onClose={() => setPurchaseModalVisible(false)}
          course={course as CourseResponse}
          activeDiscount={activeDiscount as any}
          onSuccess={handlePurchaseSuccess}
        />
      )}

      <Modal visible={settingsModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsModalVisible(false)}>
          <View style={styles.settingsPopup}>
            <Text style={styles.settingsTitle}>Course Options</Text>
            <TouchableOpacity style={styles.settingsOption} onPress={handleNavigateToNotes}>
              <Icon name="edit-note" size={24} color="#37352F" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.optionTitle}>Study Notes</Text>
                <Text style={styles.optionSubtitle}>View or add notes for this course</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsOption} onPress={handleOpenVersionHistory}>
              <Icon name="history" size={24} color="#37352F" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.optionTitle}>Version History</Text>
                <Text style={styles.optionSubtitle}>Switch to older versions</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsOption} onPress={handleOpenRefund}>
              <Icon name="settings-backup-restore" size={24} color="#EF4444" />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.optionTitle, { color: '#EF4444' }]}>Request Refund</Text>
                <Text style={styles.optionSubtitle}>View status or submit request</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={versionHistoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.refundModalContent, { height: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Version History</Text>
              <TouchableOpacity onPress={() => setVersionHistoryModalVisible(false)}>
                <Icon name="close" size={24} color="#37352F" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {versionHistory?.map((v) => (
                <TouchableOpacity
                  key={v.versionId}
                  style={[
                    styles.versionItem,
                    viewingVersionId === v.versionId && styles.versionItemSelected
                  ]}
                  onPress={() => handleSwitchVersion(v)}
                >
                  <View style={styles.versionRow}>
                    <Text style={[styles.versionNum, viewingVersionId === v.versionId && { color: '#4F46E5' }]}>
                      v{v.versionNumber}
                    </Text>
                    {v.status === 'PUBLIC' && <View style={styles.tagPublic}><Text style={styles.tagText}>LATEST</Text></View>}
                    {v.status === 'ARCHIVED' && <View style={styles.tagArchived}><Text style={styles.tagText}>ARCHIVED</Text></View>}
                  </View>
                  <Text style={styles.versionDate}>Published: {dayjs(v.publishedAt).format('DD MMM YYYY')}</Text>
                  {v.reasonForChange && (
                    <Text style={styles.versionReason} numberOfLines={2}>{v.reasonForChange}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={refundModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.refundModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Refund</Text>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Icon name="close" size={24} color="#37352F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Select Reason:</Text>
            <View style={styles.dropdownContainer}>
              {REFUND_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.dropdownItem,
                    selectedRefundReason === reason.value && styles.dropdownItemSelected
                  ]}
                  onPress={() => setSelectedRefundReason(reason.value)}
                >
                  <Text style={[
                    styles.dropdownText,
                    selectedRefundReason === reason.value && styles.dropdownTextSelected
                  ]}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Additional Details:</Text>
            <TextInput
              style={styles.refundInput}
              multiline
              placeholder={selectedRefundReason === "OTHER" ? "Please explain why..." : "Optional details..."}
              value={refundOtherText}
              onChangeText={setRefundOtherText}
            />
            <TouchableOpacity style={styles.submitRefundBtn} onPress={handleSubmitRefund}>
              {isRequestingRefund ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitRefundText}>Submit Request</Text>}
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Standard requests (Accidental/Technical) are processed every 5 minutes. Complex requests may take longer.
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#FFF' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, alignItems: 'center', gap: 10 },
  loadingText: { color: '#4F46E5', fontWeight: 'bold' },
  headerContainer: { backgroundColor: "#FFF" },
  coverContainer: { height: 240, width: "100%", position: "relative" },
  coverImage: { width: "100%", height: "100%", borderRadius: 0, backgroundColor: "#E5E7EB" },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backBtn: { position: 'absolute', left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  settingsBtn: { position: 'absolute', right: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  discountBadge: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  discountBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { position: 'absolute', bottom: 16, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  statusBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
  contentBody: { padding: 20, marginTop: -20, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 0 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 12, lineHeight: 30 },
  statsWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', alignItems: 'center' },
  headerBuyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  headerBuyText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontWeight: '700', color: '#374151', fontSize: 14 },
  statLabel: { color: '#6B7280', fontSize: 13 },
  verticalDivider: { width: 1, height: 14, backgroundColor: '#D1D5DB', marginHorizontal: 12 },
  authorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
  authorAvatarContainer: { position: 'relative', marginRight: 12 },
  authorAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FFF' },
  flagOverlay: { position: 'absolute', top: -2, right: -4, backgroundColor: '#FFF', borderRadius: 8, padding: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#1F2937', maxWidth: '70%' },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
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
  updateNoteContainer: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 20 },
  updateNoteTitle: { color: '#B45309', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  updateNoteText: { color: '#92400E', fontSize: 13 },
  systemReviewContainer: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  systemReviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  systemReviewTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A' },
  systemReviewText: { fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  lessonItem: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 10, backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  lessonItemLocked: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6", opacity: 0.8 },
  lessonThumbContainer: { position: 'relative', width: 60, height: 60, marginRight: 12 },
  lessonThumb: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: "#E5E7EB" },
  playIconOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  lessonContent: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lessonDuration: { fontSize: 12, color: "#9CA3AF" },
  textLocked: { color: "#9CA3AF" },
  emptyText: { fontStyle: "italic", color: "#9CA3AF", marginBottom: 10 },
  footerContainer: { marginTop: 10 },
  reviewsWrapper: { paddingHorizontal: 20 },
  freeTag: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  freeTagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  progressTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8, gap: 2 },
  progressTagText: { fontSize: 10, fontWeight: 'bold' },
  progressContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { fontWeight: '600', color: '#374151' },
  progressValueText: { fontWeight: 'bold', color: '#4F46E5' },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#4F46E5' },
  progressSubtitle: { fontSize: 12, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  settingsPopup: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  settingsOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  optionSubtitle: { fontSize: 12, color: '#9CA3AF' },
  refundModalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' },
  dropdownContainer: { marginBottom: 16 },
  dropdownItem: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  dropdownItemSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  dropdownText: { color: '#374151' },
  dropdownTextSelected: { color: '#4F46E5', fontWeight: '600' },
  refundInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 20 },
  submitRefundBtn: { backgroundColor: '#EF4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitRefundText: { color: '#FFF', fontWeight: 'bold' },
  disclaimer: { fontSize: 11, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  versionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  versionItemSelected: { backgroundColor: '#EEF2FF' },
  versionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  versionNum: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginRight: 8 },
  tagPublic: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagArchived: { backgroundColor: '#9CA3AF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  versionDate: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  versionReason: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
});

export default CourseDetailsScreen;