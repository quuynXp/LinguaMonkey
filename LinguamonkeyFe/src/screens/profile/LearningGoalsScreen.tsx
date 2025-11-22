import React, { useRef, useMemo } from "react"
import { Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useToast } from "../../utils/useToast"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useUserStore } from "../../stores/UserStore"
import { useUserGoalsApi } from "../../hooks/useUserGoals"
import { UserGoalResponse } from "../../types/dto"
import { GoalType } from "../../types/enums" // Import GoalType
import ScreenLayout from "../../components/layout/ScreenLayout"

// Interface cho mục tiêu hiển thị, ánh xạ từ UserGoalResponse
interface DisplayGoal {
  id: string // goalId
  titleKey: string // Key for i18n
  descriptionKey: string // Key for i18n
  target: number
  current: number
  unitKey: string // Key for i18n
  icon: string
  color: string
  goalType: string
}

const LearningGoalsScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { showToast } = useToast()
  const { useAllUserGoals, useUpdateUserGoal } = useUserGoalsApi()

  // Load user goals
  const { data: goalData, isLoading, refetch } = useAllUserGoals({ userId: user?.userId, size: 50 })
  const updateMut = useUpdateUserGoal()

  const fadeAnim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  // Map API goals to Display Goals
  const currentGoals: DisplayGoal[] = useMemo(() => {
    const goals = goalData?.data || [];

    return goals.map((goal: UserGoalResponse) => {
      let titleKey = 'goals.defaultTitle';
      let descriptionKey = 'goals.defaultDescription';
      let icon = "task-alt";
      let color = "#4F46E5";
      let targetValue = goal.targetScore || 0;
      let unitKey = 'units.general';

      switch (goal.goalType) {
        // Đã xóa DAILY_TIME và WEEKLY_LESSONS
        case GoalType.CERTIFICATION:
          titleKey = 'goals.certificationTitle';
          descriptionKey = 'goals.certificationDesc';
          icon = "workspace-premium";
          color = "#F59E0B";
          unitKey = 'units.level';
          break;
        case GoalType.PROFICIENCY:
          titleKey = 'goals.proficiencyTitle';
          descriptionKey = 'goals.proficiencyDesc';
          icon = "star";
          color = "#EF4444";
          unitKey = 'units.proficiency';
          break;
        case GoalType.COMMUNICATION:
          titleKey = 'goals.communicationTitle';
          descriptionKey = 'goals.communicationDesc';
          icon = "chat";
          color = "#3B82F6";
          unitKey = 'units.skill';
          break;
        case GoalType.WORK:
          titleKey = 'goals.workTitle';
          descriptionKey = 'goals.workDesc';
          icon = "work";
          color = "#10B981";
          unitKey = 'units.skill';
          break;
        // Thêm các case khác nếu cần, hoặc để mặc định
        default:
          // Các mục tiêu không có trong enum sẽ rơi vào default
          titleKey = 'goals.customTitle';
          descriptionKey = 'goals.customDesc';
          icon = "assignment";
          color = "#6B7280";
          unitKey = 'units.general';
          break;
      }

      const currentProgress = 0;

      return {
        id: goal.goalId,
        titleKey: titleKey,
        descriptionKey: descriptionKey,
        target: targetValue,
        current: currentProgress,
        unitKey: unitKey,
        icon: icon,
        color: color,
        goalType: goal.goalType,
      };
    }) || [];
  }, [goalData])

  // Hàm hiển thị Goal Card (đã được làm sạch logic không cần thiết)
  const renderGoalCard = (goal: DisplayGoal) => {
    const progress = Math.min((goal.current / goal.target) * 100, 100)

    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
            <Icon name={goal.icon} size={24} color={goal.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{t(goal.titleKey)}</Text>
            <Text style={styles.goalDescription}>{t(goal.descriptionKey, { target: goal.target, unit: t(goal.unitKey) })}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Icon name="edit" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.goalProgress}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {t('goals.progressFormat', { current: 0, target: goal.target, unit: t(goal.unitKey) })}
            </Text>
            <Text style={[styles.progressPercent, { color: goal.color }]}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: goal.color }]} />
          </View>
        </View>

        {progress >= 100 && (
          <View style={styles.completedBadge}>
            <Icon name="check-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>{t('common.completed')}</Text>
          </View>
        )}
      </View>
    )
  }

  if (isLoading || updateMut.isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>{t('common.loadingGoals')}</Text>
      </View>
    )
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('goals.screenTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Current Goals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('goals.currentGoalsTitle')}</Text>
            <Text style={styles.sectionSubtitle}>{t('goals.currentGoalsSubtitle')}</Text>
            {currentGoals.map(renderGoalCard)}

            {/* Streak Goal - Dữ liệu từ UserStore */}
            <View key="streak-days" style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: `#F59E0B20` }]}>
                  <Icon name="local-fire-department" size={24} color="#F59E0B" />
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{t('goals.streakTitle')}</Text>
                  <Text style={styles.goalDescription}>{t('goals.streakDesc')}</Text>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Icon name="edit" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.goalProgress}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {t('goals.streakCurrent', { streak: user?.streak || 0 })}
                  </Text>
                  <Text style={[styles.progressPercent, { color: "#F59E0B" }]}>{t('goals.streakPlaceholderPercent')}</Text>
                </View>
                <View style={styles.progressBar}>
                  {/* Giả định 30 ngày là target Streak */}
                  <View style={[styles.progressFill, { width: `${Math.min(user?.streak || 0, 30) / 30 * 100}%`, backgroundColor: "#F59E0B" }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Motivation Section */}
          <View style={styles.motivationSection}>
            <View style={styles.motivationHeader}>
              <Icon name="emoji-people" size={24} color="#4F46E5" style={styles.motivationIcon} />
              <Text style={styles.motivationTitle}>{t('goals.motivationTitle')}</Text>
            </View>
            <View style={styles.motivationContent}>
              <Text style={styles.motivationText}>
                {t('goals.motivationQuote')}
              </Text>
              <Text style={styles.motivationAuthor}>- {t('goals.motivationAuthor')}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  )
}

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
    marginTop: 10,
    fontSize: 16,
    color: "#4F46E5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  goalDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  editButton: {
    padding: 4,
  },
  goalProgress: {
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#374151",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  completedText: {
    fontSize: 12,
    color: "#10B981",
    marginLeft: 4,
    fontWeight: "500",
  },
  presetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPreset: {
    borderColor: "#4F46E5",
  },
  presetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  presetDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "500",
  },
  presetDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  presetStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  presetStatText: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedText: {
    fontSize: 12,
    color: "#4F46E5",
    marginLeft: 4,
    fontWeight: "500",
  },
  motivationSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  motivationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  motivationIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  motivationContent: {
    alignItems: "center",
  },
  motivationText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 8,
  },
  motivationAuthor: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
})

export default LearningGoalsScreen