import { ActivityIndicator, Alert, Animated, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useEffect, useRef, useState } from "react"
import Icon from "react-native-vector-icons/MaterialIcons"
import { createScaledSheet } from "../../utils/scaledStyles"
import { useNotifications } from "../../hooks/useNotifications"
import { useUserStore } from "../../stores/UserStore"
import { NotificationResponse, NotificationRequest } from "../../types/dto"
import * as Enums from "../../types/enums"

// --- Constants ---
const PAGE_SIZE = 50;

const NotificationHistoryScreen = ({ navigation }) => {
  const { user } = useUserStore();
  const userId = user?.userId;

  const {
    data: notificationPage,
    isLoading,
    refetch,
    isRefetching
  } = useNotifications().useNotificationsByUserId(userId, 0, PAGE_SIZE);

  const updateMutation = useNotifications().useUpdateNotification();

  const [filter, setFilter] = useState<"all" | "unread" | "study" | "messages" | "achievements">("all")
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const notifications: NotificationResponse[] = (notificationPage?.data as NotificationResponse[]) || [];

  const onRefresh = async () => {
    await refetch();
  }

  const markAsRead = async (notification: NotificationResponse) => {
    if (notification.read) return;

    try {
      // FIX LỖI TYPE 2353: DTO NotificationRequest không có trường `read`. 
      // Tuy nhiên, vì mục tiêu là đánh dấu đã đọc, chúng ta phải gửi tất cả các trường 
      // của NotificationRequest và giả định API endpoint này xử lý việc cập nhật trạng thái `read`.
      const reqPayload: NotificationRequest & { read?: boolean } = {
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        type: notification.type as Enums.NotificationType,
        // FIX LỖI TYPE 2339: Gán giá trị an toàn cho languageCode
        languageCode: (notification as any).languageCode || 'EN',
        payload: notification.payload,
        // Thêm trường read vào payload (Dù không có trong DTO Request, nhưng cần cho API logic này)
        read: true,
      };

      await updateMutation.mutateAsync({
        id: notification.notificationId,
        req: reqPayload as NotificationRequest // Ép kiểu về NotificationRequest
      });

    } catch (error) {
      Alert.alert("Error", "Failed to mark as read. Please try again.")
    }
  }

  const clearAllNotifications = () => {
    Alert.alert("Clear All Notifications", "Are you sure you want to clear all notification history? (Functionality not implemented)", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          Alert.alert("Info", "Clear All functionality requires a backend endpoint.")
        },
      },
    ])
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.read)
      case "study":
        return notifications.filter((n) => n.type?.includes("LESSON") || n.type?.includes("STREAK") || n.type?.includes("REMINDER"))
      case "messages":
        return notifications.filter(
          (n) => n.type?.includes("MESSAGE") || n.type?.includes("FRIEND_REQUEST"),
        )
      case "achievements":
        return notifications.filter((n) => n.type?.includes("BADGE_UNLOCKED"))
      default:
        return notifications
    }
  }

  const getNotificationIcon = (type?: string) => {
    if (!type) return "notifications"
    if (type.includes("LESSON") || type.includes("STREAK") || type.includes("REMINDER")) return "school"
    if (type.includes("MESSAGE") || type.includes("FRIEND_REQUEST")) return "message"
    if (type.includes("BADGE_UNLOCKED")) return "emoji-events"
    return "notifications"
  }

  const getNotificationColor = (type?: string) => {
    if (!type) return "#6B7280"
    if (type.includes("LESSON") || type.includes("STREAK")) return "#4F46E5"
    if (type.includes("MESSAGE")) return "#10B981"
    if (type.includes("FRIEND_REQUEST")) return "#EC4899"
    if (type.includes("BADGE_UNLOCKED")) return "#8B5CF6"
    return "#6B7280"
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  const handleNotificationPress = (notification: NotificationResponse) => {
    if (!notification.read) {
      markAsRead(notification);
    }

    try {
      const data = JSON.parse(notification.payload || '{}');
      if (data.screen) {
        navigation.navigate(data.screen, data.params);
      }
    } catch (e) {
      // console.error("Error parsing notification payload:", e);
    }
  }

  const filteredNotifications = getFilteredNotifications()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={clearAllNotifications}>
          <Icon name="clear-all" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {[
              { key: "all", label: "All", count: notifications.length },
              { key: "unread", label: "Unread", count: notifications.filter((n) => !n.read).length },
              { key: "study", label: "Study", count: notifications.filter((n) => n.type?.includes("LESSON") || n.type?.includes("STREAK")).length },
              {
                key: "messages",
                label: "Messages",
                count: notifications.filter((n) => n.type?.includes("MESSAGE")).length,
              },
              {
                key: "achievements",
                label: "Achievements",
                count: notifications.filter((n) => n.type?.includes("BADGE_UNLOCKED")).length,
              },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, filter === tab.key && styles.activeFilterTab]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text style={[styles.filterTabText, filter === tab.key && styles.activeFilterTabText]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.filterBadge, filter === tab.key && styles.activeFilterBadge]}>
                    <Text style={[styles.filterBadgeText, filter === tab.key && styles.activeFilterBadgeText]}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {filteredNotifications.length === 0 && isLoading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 60 }} />
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="notifications-none" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyDescription}>
                {filter === "all" ? "You don't have any notifications yet" : `No ${filter} notifications found`}
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {filteredNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.notificationId}
                  style={[styles.notificationCard, !notification.read && styles.unreadNotificationCard]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    <Icon
                      name={getNotificationIcon(notification.type)}
                      size={24}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, !notification.read && styles.unreadNotificationTitle]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
                    </View>

                    <Text style={styles.notificationBody} numberOfLines={2}>
                      {notification.content}
                    </Text>

                    {/* Meta data: Lấy từ payload DTO (string JSON) */}
                    {notification.payload && JSON.parse(notification.payload || '{}').partnerName && (
                      <View style={styles.notificationMeta}>
                        <Icon name="favorite" size={12} color="#EC4899" />
                        <Text style={styles.notificationMetaText}>From {JSON.parse(notification.payload || '{}').partnerName}</Text>
                      </View>
                    )}

                    {notification.payload && JSON.parse(notification.payload || '{}').hostName && (
                      <View style={styles.notificationMeta}>
                        <Icon name="groups" size={12} color="#F59E0B" />
                        <Text style={styles.notificationMetaText}>From {JSON.parse(notification.payload || '{}').hostName}</Text>
                      </View>
                    )}

                    {!notification.read && <View style={styles.unreadIndicator} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  activeFilterTab: {
    backgroundColor: "#4F46E5",
  },
  filterTabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeFilterTabText: {
    color: "#FFFFFF",
  },
  filterBadge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  activeFilterBadge: {
    backgroundColor: "#FFFFFF",
  },
  filterBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  activeFilterBadgeText: {
    color: "#4F46E5",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  unreadNotificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  unreadNotificationTitle: {
    color: "#1F2937",
  },
  notificationTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  notificationBody: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationMetaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  unreadIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
})

export default NotificationHistoryScreen