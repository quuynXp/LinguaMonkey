import React, { useState, useMemo } from "react"
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
  Alert
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useUserStore } from "../../stores/UserStore"
import { useCourses } from "../../hooks/useCourses"
import { useLessons } from "../../hooks/useLessons"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse, LessonResponse } from "../../types/dto"
import { CourseType, SkillType } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"
import { getCourseImage } from "../../utils/courseUtils"
import VipUpgradeModal from "../../components/modals/VipUpgradeModal"

// --- TYPES ---
type TabType = "OVERVIEW" | "COURSES" | SkillType

// --- COMPONENTS ---

const FilterBar = ({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}) => {
  const { t } = useTranslation()

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "OVERVIEW", label: t("common.overview") || "Tổng quan", icon: "dashboard" },
    { key: "COURSES", label: t("learn.courses") || "Khóa học", icon: "class" },
    { key: SkillType.LISTENING, label: t("learn.listening") || "Nghe", icon: "headset" },
    { key: SkillType.SPEAKING, label: t("learn.speaking") || "Nói", icon: "mic" },
    { key: SkillType.READING, label: t("learn.reading") || "Đọc", icon: "menu-book" },
    { key: SkillType.WRITING, label: t("learn.writing") || "Viết", icon: "edit" },
  ]

  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => onTabChange(tab.key)}
            >
              <Icon
                name={tab.icon}
                size={18}
                color={isActive ? "#FFFFFF" : "#6B7280"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const OverviewView = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { user, isAuthenticated, isVip, registerVip, refreshUserProfile } = useUserStore()
  const { useEnrollments, useRecommendedCourses } = useCourses()
  const [showVipModal, setShowVipModal] = useState(false);

  const { data: enrolledData, isLoading: enrolledLoading, refetch: refetchEnrolled } = useEnrollments({
    userId: user?.userId,
    page: 0,
    size: 5,
  })

  const { data: recommendedData, isLoading: recLoading, refetch: refetchRec } = useRecommendedCourses(
    user?.userId,
    5
  )

  const learningTools = [
    { name: t("learn.vocabularyFlashcards"), icon: "style", screen: "VocabularyFlashcardsScreen", color: "#EF4444" },
    { name: t("learn.ipaPronunciation"), icon: "record-voice-over", screen: "IPAScreen", color: "#F59E0B" },
    { name: t("learn.soloQuiz"), icon: "quiz", screen: "SoloQuizScreen", color: "#10B981" },
    { name: t("learn.teamQuiz"), icon: "people", screen: "TeamQuizRoom", color: "#3B82F6" },
    { name: t("learn.bilingual"), icon: "language", screen: "BilingualVideoScreen", color: "#8B5CF6" },
    { name: t("learn.certifications"), icon: "card-membership", screen: "CertificationLearningScreen", color: "#EC4899" },
  ]

  const handleRefresh = async () => {
    refetchEnrolled();
    refetchRec();
    await refreshUserProfile(); // Ensure we have latest VIP status
  }

  const handleVipFeature = (mode: string, type: string) => {
    if (!isVip) {
      setShowVipModal(true);
      return;
    }
    navigation.navigate("ProficiencyTestScreen", { mode, examType: type, skillType: type });
  }

  const onVipConfirm = async () => {
    try {
      await registerVip();
      setShowVipModal(false);
      Alert.alert(t("common.success"), t("vip.successMsg", "Nâng cấp VIP thành công!"));
    } catch (e) {
      Alert.alert(t("error.title"), t("vip.failMsg", "Thanh toán thất bại"));
    }
  }

  const purchasedCourses = enrolledData?.data || []

  return (
    <ScrollView
      style={styles.tabContainer}
      refreshControl={<RefreshControl refreshing={enrolledLoading || recLoading} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <VipUpgradeModal
        visible={showVipModal}
        onClose={() => setShowVipModal(false)}
      />

      {/* Welcome Section */}
      {isAuthenticated && user && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {t("learn.welcome", { name: user.fullname || user.nickname })} 👋
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Icon name="trending-up" size={16} color="#10B981" />
              <Text style={styles.statText}>Lv. {user.level || 1}</Text>
            </View>
            <View style={styles.statBadge}>
              <Icon name="local-fire-department" size={16} color="#F59E0B" />
              <Text style={styles.statText}>{user.streak || 0} days</Text>
            </View>
            {isVip && (
              <View style={[styles.statBadge, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="star" size={16} color="#F59E0B" />
                <Text style={[styles.statText, { color: '#D97706' }]}>VIP</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Certification Preparation Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("learn.certPreparation", "Luyện thi Chứng Chỉ")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
          {/* TOEIC */}
          <TouchableOpacity
            style={styles.certCard}
            onPress={() => handleVipFeature('certification', 'TOEIC')}
          >
            <View style={[styles.certIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Icon name="assignment" size={24} color="#0369A1" />
            </View>
            <Text style={styles.certTitle}>TOEIC</Text>
            <Text style={styles.certDesc}>{t("learn.simulation", "Mô phỏng 1-1")}</Text>
            {!isVip && (
              <View style={styles.lockOverlay}>
                <Icon name="lock" size={20} color="#EF4444" />
              </View>
            )}
          </TouchableOpacity>

          {/* IELTS */}
          <TouchableOpacity
            style={styles.certCard}
            onPress={() => handleVipFeature('certification', 'IELTS')}
          >
            <View style={[styles.certIconContainer, { backgroundColor: '#FCE7F3' }]}>
              <Icon name="school" size={24} color="#BE185D" />
            </View>
            <Text style={styles.certTitle}>IELTS</Text>
            <Text style={styles.certDesc}>{t("learn.simulation", "Mô phỏng 1-1")}</Text>
            {!isVip && (
              <View style={styles.lockOverlay}>
                <Icon name="lock" size={20} color="#EF4444" />
              </View>
            )}
          </TouchableOpacity>

          {/* Skill Practice */}
          <TouchableOpacity
            style={styles.certCard}
            onPress={() => handleVipFeature('skill', 'SPEAKING')}
          >
            <View style={[styles.certIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="mic" size={24} color="#15803D" />
            </View>
            <Text style={styles.certTitle}>Speaking</Text>
            <Text style={styles.certDesc}>1-1 AI Coach</Text>
            {!isVip && (
              <View style={styles.lockOverlay}>
                <Icon name="lock" size={20} color="#EF4444" />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Learning Tools Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("learn.learningTools")}</Text>
        <View style={styles.toolGrid}>
          {learningTools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={styles.toolCard}
              onPress={() => navigation.navigate(tool.screen)}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: `${tool.color}15` }]}>
                <Icon name={tool.icon} size={24} color={tool.color} />
              </View>
              <Text style={styles.toolName} numberOfLines={2}>{tool.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Continue Learning (My Courses) */}
      {purchasedCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("learn.myCourses")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {purchasedCourses.map((enrollment: any, index: number) => (
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
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${enrollment.progress || 0}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round(enrollment.progress || 0)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommended */}
      {recommendedData && recommendedData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("learn.recommendedCourses")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {recommendedData.map((course: any) => (
              <TouchableOpacity
                key={`rec-${course.courseId}`}
                style={styles.recCourseCard}
                onPress={() => navigation.navigate("CourseDetailsScreen", { course, isPurchased: false })}
              >
                <Image
                  source={getCourseImage(course.latestPublicVersion?.thumbnailUrl)}
                  style={styles.recCourseImage}
                />
                <Text style={styles.recCourseTitle} numberOfLines={2}>{course.title}</Text>
                <Text style={styles.recPrice}>{course.price === 0 ? "Free" : `$${course.price}`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const CourseListView = ({ navigation }: any) => {
  const { t } = useTranslation()
  const { useAllCourses } = useCourses()
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch, isFetching } = useAllCourses({
    page,
    size: 10,
    type: CourseType.FREE,
  })

  const courses = useMemo(() => (data?.data as CourseResponse[]) || [], [data])

  const loadMore = () => {
    if (data?.pagination && !data.pagination.isLast && !isFetching) {
      setPage(prev => prev + 1)
    }
  }

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
        <Text style={styles.verticalCardTitle}>{item.title}</Text>
        <Text style={styles.verticalCardAuthor}>
          {t("common.by")} {"Instructor"}
        </Text>
        <View style={styles.verticalCardMeta}>
          <Icon name="star" size={14} color="#F59E0B" />
          <Text style={styles.metaText}>4.5</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{item.price === 0 ? t("courses.free") : `$${item.price}`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (isLoading && page === 0) return <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />

  return (
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
              {isFetching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loadMoreText}>{t("common.loadMore")}</Text>}
            </TouchableOpacity>
          ) : <Text style={styles.endText}>{t("common.endOfList")}</Text>}
        </View>
      }
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    />
  )
}

const LessonListView = ({ navigation, skillType }: { navigation: any; skillType: SkillType }) => {
  const { t } = useTranslation()
  const { useAllLessons } = useLessons()
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch, isFetching } = useAllLessons({
    skillType,
    page,
    size: 15,
  })

  const lessons = useMemo(() => (data?.data as LessonResponse[]) || [], [data])

  const loadMore = () => {
    if (data?.pagination && !data.pagination.isLast && !isFetching) {
      setPage(prev => prev + 1)
    }
  }

  const handlePress = (lesson: LessonResponse) => {
    if (skillType === SkillType.SPEAKING) {
      navigation.navigate("SpeakingScreen", { lessonId: lesson.lessonId, lesson })
    } else if (skillType === SkillType.READING) {
      navigation.navigate("ReadingScreen", { lesson })
    } else if (skillType === SkillType.WRITING) {
      navigation.navigate("WritingScreen", { lesson })
    } else if (skillType === SkillType.LISTENING) {
      navigation.navigate("ListeningScreen")
    } else {
      navigation.navigate("LessonScreen", { lesson })
    }
  }

  const renderItem: ListRenderItem<LessonResponse> = ({ item }) => (
    <TouchableOpacity style={styles.lessonRow} onPress={() => handlePress(item)}>
      <View style={styles.lessonIconBox}>
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
  )

  if (isLoading && page === 0) return <ActivityIndicator style={{ marginTop: 20 }} color="#4F46E5" />

  return (
    <FlatList<LessonResponse>
      data={lessons}
      renderItem={renderItem}
      keyExtractor={(item) => item.lessonId}
      contentContainerStyle={styles.listContainer}
      ListFooterComponent={
        <View style={styles.footerLoader}>
          {!data?.pagination?.isLast ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={isFetching}>
              {isFetching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loadMoreText}>{t("common.loadMore")}</Text>}
            </TouchableOpacity>
          ) : <Text style={styles.endText}>{t("common.endOfList")}</Text>}
        </View>
      }
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("common.noData")}</Text>
        </View>
      }
    />
  )
}

const LearnScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW")

  const renderContent = () => {
    switch (activeTab) {
      case "OVERVIEW":
        return <OverviewView navigation={navigation} />
      case "COURSES":
        return <CourseListView navigation={navigation} />
      case SkillType.LISTENING:
      case SkillType.SPEAKING:
      case SkillType.READING:
      case SkillType.WRITING:
        return <LessonListView navigation={navigation} skillType={activeTab} />
      default:
        return <OverviewView navigation={navigation} />
    }
  }

  return (
    <ScreenLayout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("learn.title")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")}>
            <Icon name="search" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <FilterBar activeTab={activeTab} onTabChange={setActiveTab} />

        <View style={styles.contentArea}>
          {renderContent()}
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  contentArea: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  // Cert Card Styles
  certCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  certIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "bold",
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    padding: 4,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  toolCard: {
    width: "48%", // 2 columns
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  horizontalList: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  myCourseCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  myCourseImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#E5E7EB",
  },
  myCourseInfo: {
    padding: 12,
  },
  myCourseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: "#6B7280",
    alignSelf: "flex-end",
  },
  recCourseCard: {
    width: 160,
    marginRight: 16,
  },
  recCourseImage: {
    width: 160,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  recCourseTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  recPrice: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  verticalCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  verticalCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  verticalCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  verticalCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  verticalCardAuthor: {
    fontSize: 12,
    color: "#6B7280",
  },
  verticalCardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  lessonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  lessonRowContent: {
    flex: 1,
  },
  lessonRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  lessonRowSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4F46E5",
    borderRadius: 20,
  },
  loadMoreText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  endText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  }
})

export default LearnScreen