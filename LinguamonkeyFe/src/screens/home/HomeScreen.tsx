import { useEffect, useRef, useState } from "react"
import { Animated, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Modal, TextInput } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useLeaderboards as useLeaderboardsHooksFactory } from "../../hooks/useLeaderboards"
import { useUserStore } from "../../stores/UserStore"
import { useRoadmap } from "../../hooks/useRoadmap"
import { getGreetingTime } from "../../utils/timeHelper"
import instance from "../../api/axiosInstance"
import { useDailyChallenges, useAssignChallenge, useCompleteChallenge } from "../../hooks/useDailyChallenge"
import CountryFlag from "react-native-country-flag"
import { languageToCountry } from "../../types/api"
import { queryClient } from "../../services/queryClient"
import { useTranslation } from "react-i18next"
import { gotoTab } from "../../utils/navigationRef"
import { createScaledSheet } from "../../utils/scaledStyles"

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const bounceAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  const { useLeaderboardTopThree } = useLeaderboardsHooksFactory()
  const { data: topThreeUsers, isLoading, isError } = useLeaderboardTopThree()

  const { useUserRoadmap, useDefaultRoadmaps } = useRoadmap()
  const {
    name = "",
    streak = 0,
    languages = [],
    dailyGoal = { completedLessons: 0, totalLessons: 1 },
    recentLessons = [],
    statusMessage = "",
    user,
  } = useUserStore()

  const { data: dailyChallenges, isLoading: dailyLoading, error: dailyError } = useDailyChallenges(user?.userId)
  const assignMutation = useAssignChallenge(user?.userId)
  const completeMutation = useCompleteChallenge(user?.userId)

  const mainLanguage = languages[0] || "en"
  const { data: roadmap, isLoading: roadmapLoading, error: roadmapError } = useUserRoadmap(mainLanguage)
  const { data: defaultRoadmaps, isLoading: defaultLoading } = useDefaultRoadmaps(mainLanguage)

  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [preferences, setPreferences] = useState({
    language_code: mainLanguage,
    target_proficiency: "",
    target_date: "",
    focus_areas: [],
    study_time_per_day: 1,
    is_custom: true,
    additional_prompt: "",
  })

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

  const handleLeaderboardPress = () => navigation.navigate("EnhancedLeaderboard")
  const handleRoadmapPress = () => navigation.navigate("RoadmapScreen")
  const handlePublicRoadmapsPress = () => navigation.navigate("PublicRoadmaps")

  const goalProgress = dailyGoal?.totalLessons ? (dailyGoal.completedLessons / dailyGoal.totalLessons) * 100 : 0
  const greeting = getGreetingTime(undefined, undefined, undefined, t)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{name || t("home.student")}</Text>
          </View>
          <TouchableOpacity style={styles.streakContainer} onPress={() => gotoTab('DailyWelcome')}>
            <Icon name="local-fire-department" size={20} color="#FF6B35" />
            <Text style={styles.streakText}>{t("home.progress.streak")}: {streak} {t("home.days")}</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard */}
        {isLoading && <ActivityIndicator style={{ padding: 20 }} size="small" color="#3B82F6" />}
        {isError && <Text style={{ padding: 20, color: "red" }}>{t("home.leaderboard.error")}</Text>}

        {Array.isArray(topThreeUsers) && topThreeUsers.length === 3 && (
          <TouchableOpacity style={styles.leaderboardSection} onPress={handleLeaderboardPress}>
            <Text style={styles.sectionTitle}>{t("home.leaderboard.title")}</Text>
            <View style={styles.podiumContainer}>
              {topThreeUsers.map((user, idx) => (
                <View key={idx} style={[styles.podiumItem, idx === 0 ? styles.firstPlace : idx === 1 ? styles.secondPlace : styles.thirdPlace]}>
                  <View style={[styles.medal, idx === 0 ? styles.goldMedal : idx === 1 ? styles.silverMedal : styles.bronzeMedal]}>
                    <Text style={styles.medalText}>{idx + 1}</Text>
                  </View>
                  <Image source={{ uri: user.avatarUrl }} style={styles.podiumAvatar} />
                  <Text style={styles.podiumName}>{user.fullname}</Text>
                  <Text style={styles.podiumScore}>{t("home.progress.level")}: {user.level}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Character */}
        <Animated.View style={[styles.characterSection, { transform: [{ scale: bounceAnim }] }]}>
          <View style={styles.characterContainer}>
            <View style={styles.characterCircle}><Icon name="school" size={48} color="#4ECDC4" /></View>
            <View style={styles.speechBubble}><Text style={styles.speechText}>{t("home.character.message")}</Text></View>
          </View>
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressOverview}>
          <Text style={styles.sectionTitle}>{t("home.progress.title")}</Text>
          <View style={styles.progressCard}>
            <Icon name="star" size={24} color="#F59E0B" />
            <Text style={styles.progressNumber}>{user?.exp || 0} / {user?.expToNextLevel || 0}</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${(user?.exp / user?.expToNextLevel) * 100 || 0}%` }
              ]} />
            </View>
            <Text style={styles.progressLabel}>{t("home.progress.xp")}</Text>
          </View>
        </View>

        {/* Roadmap Section */}
        <View style={styles.roadmapSection}>
          <Text style={styles.sectionTitle}>{t("home.roadmap.title")}</Text>

          {roadmapLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>{t("home.roadmap.loading")}</Text>
            </View>
          ) : roadmapError ? (
            <View style={styles.errorContainer}>
              <Icon name="error" size={40} color="#EF4444" />
              <Text style={styles.errorText}>{t("home.roadmap.error")}</Text>
            </View>
          ) : roadmap ? (
            <TouchableOpacity style={styles.roadmapCard} onPress={handleRoadmapPress}>
              <View style={styles.roadmapHeader}>
                <View style={styles.roadmapInfo}>
                  <Text style={styles.roadmapTitle}>{roadmap.title || t("home.roadmap.personal")}</Text>
                  <Text style={styles.roadmapSubtitle}>
                    {t("home.roadmap.completed", { count: roadmap.completedItems })}
                  </Text>
                </View>
                <View style={styles.roadmapProgress}>
                  <Text style={styles.roadmapPercentage}>
                    {Math.round(roadmap.totalItems > 0 ? (roadmap.completedItems / roadmap.totalItems) * 100 : 0)}%
                  </Text>
                </View>
              </View>
              <View style={styles.roadmapProgressBar}>
                <View style={[
                  styles.roadmapProgressFill,
                  { width: `${roadmap.totalItems > 0 ? (roadmap.completedItems / roadmap.totalItems) * 100 : 0}%` }
                ]} />
              </View>
              <View style={styles.roadmapFooter}>
                <Text style={styles.roadmapEstimate}>
                  {t("home.roadmap.estimate", { days: roadmap.estimatedCompletionTime })}
                </Text>
                <Icon name="arrow-forward" size={16} color="#4ECDC4" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noRoadmapContainer}>
              {defaultLoading ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : defaultRoadmaps && defaultRoadmaps.length > 0 ? (
                <>
                  <Text style={styles.noRoadmapText}>{t("home.roadmap.selectDefault")}</Text>
                  <ScrollView horizontal style={{ marginVertical: 10 }}>
                    {defaultRoadmaps.map((def) => (
                      <TouchableOpacity
                        key={def.id}
                        onPress={() => instance.post("/api/v1/roadmaps/assign", { roadmapId: def.id }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["userRoadmap"] })
                        })}
                        style={styles.defaultCard}
                      >
                        <Text style={{ fontWeight: "600" }}>{def.title}</Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>{def.language}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.noRoadmapText}>{t("home.roadmap.notFound")}</Text>
              )}
              <TouchableOpacity style={styles.generateButton} onPress={() => setShowGenerateDialog(true)}>
                <Icon name="add" size={20} color="#fff" />
                <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "600" }}>
                  {t("home.roadmap.createCustom")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.browseButton} onPress={handlePublicRoadmapsPress}>
                <Icon name="public" size={20} color="#4ECDC4" />
                <Text style={{ color: "#4ECDC4", marginLeft: 8, fontWeight: "600" }}>
                  {t("home.roadmap.browsePublic")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Daily Goal */}
        <View style={styles.dailyGoal}>
          <Text style={styles.sectionTitle}>{t("home.dailyGoal.title")}</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalText}>{t("home.dailyGoal.complete", { total: dailyGoal.totalLessons })}</Text>
                <Text style={styles.goalProgress}>{dailyGoal.completedLessons}/{dailyGoal.totalLessons}</Text>
              </View>
              <Icon name="flag" size={24} color="#4ECDC4" />
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
            </View>
          </View>
        </View>

        {/* Daily Challenge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 {t("home.challenge.title")}</Text>
          {dailyLoading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ padding: 20 }} />
          ) : dailyError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t("home.challenge.error")}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.challengeScroll}>
              {dailyChallenges?.map((challenge) => (
                <TouchableOpacity
                  key={challenge.challengeId}
                  style={[
                    styles.challengeCard,
                    { backgroundColor: challenge.isCompleted ? "#10B981" : "#F59E0B" }
                  ]}
                  onPress={() => {
                    if (!challenge.isCompleted) {
                      completeMutation.mutate(challenge.challengeId)
                    }
                  }}
                  disabled={challenge.isCompleted}
                >
                  <Icon name="sports-esports" size={32} color="#fff" />
                  <Text style={styles.challengeTitle}>{challenge.dailyChallenge?.title || "Challenge"}</Text>
                  <Text style={styles.challengeDescription}>{challenge.expReward} XP</Text>
                  <Text style={styles.challengeDescription}>
                    {challenge.isCompleted ? "✓ Done" : "Pending"}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.challengeCard, { backgroundColor: "#3B82F6" }]}
                onPress={() => assignMutation.mutate()}
              >
                <Icon name="add" size={32} color="#fff" />
                <Text style={styles.challengeTitle}>{t("home.challenge.add")}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Generate Dialog */}
        <Modal visible={showGenerateDialog} animationType="slide" transparent>
          <View style={styles.dialog}>
            <View style={styles.dialogContent}>
              <Text style={styles.dialogTitle}>{t("home.roadmap.dialogTitle")}</Text>
              <TextInput
                placeholder={t("home.roadmap.targetProficiency")}
                style={styles.input}
                onChangeText={(val) => setPreferences({ ...preferences, target_proficiency: val })}
              />
              <TextInput
                placeholder={t("home.roadmap.targetDate")}
                style={styles.input}
                onChangeText={(val) => setPreferences({ ...preferences, target_date: val })}
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity style={[styles.dialogButton, { backgroundColor: "#4ECDC4" }]}>
                  <Text style={styles.dialogButtonText}>{t("home.roadmap.create")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogButton, { backgroundColor: "#9CA3AF" }]} onPress={() => setShowGenerateDialog(false)}>
                  <Text style={styles.dialogButtonText}>{t("home.roadmap.cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </Animated.View>
    </ScrollView>
  )
}

const styles = createScaledSheet({
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
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "#6B7280",
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
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B35",
    marginLeft: 4,
  },
  leaderboardSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  firstPlace: {
    marginTop: -20,
    paddingTop: 32,
  },
  secondPlace: {
    marginTop: -10,
    paddingTop: 24,
  },
  thirdPlace: {
    marginTop: 0,
    paddingTop: 20,
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
    color: "#fff",
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
  },
  podiumScore: {
    fontSize: 9,
    color: "#6B7280",
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
  },
  speechBubble: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: "80%",
  },
  speechText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  progressOverview: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  progressNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 12,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  roadmapSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#6B7280",
    marginTop: 10,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
  },
  errorText: {
    color: "#DC2626",
    textAlign: "center",
  },
  roadmapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  roadmapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roadmapInfo: {
    flex: 1,
  },
  roadmapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  roadmapSubtitle: {
    fontSize: 13,
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
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  roadmapProgressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
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
  noRoadmapContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  noRoadmapText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  defaultCard: {
    padding: 12,
    marginRight: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    minWidth: 150,
  },
  generateButton: {
    backgroundColor: "#4ECDC4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  browseButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  dailyGoal: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
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
  },
  goalProgress: {
    fontSize: 13,
    color: "#6B7280",
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
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    marginTop: 8,
    textAlign: "center",
  },
  challengeDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 4,
  },
  dialog: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  dialogContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 30,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  dialogButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})

export default HomeScreen