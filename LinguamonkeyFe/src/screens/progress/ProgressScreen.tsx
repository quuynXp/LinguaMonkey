import React, { useEffect, useRef, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useQuery } from "@tanstack/react-query";
import instance from "../../api/axiosInstance";
import { useAppStore } from "../../stores/appStore";
import { useUserLearningActivities } from "../../hooks/useUserActivity";
import { gotoTab } from "../../utils/navigationRef";
import { useUserStore } from "../../stores/UserStore";
import { createScaledSheet } from "../../utils/scaledStyles";

const { width } = Dimensions.get("window");

type ProgressData = {
  day: string;
  value: number;
};

type Achievement = {
  id: string;
  title: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

// --- Hook fetch statistics ---
const useUserStatistics = (
  userId?: string | null,
  period: "week" | "month" | "year" = "week"
) => {
  return useQuery({
    queryKey: ["userStatistics", userId, period],
    queryFn: async () => {
      if (!userId) throw new Error("userId required");
      const res = await instance.get(
        `/statistics/user/${userId}?period=${period}&aggregate=day`
      );
      return res.data?.result ?? res.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
};

const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const userId = useUserStore.getState().user?.userId

  const {
    data: statsData,
    isLoading: statsLoading,
    isError: statsError,
  } = useUserStatistics(userId, "week");

  const { useAllActivities } = useUserLearningActivities();
  const { data: activities, isLoading: activitiesLoading } = useAllActivities({
    userId: String(userId),
    size: 50,
  });

  // Chart data from backend timeSeries
  const weeklyData: ProgressData[] = useMemo(() => {
    if (statsData && Array.isArray(statsData.timeSeries)) {
      return statsData.timeSeries.map((p: any) => ({
        day: formatDayLabel(p.date),
        value: Number(p.value ?? 0),
      }));
    }
    return [
      { day: "T2", value: 0 },
      { day: "T3", value: 0 },
      { day: "T4", value: 0 },
      { day: "T5", value: 0 },
      { day: "T6", value: 0 },
      { day: "T7", value: 0 },
      { day: "CN", value: 0 },
    ];
  }, [statsData]);

  // Achievements demo based on backend fields
  const achievements: Achievement[] = useMemo(() => {
    return [
      {
        id: "lesson10",
        title: "Hoàn thành 10 bài học",
        unlocked: (statsData?.totalLessonsCompleted ?? 0) >= 10,
        progress: statsData?.totalLessonsCompleted ?? 0,
        maxProgress: 10,
      },
      {
        id: "quiz5",
        title: "Làm 5 quiz",
        unlocked: (statsData?.totalQuizzesCompleted ?? 0) >= 5,
        progress: statsData?.totalQuizzesCompleted ?? 0,
        maxProgress: 5,
      },
    ];
  }, [statsData]);

  const animatedValuesRef = useRef<Animated.Value[]>([]);
  useEffect(() => {
    animatedValuesRef.current = weeklyData.map(() => new Animated.Value(0));

    Animated.stagger(
      80,
      animatedValuesRef.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [weeklyData]);

  const maxValue = Math.max(1, ...weeklyData.map((d) => d.value));

  const renderChart = () => (
    <TouchableOpacity onPress={() => gotoTab("Profile", "StudyHistory") as any}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Hoạt động trong tuần</Text>
        <View style={styles.chart}>
          {weeklyData.map((data, index) => (
            <View key={`${data.day}-${index}`} style={styles.chartBar}>
              <View style={styles.barContainer}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: animatedValuesRef.current[index]?.interpolate
                        ? animatedValuesRef.current[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, (data.value / maxValue) * 120],
                          })
                        : (data.value / maxValue) * 120,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{data.day}</Text>
              <Text style={styles.barValue}>{data.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Icon name="school" size={24} color="#10B981" />
        <Text style={styles.statValue}>{statsData?.totalLessonsCompleted ?? 0}</Text>
        <Text style={styles.statLabel}>Bài học</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="menu-book" size={24} color="#4F46E5" />
        <Text style={styles.statValue}>{statsData?.totalCoursesEnrolled ?? 0}</Text>
        <Text style={styles.statLabel}>Khoá học</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="quiz" size={24} color="#F59E0B" />
        <Text style={styles.statValue}>{statsData?.totalQuizzesCompleted ?? 0}</Text>
        <Text style={styles.statLabel}>Quiz</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="emoji-events" size={24} color="#EF4444" />
        <Text style={styles.statValue}>{achievements.filter((a) => a.unlocked).length}</Text>
        <Text style={styles.statLabel}>Thành tích</Text>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>Thành tích</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.achievementsList}>
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[
                styles.achievementCard,
                a.unlocked ? styles.unlockedAchievement : styles.lockedAchievement,
              ]}
            >
              <Icon
                name="emoji-events"
                size={24}
                color={a.unlocked ? "#F59E0B" : "#9CA3AF"}
              />
              <Text style={styles.achievementTitle}>{a.title}</Text>
              {!a.unlocked && (
                <View style={styles.achievementProgress}>
                  <View style={styles.achievementProgressBar}>
                    <View
                      style={[
                        styles.achievementProgressFill,
                        {
                          width: `${((a.progress ?? 0) / (a.maxProgress ?? 1)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {a.progress ?? 0}/{a.maxProgress}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (statsLoading || activitiesLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (statsError) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#6B7280" }}>Không thể tải dữ liệu tiến độ.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: new Animated.Value(1) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Tiến độ</Text>
        </View>

        {renderStats()}
        {renderChart()}
        {renderAchievements()}
      </Animated.View>
    </ScrollView>
  );
};

// --- helpers ---
function formatDayLabel(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 ? "CN" : `T${day + 1}`;
  } catch (e) {
    return String(dateStr).slice(5);
  }
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: (width - 56) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 20,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
  },
  chartBar: {
    alignItems: "center",
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  bar: {
    backgroundColor: "#4F46E5",
    width: 20,
    borderRadius: 10,
  },
  barLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  achievementsSection: {
    marginBottom: 20,
  },
  achievementsList: {
    flexDirection: "row",
    gap: 16,
    paddingRight: 20,
  },
  achievementCard: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  unlockedAchievement: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  lockedAchievement: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementProgress: {
    width: "100%",
    alignItems: "center",
  },
  achievementProgressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 4,
  },
  achievementProgressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 10,
    color: "#6B7280",
  },
});

export default ProgressScreen;
