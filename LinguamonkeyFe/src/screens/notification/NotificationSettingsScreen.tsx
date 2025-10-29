import DateTimePicker from "@react-native-community/datetimepicker"
import { useEffect, useRef, useState } from "react"
import { Alert, Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native"
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import NotificationService, { type NotificationPreferences } from "../../services/notificationService"
import { createScaledSheet } from "../../utils/scaledStyles";

const NotificationSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { notificationPreferences, setNotificationPreferences } = useAppStore();

  useEffect(() => {
    NotificationService.requestPermissions();
  }, []);

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
      setNotificationPreferences(prefs)
    } catch (error) {
      console.error("Error loading preferences:", error)
    }
  }

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await NotificationService.saveNotificationPreferences(newPreferences)
      setNotificationPreferences(newPreferences)
    } catch (error) {
      console.error("Error saving preferences:", error)
      Alert.alert(t("notification.errorSavingPreferences"), t("notification.errorSavingPreferences"))
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!notificationPreferences) return

    const newPreferences = { ...notificationPreferences, [key]: value }
    savePreferences(newPreferences)
  }

  const updateQuietHours = (key: "enabled" | "start" | "end", value: any) => {
    if (!notificationPreferences) return

    const newPreferences = {
      ...notificationPreferences,
      quietHours: {
        ...notificationPreferences.quietHours,
        [key]: value,
      },
    }
    savePreferences(newPreferences)
  }

  const toggleCustomDay = (day: number) => {
    if (!notificationPreferences) return

    const customDays = notificationPreferences.customDays.includes(day)
      ? notificationPreferences.customDays.filter((d) => d !== day)
      : [...notificationPreferences.customDays, day].sort()

    updatePreference("customDays", customDays)
  }

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false)
    if (selectedTime && notificationPreferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updatePreference("studyTime", timeString)
    }
  }

  const handleQuietStartChange = (event: any, selectedTime?: Date) => {
    setShowQuietStartPicker(false)
    if (selectedTime && notificationPreferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updateQuietHours("start", timeString)
    }
  }

  const handleQuietEndChange = (event: any, selectedTime?: Date) => {
    setShowQuietEndPicker(false)
    if (selectedTime && notificationPreferences) {
      const timeString = selectedTime.toTimeString().slice(0, 5)
      updateQuietHours("end", timeString)
    }
  }

  const sendTestNotification = async () => {
    try {
      await NotificationService.sendMessageNotification(
        "Test User",
        t("notification.testNotificationMessage"),
        "test_chat",
      )
      setTestNotificationSent(true)
      setTimeout(() => setTestNotificationSent(false), 3000)
    } catch (error) {
      Alert.alert(t("notification.errorSendingTest"), t("notification.errorSendingTest"))
    }
  }

  const requestPermissions = async () => {
    const granted = await NotificationService.requestPermissions()
    if (granted) {
      Alert.alert(t("notification.permissionsSuccess"), t("notification.permissionsSuccessMessage"))
    } else {
      Alert.alert(t("notification.permissionsRequired"), t("notification.permissionsRequiredMessage"))
    }
  }

  const getDayName = (day: number) => {
    const days = [
      t("notification.days.sun"),
      t("notification.days.mon"),
      t("notification.days.tue"),
      t("notification.days.wed"),
      t("notification.days.thu"),
      t("notification.days.fri"),
      t("notification.days.sat")
    ]
    return days[day]
  }

  const getStudyTimeDate = () => {
    if (!notificationPreferences) return new Date()
    const [hours, minutes] = notificationPreferences.studyTime.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const getQuietStartDate = () => {
    if (!notificationPreferences) return new Date()
    const [hours, minutes] = notificationPreferences.quietHours.start.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const getQuietEndDate = () => {
    if (!notificationPreferences) return new Date()
    const [hours, minutes] = notificationPreferences.quietHours.end.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  if (!notificationPreferences) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="notifications" size={48} color="#6B7280" />
        <Text style={styles.loadingText}>{t("notification.loading")}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notification.settingsTitle")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("NotificationHistory")}>
          <Icon name="history" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* Permissions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.permissionsSection")}</Text>
            <TouchableOpacity style={styles.permissionCard} onPress={requestPermissions}>
              <View style={styles.permissionIcon}>
                <Icon name="security" size={24} color="#4F46E5" />
              </View>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>{t("notification.enableNotifications")}</Text>
                <Text style={styles.permissionDescription}>{t("notification.enableNotificationsDesc")}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Study Reminders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.studyRemindersSection")}</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.studyReminders")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.studyRemindersDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.studyReminders}
                  onValueChange={(value) => updatePreference("studyReminders", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={notificationPreferences.studyReminders ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>

              {notificationPreferences.studyReminders && (
                <View style={styles.settingDetails}>
                  {/* Study Time */}
                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowTimePicker(true)}>
                    <Icon name="schedule" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>{t("notification.studyTime", { time: notificationPreferences.studyTime })}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  {/* Frequency */}
                  <View style={styles.frequencyContainer}>
                    <Text style={styles.frequencyTitle}>{t("notification.reminderFrequency")}</Text>
                    <View style={styles.frequencyOptions}>
                      {[
                        { value: "daily", label: t("notification.daily") },
                        { value: "weekdays", label: t("notification.weekdays") },
                        { value: "custom", label: t("notification.custom") },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.frequencyOption,
                            notificationPreferences.reminderFrequency === option.value && styles.selectedFrequencyOption,
                          ]}
                          onPress={() => updatePreference("reminderFrequency", option.value)}
                        >
                          <Text
                            style={[
                              styles.frequencyOptionText,
                              notificationPreferences.reminderFrequency === option.value && styles.selectedFrequencyOptionText,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Custom Days */}
                  {notificationPreferences.reminderFrequency === "custom" && (
                    <View style={styles.customDaysContainer}>
                      <Text style={styles.customDaysTitle}>{t("notification.selectDays")}</Text>
                      <View style={styles.daysGrid}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayButton, notificationPreferences.customDays.includes(day) && styles.selectedDayButton]}
                            onPress={() => toggleCustomDay(day)}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                notificationPreferences.customDays.includes(day) && styles.selectedDayButtonText,
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
                  <Text style={styles.settingTitle}>{t("notification.streakReminders")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.streakRemindersDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.streakReminders}
                  onValueChange={(value) => updatePreference("streakReminders", value)}
                  trackColor={{ false: "#E5E7EB", true: "#EF4444" }}
                  thumbColor={notificationPreferences.streakReminders ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Message Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.messageNotificationsSection")}</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.chatMessages")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.chatMessagesDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.messageNotifications}
                  onValueChange={(value) => updatePreference("messageNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                  thumbColor={notificationPreferences.messageNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.coupleNotifications")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.coupleNotificationsDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.coupleNotifications}
                  onValueChange={(value) => updatePreference("coupleNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#EC4899" }}
                  thumbColor={notificationPreferences.coupleNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.groupInvitations")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.groupInvitationsDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.groupInvitations}
                  onValueChange={(value) => updatePreference("groupInvitations", value)}
                  trackColor={{ false: "#E5E7EB", true: "#F59E0B" }}
                  thumbColor={notificationPreferences.groupInvitations ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.achievementNotifications")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.achievementNotificationsDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.achievementNotifications}
                  onValueChange={(value) => updatePreference("achievementNotifications", value)}
                  trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }}
                  thumbColor={notificationPreferences.achievementNotifications ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Sound & Vibration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.soundVibrationSection")}</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.soundEffects")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.soundEffectsDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.soundEnabled}
                  onValueChange={(value) => updatePreference("soundEnabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={notificationPreferences.soundEnabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.vibration")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.vibrationDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.vibrationEnabled}
                  onValueChange={(value) => updatePreference("vibrationEnabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                  thumbColor={notificationPreferences.vibrationEnabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>
            </View>
          </View>

          {/* Quiet Hours Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.quietHoursSection")}</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t("notification.quietHours")}</Text>
                  <Text style={styles.settingDescription}>{t("notification.quietHoursDesc")}</Text>
                </View>
                <Switch
                  value={notificationPreferences.quietHours.enabled}
                  onValueChange={(value) => updateQuietHours("enabled", value)}
                  trackColor={{ false: "#E5E7EB", true: "#6B7280" }}
                  thumbColor={notificationPreferences.quietHours.enabled ? "#FFFFFF" : "#F3F4F6"}
                />
              </View>

              {notificationPreferences.quietHours.enabled && (
                <View style={styles.quietHoursDetails}>
                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowQuietStartPicker(true)}>
                    <Icon name="bedtime" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>{t("notification.quietHoursStart", { time: notificationPreferences.quietHours.start })}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.timeSelector} onPress={() => setShowQuietEndPicker(true)}>
                    <Icon name="wb-sunny" size={20} color="#6B7280" />
                    <Text style={styles.timeSelectorText}>{t("notification.quietHoursEnd", { time: notificationPreferences.quietHours.end })}</Text>
                    <Icon name="chevron-right" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Test Notification Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("notification.testNotificationsSection")}</Text>

            <TouchableOpacity
              style={[styles.testButton, testNotificationSent && styles.testButtonSent]}
              onPress={sendTestNotification}
              disabled={testNotificationSent}
            >
              <Icon name={testNotificationSent ? "check" : "notifications-active"} size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>
                {testNotificationSent ? t("notification.testNotificationSent") : t("notification.sendTestNotification")}
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
