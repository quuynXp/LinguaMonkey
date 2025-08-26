"use client"

import { Alert , Animated, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

import { useEffect, useRef, useState } from "react"

import Icon from "react-native-vector-icons/MaterialIcons"
import NotificationService from "../../services/notificationService"

interface NotificationHistoryItem {
  id: string
  title: string
  body: string
  type: string
  receivedAt: Date
  isRead: boolean
  data?: any
}

const NotificationHistoryScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread" | "study" | "messages" | "achievements">("all")

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadNotifications()

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const loadNotifications = async () => {
    try {
      const history = await NotificationService.getNotificationHistory()
      setNotifications(
        history.map((item) => ({
          ...item,
          receivedAt: new Date(item.receivedAt),
        })),
      )
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadNotifications()
    setRefreshing(false)
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        ),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const clearAllNotifications = () => {
    Alert.alert("Clear All Notifications", "Are you sure you want to clear all notification history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          setNotifications([])
          // In real app, clear from storage
        },
      },
    ])
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.isRead)
      case "study":
        return notifications.filter((n) => n.type.includes("study") || n.type.includes("streak"))
      case "messages":
        return notifications.filter(
          (n) => n.type.includes("message") || n.type.includes("couple") || n.type.includes("group"),
        )
      case "achievements":
        return notifications.filter((n) => n.type.includes("achievement"))
      default:
        return notifications
    }
  }

  const getNotificationIcon = (type: string) => {
    if (type.includes("study") || type.includes("streak")) return "school"
    if (type.includes("message")) return "message"
    if (type.includes("couple")) return "favorite"
    if (type.includes("group")) return "groups"
    if (type.includes("achievement")) return "emoji-events"
    return "notifications"
  }

  const getNotificationColor = (type: string) => {
    if (type.includes("study") || type.includes("streak")) return "#4F46E5"
    if (type.includes("message")) return "#10B981"
    if (type.includes("couple")) return "#EC4899"
    if (type.includes("group")) return "#F59E0B"
    if (type.includes("achievement")) return "#8B5CF6"
    return "#6B7280"
  }

  const formatTime = (date: Date) => {
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

  const handleNotificationPress = (notification: NotificationHistoryItem) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Navigate based on notification data
    if (notification.data?.screen) {
      navigation.navigate(notification.data.screen, notification.data.params)
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
              { key: "unread", label: "Unread", count: notifications.filter((n) => !n.isRead).length },
              { key: "study", label: "Study", count: notifications.filter((n) => n.type.includes("study")).length },
              {
                key: "messages",
                label: "Messages",
                count: notifications.filter((n) => n.type.includes("message")).length,
              },
              {
                key: "achievements",
                label: "Achievements",
                count: notifications.filter((n) => n.type.includes("achievement")).length,
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
                      {tab.count}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {filteredNotifications.length === 0 ? (
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
                  key={notification.id}
                  style={[styles.notificationCard, !notification.isRead && styles.unreadNotificationCard]}
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
                      <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadNotificationTitle]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationTime}>{formatTime(notification.receivedAt)}</Text>
                    </View>

                    <Text style={styles.notificationBody} numberOfLines={2}>
                      {notification.body}
                    </Text>

                    {notification.type.includes("couple") && notification.data?.partnerName && (
                      <View style={styles.notificationMeta}>
                        <Icon name="favorite" size={12} color="#EC4899" />
                        <Text style={styles.notificationMetaText}>From {notification.data.partnerName}</Text>
                      </View>
                    )}

                    {notification.type.includes("group") && notification.data?.hostName && (
                      <View style={styles.notificationMeta}>
                        <Icon name="groups" size={12} color="#F59E0B" />
                        <Text style={styles.notificationMetaText}>From {notification.data.hostName}</Text>
                      </View>
                    )}

                    {notification.type.includes("achievement") && notification.data?.points && (
                      <View style={styles.notificationMeta}>
                        <Icon name="stars" size={12} color="#8B5CF6" />
                        <Text style={styles.notificationMetaText}>+{notification.data.points} points</Text>
                      </View>
                    )}
                  </View>

                  {!notification.isRead && <View style={styles.unreadIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
