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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { useUserStore } from "../../stores/UserStore";
import { useCourses } from "../../hooks/useCourses";
import { useLessons } from "../../hooks/useLessons";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { CourseResponse, LessonResponse } from "../../types/dto";
import { CourseType, SkillType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCourseImage } from "../../utils/courseUtils";
import { getCountryFlag } from "../../utils/flagUtils";
import VipUpgradeModal from "../../components/modals/VipUpgradeModal";
import { Course } from "../../types/entity";

const { width } = Dimensions.get("window");

type LanguageOption = {
  code: string;
  name: string;
  flag: React.JSX.Element | null;
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
        style={styles.selectedLanguageButton}
        onPress={() => canExpand && setIsExpanded(!isExpanded)}
        activeOpacity={canExpand ? 0.7 : 1}
      >
        <View style={styles.languageFlagWrapper}>
          {selectedLanguage.flag}
        </View>
        <Text style={styles.selectedLanguageText}>{selectedLanguage.name}</Text>
        {canExpand && (
          <Icon
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color="#4F46E5"
          />
        )}
      </TouchableOpacity>

      {isExpanded && canExpand && (
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
              <Text style={styles.languageName}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const SkillLessonListView = ({
  navigation,
  skillType,
  languageCode,
  onBack
}: {
  navigation: any;
  skillType: SkillType;
  languageCode: string;
  onBack: () => void
}) => {
  const { t } = useTranslation();
  const { useAllLessons } = useLessons();
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useAllLessons({
    skillType,
    page,
    size: 15,
    languageCode,
  });

  const lessons = useMemo(() => (data?.data as LessonResponse[]) || [], [data]);

  const loadMore = () => {
    if (data?.pagination && !data.pagination.isLast && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const getSkillTitle = () => {
    switch (skillType) {
      case SkillType.LISTENING: return t("learn.listening") || "Listening";
      case SkillType.SPEAKING: return t("learn.speaking") || "Speaking";
      case SkillType.READING: return t("learn.reading") || "Reading";
      case SkillType.WRITING: return t("learn.writing") || "Writing";
      default: return "";
    }
  };

  const handlePress = (lesson: LessonResponse) => {
    if (skillType === SkillType.SPEAKING) {
      navigation.navigate("SpeakingScreen", { lessonId: lesson.lessonId, lesson });
    } else if (skillType === SkillType.READING) {
      navigation.navigate("ReadingScreen", { lesson });
    } else if (skillType === SkillType.WRITING) {
      navigation.navigate("WritingScreen", { lesson });
    } else if (skillType === SkillType.LISTENING) {
      navigation.navigate("ListeningScreen");
    } else {
      navigation.navigate("LessonScreen", { lesson });
    }
  };

  const renderItem: ListRenderItem<LessonResponse> = ({ item }) => (
    <TouchableOpacity style={styles.lessonRow} onPress={() => handlePress(item)}>
      <View style={[styles.lessonIconBox, { backgroundColor: '#EEF2FF' }]}>
        <Icon
          name={
            skillType === SkillType.LISTENING ? "headset" :
              skillType === SkillType.SPEAKING ? "mic" :
                skillType === SkillType.READING ? "menu-book" : "edit"
          }
          size={24}
          color="#4F46E5"
        />
      </View>
      <View style={styles.lessonRowContent}>
        <Text style={styles.lessonRowTitle} numberOfLines={1}>{item.title || item.lessonName}</Text>
        <Text style={styles.lessonRowSubtitle}>{item.expReward || 10} XP • {item.difficultyLevel || 'A1'}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.subScreenContainer}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>{getSkillTitle()} ({languageCode.toUpperCase()})</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && page === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />
      ) : (
        <FlatList<LessonResponse>
          data={lessons}
          renderItem={renderItem}
          keyExtractor={(item) => item.lessonId}
          contentContainerStyle={styles.listContainer}
          onEndReached={() => { }}
          ListFooterComponent={
            <View style={styles.footerLoader}>
              {!data?.pagination?.isLast ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={isFetching}>
                  {isFetching ? <ActivityIndicator color="#4F46E5" /> : <Text style={styles.loadMoreText}>{t("common.loadMore")}</Text>}
                </TouchableOpacity>
              ) : lessons.length > 0 ? <Text style={styles.endText}>{t("common.endOfList")}</Text> : null}
            </View>
          }
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("common.noData")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const AllCoursesView = ({ navigation, onBack }: { navigation: any; onBack: () => void }) => {
  const { t } = useTranslation();
  const { useAllCourses } = useCourses();
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useAllCourses({
    page,
    size: 10,
    type: CourseType.FREE,
  });

  const courses = useMemo(() => (data?.data as CourseResponse[]) || [], [data]);

  const loadMore = () => {
    if (data?.pagination && !data.pagination.isLast && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const renderItem: ListRenderItem<CourseResponse> = ({ item }) => (
    <TouchableOpacity
      style={styles.verticalCard}
      onPress={() => navigation.navigate("CourseDetailsScreen", { course: item })}
    >
      <Image
        source={getCourseImage(item.latestPublicVersion?.thumbnailUrl)}
        style={styles.verticalCardImage}
      />
      <View style={styles.verticalCardContent}>
        <Text style={styles.verticalCardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.verticalCardMeta}>
          <Icon name="star" size={14} color="#F59E0B" />
          <Text style={styles.metaText}>4.5</Text>
          <View style={styles.dot} />
          <Text style={[styles.metaText, { color: '#4F46E5', fontWeight: 'bold' }]}>
            {item.price === 0 ? t("courses.free") : `$${item.price}`}
          </Text>
        </View>
        <Text style={styles.verticalCardAuthor} numberOfLines={1}>
          {t("common.by")} {item?.creatorId || "Instructor"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.subScreenContainer}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>{t("learn.allCourses") || "All Courses"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && page === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />
      ) : (
        <FlatList<CourseResponse>
          data={courses}
          renderItem={renderItem}
          keyExtractor={(item) => item.courseId}
          contentContainerStyle={styles.listContainer}
          onEndReached={() => { }}
          ListFooterComponent={
            <View style={styles.footerLoader}>
              {!data?.pagination?.isLast ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={isFetching}>
                  {isFetching ? <ActivityIndicator color="#4F46E5" /> : <Text style={styles.loadMoreText}>{t("common.loadMore")}</Text>}
                </TouchableOpacity>
              ) : courses.length > 0 ? <Text style={styles.endText}>{t("common.endOfList")}</Text> : null}
            </View>
          }
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("common.noData")}</Text>
            </View>
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
  const { useEnrollments, useRecommendedCourses } = useCourses();

  const getLanguageOption = useCallback((langCode: string): LanguageOption => ({
    code: langCode,
    name: t(`languages.${langCode}`) || langCode.toUpperCase(),
    // Sửa dụng langCode để hiển thị cờ
    flag: getCountryFlag(langCode, 22),
  }), [t]);

  const learningLanguages: LanguageOption[] = useMemo(() => {
    if (userStore.languages && userStore.languages.length > 0) {
      return userStore.languages.map(getLanguageOption);
    }
    return [getLanguageOption('en')];
  }, [userStore.languages, getLanguageOption]);

  const [showVipModal, setShowVipModal] = useState(false);
  const [viewMode, setViewMode] = useState<'HOME' | 'ALL_COURSES' | 'SKILL_LESSONS'>('HOME');
  const [selectedSkill, setSelectedSkill] = useState<SkillType>(SkillType.LISTENING);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    learningLanguages[0] || getLanguageOption('en')
  );

  useEffect(() => {
    if (!learningLanguages.find(lang => lang.code === selectedLanguage.code)) {
      setSelectedLanguage(learningLanguages[0] || getLanguageOption('en'));
    }
  }, [learningLanguages, selectedLanguage.code, getLanguageOption]);

  const { data: enrolledData, isLoading: enrolledLoading, refetch: refetchEnrolled } = useEnrollments({
    userId: user?.userId,
    page: 0,
    size: 5,
  });

  const { data: recommendedData, isLoading: recLoading, refetch: refetchRec } = useRecommendedCourses(
    user?.userId,
    5
  );

  useFocusEffect(
    useCallback(() => {
      refreshUserProfile();
    }, [refreshUserProfile])
  );

  const handleRefresh = async () => {
    refetchEnrolled();
    refetchRec();
    await refreshUserProfile();
  };

  const handleVipFeature = (mode: string, type: string) => {
    if (!isVip) {
      setShowVipModal(true);
      return;
    }
    navigation.navigate("ProficiencyTestScreen", { mode, examType: type, skillType: type });
  };

  const openCreatorDashboard = () => {
    navigation.navigate("CourseStack", "CreatorDashboardScreen");
  };

  const openSkillLessons = (skill: SkillType) => {
    setSelectedSkill(skill);
    setViewMode('SKILL_LESSONS');
  };

  const learningTools = useMemo(() => [
    { name: t("learn.vocabularyFlashcards"), icon: "style", screen: "VocabularyFlashcardsScreen", color: "#EF4444", bg: "#FEF2F2" },
    { name: t("learn.ipaPronunciation"), icon: "record-voice-over", screen: "IPAScreen", color: "#F59E0B", bg: "#FFFBEB" },
    { name: t("learn.bilingual"), icon: "language", screen: "BilingualVideoScreen", color: "#8B5CF6", bg: "#F5F3FF" },
    { name: t("learn.grammar"), icon: "spellcheck", screen: "GrammarLearningScreen", color: "#4F46E5", bg: "#EEF2FF" },
  ], [t]);

  const skillCards = useMemo(() => [
    { name: t("learn.listening") || "Nghe", icon: "headphones", iconLib: Icon, type: SkillType.LISTENING, color: "#3B82F6", bg: "#EFF6FF" },
    { name: t("learn.speaking") || "Nói", icon: "microphone-alt", iconLib: FontAwesome5, type: SkillType.SPEAKING, color: "#10B981", bg: "#ECFDF5" },
    { name: t("learn.reading") || "Đọc", icon: "book-open", iconLib: FontAwesome5, type: SkillType.READING, color: "#F59E0B", bg: "#FFFBEB" },
    { name: t("learn.writing") || "Viết", icon: "pen-nib", iconLib: FontAwesome5, type: SkillType.WRITING, color: "#EC4899", bg: "#FDF2F8" },
  ], [t]);

  const purchasedCourses = enrolledData?.data || [];

  if (viewMode === 'ALL_COURSES') {
    return <AllCoursesView navigation={navigation} onBack={() => setViewMode('HOME')} />;
  }

  if (viewMode === 'SKILL_LESSONS') {
    return (
      <SkillLessonListView
        navigation={navigation}
        skillType={selectedSkill}
        languageCode={selectedLanguage.code}
        onBack={() => setViewMode('HOME')}
      />
    );
  }

  return (
    <ScreenLayout>
      <VipUpgradeModal
        visible={showVipModal}
        onClose={() => setShowVipModal(false)}
      />

      <View style={styles.container}>
        <View style={styles.mainHeader}>
          <Icon name="school" size={32} color="#4F46E5" />
          <LearningLanguageSelector
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            learningLanguages={learningLanguages}
          />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={enrolledLoading || recLoading} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >

          {/* Section 1: Chứng chỉ (Reordered) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("learn.certPreparation", "Luyện thi Chứng Chỉ")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
              <TouchableOpacity
                style={styles.certCard}
                onPress={() => handleVipFeature('certification', 'TOEIC')}
                activeOpacity={0.8}
              >
                <View style={[styles.certIconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Icon name="assignment" size={28} color="#0369A1" />
                </View>
                <Text style={styles.certTitle}>TOEIC</Text>
                <Text style={styles.certDesc}>{t("learn.simulation", "Mô phỏng 1-1")}</Text>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>VIP</Text>
                </View>

                {!isVip && (
                  <View style={styles.lockOverlay}>
                    <Icon name="lock" size={24} color="#EF4444" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.certCard}
                onPress={() => handleVipFeature('certification', 'IELTS')}
                activeOpacity={0.8}
              >
                <View style={[styles.certIconContainer, { backgroundColor: '#FCE7F3' }]}>
                  <Icon name="school" size={28} color="#BE185D" />
                </View>
                <Text style={styles.certTitle}>IELTS</Text>
                <Text style={styles.certDesc}>{t("learn.simulation", "Mô phỏng 1-1")}</Text>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>VIP</Text>
                </View>

                {!isVip && (
                  <View style={styles.lockOverlay}>
                    <Icon name="lock" size={24} color="#EF4444" />
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Section 2: Learn Skills (Reordered) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("learn.skills", "Kỹ Năng")} ({selectedLanguage.name})</Text>
            <View style={styles.toolGridContainer}>
              {skillCards.map((skill, index) => {
                const IconComponent = skill.iconLib;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.skillAsToolCard, index % 2 === 0 ? styles.cardRightMargin : {}]}
                    onPress={() => openSkillLessons(skill.type)}
                  >
                    <View style={[styles.toolIconContainer, { backgroundColor: skill.bg }]}>
                      <IconComponent name={skill.icon} size={24} color={skill.color} />
                    </View>
                    <Text style={styles.toolName}>{skill.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3: Learning Tools */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("learn.learningTools")}</Text>
            <View style={styles.toolGridContainer}>
              {learningTools.map((tool, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.toolCard, index % 2 === 0 ? styles.cardRightMargin : {}]}
                  onPress={() => navigation.navigate(tool.screen)}
                >
                  <View style={[styles.toolIconContainer, { backgroundColor: tool.bg }]}>
                    <Icon name={tool.icon} size={28} color={tool.color} />
                  </View>
                  <Text style={styles.toolName} numberOfLines={2}>{tool.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Section 4: My Courses */}
          {purchasedCourses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t("learn.myCourses")}</Text>
                <TouchableOpacity onPress={openCreatorDashboard}>
                  <Text style={styles.seeAllText}>{t("learn.myCourseManagement", "Quản lý Course")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {purchasedCourses.map((enrollment: any, index: number) => {
                  // Mock stats for My Course if missing
                  const rating = enrollment.course?.averageRating || 5.0;
                  const buyers = enrollment.course?.studentsCount || 0;
                  const reviews = enrollment.course?.reviewCount || 0;
                  const dateEnrolled = enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '';

                  return (
                    <TouchableOpacity
                      key={`my-course-${enrollment.id || index}`}
                      style={styles.myCourseCard}
                      onPress={() => navigation.navigate("CourseDetailsScreen", { course: enrollment.course, isPurchased: true })}
                    >
                      <Image
                        source={getCourseImage(enrollment.course?.latestPublicVersion?.thumbnailUrl)}
                        style={styles.myCourseImage}
                      />
                      <View style={styles.myCourseInfo}>
                        <Text style={styles.myCourseTitle} numberOfLines={1}>{enrollment.course?.title}</Text>

                        {/* Enroll Date & Stats */}
                        <Text style={styles.myCourseDate}>Start: {dateEnrolled}</Text>
                        <View style={styles.myCourseStatsRow}>
                          <View style={styles.statItem}>
                            <Icon name="star" size={12} color="#F59E0B" />
                            <Text style={styles.statText}>{rating}</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Icon name="people" size={12} color="#6B7280" />
                            <Text style={styles.statText}>{buyers}</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Icon name="rate-review" size={12} color="#6B7280" />
                            <Text style={styles.statText}>{reviews}</Text>
                          </View>
                        </View>

                        {/* Progress */}
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${enrollment.progress || 0}%` }]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Section 5: Recommended Courses */}
          {recommendedData && recommendedData.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
                <TouchableOpacity onPress={() => setViewMode('ALL_COURSES')}>
                  <Text style={styles.seeAllText}>{t("common.seeAll", "Xem tất cả")}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {recommendedData.map((course: any) => {
                  // Fallbacks for data that might be missing from BE as requested
                  const rating = course.averageRating || 4.5;
                  const reviewCount = course.reviewCount || 0;
                  // Use creatorId if name missing, or static "Instructor"
                  const authorName = course.creatorName || course.creatorId || "Instructor";

                  return (
                    <TouchableOpacity
                      key={`rec-${course.courseId}`}
                      style={styles.recCourseCard}
                      onPress={() => navigation.navigate("CourseDetailsScreen", { course, isPurchased: false })}
                    >
                      <Image
                        source={getCourseImage(course.latestPublicVersion?.thumbnailUrl)}
                        style={styles.recCourseImage}
                      />
                      <View style={{ padding: 8 }}>
                        <Text style={styles.recCourseTitle} numberOfLines={2}>{course.title}</Text>

                        <View style={styles.recCourseAuthorRow}>
                          {/* Placeholder Avatar */}
                          <View style={styles.recAuthorAvatar}>
                            <Text style={styles.recAuthorAvatarText}>{authorName.charAt(0)}</Text>
                          </View>
                          <Text style={styles.recAuthorName} numberOfLines={1}>{authorName}</Text>
                        </View>

                        <View style={styles.recCourseFooter}>
                          <Text style={styles.recPrice}>{course.price === 0 ? "Free" : `$${course.price}`}</Text>
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
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </ScreenLayout>
  );
};

const columnGap = 10;
const paddingHorizontal = 20;
const cardWidth = (width - paddingHorizontal * 2 - columnGap) / 2;

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
  languageSelectorContainer: {
    position: 'relative',
    zIndex: 10,
    width: 130,
  },
  selectedLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  selectedLanguageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
    flex: 1,
  },
  languageDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    left: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  languageName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
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
  },
  backButton: {
    padding: 8,
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: paddingHorizontal,
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

  certCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    height: 160,
    justifyContent: 'center',
  },
  certIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  certDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vipTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },

  toolGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",

  },
  cardRightMargin: {
    marginRight: columnGap,
  },

  skillAsToolCard: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: columnGap,
    height: 110,
    justifyContent: 'center',
  },

  toolCard: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: columnGap,
  },
  toolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  toolName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },

  horizontalList: {
    marginHorizontal: -paddingHorizontal,
    paddingHorizontal: paddingHorizontal,
  },
  myCourseCard: {
    width: 240, // Slightly wider for more info
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
  myCourseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
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
  verticalCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  verticalCardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  verticalCardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  verticalCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 22,
  },
  verticalCardAuthor: {
    fontSize: 12,
    color: "#6B7280",
  },
  verticalCardMeta: {
    flexDirection: "row",
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },

  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  lessonIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lessonRowContent: {
    flex: 1,
  },
  lessonRowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  lessonRowSubtitle: {
    fontSize: 13,
    color: "#6B7280",
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
  languageFlagWrapper: {
    marginRight: 8,
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