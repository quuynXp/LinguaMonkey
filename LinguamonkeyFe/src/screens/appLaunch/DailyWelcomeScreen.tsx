import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/UserStore";
import { useLearningStore } from "../../stores/LearningStore";
import { useUISettingsStore } from "../../stores/UISettingsStore";
import axiosInstance from "../../api/axiosInstance";
import { getGreetingTime } from "../../utils/timeHelper";
import { useProgressStats } from "../../hooks/useProgressStats";
import { User, UserGoalResponse, UserBadge } from "../../types/api";
import { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from '@expo/vector-icons';
import { resetToTab, resetToAuth } from "../../utils/navigationRef";
import { createScaledSheet } from '../../utils/scaledStyles';
import { useBadge } from '../../hooks/useBadge';

type RootStackParamList = {
  DailyWelcome: undefined;
  Main: { initialRouteName?: string; screen?: string; params?: any };
  Auth: undefined;
};

type DailyWelcomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'DailyWelcome'>;
};

const DailyWelcomeScreen = ({ navigation }: DailyWelcomeScreenProps) => {
  const user = useUserStore((state) => state.user);
  const addBadge = useUserStore((state) => state.addBadge);
  const { t } = useTranslation();
  const { selectedLesson, updateProgress } = useLearningStore();
  const { currentLanguage, setCurrentLanguage } = useUISettingsStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fireAnim = useRef(new Animated.Value(0)).current;

  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [achievements, setAchievements] = useState<UserBadge[]>([]);
  const [userGoal, setUserGoal] = useState<UserGoalResponse | null>(null);

  const { progressStats, lessonProgress } = useProgressStats(user?.userId);

  const motivationalMessages = {
    en: [
      "Every word you learn is a step closer to fluency! 🌟",
      "Consistency is the key to mastering any language! 💪",
    ],
    vi: [
      "Mỗi từ bạn học là một bước tiến gần hơn đến sự thành thạo! 🌟",
      "Sự kiên trì là chìa khóa để làm chủ bất kỳ ngôn ngữ nào! 💪",
    ],
    zh: [
      "你学的每个词都让你更接近流利！🌟",
      "坚持不懈是掌握任何语言的关键！💪",
    ],
  };

  useEffect(() => {
    if (!user?.userId) {
      resetToAuth('Login');
      return;
    }

    const userId = user?.userId;
    const fetchAchievements = async () => {
      try {
        if (userId) {
          const response = await axiosInstance.get<{ data: UserBadge[] }>(`/badge/${userId}`);
          const badgesData = response.data.data;
          setAchievements(badgesData.filter((badge) => badge.badgeId));
          badgesData.forEach((badge) => addBadge(badge.badgeId));
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      }
    };

    const fetchUserGoal = async () => {
      try {
        if (userId) {
          const response = await axiosInstance.get<{ data: UserGoalResponse[] }>(`/user-goals`, {
            params: { userId },
          });
          const goalsData = response.data.data;
          setUserGoal(goalsData[0] || null);
        }
      } catch (error) {
        console.error("Failed to fetch user goal:", error);
      }
    };

    fetchAchievements();
    fetchUserGoal();

    const messages = motivationalMessages[currentLanguage || "en"];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMotivationalMessage(randomMessage);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.spring(fireAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 500);
  }, [currentLanguage, user?.userId, navigation]);

  const getGreeting = () => {
    return getGreetingTime(undefined, currentLanguage || "en");
  };

  const getStreakMessage = () => {
    const streak = (user as User)?.streak || 0;
    if (streak === 1) return t("streakMessage.start");
    if (streak < 7) return t("streakMessage.momentum");
    if (streak < 30) return t("streakMessage.fire");
    if (streak < 100) return t("streakMessage.unstoppable");
    return t("streakMessage.legend");
  };

  return (
    <ScrollView
      contentContainerStyle={{ ...styles.container, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => resetToTab('Home')}>
            <Icon name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.fullname || user?.nickname || ""} 🌅
        </Text>

        {/* Streak Section */}
        <Animated.View
          style={[styles.streakContainer, { transform: [{ scale: fireAnim }] }]}
        >
          <View style={styles.streakCard}>
            <View style={styles.fireIcon}>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakCount}>
                {t("streakTitle", { count: user?.streak || 0 })}
              </Text>
              <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Motivational Message */}
        <View style={styles.motivationCard}>
          <Icon name="format-quote" size={24} color="#4F46E5" />
          <Text style={styles.motivationText}>{motivationalMessage}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>{t("progressSection")} 📊</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="school" size={24} color="#10B981" />
              <Text style={styles.statNumber}>{progressStats.completedLessons}</Text>
              <Text style={styles.statLabel}>{t("stats.lessons")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="stars" size={24} color="#8B5CF6" />
              <Text style={styles.statNumber}>{user?.exp || 0}</Text>
              <Text style={styles.statLabel}>
                {t("stats.xp")} / {user?.expToNextLevel || 0}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="leaderboard" size={24} color="#F59E0B" />
              <Text style={styles.statNumber}>{user?.level || 1}</Text>
              <Text style={styles.statLabel}>{t("stats.level")}</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="schedule" size={24} color="#3B82F6" />
              <Text style={styles.statNumber}>{progressStats.timeSpent}m</Text>
              <Text style={styles.statLabel}>{t("stats.time")}</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsList}>
          {achievements.map((ach) => {
            const { badge, loading } = useBadge(ach.badgeId);

            if (loading || !badge) return null;

            return (
              <View key={ach.badgeId} style={styles.achievementCard}>
                <Icon name="emoji-events" size={20} color="#F59E0B" />
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{badge.badgeName}</Text>
                  <Text style={styles.achievementDescription}>{badge.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Continue Learning */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => resetToTab('Home', 'HomeMain')}
        >
          <Text style={styles.continueButtonText}>{t("continueButton")}</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = createScaledSheet({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#F8FAFC",
  },
  header: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  streakContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FEF3C7",
  },
  fireIcon: {
    position: "relative",
    marginRight: 16,
  },
  fireEmoji: {
    fontSize: 48,
  },
  streakBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakNumber: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  streakMessage: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
  },
  reminderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    width: "100%",
  },
  reminderText: {
    fontSize: 14,
    color: "#D97706",
    marginLeft: 8,
    fontWeight: "500",
  },
  motivationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  motivationText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontStyle: "italic",
    marginLeft: 12,
    lineHeight: 24,
  },
  progressSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  achievementsSection: {
    marginBottom: 16,
  },
  achievementsList: {
    gap: 8,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
    marginTop: 4,
  },
});

export default DailyWelcomeScreen;