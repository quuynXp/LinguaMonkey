import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  ListRenderItem,
  Dimensions,
  ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { useUserStore } from "../../stores/UserStore";
import { useCourses } from "../../hooks/useCourses";
import { useLessons } from "../../hooks/useLessons";
import { useLessonStructure } from "../../hooks/useLessonStructure";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type {
  CourseResponse,
  LessonResponse,
  CourseVersionEnrollmentResponse,
} from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getLessonImage } from "../../utils/courseUtils";
import { getDirectMediaUrl } from "../../utils/mediaUtils";
import { getCountryFlag } from "../../utils/flagUtils";
import VipUpgradeModal from "../../components/modals/VipUpgradeModal";
import { gotoTab } from "../../utils/navigationRef";

const { width } = Dimensions.get("window");
const PLACEHOLDER_IMAGE = require("../../assets/images/ImagePlacehoderCourse.png");

const SCREEN_PADDING = 20;
const COLUMN_GAP = 12;

type LanguageOption = {
  code: string;
  name: string;
  flag: React.JSX.Element | null;
};

const CategoryLessonsView = ({
  categoryId,
  categoryName,
  onBack,
  navigation
}: {
  categoryId: string;
  categoryName: string;
  onBack: () => void;
  navigation: any;
}) => {
  const { t } = useTranslation();
  const { useAllLessons } = useLessons();
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching, refetch } = useAllLessons({
    categoryId,
    page,
    size: 20,
  });

  const lessons = useMemo(() => (data?.data as LessonResponse[]) || [], [data]);

  const loadMore = () => {
    if (data?.pagination && !data.pagination.isLast && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const handleStartLesson = (lesson: LessonResponse) => {
    navigation.navigate("LessonScreen", { lesson });
  };

  const renderLessonItem: ListRenderItem<LessonResponse> = ({ item }) => (
    <TouchableOpacity
      style={styles.lessonRow}
      onPress={() => handleStartLesson(item)}
    >
      <Image
        source={getLessonImage(item.thumbnailUrl)}
        style={styles.lessonThumbnailSmall}
      />
      <View style={styles.lessonRowContent}>
        <Text style={styles.lessonRowTitle} numberOfLines={1}>{item.title || item.lessonName}</Text>
        <View style={styles.lessonRowMeta}>
          <Text style={styles.lessonRowSubtitle}>{item.difficultyLevel || 'A1'}</Text>
          <View style={styles.dotSmall} />
          <Text style={[styles.lessonRowSubtitle, { color: '#F59E0B' }]}>
            {item.expReward || 10} XP
          </Text>
          {typeof item.durationSeconds === 'number' && item.durationSeconds > 0 ? (
            <>
              <View style={styles.dotSmall} />
              <Text style={styles.lessonRowSubtitle}>{Math.ceil(item.durationSeconds / 60)} mins</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.playButtonSmall}>
        <Icon name="play-arrow" size={20} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.subScreenContainer}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && page === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={lessons}
          renderItem={renderLessonItem}
          keyExtractor={(item) => item.lessonId}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListFooterComponent={
            <View style={styles.footerLoader}>
              {!data?.pagination?.isLast ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={isFetching}>
                  {isFetching ? <ActivityIndicator color="#4F46E5" /> : <Text style={styles.loadMoreText}>{t("common.loadMore")}</Text>}
                </TouchableOpacity>
              ) : lessons.length > 0 ? (
                <Text style={styles.endText}>{t("common.endOfList")}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("common.noData", "Không có bài học nào")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const LearningLanguageSelector = ({
  selectedLanguage,
  onSelectLanguage,
  learningLanguages,
}: {
  selectedLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  learningLanguages: LanguageOption[];
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = learningLanguages.length > 1;

  if (!learningLanguages || learningLanguages.length === 0) {
    return (
      <View style={styles.languageSelectorContainer}>
        <Text style={styles.noLanguageText}>{t("learn.noLanguage")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.languageSelectorContainer}>
      <TouchableOpacity
        style={[styles.selectedLanguageButton, !canExpand && { paddingRight: 8 }]}
        onPress={() => canExpand && setIsExpanded(!isExpanded)}
        activeOpacity={canExpand ? 0.7 : 1}
        disabled={!canExpand}
      >
        <View style={styles.languageFlagWrapper}>
          {selectedLanguage.flag}
        </View>
        {canExpand ? (
          <Icon
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color="#4F46E5"
            style={{ marginLeft: 4 }}
          />
        ) : null}
      </TouchableOpacity>

      {isExpanded && canExpand ? (
        <View style={styles.languageDropdown}>
          {learningLanguages.filter(lang => lang.code !== selectedLanguage.code).map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageItem}
              onPress={() => {
                onSelectLanguage(lang);
                setIsExpanded(false);
              }}
            >
              <View style={styles.languageFlagWrapper}>
                {lang.flag}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const TopSellingCoursesList = ({
  t,
  onSeeAll,
  courses,
  isLoading,
  navigation
}: {
  t: any;
  onSeeAll: () => void;
  courses: CourseResponse[];
  isLoading: boolean;
  navigation: any;
}) => {
  const handleCoursePress = (course: CourseResponse) => {
    gotoTab("CourseStack", "CourseDetailsScreen", { courseId: course.courseId });
  };

  const renderItem: ListRenderItem<CourseResponse> = ({ item }) => {
    if (!item.latestPublicVersion) return null;

    const studentCount = item.totalStudents || 0;
    const processedUrl = getDirectMediaUrl(item.latestPublicVersion.thumbnailUrl);
    const thumbSource = processedUrl ? { uri: processedUrl } : PLACEHOLDER_IMAGE;

    return (
      <TouchableOpacity
        style={styles.gridCardFlat}
        onPress={() => handleCoursePress(item)}
      >
        <Image
          source={thumbSource}
          style={styles.gridCardImage}
          resizeMode="cover"
        />
        <View style={styles.gridCardContent}>
          <Text style={styles.gridCardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.gridCardMeta}>
            <Icon name="people" size={14} color="#6B7280" />
            <Text style={styles.gridCardMetaText}>{studentCount} students</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t("learn.topSelling", "Top khóa học bán chạy")}</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>{t("common.seeAll", "Xem tất cả")}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.courseId}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: COLUMN_GAP }}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t("common.noData", "Không có dữ liệu")}</Text>
          }
        />
      )}
    </View>
  );
};

const LearnScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const userStore = useUserStore();
  const isVip = userStore.vip;
  const { user, refreshUserProfile } = userStore;

  const { useEnrollments, useRecommendedCourses, useCreatorCourses, useTopSellingCourses } = useCourses();
  const { useCategories } = useLessonStructure();

  const getLanguageOption = useCallback((langCode: string): LanguageOption => ({
    code: langCode,
    name: langCode.toUpperCase(),
    flag: getCountryFlag(langCode, 22),
  }), []);

  const learningLanguages: LanguageOption[] = useMemo(() => {
    if (userStore.languages && userStore.languages.length > 0) {
      return userStore.languages.map(getLanguageOption);
    }
    return [getLanguageOption('en')];
  }, [userStore.languages, getLanguageOption]);

  const [showVipModal, setShowVipModal] = useState(false);
  const [viewMode, setViewMode] = useState<'HOME' | 'CATEGORY_LESSONS'>('HOME');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    learningLanguages[0] || getLanguageOption('en')
  );
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (learningLanguages.length > 0 && !learningLanguages.find(lang => lang.code === selectedLanguage.code)) {
      setSelectedLanguage(learningLanguages[0]);
    }
  }, [learningLanguages]);

  const { data: enrolledData, isLoading: enrolledLoading, refetch: refetchEnrolled } = useEnrollments({
    userId: user?.userId,
    page: 0,
    size: 20,
  });

  const {
    data: creatorData,
    isLoading: creatorLoading,
    refetch: refetchCreator
  } = useCreatorCourses(user?.userId, 0, 5);

  const { data: recommendedData, isLoading: recLoading, refetch: refetchRec } = useRecommendedCourses(
    user?.userId,
    5
  );

  const { data: topSellingData, isLoading: topSellingLoading, refetch: refetchTopSelling } = useTopSellingCourses(10);

  const { refetch: refetchCats } = useCategories({
    lang: selectedLanguage.code,
    page: 0,
    size: 50
  });

  useFocusEffect(
    useCallback(() => {
      refreshUserProfile();
    }, [refreshUserProfile])
  );

  const handleRefresh = async () => {
    refetchEnrolled();
    refetchRec();
    refetchCreator();
    refetchTopSelling();
    refetchCats();
    await refreshUserProfile();
  };

  const topSellingCourses = useMemo(() => (topSellingData as CourseResponse[]) || [], [topSellingData]);

  const handleSeeAllMarketplace = () => {
    navigation.navigate("StudentCoursesScreen", { mode: 'MARKETPLACE' });
  };

  const handleSeeAllEnrolled = () => {
    navigation.navigate("StudentCoursesScreen", { mode: 'ENROLLED' });
  };

  const handleVipFeature = () => {
    if (isVip) {
      gotoTab("CourseStack", "CreatorDashboardScreen");
    } else {
      setShowVipModal(true);
    }
  };

  const openCreatorDashboardList = () => {
    gotoTab("CourseStack", "CreatorDashboardScreen");
  };

  const handleMyCoursePress = (enrollment: CourseVersionEnrollmentResponse) => {
    const courseId = enrollment.course?.courseId || enrollment.courseVersion?.courseId;
    if (!courseId) return;

    const creatorId = enrollment.course?.creatorId;
    const isCreator = user?.userId === creatorId;

    if (isCreator) {
      gotoTab("CourseStack", "CourseManagerScreen", { courseId });
    } else {
      gotoTab("CourseStack", "CourseDetailsScreen", { courseId, isPurchased: true });
    }
  };

  const purchasedCourses = useMemo(() => (enrolledData?.data as CourseVersionEnrollmentResponse[]) || [], [enrolledData]);
  const creatorCourses = useMemo(() => (creatorData?.data as CourseResponse[]) || [], [creatorData]);

  if (viewMode === 'CATEGORY_LESSONS' && selectedCategory) {
    return (
      <CategoryLessonsView
        categoryId={selectedCategory.id}
        categoryName={selectedCategory.name}
        navigation={navigation}
        onBack={() => setViewMode('HOME')}
      />
    );
  }

  const isRefreshing = enrolledLoading || recLoading || creatorLoading || topSellingLoading;

  return (
    <ScreenLayout swipeToTab="Progress">
      <VipUpgradeModal
        visible={showVipModal}
        onClose={() => setShowVipModal(false)}
      />

      <View style={styles.container}>
        <View style={styles.mainHeader}>
          <Icon name="school" size={32} color="#4F46E5" />

          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.navigate("NotesScreen")}
            >
              <Icon name="sticky-note-2" size={22} color="#4F46E5" />
            </TouchableOpacity>

            <LearningLanguageSelector
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
              learningLanguages={learningLanguages}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isVip ? t("learn.creatorDashboardTitle", "Quản lý Khóa học") : t("learn.becomeCreator", "Trở thành Giảng viên")}</Text>
            <TouchableOpacity
              style={styles.certBigCard}
              onPress={handleVipFeature}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={PLACEHOLDER_IMAGE}
                style={styles.certBigCardBg}
                imageStyle={{ borderRadius: 16 }}
              >
                {!isVip ? <View style={styles.certDarkOverlay} /> : null}
                <View style={styles.certContentOverlay}>
                  <View style={[styles.certIconContainer, { backgroundColor: isVip ? '#FFFFFF' : '#FFF0E5' }]}>
                    <Icon name={isVip ? "cast-for-education" : "lock"} size={24} color={isVip ? "#0369A1" : "#F97316"} />
                  </View>
                  <View>
                    <Text style={[styles.certBigTitle, !isVip && styles.certBigTitleLocked]}>
                      {isVip ? t("learn.creatorDashboard", "Creator Dashboard") : t("learn.vipCourseTitle", "VIP Creator Course")}
                    </Text>
                    <Text style={[styles.certBigDesc, !isVip && styles.certBigDescLocked]}>
                      {isVip ? t("learn.manageCourses", "Quản lý và tạo khóa học") : t("learn.vipCourseDesc", "Khu vực đặc biệt chỉ dành cho VIP")}
                    </Text>
                  </View>
                  <View style={styles.vipTagAbs}>
                    <Text style={styles.vipTagText}>{isVip ? 'TEACH' : 'VIP'}</Text>
                  </View>
                </View>
                {!isVip ? (
                  <View style={styles.certUnlockTextContainer}>
                    <Text style={styles.certUnlockText}>{t("common.unlock", "Mở khóa")}</Text>
                  </View>
                ) : null}
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {topSellingCourses.length > 0 ? (
            <TopSellingCoursesList
              t={t}
              onSeeAll={handleSeeAllMarketplace}
              courses={topSellingCourses}
              isLoading={topSellingLoading}
              navigation={navigation}
            />
          ) : null}

          {purchasedCourses.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t("learn.enrolledCourses", "Khóa học của tôi")}</Text>
                <TouchableOpacity onPress={handleSeeAllEnrolled}>
                  <Text style={styles.seeAllText}>{t("common.seeAll", "Xem tất cả")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {purchasedCourses.map((enrollment: CourseVersionEnrollmentResponse, index: number) => {
                  const courseVersion = enrollment.courseVersion;
                  if (!courseVersion) return null;
                  const key = enrollment.enrollmentId || courseVersion.versionId || `enroll-${index}`;
                  const dateEnrolled = enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '';

                  const processedUrl = getDirectMediaUrl(courseVersion.thumbnailUrl);
                  const thumbSource = processedUrl ? { uri: processedUrl } : PLACEHOLDER_IMAGE;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.myCourseCard}
                      onPress={() => handleMyCoursePress(enrollment)}
                    >
                      <Image
                        source={thumbSource}
                        style={styles.myCourseImage}
                      />
                      <View style={styles.myCourseInfo}>
                        <Text style={styles.myCourseTitle} numberOfLines={1}>{courseVersion.title || "Untitled"}</Text>
                        <Text style={styles.myCourseDate}>Start: {dateEnrolled}</Text>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${enrollment.progress || 0}%` }]} />
                        </View>
                        <Text style={styles.statText}>{enrollment.progress || 0}% Complete</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {creatorCourses.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t("learn.myCreatorCourses", "Khóa học đã tạo")}</Text>
                <TouchableOpacity onPress={openCreatorDashboardList}>
                  <Text style={styles.seeAllText}>{t("learn.myCourseManagement", "Quản lý")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {creatorCourses.map((course: CourseResponse) => {
                  if (!course.courseId) return null;
                  const rating = course.averageRating ? course.averageRating.toFixed(1) : "0.0";
                  const reviewCount = course.reviewCount || 0;
                  const processedUrl = getDirectMediaUrl(course.latestPublicVersion?.thumbnailUrl);
                  const thumbSource = processedUrl ? { uri: processedUrl } : PLACEHOLDER_IMAGE;

                  return (
                    <TouchableOpacity
                      key={`creator-${course.courseId}`}
                      style={styles.recCourseCard}
                      onPress={() => gotoTab("CourseStack", "CourseManagerScreen", { courseId: course.courseId })}
                    >
                      <Image
                        source={thumbSource}
                        style={styles.recCourseImage}
                      />
                      <View style={{ padding: 8 }}>
                        <Text style={styles.recCourseTitle} numberOfLines={2}>{course.title}</Text>
                        <View style={styles.recCourseFooter}>
                          <View style={styles.recRatingContainer}>
                            <Icon name="star" size={12} color="#F59E0B" />
                            <Text style={styles.recRatingText}>{rating} ({reviewCount})</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {recommendedData && recommendedData.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
                <TouchableOpacity onPress={handleSeeAllMarketplace}>
                  <Text style={styles.seeAllText}>{t("common.seeAll", "Xem tất cả")}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {recommendedData.map((course: CourseResponse) => {
                  const rating = course.averageRating ? course.averageRating.toFixed(1) : "0.0";
                  const reviewCount = course.reviewCount || 0;
                  const authorName = course.creatorName || course.creatorId || "Instructor";
                  const price = course.latestPublicVersion?.price ?? 0;

                  if (!course.courseId) return null;

                  const processedUrl = getDirectMediaUrl(course.latestPublicVersion?.thumbnailUrl);
                  const thumbSource = processedUrl ? { uri: processedUrl } : PLACEHOLDER_IMAGE;

                  return (
                    <TouchableOpacity
                      key={`rec-${course.courseId}`}
                      style={styles.recCourseCard}
                      onPress={() => gotoTab("CourseStack", "CourseDetailsScreen", { courseId: course.courseId, isPurchased: false })}
                    >
                      <Image
                        source={thumbSource}
                        style={styles.recCourseImage}
                      />
                      <View style={{ padding: 8 }}>
                        <Text style={styles.recCourseTitle} numberOfLines={2}>{course.title}</Text>
                        <View style={styles.recCourseAuthorRow}>
                          <View style={styles.recAuthorAvatar}>
                            <Text style={styles.recAuthorAvatarText}>{authorName.charAt(0)}</Text>
                          </View>
                          <Text style={styles.recAuthorName} numberOfLines={1}>{authorName}</Text>
                        </View>
                        <View style={styles.recCourseFooter}>
                          <Text style={styles.recPrice}>{price === 0 ? "Free" : `$${price}`}</Text>
                          <View style={styles.recRatingContainer}>
                            <Icon name="star" size={12} color="#F59E0B" />
                            <Text style={styles.recRatingText}>{rating} ({reviewCount})</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  subScreenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainHeader: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 20,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSelectorContainer: {
    position: 'relative',
    zIndex: 50,
    minWidth: 40,
  },
  selectedLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  languageDropdown: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 60,
    zIndex: 100,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  languageFlagWrapper: {
    marginRight: 0,
  },
  noLanguageText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 6,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    maxWidth: 250,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_PADDING,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  certBigCard: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  certBigCardBg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  certDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  certContentOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  certIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  certBigTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  certBigDesc: {
    fontSize: 13,
    color: "#4B5563",
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  certBigTitleLocked: {
    color: "#FFFFFF",
    backgroundColor: 'transparent',
  },
  certBigDescLocked: {
    color: "#E5E7EB",
    backgroundColor: 'transparent',
  },
  certUnlockTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  certUnlockText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  vipTagAbs: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  gridCardFlat: {
    width: '48%',
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gridCardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  gridCardContent: {
    padding: 10,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
    height: 40,
  },
  gridCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridCardMetaText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
  },
  horizontalList: {
    marginHorizontal: -SCREEN_PADDING,
    paddingHorizontal: SCREEN_PADDING,
  },
  myCourseCard: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  myCourseImage: {
    width: "100%",
    height: 110,
    backgroundColor: "#E5E7EB",
  },
  myCourseInfo: {
    padding: 12,
  },
  myCourseTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  myCourseDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  statText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  recCourseCard: {
    width: 200,
    marginRight: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recCourseImage: {
    width: 200,
    height: 110,
    backgroundColor: "#E5E7EB",
  },
  recCourseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
    height: 40,
  },
  recCourseAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  recAuthorAvatarText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  recAuthorName: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  recCourseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recPrice: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "700",
  },
  recRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recRatingText: {
    fontSize: 11,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  lessonThumbnailSmall: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  lessonRowContent: {
    flex: 1,
  },
  lessonRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  lessonRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotSmall: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 6,
  },
  lessonRowSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: '500',
  },
  playButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  loadMoreText: {
    color: "#4F46E5",
    fontWeight: "600",
    fontSize: 13,
  },
  endText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  }
});

export default LearnScreen;