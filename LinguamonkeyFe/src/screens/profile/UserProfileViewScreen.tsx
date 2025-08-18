"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useUsers } from "../hooks/useUsers"
import { useAppStore } from "../stores/appStore"
import type { Achievement } from "../types/api"

const { width } = Dimensions.get("window")

const UserProfileViewScreen = ({ navigation, route }: any) => {
  const { userId } = route.params
  const { t } = useTranslation()
  const { user: currentUser } = useAppStore()

  const [showEffortMap, setShowEffortMap] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "year">("month")
  const [showAchievements, setShowAchievements] = useState(false)

  // API hooks
  const { useUserProfile, useUserLearningActivities, useSendFriendRequest, useAcceptFriendRequest } = useUsers()

  const { data: userProfile, isLoading: profileLoading, error: profileError } = useUserProfile(userId)
  const { data: effortMapData = [] } = useUserLearningActivities(userId, selectedTimeframe)
  const { sendRequest, isSending } = useSendFriendRequest()
  const { acceptRequest, isAccepting } = useAcceptFriendRequest()

  const handleAddFriend = async () => {
    if (!userProfile || isSending) return

    Alert.alert(t("profile.addFriend"), `Send a friend request to ${userProfile.fullname}?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: async () => {
          try {
            await sendRequest(userProfile.user_id)
            Alert.alert(t("common.success"), "Friend request sent!")
          } catch (error: any) {
            Alert.alert(t("common.error"), error.message || t("errors.unknown"))
          }
        },
      },
    ])
  }

  const handleMessage = () => {
    if (!userProfile) return

    navigation.navigate("UserChatScreen", {
      userId: userProfile.user_id,
      userName: userProfile.fullname,
    })
  }

  const handleViewRoadmap = () => {
    if (!userProfile) return

    // Navigate to roadmap screen for this user's primary learning language
    const primaryLanguage = userProfile.learningLanguages?.[0]?.language_code
    navigation.navigate("RoadmapScreen", {
      userId: userProfile.user_id,
      languageCode: primaryLanguage,
    })
  }

  const getEffortMapData = () => {
    if (!effortMapData.length) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      }
    }

    // Convert learning activities to chart data
    const data = effortMapData.map((item) => {
      // Convert duration string to minutes for display
      const duration = item.duration ? parseInt(item.duration.replace(/\D/g, '')) || 0 : 0
      return duration
    })
    const labels = effortMapData.map((item) => new Date(item.created_at).getDate().toString())

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }
  }

  const renderAchievement = (achievement: Achievement) => (
    <View key={achievement.badge_id} style={styles.achievementItem}>
      <View style={[styles.achievementIcon, { backgroundColor: "#3B82F6" }]}>
        <Icon name="star" size={24} color="#fff" />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementTitle}>{achievement.badge.badge_name}</Text>
        <Text style={styles.achievementDescription}>{achievement.badge.description}</Text>
        <Text style={styles.achievementDate}>
          {t("profile.unlocked")} {new Date(achievement.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Icon name="check-circle" size={20} color="#3B82F6" />
    </View>
  )

  if (profileError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{t("errors.networkError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (profileLoading || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: userProfile.avatar_url || '/placeholder.svg?height=120&width=120' }} style={styles.avatar} />
          <Text style={styles.name}>{userProfile.fullname}</Text>
          <Text style={styles.username}>{userProfile.nickname || userProfile.email}</Text>
          <Text style={styles.bio}>{userProfile.country || 'Learning enthusiast'}</Text>

          {currentUser?.user_id !== userProfile.user_id && (
            <View style={styles.actionButtons}>
              {!userProfile.isFriend && !userProfile.friendRequestSent && (
                <TouchableOpacity
                  style={[styles.addFriendButton, isSending && styles.disabledButton]}
                  onPress={handleAddFriend}
                  disabled={isSending}
                >
                  <Icon name="person-add" size={20} color="#fff" />
                  <Text style={styles.addFriendText}>{isSending ? t("common.loading") : t("profile.addFriend")}</Text>
                </TouchableOpacity>
              )}
              {userProfile.friendRequestSent && (
                <View style={styles.pendingButton}>
                  <Icon name="schedule" size={20} color="#666" />
                  <Text style={styles.pendingText}>{t("profile.requestSent")}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Icon name="message" size={20} color="#2196F3" />
                <Text style={styles.messageText}>{t("profile.message")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Roadmap Button - Show for current user or friends */}
          {(currentUser?.user_id === userProfile.user_id || userProfile.isFriend) && (
            <TouchableOpacity style={styles.roadmapButton} onPress={handleViewRoadmap}>
              <Icon name="map" size={20} color="#FFFFFF" />
              <Text style={styles.roadmapButtonText}>{t("profile.viewRoadmap")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {t("profile.stats.currentLevel")} {userProfile.level}
            </Text>
            <Text style={styles.statLabel}>{t("profile.stats.currentLevel")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProfile.exp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t("profile.stats.totalXP")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProfile.streak}</Text>
            <Text style={styles.statLabel}>{t("profile.stats.dayStreak")}</Text>
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.languages")}</Text>
          <View style={styles.languageContainer}>
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>{t("profile.native")}</Text>
              <Text style={styles.languageValue}>{userProfile.native_language_code || 'Not specified'}</Text>
            </View>
            <View style={styles.languageItem}>
              <Text style={styles.languageLabel}>{t("profile.learning")}</Text>
              <Text style={styles.languageValue}>
                {userProfile.learningLanguages?.map(lang => lang.language.language_name).join(", ") || 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.stats.title")}</Text>
          <View style={styles.detailedStats}>
            <View style={styles.detailedStatItem}>
              <Icon name="schedule" size={24} color="#4CAF50" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>
                  {Math.floor(userProfile.stats?.totalStudyTime / 60 || 0)}h {(userProfile.stats?.totalStudyTime || 0) % 60}m
                </Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.totalStudyTime")}</Text>
              </View>
            </View>
            <View style={styles.detailedStatItem}>
              <Icon name="book" size={24} color="#2196F3" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{userProfile.stats?.lessonsCompleted || 0}</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.lessonsCompleted")}</Text>
              </View>
            </View>
            <View style={styles.detailedStatItem}>
              <Icon name="translate" size={24} color="#FF9800" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{userProfile.stats?.wordsLearned || 0}</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.wordsLearned")}</Text>
              </View>
            </View>
            <View style={styles.detailedStatItem}>
              <Icon name="quiz" size={24} color="#9C27B0" />
              <View style={styles.detailedStatInfo}>
                <Text style={styles.detailedStatNumber}>{userProfile.stats?.averageScore || 0}%</Text>
                <Text style={styles.detailedStatLabel}>{t("profile.stats.averageScore")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.achievements")}</Text>
            <TouchableOpacity onPress={() => setShowAchievements(true)}>
              <Text style={styles.viewAllText}>{t("profile.viewAll")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {userProfile.achievements?.slice(0, 4).map((achievement) => (
              <View key={achievement.badge_id} style={styles.achievementPreview}>
                <View style={[styles.achievementPreviewIcon, { backgroundColor: "#3B82F6" }]}>
                  <Icon name="star" size={20} color="#fff" />
                </View>
                <Text style={styles.achievementPreviewTitle} numberOfLines={1}>
                  {achievement.badge.badge_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Effort Map Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.learningActivity")}</Text>
            <TouchableOpacity onPress={() => setShowEffortMap(true)}>
              <Text style={styles.viewAllText}>{t("profile.viewDetails")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chartContainer}>
            <LineChart
              data={getEffortMapData()}
              width={width - 60}
              height={180}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#2196F3",
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      </ScrollView>

      {/* Achievements Modal */}
      <Modal visible={showAchievements} animationType="slide" onRequestClose={() => setShowAchievements(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAchievements(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("profile.achievements")}</Text>
            <View style={styles.headerRight} />
          </View>
          <ScrollView style={styles.modalContent}>
            {userProfile.achievements?.map(renderAchievement)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Effort Map Modal */}
      <Modal visible={showEffortMap} animationType="slide" onRequestClose={() => setShowEffortMap(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEffortMap(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("profile.learningActivity")}</Text>
            <View style={styles.headerRight} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.timeframeSelector}>
              {(["week", "month", "year"] as const).map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  style={[styles.timeframeButton, selectedTimeframe === timeframe && styles.selectedTimeframeButton]}
                  onPress={() => setSelectedTimeframe(timeframe)}
                >
                  <Text
                    style={[
                      styles.timeframeButtonText,
                      selectedTimeframe === timeframe && styles.selectedTimeframeButtonText,
                    ]}
                  >
                    {t(`profile.timeframes.${timeframe}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.effortMapChart}>
              <LineChart
                data={getEffortMapData()}
                width={width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#2196F3",
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>

            <View style={styles.effortDetails}>
              <Text style={styles.effortDetailsTitle}>{t("profile.recentActivity")}</Text>
              {effortMapData
                .slice(-7)
                .reverse()
                .map((data, index) => (
                  <View key={index} style={styles.effortDetailItem}>
                    <Text style={styles.effortDate}>{new Date(data.created_at).toLocaleDateString()}</Text>
                    <View style={styles.effortMetrics}>
                      <Text style={styles.effortMetric}>{data.activity_type}</Text>
                      <Text style={styles.effortMetric}>{data.duration || '0min'}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 15,
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  addFriendText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  pendingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  pendingText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "bold",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  messageText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "bold",
  },
  roadmapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  roadmapButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
  },
  languageContainer: {
    gap: 10,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    minWidth: 70,
  },
  languageValue: {
    fontSize: 14,
    color: "#333",
  },
  detailedStats: {
    gap: 15,
  },
  detailedStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  detailedStatInfo: {
    flex: 1,
  },
  detailedStatNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  detailedStatLabel: {
    fontSize: 12,
    color: "#666",
  },
  achievementPreview: {
    alignItems: "center",
    marginRight: 20,
    width: 80,
  },
  achievementPreviewIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementPreviewTitle: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: "#999",
  },
  timeframeSelector: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  selectedTimeframeButton: {
    backgroundColor: "#2196F3",
  },
  timeframeButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedTimeframeButtonText: {
    color: "#fff",
  },
  effortMapChart: {
    alignItems: "center",
    marginBottom: 20,
  },
  effortDetails: {
    marginTop: 10,
  },
  effortDetailsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  effortDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  effortDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  effortMetrics: {
    flexDirection: "row",
    gap: 15,
  },
  effortMetric: {
    fontSize: 12,
    color: "#666",
  },
})

export default UserProfileViewScreen
