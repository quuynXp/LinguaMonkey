
import { useEffect, useRef } from "react"
import { Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
import useTopThreeUsers from "../../hooks/useTopThreeUsers"
import { useUserStore } from "../../stores/UserStore" // <-- store của bạn

// const { width } = Dimensions.get("window")

const HomeScreen = ({ navigation }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  const { topThreeUsers, isLoading, isError } = useTopThreeUsers()
  const {
    name = "",
    streak = 0,
    languages = [],
    dailyGoal = { completedLessons: 0, totalLessons: 1 },
    recentLessons = [],
    statusMessage = ""
  } = useUserStore()

  useEffect(() => {
    console.log("topThreeUsers", topThreeUsers)
    console.log("userStore", { name, streak, languages, dailyGoal, recentLessons, statusMessage })
  }, [topThreeUsers, name, streak, languages, dailyGoal, recentLessons, statusMessage])



  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start()

    const bounceAnimation = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(() => setTimeout(bounceAnimation, 3000))
    }
    bounceAnimation()
  }, [])

  const handleLeaderboardPress = () => navigation.navigate("EnhancedLeaderboard")
  const goalProgress = dailyGoal?.totalLessons
    ? (dailyGoal.completedLessons / dailyGoal.totalLessons) * 100
    : 0
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào! 👋</Text>
            <Text style={styles.userName}>{name}</Text>
          </View>
          <TouchableOpacity style={styles.streakContainer} onPress={() => navigation.navigate("DailyWelcome")}>
            <Icon name="local-fire-department" size={20} color="#FF6B35" />
            <Text style={styles.streakText}>{streak} ngày</Text>
          </TouchableOpacity>
        </View>

        {/* Top 3 Leaderboard */}
        {isLoading && <ActivityIndicator style={{ padding: 20 }} size="small" color="#3B82F6" />}
        {isError && <Text style={{ padding: 20, color: "red" }}>Không thể tải bảng xếp hạng</Text>}

        {Array.isArray(topThreeUsers) && topThreeUsers.length === 3 && (
          <TouchableOpacity style={styles.leaderboardSection} onPress={handleLeaderboardPress}>
            <Text style={styles.sectionTitle}>🏆 Top Learners</Text>
            <View style={styles.podiumContainer}>
              {topThreeUsers.map((u, index) => (
                <View
                  key={u.leaderboardId}
                  style={[
                    styles.podiumItem,
                    index === 0 ? styles.firstPlace : index === 1 ? styles.secondPlace : styles.thirdPlace
                  ]}
                >
                  {index === 0 && (
                    <Icon
                      name="emoji-events"
                      size={24}
                      color="#FFD700"
                      style={styles.crownAnimation}
                    />
                  )}
                  <View style={[
                    styles.medal,
                    index === 0 ? styles.goldMedal : index === 1 ? styles.silverMedal : styles.bronzeMedal
                  ]}>
                    <Text style={styles.medalText}>{index + 1}</Text>
                  </View>
                  <Image source={{ uri: u.avatarUrl }} style={styles.podiumAvatar} />
                  <Text style={styles.podiumName}>{u.name.split(" ")[0]}</Text>
                  <Text style={styles.podiumScore}>{u.score}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Học nhanh</Text>
          <View style={styles.actionGrid}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.id}
                style={[styles.actionCard, { backgroundColor: lang.color }]}
              >
                <Icon name={lang.icon} size={24} color="#FFFFFF" />
                <Text style={styles.actionTitle}>{lang.name}</Text>
                <Text style={styles.actionSubtitle}>{lang.quickLessonTime} phút</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Goal */}
        <View style={styles.dailyGoal}>
          <Text style={styles.sectionTitle}>Mục tiêu hôm nay</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalText}>
                Hoàn thành {dailyGoal.totalLessons} bài học
              </Text>
              <Text style={styles.goalProgress}>
                {dailyGoal.completedLessons}/{dailyGoal.totalLessons} bài
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
            </View>
          </View>
        </View>

        {/* Recent Lessons */}
        <View style={styles.recentLessons}>
          <Text style={styles.sectionTitle}>Tiếp tục học</Text>
          {recentLessons.map(lesson => (
            <TouchableOpacity key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonIcon}>
                <Icon name="quiz" size={20} color="#4F46E5" />
              </View>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonSubtitle}>
                  {lesson.language} • Bài {lesson.lessonNumber}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
    marginLeft: 4,
  },
  characterSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  characterContainer: {
    marginBottom: 16,
  },
  character: {
    width: 120,
    height: 120,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  speechText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    fontWeight: "500",
  },
  leaderboardSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 12,
  },
  podiumItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  firstPlace: {
    marginTop: -16,
    paddingTop: 28,
  },
  secondPlace: {
    marginTop: -8,
  },
  thirdPlace: {
    marginTop: 0,
  },
  crownAnimation: {
    width: 24,
    height: 24,
    position: "absolute",
    top: -12,
  },
  medal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  goldMedal: {
    backgroundColor: "#F59E0B",
  },
  silverMedal: {
    backgroundColor: "#9CA3AF",
  },
  bronzeMedal: {
    backgroundColor: "#CD7C2F",
  },
  medalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 9,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 4,
  },
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chineseCard: {
    backgroundColor: "#EF4444",
  },
  englishCard: {
    backgroundColor: "#3B82F6",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  dailyGoal: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  goalProgress: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  recentLessons: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lessonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  lessonSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
})

export default HomeScreen
