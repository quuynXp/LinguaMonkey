"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useAppStore } from "../../stores/appStore"
import { useUserStats } from "../../hooks/useUsers"
import { formatShortTime } from "../../utils/timeHelper"

const { width } = Dimensions.get("window")

interface ProgressData {
  day: string
  minutes: number
  lessons: number
}

interface Achievement {
  id: number
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress: number
  maxProgress: number
}

const ProgressScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week")
  const [selectedLanguage, setSelectedLanguage] = useState<"chinese" | "english">("chinese")
  const animatedValues = useRef(Array(7).fill(new Animated.Value(0))).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  const { user } = useAppStore()
  const { data: userStats } = useUserStats(user?.user_id)

  useEffect(() => {
    // Animate chart bars
    Animated.stagger(
      100,
      animatedValues.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ),
    ).start()

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const weeklyData: ProgressData[] = [
    { day: "T2", minutes: 25, lessons: 3 },
    { day: "T3", minutes: 30, lessons: 4 },
    { day: "T4", minutes: 15, lessons: 2 },
    { day: "T5", minutes: 45, lessons: 6 },
    { day: "T6", minutes: 35, lessons: 5 },
    { day: "T7", minutes: 20, lessons: 3 },
    { day: "CN", minutes: 40, lessons: 5 },
  ]

  const achievements: Achievement[] = [
    {
      id: 1,
      title: "Người mới bắt đầu",
      description: "Hoàn thành bài học đầu tiên",
      icon: "school",
      unlocked: true,
      progress: 1,
      maxProgress: 1,
    },
    {
      id: 2,
      title: "Kiên trì 7 ngày",
      description: "Học liên tục 7 ngày",
      icon: "local-fire-department",
      unlocked: true,
      progress: 7,
      maxProgress: 7,
    },
    {
      id: 3,
      title: "Bậc thầy từ vựng",
      description: "Học 100 từ mới",
      icon: "book",
      unlocked: false,
      progress: 67,
      maxProgress: 100,
    },
    {
      id: 4,
      title: "Tốc độ ánh sáng",
      description: "Hoàn thành 10 bài trong 1 ngày",
      icon: "flash-on",
      unlocked: false,
      progress: 6,
      maxProgress: 10,
    },
  ]

  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes))
  const navigation = useNavigation()

  const renderChart = () => (
    <TouchableOpacity onPress={() => navigation.navigate("StudyHistory")}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Thời gian học trong tuần</Text>
        <View style={styles.chart}>
          {weeklyData.map((data, index) => (
            <View key={data.day} style={styles.chartBar}>
              <View style={styles.barContainer}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: animatedValues[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (data.minutes / maxMinutes) * 120],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{data.day}</Text>
              <Text style={styles.barValue}>{data.minutes}p</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Icon name="schedule" size={24} color="#4F46E5" />
        <Text style={styles.statValue}>{formatShortTime(userStats?.totalStudyTime)}</Text>
        <Text style={styles.statLabel}>Phút học</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="school" size={24} color="#10B981" />
        <Text style={styles.statValue}>{userStats?.lessonsCompleted}</Text>
        <Text style={styles.statLabel}>Bài học</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="local-fire-department" size={24} color="#F59E0B" />
        <Text style={styles.statValue}>7</Text>
        <Text style={styles.statLabel}>Ngày liên tiếp</Text>
      </View>
      <View style={styles.statCard}>
        <Icon name="emoji-events" size={24} color="#EF4444" />
        <Text style={styles.statValue}>2</Text>
        <Text style={styles.statLabel}>Thành tích</Text>
      </View>
    </View>
  )

  const renderLanguageProgress = () => (
    <View style={styles.languageProgress}>
      <Text style={styles.sectionTitle}>Tiến độ theo ngôn ngữ</Text>

      <TouchableOpacity
        style={[styles.languageCard, selectedLanguage === "chinese" && styles.selectedLanguageCard]}
        onPress={() => setSelectedLanguage("chinese")}
      >
        <View style={styles.languageHeader}>
          <Text style={styles.languageFlag}>🇨🇳</Text>
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>Tiếng Trung</Text>
            <Text style={styles.languageLevel}>Sơ cấp • Cấp độ 3</Text>
          </View>
          <Text style={styles.languagePercent}>65%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: "65%", backgroundColor: "#EF4444" }]} />
        </View>
        <View style={styles.languageStats}>
          <Text style={styles.languageStatText}>24 bài học • 156 từ vựng</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.languageCard, selectedLanguage === "english" && styles.selectedLanguageCard]}
        onPress={() => setSelectedLanguage("english")}
      >
        <View style={styles.languageHeader}>
          <Text style={styles.languageFlag}>🇺🇸</Text>
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>Tiếng Anh</Text>
            <Text style={styles.languageLevel}>Trung cấp • Cấp độ 2</Text>
          </View>
          <Text style={styles.languagePercent}>45%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: "45%", backgroundColor: "#3B82F6" }]} />
        </View>
        <View style={styles.languageStats}>
          <Text style={styles.languageStatText}>18 bài học • 98 từ vựng</Text>
        </View>
      </TouchableOpacity>
    </View>
  )

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>Thành tích</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.achievementsList}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                achievement.unlocked ? styles.unlockedAchievement : styles.lockedAchievement,
              ]}
            >
              <View style={styles.achievementIcon}>
                {achievement.unlocked ? (
                  <Icon name={achievement.icon} size={24} color="#F59E0B" />
                ) : (
                  <Icon name={achievement.icon} size={24} color={achievement.unlocked ? "#F59E0B" : "#9CA3AF"} />
                )}
              </View>
              <Text style={[styles.achievementTitle, !achievement.unlocked && styles.lockedText]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementDescription, !achievement.unlocked && styles.lockedText]}>
                {achievement.description}
              </Text>
              {!achievement.unlocked && (
                <View style={styles.achievementProgress}>
                  <View style={styles.achievementProgressBar}>
                    <View
                      style={[
                        styles.achievementProgressFill,
                        { width: `${(achievement.progress / achievement.maxProgress) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {achievement.progress}/{achievement.maxProgress}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Tiến độ</Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Icon name="calendar-today" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {renderStats()}
        {renderChart()}
        {renderLanguageProgress()}
        {renderAchievements()}
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
  calendarButton: {
    padding: 8,
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
  languageProgress: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  languageCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLanguageCard: {
    borderColor: "#4F46E5",
  },
  languageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  languageLevel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  languagePercent: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  languageStats: {
    marginTop: 4,
  },
  languageStatText: {
    fontSize: 14,
    color: "#6B7280",
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
  achievementIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  trophyAnimation: {
    width: 48,
    height: 48,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  lockedText: {
    color: "#9CA3AF",
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
})

export default ProgressScreen
