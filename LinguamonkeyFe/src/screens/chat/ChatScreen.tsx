import React, { useRef, useEffect } from "react"
import { Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { useUserStore } from "../../stores/UserStore"
import { useChatStore } from "../../stores/ChatStore"
import { createScaledSheet } from "../../utils/scaledStyles"
import instance from "../../api/axiosClient"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { AppApiResponse, ChatStatsResponse, UserLearningActivityResponse, PageResponse } from "../../types/dto"

// Augment local interface if not yet updated in types/dto
interface ExtendedChatStatsResponse extends ChatStatsResponse {
  joinedRooms: number;
}

const ChatScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation()
  const user = useUserStore((state) => state.user)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const initChatService = useChatStore((state) => state.initChatService);
  const disconnectChatService = useChatStore((state) => state.disconnect);

  const { data: stats, isLoading: isLoadingStats } = useQuery<ExtendedChatStatsResponse>({
    queryKey: ['chatStats', user?.userId],
    queryFn: async () => {
      const response = await instance.get<AppApiResponse<ExtendedChatStatsResponse>>(`/api/v1/chat/stats/${user?.userId}`);
      return response.data.result;
    },
    enabled: !!user?.userId,
  });

  const { data: activities = [], isLoading: isLoadingActivities } = useQuery<UserLearningActivityResponse[]>({
    queryKey: ['chatActivities', user?.userId],
    queryFn: async () => {
      const response = await instance.get<AppApiResponse<PageResponse<UserLearningActivityResponse>>>(`/api/v1/user-learning-activities`, {
        params: {
          userId: user?.userId,
          page: 0,
          size: 5,
          sort: 'createdAt,desc',
          type: 'CHAT'
        }
      });
      return response.data.result.content;
    },
    enabled: !!user?.userId,
  });

  useEffect(() => {
    if (!user) return;

    initChatService();

    return () => {
      disconnectChatService();
    }
  }, [user, initChatService, disconnectChatService]);

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
  }, [fadeAnim, slideAnim])

  const chatOptions = [
    {
      id: "ai-chat",
      title: t("chat.aiChat"),
      subtitle: t("chat.aiChatDescription"),
      icon: "smart-toy",
      color: "#4F46E5",
      onPress: () => navigation.navigate("ChatAIScreen"),
    },
    {
      id: "user-chat",
      title: t("chat.userChat"),
      subtitle: t("chat.userChatDescription"),
      icon: "group",
      color: "#10B981",
      onPress: () => navigation.navigate("ChatRoomListScreen"),
    },
  ]

  const quickActions = [
    {
      id: "call-setup",
      title: t("chat.callSetup"),
      icon: "settings-phone",
      color: "#3B82F6",
      onPress: () => navigation.navigate("CallSetupScreen"),
    },
    {
      id: "join-room",
      title: t("chat.joinRoom"),
      icon: "meeting-room",
      color: "#F59E0B",
      onPress: () => navigation.navigate("ChatRoomListScreen"),
    },
    {
      id: "create-room",
      title: t("chat.createRoom"),
      icon: "add-circle",
      color: "#4F46E5",
      onPress: () => navigation.navigate("CreateRoomScreen"),
    },
  ]

  const renderChatOption = (option: any) => (
    <TouchableOpacity key={option.id} style={styles.chatOption} onPress={option.onPress}>
      <View style={styles.chatOptionContent}>
        <View style={[styles.chatIconContainer, { backgroundColor: `${option.color}20` }]}>
          <Icon name={option.icon} size={40} color={option.color} />
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle}>{option.title}</Text>
          <Text style={styles.chatSubtitle}>{option.subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  )

  const renderQuickAction = (action: any) => (
    <TouchableOpacity key={action.id} style={styles.quickAction} onPress={action.onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
        <Icon name={action.icon} size={24} color={action.color} />
      </View>
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  )

  const renderActivity = (activity: UserLearningActivityResponse) => (
    <View key={activity.activityId} style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Icon
          name={activity.activityType === "AI_CHAT" ? "smart-toy" : "group"}
          size={20}
          color={activity.activityType === "AI_CHAT" ? "#4F46E5" : "#10B981"}
        />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{activity.activityType} - {t("chat.activityDetails")}</Text>
        <Text style={styles.activityTime}>{new Date(activity.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("chat.title")}</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate("ChatSettingsScreen")}>
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
          <View style={styles.welcomeSection}>
            <Icon name="chat" size={120} color="#4F46E5" />
            <Text style={styles.welcomeTitle}>{t("chat.welcome")}</Text>
            <Text style={styles.welcomeText}>{t("chat.welcomeDescription")}</Text>
          </View>

          {isLoadingStats ? <ActivityIndicator /> : stats && (
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
                {/* Changed layout to accommodate 4 items or wrapping */}
                <View style={styles.statCard}>
                  <Icon name="videocam" size={24} color="#EF4444" />
                  <Text style={styles.statValue}>{stats.videoCalls || 0}</Text>
                  <Text style={styles.statLabel}>{t("chat.videoCalls")}</Text>
                </View>
                <View style={styles.statCard}>
                  <Icon name="meeting-room" size={24} color="#F59E0B" />
                  <Text style={styles.statValue}>{stats.joinedRooms || 0}</Text>
                  <Text style={styles.statLabel}>{t("chat.activeRooms")}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.chooseType")}</Text>
            {chatOptions.map(renderChatOption)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.quickActions")}</Text>
            <View style={styles.quickActionsGrid}>{quickActions.map(renderQuickAction)}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("chat.recentActivity")}</Text>
            <View style={styles.activityCard}>
              {isLoadingActivities ? <ActivityIndicator /> : activities.length > 0 ? (
                activities.map(renderActivity)
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
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
    flexWrap: "wrap", // Allow wrapping for 4th item if screen small
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%', // Ensure 2 per row
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
})

export default ChatScreen;