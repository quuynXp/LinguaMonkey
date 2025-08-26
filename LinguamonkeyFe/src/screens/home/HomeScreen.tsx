import { useEffect, useRef, useState } from "react"
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal, TextInput, ImageSourcePropType } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import useTopThreeUsers from "../../hooks/useTopThreeUsers"
import { useUserStore } from "../../stores/UserStore"
import { useRoadmap } from "../../hooks/useRoadmap"
import { getGreetingTime } from "../../utils/timeHelper"
import instance from "../../api/axiosInstance"
import { useDailyChallenges, useAssignChallenge, useCompleteChallenge } from "../../hooks/useDailyChallenge";
import CountryFlag from "react-native-country-flag";
import { languageToCountry } from "../../types/api"
import { queryClient } from "../../services/queryClient"

const HomeScreen = ({ navigation }) => {
  const bounceAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current


  const { topThreeUsers, isLoading, isError } = useTopThreeUsers()
  const { useUserRoadmap, useDefaultRoadmaps, useGenerateRoadmap } = useRoadmap()
  const {
    name = "",
    streak = 0,
    languages = [],
    dailyGoal = { completedLessons: 0, totalLessons: 1 },
    recentLessons = [],
    statusMessage = "",
    user,
  } = useUserStore()


  const { data: dailyChallenges, isLoading: dailyLoading } = useDailyChallenges(user?.user_id);
  const assignMutation = useAssignChallenge(user?.user_id);
  const completeMutation = useCompleteChallenge(user?.user_id);


  // Assume main language is first in languages or native
  const mainLanguage = languages[0]?.language_code || "en";
  const { data: roadmap, isLoading: roadmapLoading } = useUserRoadmap(mainLanguage);
  const { data: defaultRoadmaps } = useDefaultRoadmaps(mainLanguage);

  const generateMutation = useGenerateRoadmap();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [preferences, setPreferences] = useState({
    language_code: mainLanguage,
    target_proficiency: "",
    target_date: "",
    focus_areas: [],
    study_time_per_day: 0,
    is_custom: true,
    additional_prompt: "",
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start()

    const bounceAnimation = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]).start(() => setTimeout(bounceAnimation, 4000))
    }
    bounceAnimation()
  }, [])

  const handleGenerate = () => {
    generateMutation.mutate(preferences, {
      onSuccess: () => setShowGenerateDialog(false),
    });
  };

  const selectDefault = (defaultId) => {
    // Mutation to assign default to user, assume endpoint /api/roadmaps/assign
    instance.post("/roadmaps/assign", { roadmapId: defaultId }).then(() => {
      queryClient.invalidateQueries(["userRoadmap"]);
    });
  };

  const handleLeaderboardPress = () => navigation.navigate("EnhancedLeaderboard")
  const handleRoadmapPress = () => navigation.navigate("RoadmapScreen")
  const goalProgress = dailyGoal?.totalLessons ? (dailyGoal.completedLessons / dailyGoal.totalLessons) * 100 : 0

  const greeting = getGreetingTime()

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{name || "Học viên"}</Text>
            <Text style={styles.motivationText}>Hôm nay bạn muốn học gì?</Text>
          </View>
          <TouchableOpacity style={styles.streakContainer} onPress={() => navigation.navigate("DailyWelcome")}>
            <Icon name="local-fire-department" size={20} color="#FF6B35" />
            <Text style={styles.streakText}>{streak} ngày</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Character Section */}
        <Animated.View style={[styles.characterSection, { transform: [{ scale: bounceAnim }] }]}>
          <View style={styles.characterContainer}>
            <View style={styles.characterCircle}>
              <Icon name="school" size={48} color="#4ECDC4" />
            </View>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>Chúng ta cùng học nhé! 🚀</Text>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Progress Overview */}
        <View style={styles.progressOverview}>
          <Text style={styles.sectionTitle}>📊 Tiến độ học tập</Text>
          <View style={styles.progressCards}>
            <View style={styles.progressCard}>
              <Icon name="trending-up" size={24} color="#4ECDC4" />
              <Text style={styles.progressNumber}>{user?.level || 1}</Text>
              <Text style={styles.progressLabel}>Cấp độ</Text>
            </View>
            <View style={styles.progressCard}>
              <Icon name="local-fire-department" size={24} color="#FF6B35" />
              <Text style={styles.progressNumber}>{user.streak}</Text>
              <Text style={styles.progressLabel}>Ngày liên tiếp</Text>
            </View>
            <View style={styles.progressCard}>
              <Icon name="star" size={24} color="#F59E0B" />
              <Text style={styles.progressNumber}>{user?.exp || 0}</Text>
              <Text style={styles.progressLabel}>Điểm XP</Text>
            </View>
          </View>
        </View>

        {/* Top 3 Leaderboard */}
        {isLoading && <ActivityIndicator style={{ padding: 20 }} size="small" color="#3B82F6" />}
        {isError && <Text style={{ padding: 20, color: "red" }}>Không thể tải bảng xếp hạng</Text>}

        {Array.isArray(topThreeUsers) && topThreeUsers.length === 3 && (
          <TouchableOpacity style={styles.leaderboardSection} onPress={handleLeaderboardPress}>
            <Text style={styles.sectionTitle}>🏆 Bảng xếp hạng</Text>
            <View style={styles.podiumContainer}>
              {topThreeUsers.map((u, index) => (
                <View
                  key={u.leaderboardId}
                  style={[
                    styles.podiumItem,
                    index === 0 ? styles.firstPlace : index === 1 ? styles.secondPlace : styles.thirdPlace,
                  ]}
                >
                  {index === 0 && <Icon name="emoji-events" size={24} color="#FFD700" style={styles.crownAnimation} />}
                  <View
                    style={[
                      styles.medal,
                      index === 0 ? styles.goldMedal : index === 1 ? styles.silverMedal : styles.bronzeMedal,
                    ]}
                  >
                    <Text style={styles.medalText}>{index + 1}</Text>
                  </View>
                  <Image source={{ uri: u.avatarUrl }} style={styles.podiumAvatar} />
                  <Text style={styles.podiumName}>{u.name.split(" ")[0]}</Text>
                  <Text style={styles.podiumScore}>{u.score}</Text>
                </View>
              ))}
            </View>
            <View style={styles.viewMoreContainer}>
              <Text style={styles.viewMoreText}>Xem bảng xếp hạng đầy đủ</Text>
              <Icon name="chevron-right" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        )}

        {/* Roadmap Section */}
        {roadmapLoading ? <ActivityIndicator /> : roadmap ? (
          <TouchableOpacity style={styles.roadmapSection} onPress={handleRoadmapPress}>
            <Text style={styles.sectionTitle}>🗺️ Lộ trình học tập</Text>
            <View style={styles.roadmapCard}>
              <View style={styles.roadmapHeader}>
                <View style={styles.roadmapInfo}>
                  <Text style={styles.roadmapTitle}>Lộ trình cá nhân</Text>
                  <Text style={styles.roadmapSubtitle}>
                    {roadmap.completedItems}/{roadmap.total_items} mục đã hoàn thành
                  </Text>
                </View>
                <View style={styles.roadmapProgress}>
                  <Text style={styles.roadmapPercentage}>
                    {Math.round((roadmap.completedItems / roadmap.total_items) * 100)}%
                  </Text>
                </View>
              </View>
              <View style={styles.roadmapProgressBar}>
                <View
                  style={[
                    styles.roadmapProgressFill,
                    { width: `${(roadmap.completedItems / roadmap.total_items) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.roadmapFooter}>
                <Text style={styles.roadmapEstimate}>Ước tính: {roadmap.estimated_completion_time} ngày</Text>
                <Icon name="arrow-forward" size={16} color="#4ECDC4" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.roadmapSection}>
            <Text style={styles.sectionTitle}>🗺️ Tạo lộ trình học tập</Text>
            <Text>Chưa có lộ trình cho ngôn ngữ {mainLanguage}. Chọn mặc định hoặc tạo mới.</Text>
            <ScrollView horizontal style={{ marginVertical: 10 }}>
              {defaultRoadmaps?.map((def) => (
                <TouchableOpacity key={def.roadmap_id} onPress={() => selectDefault(def.roadmap_id)} style={styles.defaultCard}>
                  <Text>{def.title} ({def.language_code})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.generateButton} onPress={() => setShowGenerateDialog(true)}>
              <Text>Tạo lộ trình tùy chỉnh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate Dialog */}
        <Modal visible={showGenerateDialog} animationType="slide">
          <View style={styles.dialog}>
            <Text>Nhập thông tin để tạo lộ trình</Text>
            <TextInput placeholder="Target Proficiency" onChangeText={(t) => setPreferences({ ...preferences, target_proficiency: t })} />
            <TextInput placeholder="Target Date" onChangeText={(t) => setPreferences({ ...preferences, target_date: t })} />
            {/* Add more inputs for focus_areas, etc. */}
            <TouchableOpacity onPress={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <ActivityIndicator /> : <Text>Tạo</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGenerateDialog(false)}><Text>Hủy</Text></TouchableOpacity>
          </View>
        </Modal>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Học nhanh</Text>
          <View style={styles.actionGrid}>
            {languages.map((lang) => {
              const countryCode = languageToCountry[lang.language_code] || "US";

              return (
                <TouchableOpacity
                  key={lang.language_code}
                  style={[styles.actionCard, { backgroundColor: "#4ECDC4" }]}
                >
                  <CountryFlag isoCode={countryCode} size={24} style={{ marginBottom: 6 }} />
                  <Text style={styles.actionTitle}>{lang.language_name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily Goal */}
        <View style={styles.dailyGoal}>
          <Text style={styles.sectionTitle}>🎯 Mục tiêu hôm nay</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalText}>Hoàn thành {dailyGoal.totalLessons} bài học</Text>
                <Text style={styles.goalProgress}>
                  {dailyGoal.completedLessons}/{dailyGoal.totalLessons} bài
                </Text>
              </View>
              <View style={styles.goalIcon}>
                <Icon name="flag" size={24} color="#4ECDC4" />
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
            </View>
          </View>
        </View>

        {/* Daily Challenge Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 Thử thách hàng ngày</Text>
          {dailyLoading ? (
            <ActivityIndicator />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.challengeScroll}>
              {dailyChallenges?.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id.challengeId}
                  style={[styles.challengeCard, { backgroundColor: challenge.isCompleted ? "#4ECDC4" : "#F59E0B" }]}
                  onPress={() => completeMutation.mutate(challenge.id.challengeId)}
                >
                  <View style={styles.challengeIcon}>
                    <Icon name="sports-esports" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.challengeTitle}>Thử thách</Text>
                  <Text style={styles.challengeDescription}>
                    {challenge.expReward} XP {challenge.isCompleted ? "(Đã xong)" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.challengeCard, { backgroundColor: "#3B82F6" }]}
                onPress={() => assignMutation.mutate()}
              >
                <Icon name="add" size={32} color="#FFF" />
                <Text style={styles.challengeTitle}>Nhận thêm</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Recent Lessons */}
        {recentLessons.length > 0 && (
          <View style={styles.recentLessons}>
            <Text style={styles.sectionTitle}>📚 Tiếp tục học</Text>
            {recentLessons.map((lesson) => (
              <TouchableOpacity key={lesson.lesson_id} style={styles.lessonCard}>
                <View style={styles.lessonIcon}>
                  <Icon name="quiz" size={20} color="#4F46E5" />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <CountryFlag
                    isoCode={languageToCountry[lesson.language_code] || "US"}
                    size={20}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.lessonSubtitle}>
                    {lesson.language_code} • Bài {lesson.lesson_name}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            {statusMessage || "Bạn đang có tiến bộ tốt! Hãy tiếp tục duy trì nhé! 🌟"}
          </Text>
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
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  motivationText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    alignItems: "center",
  },
  characterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  progressOverview: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressCards: {
    flexDirection: "row",
    gap: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
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
  roadmapSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  roadmapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roadmapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roadmapInfo: {
    flex: 1,
  },
  roadmapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  roadmapProgress: {
    alignItems: "center",
  },
  roadmapPercentage: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4ECDC4",
  },
  roadmapProgressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  roadmapProgressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  roadmapFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roadmapEstimate: {
    fontSize: 12,
    color: "#9CA3AF",
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
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
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
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  goalIcon: {
    padding: 8,
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  challengeScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  challengeCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginRight: 16,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeIcon: {
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  challengeDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
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
    marginBottom: 12,
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
  defaultCard: {
    padding: 10,
    marginRight: 10,
    backgroundColor: "#EEE",
    borderRadius: 8,
  },
  generateButton: {
    padding: 12,
    backgroundColor: "#4ECDC4",
    borderRadius: 8,
    alignItems: "center",
  },
  dialog: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
})

export default HomeScreen
