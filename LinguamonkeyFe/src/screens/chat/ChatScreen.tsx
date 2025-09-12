import React, { useRef, useEffect } from "react"
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useUserStore } from "../../stores/UserStore"
import { gotoTab } from "../../utils/navigationRef"
import { useChatStore } from "../../stores/ChatStore"
import { useTokenStore } from "../../stores/tokenStore"

const ChatScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const user = useUserStore.getState().user

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const connect = useChatStore((state) => state.connect)
  const disconnect = useChatStore((state) => state.disconnect)
  const activities = useChatStore((state) => state.activities)
  const stats = useChatStore((state) => state.stats)
  const sendLastActive = useChatStore((state) => state.updateLastActive)

  useEffect(() => {
    if (!user) return
    const token = useTokenStore.getState().accessToken
    connect(token)

    const iv = setInterval(() => {
      sendLastActive(user.userId)
    }, 60 * 1000)

    return () => {
      clearInterval(iv)
      disconnect()
    }
  }, [user])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const chatOptions = [
    {
      id: "ai-chat",
      title: t("chat.aiChat"),
      subtitle: t("chat.aiChatDescription"),
      icon: "smart-toy",
      color: "#4F46E5",
      onPress: () => gotoTab("Chat", "ChatAI"),
    },
    {
      id: "user-chat",
      title: t("chat.userChat"),
      subtitle: t("chat.userChatDescription"),
      icon: "group",
      color: "#10B981",
      onPress: () => gotoTab("Chat", "UserChat"),
    },
  ]

  const quickActions = [
    {
      id: "video-call",
      title: t("chat.videoCall"),
      icon: "videocam",
      color: "#EF4444",
      onPress: () => gotoTab("Chat", "VideoCallManager"),
    },
    {
      id: "join-room",
      title: t("chat.joinRoom"),
      icon: "meeting-room",
      color: "#F59E0B",
      onPress: () => gotoTab("Chat", "ChatRoomList"),
    },
    {
      id: "create-room",
      title: t("chat.createRoom"),
      icon: "add-circle",
      color: "#EF4444",
      onPress: () => gotoTab("Chat", "CreateRoom"),
    },
  ]

  const renderChatOption = (option) => (
    <TouchableOpacity key={option.id} style={styles.chatOption} onPress={option.onPress}>
      <View style={styles.chatOptionContent}>
        <View style={[styles.chatIconContainer, { backgroundColor: `${option.color}20` }]}>
          <Icon name={option.icon} size={40} color={option.color} style={styles.chatAnimation} />
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle}>{option.title}</Text>
          <Text style={styles.chatSubtitle}>{option.subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  )

  const renderQuickAction = (action) => (
    <TouchableOpacity key={action.id} style={styles.quickAction} onPress={action.onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
        <Icon name={action.icon} size={24} color={action.color} />
      </View>
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("chat.title")}</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate("ChatSettings")}>
          <Icon name="settings" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Icon name="chat" size={120} color="#4F46E5" style={styles.welcomeAnimation} />
            <Text style={styles.welcomeTitle}>{t("chat.welcome")}</Text>
            <Text style={styles.welcomeText}>{t("chat.welcomeDescription")}</Text>
          </View>

          {/* Chat Statistics */}
          {stats && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>{t("chat.yourStats")}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Icon name="chat" size={24} color="#4F46E5" />
                  <Text style={styles.statValue}>{stats.totalMessages || 0}</Text>
                  <Text style={styles.statLabel}>{t("chat.messages")}</Text>
                </View>
                <View style={styles.statCard}>
                  <Icon name="translate" size={24} color="#10B981" />
                  <Text style={styles.statValue}>{stats.translationsUsed || 0}</Text>
                  <Text style={styles.statLabel}>{t("chat.translations")}</Text>
                </View>
                <View style={styles.statCard}>
                  <Icon name="videocam" size={24} color="#EF4444" />
                  <Text style={styles.statValue}>{stats.videoCalls || 0}</Text>
                  <Text style={styles.statLabel}>{t("chat.videoCalls")}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Chat Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.chooseType")}</Text>
            {chatOptions.map(renderChatOption)}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.quickActions")}</Text>
            <View style={styles.quickActionsGrid}>{quickActions.map(renderQuickAction)}</View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.recentActivity")}</Text>
            <View style={styles.activityCard}>
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Icon
                        name={activity.type === "ai" ? "smart-toy" : "group"}
                        size={20}
                        color={activity.type === "ai" ? "#4F46E5" : "#10B981"}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityTime}>{activity.createdAt || ""}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Icon name="chat-bubble-outline" size={20} color="#6B7280" />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{t("chat.noRecentActivity")}</Text>
                    <Text style={styles.activityTime}>{t("chat.startChatting")}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb" size={20} color="#F59E0B" />
              <Text style={styles.tipsTitle}>{t("tips.title")}</Text>
            </View>
            <Text style={styles.tipsText}>{t("chat.tips")}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  chatOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  chatIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  chatAnimation: {
    width: 40,
    height: 40,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAction: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "30%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
    fontWeight: "500",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
})

export default ChatScreen
