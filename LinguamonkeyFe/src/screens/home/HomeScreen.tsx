import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/UserStore";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useDailyChallenges, useAssignChallenge, useCompleteChallenge } from "../../hooks/useDailyChallenge";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { queryClient } from "../../services/queryClient";
import { gotoTab } from "../../utils/navigationRef";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { getGreetingKey } from "../../utils/motivationHelper";
import type { UserDailyChallengeResponse } from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import HomeCarousel from "../../components/home/HomeCarousel";
import RoadmapTimeline from "../../components/roadmap/RoadmapTimeline";
import RoadmapSkeleton from "../../components/common/RoadmapSkeleton";

const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // --- LEADERBOARD LOGIC ---
  const { useTopThree } = useLeaderboards();
  const { data: rawTopThreeData, isLoading: topThreeLoading } = useTopThree(null);
  const rawTopThreeUsers = rawTopThreeData || [];

  let topThreeUsers: any[] = [];
  if (rawTopThreeUsers.length >= 3) {
    topThreeUsers = [rawTopThreeUsers[1], rawTopThreeUsers[0], rawTopThreeUsers[2]];
  } else {
    topThreeUsers = rawTopThreeUsers.slice(0, 3);
  }

  // --- USER & CHALLENGE LOGIC ---
  const {
    name = "",
    streak = 0,
    languages = [],
    user,
  } = useUserStore();

  const { data: dailyChallengesData, isLoading: dailyLoading, refetch: refetchDaily } = useDailyChallenges(user?.userId);
  const dailyChallenges = dailyChallengesData || [];
  const currentChallenge = dailyChallenges.find((c: UserDailyChallengeResponse) => !c.completed);

  const assignChallengeMutation = useAssignChallenge();
  const completeMutation = useCompleteChallenge();

  // --- ROADMAP LOGIC ---
  const {
    useUserRoadmaps,
    useSuggestions,
    useAddSuggestion,
    useCompleteRoadmapItem
  } = useRoadmap();

  const mainLanguage = languages[0] || "en";
  const { data: roadmapData, isLoading: roadmapLoading } = useUserRoadmaps(mainLanguage);

  // Take the first active roadmap
  const roadmap = (roadmapData && roadmapData.length > 0) ? roadmapData[0] : null;

  // Suggestions Logic
  const { data: suggestionsData } = useSuggestions(roadmap?.roadmapId || null);
  const suggestions = suggestionsData || [];

  const addSuggestionMutation = useAddSuggestion();
  const completeItemMutation = useCompleteRoadmapItem();

  const [refreshing, setRefreshing] = useState(false);

  // --- ANIMATIONS & EFFECTS ---
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
      queryClient.invalidateQueries({ queryKey: ["leaderboards", "top3"] }),
      refetchDaily()
    ]);
    setRefreshing(false);
  }, [refetchDaily]);

  // --- HANDLERS ---
  const handleLeaderboardPress = () => gotoTab("EnhancedLeaderboardScreen");
  const handleRoadmapPress = () => navigation.navigate('RoadmapStack', { screen: 'RoadmapScreen' });
  const handleFindRoadmap = () => navigation.navigate('RoadmapStack', { screen: 'PublicRoadmapsScreen' });

  const handleAddSuggestion = async (itemId: string, text: string) => {
    if (!roadmap?.roadmapId) return;
    await addSuggestionMutation.mutateAsync({
      roadmapId: roadmap.roadmapId,
      itemId,
      reason: text,
      suggestedOrderIndex: 0 // Default or calculated
    });
  };

  const handleCompleteItem = (itemId: string) => {
    completeItemMutation.mutate({ itemId });
  };

  const greetingKey = getGreetingKey();

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

  const calculateChallengeProgress = (item: UserDailyChallengeResponse): number => {
    return Math.min(1, Math.max(0, (item.progress || 0) / 100));
  };

  const goToChatAISCreen = () => {
    gotoTab("ChatStack", 'ChatAIScreen');
  };

  // --- RENDER ---
  return (
    <ScreenLayout backgroundColor="#F8FAFC" swipeToTab="Chat">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{t(greetingKey)} 👋</Text>
              <Text style={styles.fullname}>{name || t("home.student")}</Text>
            </View>
            <TouchableOpacity style={styles.streakContainer} onPress={() => gotoTab('DailyWelcomeScreen')}>
              <Icon name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={styles.streakText}>{streak}</Text>
            </TouchableOpacity>
          </View>

          {/* LEADERBOARD PODIUM */}
          {topThreeLoading ? (
            <ActivityIndicator style={{ margin: 20 }} color="#3B82F6" />
          ) : Array.isArray(topThreeUsers) && topThreeUsers.length > 0 ? (
            <TouchableOpacity style={styles.leaderboardSection} onPress={handleLeaderboardPress} activeOpacity={0.9}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.leaderboard.title")}</Text>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </View>
              <View style={styles.podiumContainer}>
                {topThreeUsers.map((u: any, idx: number) => {
                  let rank = 0;
                  let podiumStyle = {};
                  let bụcStyle = {};

                  if (idx === 1) {
                    rank = 1;
                    podiumStyle = styles.firstPlacePodium;
                    bụcStyle = styles.podiumBarFirst;
                  } else if (idx === 0) {
                    rank = 2;
                    podiumStyle = styles.secondPlacePodium;
                    bụcStyle = styles.podiumBarSecond;
                  } else if (idx === 2) {
                    rank = 3;
                    podiumStyle = styles.thirdPlacePodium;
                    bụcStyle = styles.podiumBarThird;
                  }

                  const isFirst = rank === 1;
                  const isSecond = rank === 2;

                  return (
                    <View key={rank} style={[styles.podiumItem, podiumStyle]}>
                      <View style={[styles.medal, isFirst ? styles.goldMedal : isSecond ? styles.silverMedal : styles.bronzeMedal]}>
                        <Text style={styles.medalText}>{rank}</Text>
                      </View>
                      <Image source={{ uri: u.avatarUrl || 'https://via.placeholder.com/50' }} style={styles.podiumAvatar} />
                      <Text style={styles.podiumName} numberOfLines={1}>{u.fullname || u.fullname || "User"}</Text>
                      <View style={styles.levelBadge}>
                        <Icon name="star" size={12} color="#FFFFFF" />
                        <Text style={styles.levelText}>{u.level || 1}</Text>
                      </View>
                      <Text style={styles.podiumScore}>{u.score || u.totalExp || 0} XP</Text>
                      <View style={[styles.podiumBar, bụcStyle]} />
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          ) : null}

          <HomeCarousel navigation={navigation} />

          {/* AI CHARACTER */}
          <Animated.View style={[styles.characterSection, { transform: [{ scale: bounceAnim }] }]}>
            <TouchableOpacity style={styles.characterContainer} onPress={goToChatAISCreen} activeOpacity={0.8}>
              <View style={styles.characterCircle}>
                <Icon name="smart-toy" size={40} color="#FFFFFF" />
              </View>
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>{t("home.character.message")}</Text>
                <View style={styles.speechArrow} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* PROGRESS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.progress.title")}</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Icon name="stars" size={24} color="#F59E0B" />
                <Text style={styles.progressLabel}>{t("home.progress.xp")}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${(user?.exp && user?.expToNextLevel ? (user.exp / user.expToNextLevel) * 100 : 0)}%` }]} />
              </View>
              <Text style={styles.progressValue}>{user?.exp || 0} / {user?.expToNextLevel || 100}</Text>
            </View>
          </View>

          {/* CURRENT CHALLENGE */}
          {currentChallenge && !currentChallenge.completed ? (
            <TouchableOpacity
              style={styles.section}
              onPress={() => handleCompleteChallenge(currentChallenge.challengeId)}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionTitle}>{t("home.challenge.currentTitle")}</Text>
              <View style={[styles.progressCard, { backgroundColor: '#E0F2FE', borderColor: '#3B82F6', borderWidth: 1 }]}>
                <View style={styles.progressHeader}>
                  <Icon name="run-circle" size={24} color="#3B82F6" />
                  <Text style={[styles.progressLabel, { color: '#3B82F6' }]}>{currentChallenge.title}</Text>
                </View>
                <Text style={{ color: '#6B7280', marginBottom: 10 }}>
                  {currentChallenge.description || t("home.challenge.defaultDesc")}
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${currentChallenge.progress || 0}%`, backgroundColor: '#3B82F6' }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.progressValue, { textAlign: 'left', flex: 1 }]}>
                    +{currentChallenge.expReward} XP
                  </Text>
                  <Text style={styles.progressValue}>
                    {currentChallenge.progress || 0}%
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleCompleteChallenge(currentChallenge.challengeId)}
                >
                  <Text style={styles.completeButtonText}>{t("common.complete")}</Text>
                  <Icon name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* --- ROADMAP SECTION WITH TIMELINE & SKELETON --- */}
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
              <RoadmapSkeleton />
            ) : roadmap ? (
              <View>
                <View style={styles.roadmapHeaderCard}>
                  <Text style={styles.roadmapTitle}>{roadmap.title}</Text>
                  <Text style={styles.roadmapSubtitle}>
                    {t("home.roadmap.completed", { count: roadmap.completedItems })} / {roadmap.totalItems} {t('common.items')}
                  </Text>
                </View>

                <RoadmapTimeline
                  items={roadmap.items || []}
                  suggestions={suggestions}
                  isOwner={true}
                  onCompleteItem={handleCompleteItem}
                  onAddSuggestion={handleAddSuggestion}
                />
              </View>
            ) : (
              // Empty State
              <TouchableOpacity style={styles.emptyStateContainer} onPress={handleFindRoadmap}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="add-road" size={24} color="#9CA3AF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyStateTitle}>{t("home.roadmap.noPersonal")}</Text>
                  <Text style={styles.emptyStateSub}>{t("home.roadmap.browsePublic")}</Text>
                </View>
                <Icon name="arrow-forward-ios" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* CHALLENGES LIST */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.challenge.title")}</Text>
            {dailyLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeList}>
                {dailyChallenges?.map((item: UserDailyChallengeResponse) => {
                  const progressPercentage = calculateChallengeProgress(item) * 100;
                  const showProgressBar = item.progress > 0 && !item.completed;

                  return (
                    <TouchableOpacity
                      key={item.challengeId}
                      style={[styles.challengeCard, item.completed && styles.challengeCompleted]}
                      onPress={() => !item.completed && handleCompleteChallenge(item.challengeId)}
                      disabled={item.completed}
                      activeOpacity={item.completed ? 1 : 0.7}
                    >
                      <View style={[styles.challengeIcon, { backgroundColor: item.completed ? 'rgba(255,255,255,0.2)' : '#FFF7ED' }]}>
                        <Icon
                          name={item.completed ? "check-circle" : "sports-esports"}
                          size={24}
                          color={item.completed ? "#fff" : "#F59E0B"}
                        />
                      </View>
                      <Text style={[styles.challengeTitleText, item.completed && { color: '#fff' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.challengeDescriptionText, item.completed && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={2}>
                        {item.description || t("home.challenge.defaultDescShort")}
                      </Text>
                      {showProgressBar && (
                        <View style={{ marginVertical: 8, width: '100%' }}>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: '#F59E0B' }]} />
                          </View>
                          <Text style={[styles.progressValue, { fontSize: 10, textAlign: 'right', color: item.completed ? '#fff' : '#6B7280', fontWeight: 'bold' }]}>
                            {item.progress}%
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: showProgressBar ? 0 : 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.xpBadge, item.completed && { backgroundColor: 'rgba(255,255,255,0.3)', color: '#fff' }]}>
                            +{item.expReward} XP
                          </Text>
                          {item.rewardCoins > 0 && (
                            <View style={[styles.coinBadge, item.completed && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                              <Icon name="monetization-on" size={12} color={item.completed ? "#fff" : "#059669"} />
                              <Text style={[styles.coinText, item.completed && { color: '#fff' }]}>
                                {item.rewardCoins}
                              </Text>
                            </View>
                          )}
                        </View>
                        {!item.completed && (
                          <Icon name="chevron-right" size={24} color={item.completed ? "#fff" : "#6B7280"} />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })}
                <TouchableOpacity style={styles.addChallengeCard} onPress={handleAssignChallenge}>
                  <Icon name="add-circle-outline" size={32} color="#3B82F6" />
                  <Text style={styles.addChallengeText}>{t("home.challenge.add")}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </ScrollView>
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
  fullname: {
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
    marginBottom: 0,
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
    height: 200,
    paddingBottom: 0,
  },
  podiumItem: {
    alignItems: "center",
    width: 90,
    position: 'relative',
  },
  podiumBar: {
    position: 'absolute',
    bottom: 0,
    width: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  podiumBarThird: {
    height: 40,
    backgroundColor: '#CD7C2F',
    zIndex: 0,
    opacity: 0.8,
  },
  podiumBarSecond: {
    height: 65,
    backgroundColor: '#9CA3AF',
    zIndex: 0,
    opacity: 0.8,
  },
  podiumBarFirst: {
    height: 90,
    backgroundColor: '#F59E0B',
    zIndex: 1,
    opacity: 0.9,
  },
  thirdPlacePodium: {
    marginLeft: 8,
    paddingBottom: 40,
  },
  secondPlacePodium: {
    marginRight: 8,
    paddingBottom: 65,
  },
  firstPlacePodium: {
    zIndex: 2,
    marginHorizontal: 4,
    paddingBottom: 90,
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
    zIndex: 4,
  },
  podiumScore: {
    fontSize: 10,
    color: "#6B7280",
    zIndex: 4,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
    zIndex: 4,
  },
  levelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 2,
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
  roadmapHeaderCard: {
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  roadmapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyStateContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyStateSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
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
    minHeight: 180,
    justifyContent: 'space-between',
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
    marginBottom: 8,
  },
  challengeTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  challengeDescriptionText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    overflow: 'hidden',
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
  coinBadge: {
    flexDirection: 'row',
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  coinText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 3,
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
    minHeight: 180,
  },
  addChallengeText: {
    marginTop: 8,
    color: "#3B82F6",
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default HomeScreen;