import React, { useRef, useEffect } from "react"
import { Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { useUserStore } from "../../stores/UserStore"
import instance from "../../api/axiosClient"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { AppApiResponse, ChatStatsResponse, VideoCallResponse } from "../../types/dto" // Import VideoCallResponse
import { createScaledSheet } from "../../utils/scaledStyles"
import { gotoTab } from "../../utils/navigationRef"
import { useVideoCalls } from "../../hooks/useVideos" // Import custom hook
import { VideoCallStatus } from "../../types/enums" // Giả định bạn có enum này, hoặc dùng string

interface ExtendedChatStatsResponse extends ChatStatsResponse {
  joinedRooms: number;
}

const ChatScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation()
  const user = useUserStore((state) => state.user)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // --- 1. SỬ DỤNG HOOK LẤY LỊCH SỬ VIDEO CALL ---
  const { useVideoCallHistory } = useVideoCalls();
  const { data: callHistory = [], isLoading: isLoadingHistory } = useVideoCallHistory(user?.userId || null);

  // --- LẤY THỐNG KÊ (GIỮ NGUYÊN) ---
  const { data: stats, isLoading: isLoadingStats } = useQuery<ExtendedChatStatsResponse>({
    queryKey: ['chatStats', user?.userId],
    queryFn: async () => {
      const response = await instance.get<AppApiResponse<ExtendedChatStatsResponse>>(`/api/v1/chat/stats/${user?.userId}`);
      return response.data.result;
    },
    enabled: !!user?.userId,
  });

  // --- XỬ LÝ KHI CLICK VÀO LỊCH SỬ ---
  const handleJoinCall = (call: VideoCallResponse) => {
    // Nếu đang ONGOING hoặc WAITING -> Cho phép Join lại
    // Nếu ENDED -> Có thể gọi lại (tạo call mới) hoặc xem chi tiết. 
    // Ở đây demo logic Join lại phòng cũ.
    if (call.roomId) {
      // Điều hướng tới màn hình WebRTC (tên màn hình khớp với file trước đó bạn làm)
      navigation.navigate('WebRTCCallScreen', { // Hoặc 'ChatStack', { screen: 'WebRTCCallScreen', ... }
        roomId: call.roomId,
        videoCallId: call.videoCallId,
        isCaller: false
      });
    }
  };

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

  // --- HELPER UI ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONGOING': return '#22c55e'; // Xanh lá
      case 'WAITING': return '#eab308'; // Vàng
      case 'ENDED': return '#9ca3af';   // Xám
      case 'INITIATED': return '#3b82f6'; // Xanh dương
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONGOING': return 'videocam';
      case 'WAITING': return 'ring-volume';
      case 'ENDED': return 'videocam-off';
      default: return 'history';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    const date = new Date(timeString);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  };

  // --- CÁC OPTION MENU (GIỮ NGUYÊN) ---
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

  // --- 2. RENDER HISTORY ITEM MỚI ---
  const renderHistoryItem = (call: VideoCallResponse) => {
    const statusColor = getStatusColor(call.status);
    const isOngoing = call.status === 'ONGOING' || call.status === 'WAITING';

    return (
      <TouchableOpacity
        key={call.videoCallId}
        style={styles.activityItem}
        onPress={() => handleJoinCall(call)}
        disabled={!isOngoing} // Chỉ cho click nếu đang diễn ra (hoặc tùy logic bạn muốn cho xem detail)
      >
        <View style={[styles.activityIcon, { backgroundColor: `${statusColor}20` }]}>
          <Icon
            name={getStatusIcon(call.status)}
            size={20}
            color={statusColor}
          />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle}>
            {call.videoCallType === 'GROUP' ? t('Group Call') : t('Video Call')}
          </Text>
          <Text style={styles.activityTime}>
            {call.startTime ? formatTime(call.startTime) : 'Just now'}
          </Text>
        </View>

        {/* Badge Status */}
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {call.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
            <Icon name="video-chat" size={120} color="#4F46E5" />
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
                {/* Thêm một card thống kê Video Call nếu API có trả về */}
                <View style={styles.statCard}>
                  <Icon name="videocam" size={24} color="#10B981" />
                  <Text style={styles.statValue}>{callHistory.length || 0}</Text>
                  <Text style={styles.statLabel}>{t("Calls")}</Text>
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

          {/* --- 3. VIDEO CALL HISTORY SECTION --- */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t("Call History")}</Text>
              <TouchableOpacity onPress={() => {/* Navigate to full history */ }}>
                <Text style={{ color: '#4F46E5', fontSize: 12 }}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityCard}>
              {isLoadingHistory ? (
                <ActivityIndicator color="#4F46E5" />
              ) : callHistory.length > 0 ? (
                callHistory.slice(0, 5).map(renderHistoryItem) // Chỉ lấy 5 item gần nhất
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF' }}>{t("chat.noRecentActivity")}</Text>
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
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '40%',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // Thêm style cho Status Badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
})

export default ChatScreen;