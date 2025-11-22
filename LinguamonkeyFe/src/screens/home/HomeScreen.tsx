import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Modal, TextInput, RefreshControl } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/UserStore";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useDailyChallenges, useAssignChallenge, useCompleteChallenge } from "../../hooks/useDailyChallenge";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { queryClient } from "../../services/queryClient";
import { gotoTab } from "../../utils/navigationRef";
import { createScaledSheet } from "../../utils/scaledStyles";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { getGreetingKey } from "../../utils/motivationHelper";
import type { UserDailyChallengeResponse } from "../../types/dto";

const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const { useLeaderboardList } = useLeaderboards();
  const { data: leaderboardsData, isLoading: leaderboardsLoading } = useLeaderboardList({ tab: "global", page: 0, size: 3 });
  const topThreeUsers = leaderboardsData?.data || [];

  const { useUserRoadmaps, useDefaultRoadmaps, useAssignDefaultRoadmap, useGenerateRoadmap } = useRoadmap();
  const {
    name = "",
    streak = 0,
    languages = [],
    user,
  } = useUserStore();

  const { data: dailyChallengesData, isLoading: dailyLoading, refetch: refetchDaily } = useDailyChallenges(user?.userId);
  const dailyChallenges = dailyChallengesData || [];

  const assignChallengeMutation = useAssignChallenge();
  const completeMutation = useCompleteChallenge();

  const mainLanguage = languages[0] || "en";
  const { data: roadmapData, isLoading: roadmapLoading } = useUserRoadmaps(mainLanguage);
  const roadmap = (roadmapData && roadmapData.length > 0) ? roadmapData[0] : null;

  const { data: defaultRoadmapsData, isLoading: defaultLoading } = useDefaultRoadmaps(mainLanguage);
  const defaultRoadmaps = defaultRoadmapsData || [];

  const assignDefaultRoadmapMutation = useAssignDefaultRoadmap();
  const generateRoadmapMutation = useGenerateRoadmap();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState({
    language_code: mainLanguage,
    target_proficiency: "",
    target_date: "",
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    const bounceAnimation = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]).start(() => setTimeout(bounceAnimation, 4000));
    };
    bounceAnimation();
  }, [fadeAnim, bounceAnim]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] }),
      queryClient.invalidateQueries({ queryKey: ["dailyChallenges"] }),
      refetchDaily()
    ]);
    setRefreshing(false);
  }, [refetchDaily]);

  const handleLeaderboardPress = () => navigation.navigate("EnhancedLeaderboard");
  const handleRoadmapPress = () => navigation.navigate("RoadmapScreen");
  const handlePublicRoadmapsPress = () => navigation.navigate("PublicRoadmaps");
  const greetingKey = getGreetingKey();

  const handleAssignDefaultRoadmap = async (roadmapId: string) => {
    try {
      await assignDefaultRoadmapMutation.mutate({ roadmapId });
    } catch (error) {
      console.error("Failed to assign roadmap", error);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!user?.userId) return;
    try {
      await generateRoadmapMutation.mutate({
        userId: user.userId,
        languageCode: preferences.language_code,
        targetProficiency: preferences.target_proficiency,
        targetDate: preferences.target_date,
        focusAreas: [],
        studyTimePerDay: 1,
        isCustom: true,
        additionalPrompt: "",
      });
      setShowGenerateDialog(false);
    } catch (error) {
      console.error("Failed to generate roadmap", error);
    }
  };

  const handleAssignChallenge = async () => {
    if (!user?.userId) return;
    try {
      await assignChallengeMutation.assignChallenge(user.userId);
    } catch (error) {
      console.error("Failed to assign challenge", error);
    }
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    if (!user?.userId) return;
    try {
      await completeMutation.completeChallenge({ userId: user.userId, challengeId });
    } catch (error) {
      console.error("Failed to complete challenge", error);
    }
  };

  return (
    <ScreenLayout backgroundColor="#F8FAFC">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{t(greetingKey)} 👋</Text>
              <Text style={styles.userName}>{name || t("home.student")}</Text>
            </View>
            <TouchableOpacity style={styles.streakContainer} onPress={() => gotoTab('DailyWelcome')}>
              <Icon name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={styles.streakText}>{streak}</Text>
            </TouchableOpacity>
          </View>

          {/* Leaderboard Teaser */}
          {leaderboardsLoading ? (
            <ActivityIndicator style={{ margin: 20 }} color="#3B82F6" />
          ) : Array.isArray(topThreeUsers) && topThreeUsers.length > 0 && (
            <TouchableOpacity style={styles.leaderboardSection} onPress={handleLeaderboardPress} activeOpacity={0.9}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.leaderboard.title")}</Text>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </View>
              <View style={styles.podiumContainer}>
                {topThreeUsers.slice(0, 3).map((u: any, idx: number) => (
                  <View key={idx} style={[styles.podiumItem, idx === 0 ? styles.firstPlace : idx === 1 ? styles.secondPlace : styles.thirdPlace]}>
                    <View style={[styles.medal, idx === 0 ? styles.goldMedal : idx === 1 ? styles.silverMedal : styles.bronzeMedal]}>
                      <Text style={styles.medalText}>{idx + 1}</Text>
                    </View>
                    <Image source={{ uri: u.avatarUrl || 'https://via.placeholder.com/50' }} style={styles.podiumAvatar} />
                    <Text style={styles.podiumName} numberOfLines={1}>{u.fullname}</Text>
                    <Text style={styles.podiumScore}>{u.level} XP</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}

          {/* AI Character */}
          <Animated.View style={[styles.characterSection, { transform: [{ scale: bounceAnim }] }]}>
            <View style={styles.characterContainer}>
              <View style={styles.characterCircle}>
                <Icon name="smart-toy" size={40} color="#FFFFFF" />
              </View>
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>{t("home.character.message")}</Text>
                <View style={styles.speechArrow} />
              </View>
            </View>
          </Animated.View>

          {/* Learning Progress */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.progress.title")}</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Icon name="stars" size={24} color="#F59E0B" />
                <Text style={styles.progressLabel}>{t("home.progress.xp")}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${(user?.exp / user?.expToNextLevel) * 100 || 0}%` }]} />
              </View>
              <Text style={styles.progressValue}>{user?.exp || 0} / {user?.expToNextLevel || 100}</Text>
            </View>
          </View>

          {/* Roadmap */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("home.roadmap.title")}</Text>
              {roadmap && (
                <TouchableOpacity onPress={handleRoadmapPress}>
                  <Text style={styles.seeAllText}>{t("common.viewAll")}</Text>
                </TouchableOpacity>
              )}
            </View>

            {roadmapLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : roadmap ? (
              <TouchableOpacity style={styles.roadmapCard} onPress={handleRoadmapPress}>
                <View style={styles.roadmapInfo}>
                  <Text style={styles.roadmapTitle}>{roadmap.title}</Text>
                  <Text style={styles.roadmapSubtitle}>
                    {t("home.roadmap.completed", { count: roadmap.completedItems })}
                  </Text>
                </View>
                <View style={styles.circularProgress}>
                  <Text style={styles.percentageText}>
                    {Math.round(roadmap.totalItems > 0 ? (roadmap.completedItems / roadmap.totalItems) * 100 : 0)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyStateContainer}>
                {defaultLoading ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <>
                    <Text style={styles.emptyStateText}>{t("home.roadmap.noPersonal")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.defaultRoadmapScroll}>
                      {defaultRoadmaps?.map((def: any) => (
                        <TouchableOpacity
                          key={def.id}
                          onPress={() => handleAssignDefaultRoadmap(def.id)}
                          style={styles.defaultCard}
                        >
                          <Text style={styles.defaultCardTitle}>{def.title}</Text>
                          <Text style={styles.defaultCardLang}>{def.language}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.primaryButton} onPress={() => setShowGenerateDialog(true)}>
                        <Icon name="add" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>{t("home.roadmap.createCustom")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={handlePublicRoadmapsPress}>
                        <Icon name="public" size={20} color="#4ECDC4" />
                        <Text style={styles.secondaryButtonText}>{t("home.roadmap.browsePublic")}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Daily Challenges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.challenge.title")}</Text>
            {dailyLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeList}>
                {dailyChallenges?.map((item: UserDailyChallengeResponse) => (
                  <TouchableOpacity
                    key={item.challengeId}
                    style={[styles.challengeCard, item.isCompleted && styles.challengeCompleted]}
                    onPress={() => !item.isCompleted && handleCompleteChallenge(item.challengeId)}
                    disabled={item.isCompleted}
                  >
                    <View style={[styles.challengeIcon, { backgroundColor: item.isCompleted ? 'rgba(255,255,255,0.2)' : '#FFF7ED' }]}>
                      <Icon
                        name={item.isCompleted ? "check-circle" : "sports-esports"}
                        size={24}
                        color={item.isCompleted ? "#fff" : "#F59E0B"}
                      />
                    </View>
                    <Text style={[styles.challengeText, item.isCompleted && { color: '#fff' }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.xpBadge, item.isCompleted && { backgroundColor: 'rgba(255,255,255,0.3)', color: '#fff' }]}>
                      +{item.expReward} XP
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addChallengeCard} onPress={handleAssignChallenge}>
                  <Icon name="add-circle-outline" size={32} color="#3B82F6" />
                  <Text style={styles.addChallengeText}>{t("home.challenge.add")}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Generate Roadmap Modal */}
      <Modal visible={showGenerateDialog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("home.roadmap.dialogTitle")}</Text>
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowGenerateDialog(false)}>
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleGenerateRoadmap}>
                <Text style={styles.confirmButtonText}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  streakText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C2410C",
    marginLeft: 4,
  },
  leaderboardSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  seeAllText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 140,
  },
  podiumItem: {
    alignItems: "center",
    width: 80,
  },
  firstPlace: {
    zIndex: 2,
    marginBottom: 10,
  },
  secondPlace: {
    marginRight: 8,
  },
  thirdPlace: {
    marginLeft: 8,
  },
  medal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -10,
    zIndex: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  goldMedal: { backgroundColor: "#F59E0B" },
  silverMedal: { backgroundColor: "#9CA3AF" },
  bronzeMedal: { backgroundColor: "#CD7C2F" },
  medalText: { fontSize: 10, fontWeight: "bold", color: "#fff" },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 8,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 10,
    color: "#6B7280",
  },
  characterSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  characterContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  characterCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 4,
    borderColor: "#E0F2FE",
  },
  speechBubble: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  speechText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  speechArrow: {
    position: "absolute",
    bottom: 0,
    left: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: "transparent",
    borderBottomWidth: 8,
    borderBottomColor: "#FFFFFF",
    borderRightWidth: 8,
    borderRightColor: "transparent",
    transform: [{ rotate: "-90deg" }],
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "right",
  },
  roadmapCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roadmapInfo: {
    flex: 1,
    marginRight: 16,
  },
  roadmapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  circularProgress: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyStateContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  defaultRoadmapScroll: {
    marginBottom: 16,
  },
  defaultCard: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
  },
  defaultCardTitle: {
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  defaultCardLang: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: "#4F46E5",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 13,
  },
  challengeList: {
    paddingRight: 24,
  },
  challengeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeCompleted: {
    backgroundColor: "#10B981",
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  challengeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    height: 40,
  },
  xpBadge: {
    backgroundColor: "#FFF7ED",
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  addChallengeCard: {
    width: 160,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
  },
  addChallengeText: {
    marginTop: 8,
    color: "#3B82F6",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  confirmButton: {
    backgroundColor: "#4F46E5",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default HomeScreen;