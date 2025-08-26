"use client"

import DateTimePicker from "@react-native-community/datetimepicker"
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native"
import Icon  from '@expo/vector-icons/MaterialIcons';
import NotificationService, { type NotificationPreferences } from "../../services/notificationService"

const NotificationSettingsScreen = ({ navigation }) => {

  useEffect(() => {
    // xin quyền khi vào màn hình
    NotificationService.requestPermissions();
  }, []);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false)
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false)
  const [testNotificationSent, setTestNotificationSent] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadPreferences()

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationService.getNotificationPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error("Error loading preferences:", error)
    }
  }

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await NotificationService.saveNotificationPreferences(newPreferences)
      setPreferences(newPreferences)
    } catch (error) {
      console.error("Error saving preferences:", error)
      Alert.alert("Error", "Failed to save notification preferences")
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return

    const newPreferences = { ...preferences, [key]: value }
    savePreferences(newPreferences)
  }

  const updateQuietHours = (key: "enabled" | "start" | "end", value: any) => {
    if (!preferences) return

    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [key]: value,
      },
    }
    savePreferences(newPreferences)
  }

  const toggleCustomDay = (day: number) => {
    if (!preferences) return

    const customDays = preferences.customDays.includes(day)
      ? preferences.customDays.filter((d) => d !== day)
      : [...preferences.customDays, day].sort()

    updatePreference("customDays", customDays)
  }

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime && preferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updatePreference("studyTime", timeString)
    }
  }

  const handleQuietStartChange = (event: any, selectedTime?: Date) => {
    setShowQuietStartPicker(false)
    if (selectedTime && preferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updateQuietHours("start", timeString)
    }
  }

  const handleQuietEndChange = (event: any, selectedTime?: Date) => {
    setShowQuietEndPicker(false)
    if (selectedTime && preferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updateQuietHours("end", timeString)
    }
  }

  const sendTestNotification = async () => {
    try {
      await NotificationService.sendMessageNotification(
        "Test User",
        "This is a test notification to check your settings!",
        "test_chat",
      )
      setTestNotificationSent(true)
      setTimeout(() => setTestNotificationSent(false), 3000)
    } catch (error) {
      Alert.alert("Error", "Failed to send test notification")
    }
  }

  const requestPermissions = async () => {
    const granted = await NotificationService.requestPermissions()
    if (granted) {
      Alert.alert("Success", "Notification permissions granted!")
    } else {
      Alert.alert("Permissions Required", "Please enable notifications in your device settings to receive reminders.")
    }
  }

  const getDayName = (day: number) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days[day]
  }

  const getStudyTimeDate = () => {
    if (!preferences) return new Date()
    const [hours, minutes] = preferences.studyTime.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const getQuietStartDate = () => {
    if (!preferences) return new Date()
    const [hours, minutes] = preferences.quietHours.start.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const getQuietEndDate = () => {
    if (!preferences) return new Date()
    const [hours, minutes] = preferences.quietHours.end.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  if (!preferences) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="notifications" size={48} color="#6B7280" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity onPress={() => navigation.navigate("NotificationHistory")}>
          <Icon name="history" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Permissions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <TouchableOpacity style={styles.permissionCard} onPress={requestPermissions}>
              <View style={styles.permissionIcon}>
                <Icon name="security" size={24} color="#4F46E5" />
              </View>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>Enable Notifications</Text>
                <Text style={styles.permissionDescription}>Allow the app to send you study reminders and messages</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Study Reminders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Study Reminders</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Daily Study Reminders</Text>
                  <Text style={styles.settingDescription}>Get reminded to study at your preferred time</Text>
                </View>
                <Switch
                  value={preferences.studyReminders}
                  onValueChange={(value) => updatePreference("studyReminders", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={preferences.studyReminders ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>

              {preferences.studyReminders && (
                <View style={styles.settingDetails}>
                  {/* Study Time */}
                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowTimePicker(true)}>
                    <Icon name="schedule" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>Study Time: {preferences.studyTime}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  {/* Frequency */}
                  <View style={styles.frequencyContainer}>
                    <Text style={styles.frequencyTitle}>Reminder Frequency</Text>
                    <View style={styles.frequencyOptions}>
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "weekdays", label: "Weekdays Only" },
                        { value: "custom", label: "Custom Days" },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.frequencyOption,
                            preferences.reminderFrequency === option.value && styles.selectedFrequencyOption,
                          ]}
                          onPress={() => updatePreference("reminderFrequency", option.value)}
                        >
                          <Text
                            style={[
                              styles.frequencyOptionText,
                              preferences.reminderFrequency === option.value && styles.selectedFrequencyOptionText,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Custom Days */}
                  {preferences.reminderFrequency === "custom" && (
                    <View style={styles.customDaysContainer}>
                      <Text style={styles.customDaysTitle}>Select Days</Text>
                      <View style={styles.daysGrid}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayButton, preferences.customDays.includes(day) && styles.selectedDayButton]}
                            onPress={() => toggleCustomDay(day)}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                preferences.customDays.includes(day) && styles.selectedDayButtonText,
                              ]}
                            >
                              {getDayName(day)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Streak Reminders */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Streak Warnings</Text>
                  <Text style={styles.settingDescription}>Get warned before losing your study streak</Text>
                </View>
                <Switch
                  value={preferences.streakReminders}
                  onValueChange={(value) => updatePreference("streakReminders", value)}
                  trackColor={{ false: "#E5E7EB", true: "#EF4444" }}
                  thumbColor={preferences.streakReminders ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Message Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message Notifications</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Chat Messages</Text>
                  <Text style={styles.settingDescription}>Notifications for new chat messages</Text>
                </View>
                <Switch
                  value={preferences.messageNotifications}
                  onValueChange={(value) => updatePreference("messageNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                  thumbColor={preferences.messageNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Couple Notifications</Text>
                  <Text style={styles.settingDescription}>Updates from your learning partner</Text>
                </View>
                <Switch
                  value={preferences.coupleNotifications}
                  onValueChange={(value) => updatePreference("coupleNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#EC4899" }}
                  thumbColor={preferences.coupleNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Group Invitations</Text>
                  <Text style={styles.settingDescription}>Invitations to group study sessions</Text>
                </View>
                <Switch
                  value={preferences.groupInvitations}
                  onValueChange={(value) => updatePreference("groupInvitations", value)}
                  trackColor={{ false: "#E5E7EB", true: "#F59E0B" }}
                  thumbColor={preferences.groupInvitations ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Achievement Notifications</Text>
                  <Text style={styles.settingDescription}>Celebrate your learning milestones</Text>
                </View>
                <Switch
                  value={preferences.achievementNotifications}
                  onValueChange={(value) => updatePreference("achievementNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }}
                  thumbColor={preferences.achievementNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Sound & Vibration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sound & Vibration</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Sound Effects</Text>
                  <Text style={styles.settingDescription}>Play sound with notifications</Text>
                </View>
                <Switch
                  value={preferences.soundEnabled}
                  onValueChange={(value) => updatePreference("soundEnabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={preferences.soundEnabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Vibration</Text>
                  <Text style={styles.settingDescription}>Vibrate device for notifications</Text>
                </View>
                <Switch
                  value={preferences.vibrationEnabled}
                  onValueChange={(value) => updatePreference("vibrationEnabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={preferences.vibrationEnabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Quiet Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                  <Text style={styles.settingDescription}>Silence notifications during specific hours</Text>
                </View>
                <Switch
                  value={preferences.quietHours.enabled}
                  onValueChange={(value) => updateQuietHours("enabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#6B7280" }}
                  thumbColor={preferences.quietHours.enabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>

              {preferences.quietHours.enabled && (
                <View style={styles.quietHoursDetails}>
                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowQuietStartPicker(true)}>
                    <Icon name="bedtime" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>Start: {preferences.quietHours.start}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowQuietEndPicker(true)}>
                    <Icon name="wb-sunny" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>End: {preferences.quietHours.end}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Test Notification Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Notifications</Text>

            <TouchableOpacity
              style={[styles.testButton, testNotificationSent && styles.testButtonSent]}
              onPress={sendTestNotification}
              disabled={testNotificationSent}
            >
              <Icon name={testNotificationSent ? "check" : "notifications-active"} size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>
                {testNotificationSent ? "Test Sent!" : "Send Test Notification"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Time Pickers */}
      {showTimePicker && (
        <DateTimePicker
          value={getStudyTimeDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {showQuietStartPicker && (
        <DateTimePicker
          value={getQuietStartDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleQuietStartChange}
        />
      )}

      {showQuietEndPicker && (
        <DateTimePicker
          value={getQuietEndDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleQuietEndChange}
        />
      )}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  settingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  settingDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timeSelectorText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  frequencyContainer: {
    marginBottom: 16,
  },
  frequencyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  frequencyOptions: {
    flexDirection: "row",
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  selectedFrequencyOption: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  frequencyOptionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  selectedFrequencyOptionText: {
    color: "#FFFFFF",
  },
  customDaysContainer: {
    marginTop: 12,
  },
  customDaysTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: "row",
    gap: 6,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  selectedDayButton: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  dayButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  selectedDayButtonText: {
    color: "#FFFFFF",
  },
  quietHoursDetails: {
    marginTop: 12,
    gap: 8,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonSent: {
    backgroundColor: "#10B981",
  },
  testButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default NotificationSettingsScreen
