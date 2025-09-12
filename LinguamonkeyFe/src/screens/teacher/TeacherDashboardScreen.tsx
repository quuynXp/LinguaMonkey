import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { getTeacherOverview } from "../../services/teacherStatisticsApi"
import { useUserStore } from "../../stores/UserStore"
import { gotoTab, resetToAuth } from "../../utils/navigationRef"
import Toast from "../../components/Toast"
import { LineChart } from "react-native-chart-kit"

const { width } = Dimensions.get("window")

const TeacherDashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  const teacherId = useUserStore.getState().user.user_id

  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month")

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["teacherStats", teacherId, selectedPeriod],
    queryFn: () =>
      getTeacherOverview({
        teacherId,
        period: selectedPeriod,
        aggregate: selectedPeriod === "week" ? "day" : "week", // ví dụ: tuần → theo ngày, tháng/năm → theo tuần
      }),
    enabled: !!teacherId, // chỉ fetch khi có teacherId
  })

  const statsCards = [
    {
      id: "courses",
      title: t("teacher.dashboard.myCourses"),
      value: data?.courses || 0,
      icon: "school",
      color: "#3B82F6",
      screen: "TeacherCourseManagement",
    },
    {
      id: "lessons",
      title: t("teacher.dashboard.totalLessons"),
      value: data?.lessons || 0,
      icon: "book",
      color: "#10B981",
      screen: "TeacherLessonManagement",
    },
    {
      id: "students",
      title: t("teacher.dashboard.totalStudents"),
      value: data?.students || 0,
      icon: "people",
      color: "#F59E0B",
      screen: "TeacherStudentManagement",
    },
    {
      id: "revenue",
      title: t("teacher.dashboard.revenue"),
      value: `$${data?.revenue || 0}`,
      icon: "attach-money",
      color: "#EF4444",
      screen: "TeacherRevenueAnalytics",
    },
  ]

  const renderStatsCard = (stat: any) => (
    <TouchableOpacity
      key={stat.id}
      style={[styles.statsCard, { borderLeftColor: stat.color }]}
      onPress={() => navigation.navigate(stat.screen)}
    >
      <View style={styles.statsCardHeader}>
        <View style={[styles.statsIcon, { backgroundColor: `${stat.color}20` }]}>
          <Icon name={stat.icon} size={24} color={stat.color} />
        </View>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </View>
      <Text style={styles.statsValue}>{stat.value.toLocaleString()}</Text>
      <Text style={styles.statsTitle}>{stat.title}</Text>
    </TouchableOpacity>
  )

  const renderQuickAction = (action: any) => (
    <TouchableOpacity
      key={action.id}
      style={styles.actionCard}
      onPress={() => gotoTab(action.screen)}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
        <Icon name={action.icon} size={28} color={action.color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t("teacher.dashboard.loading")}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t("teacher.dashboard.title")}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="notifications" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "year"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.selectedPeriodButton]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.selectedPeriodButtonText,
                ]}
              >
                {t(`teacher.dashboard.periods.${period}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t("teacher.dashboard.overview")}</Text>
          <View style={styles.statsGrid}>{statsCards.map(renderStatsCard)}</View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => resetToAuth()}
      >
        <Icon name="logout" size={22} color="#EF4444" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6B7280" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: { flex: 1 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1F2937" },
  notificationButton: { padding: 8 },
  content: { flex: 1 },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  selectedPeriodButton: { backgroundColor: "#3B82F6" },
  periodButtonText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  selectedPeriodButtonText: { color: "#fff" },
  statsSection: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: (width - 60) / 2,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsValue: { fontSize: 24, fontWeight: "bold", color: "#1F2937", marginBottom: 4 },
  statsTitle: { fontSize: 14, color: "#6B7280" },
  section: { padding: 24 },
  actionsGrid: { gap: 12 },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  actionDescription: { fontSize: 14, color: "#6B7280" },
})

export default TeacherDashboardScreen
