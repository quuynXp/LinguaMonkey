import React, { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { useUserStore } from "../../stores/UserStore";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useClaimChallengeReward, useDailyChallenges } from "../../hooks/useDailyChallenge";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { useNotifications } from "../../hooks/useNotifications";
import { gotoTab } from "../../utils/navigationRef";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { getGreetingKey } from "../../utils/motivationHelper";
import type { UserDailyChallengeResponse, RoadmapUserResponse } from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import HomeSinglePromotion from "../../components/home/HomeSinglePromotion";
import RoadmapTimeline from "../../components/roadmap/RoadmapTimeline";
import RoadmapSkeleton from "../../components/common/RoadmapSkeleton";

const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const {
    name = "",
    streak = 0,
    user,
  } = useUserStore();

  const { useTopThree } = useLeaderboards();
  const { data: rawTopThreeData, isLoading: topThreeLoading } = useTopThree(null);
  const rawTopThreeUsers = rawTopThreeData || [];

  let topThreeUsers: any[] = [];
  if (rawTopThreeUsers.length >= 3) {
    topThreeUsers = [rawTopThreeUsers[1], rawTopThreeUsers[0], rawTopThreeUsers[2]];
  } else {
    topThreeUsers = rawTopThreeUsers.slice(0, 3);
  }

  const { data: challengesData, isLoading: dailyLoading } = useDailyChallenges(user?.userId);
  const { claimReward } = useClaimChallengeReward();
  const activeChallenges = challengesData || [];

  const [enableUnread, setEnableUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEnableUnread(true);
      return () => setEnableUnread(false);
    }, [])
  );

  const { useUnreadCount } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount(user?.userId, enableUnread);

  const {
    useUserRoadmaps,
    useSuggestions,
    useAddSuggestion,
    useCompleteRoadmapItem
  } = useRoadmap();

  const { data: roadmapData, isLoading: roadmapLoading, refetch: refetchRoadmaps } = useUserRoadmaps();

  const getActiveRoadmap = (roadmaps: RoadmapUserResponse[] | undefined) => {
    if (!roadmaps || roadmaps.length === 0) return null;

    const activeOnes = roadmaps.filter(r => {
      const progress = r.totalItems > 0 ? r.completedItems / r.totalItems : 0;
      return progress < 1;
    });

    if (activeOnes.length === 0) {
      return null;
    }

    activeOnes.sort((a, b) => {
      const progA = a.totalItems > 0 ? a.completedItems / a.totalItems : 0;
      const progB = b.totalItems > 0 ? b.completedItems / b.totalItems : 0;
      return progB - progA;
    });

    return activeOnes[0];
  };

  const roadmap = getActiveRoadmap(roadmapData);

  const { data: suggestionsData, refetch: refetchSuggestions } = useSuggestions(roadmap?.roadmapId || null);
  const suggestions = suggestionsData || [];

  const addSuggestionMutation = useAddSuggestion();
  const completeItemMutation = useCompleteRoadmapItem();

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchRoadmaps();
      if (roadmap?.roadmapId) {
        refetchSuggestions();
      }
    }, [refetchRoadmaps, refetchSuggestions, roadmap?.roadmapId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchRoadmaps(),
      roadmap?.roadmapId ? refetchSuggestions() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

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

  const handleLeaderboardPress = () => gotoTab("EnhancedLeaderboardScreen");
  const handleRoadmapPress = () => navigation.navigate('RoadmapStack', { screen: 'RoadmapScreen' });
  const handleFindRoadmap = () => navigation.navigate('RoadmapStack', { screen: 'PublicRoadmapsScreen' });
  const handleNotificationPress = () => navigation.navigate('NotificationsScreen');
  const handleSeeAllChallenges = () => navigation.navigate('DailyChallengeBadgeScreen', { initialTab: 'DAILY' });
  const goToChatAISCreen = () => gotoTab("ChatStack", 'ChatAIScreen');

  const handleClaim = async (id: string) => {
    if (!user?.userId) return;
    try {
      await claimReward({ userId: user.userId, challengeId: id });
    } catch (e) { }
  };

  const handleAddSuggestion = async (itemId: string, text: string) => {
    if (!roadmap?.roadmapId) return;
    try {
      await addSuggestionMutation.mutateAsync({
        roadmapId: roadmap.roadmapId,
        itemId,
        reason: text,
        suggestedOrderIndex: 0
      });
      refetchSuggestions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      await completeItemMutation.mutateAsync({ itemId });
    } catch (error) {
      console.error(error);
    }
  };

  const greetingKey = getGreetingKey();

  const handleChallengePress = (item: UserDailyChallengeResponse) => {
    const isClaimable = item.status === 'CAN_CLAIM';
    const isCompleted = item.status === 'CLAIMED';

    if (isClaimable) {
      handleClaim(item.challengeId);
    } else if (!isCompleted) {
      if (item.stack && item.screenRoute) {
        // Đúng cấu trúc goToTab("stack", "màn hình")
        gotoTab(item.stack, item.screenRoute);
      } else if (item.screenRoute) {
        // Dùng navigation.navigate nếu không có stack (Màn hình nằm trực tiếp trong Tab hoặc là một màn hình gốc)
        navigation.navigate(item.screenRoute);
      } else {
        // Fallback mặc định
        navigation.navigate('LearnScreen');
      }
    }
  };

  const renderChallengeSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("home.challenge.title")}</Text>
        <TouchableOpacity onPress={handleSeeAllChallenges}>
          <Text style={styles.seeAllText}>{t("common.viewAll")}</Text>
        </TouchableOpacity>
      </View>

      {dailyLoading ? (
        <ActivityIndicator color="#3B82F6" />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeList}>
          {activeChallenges.slice(0, 5).map((item: UserDailyChallengeResponse) => {
            const isClaimable = item.status === 'CAN_CLAIM';
            const isCompleted = item.status === 'CLAIMED';
            const progress = Math.min(100, (item.progress / (item.targetAmount || 1)) * 100);

            return (
              <TouchableOpacity
                key={item.challengeId}
                style={[styles.challengeCardHome, isCompleted && styles.challengeCardCompleted]}
                onPress={() => handleChallengePress(item)} // SỬA ĐỔI: Chuyển logic điều hướng vào hàm riêng
                activeOpacity={0.8}
              >
                <View style={styles.challengeCardHeader}>
                  <Icon name={item.period === 'WEEKLY' ? "date-range" : "today"} size={20} color={isCompleted ? "#FFF" : "#4F46E5"} />
                  <View style={[styles.xpBadge, isCompleted && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.xpText, isCompleted && { color: '#FFF' }]}>+{item.expReward} XP</Text>
                  </View>
                </View>

                <Text style={[styles.challengeTitle, isCompleted && { color: '#FFF' }]} numberOfLines={2}>{item.title}</Text>

                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isCompleted ? '#FFF' : '#F59E0B' }]} />
                </View>

                <View style={styles.challengeFooter}>
                  <Text style={[styles.progressText, isCompleted && { color: 'rgba(255,255,255,0.8)' }]}>
                    {item.progress}/{item.targetAmount}
                  </Text>
                  {isClaimable ? (
                    <View style={styles.claimBtnSmall}>
                      <Text style={styles.claimTextSmall}>{t('common.claim')}</Text>
                    </View>
                  ) : isCompleted ? (
                    <Icon name="check-circle" size={18} color="#FFF" />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <ScreenLayout backgroundColor="#F8FAFC" swipeToTab="Learn">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{t(greetingKey)} 👋</Text>
              <Text style={styles.fullname}>{name || t("home.student")}</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleNotificationPress}>
                <Icon name="notifications-none" size={26} color="#374151" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.streakContainer} onPress={() => gotoTab('DailyWelcomeScreen')}>
                <Icon name="local-fire-department" size={20} color="#FF6B35" />
                <Text style={styles.streakText}>{streak}</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                    rank = 1; podiumStyle = styles.firstPlacePodium; bụcStyle = styles.podiumBarFirst;
                  } else if (idx === 0) {
                    rank = 2; podiumStyle = styles.secondPlacePodium; bụcStyle = styles.podiumBarSecond;
                  } else if (idx === 2) {
                    rank = 3; podiumStyle = styles.thirdPlacePodium; bụcStyle = styles.podiumBarThird;
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

          <HomeSinglePromotion navigation={navigation} />

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

          {renderChallengeSection()}

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
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginRight: 12, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  challengeList: { paddingRight: 24 },
  challengeCardHome: {
    width: 150,
    height: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  challengeCardCompleted: { backgroundColor: '#10B981' },
  challengeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  xpText: { fontSize: 10, fontWeight: 'bold', color: '#4F46E5' },
  challengeTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  claimBtnSmall: { backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  claimTextSmall: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  headerContent: { flex: 1 },
  greeting: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  progressText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  fullname: { fontSize: 22, fontWeight: "bold", color: "#1F2937" },
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
  streakText: { fontSize: 14, fontWeight: "700", color: "#C2410C", marginLeft: 4 },
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
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  seeAllText: { fontSize: 14, color: "#4F46E5", fontWeight: "600" },
  podiumContainer: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", height: 200, paddingBottom: 0 },
  podiumItem: { alignItems: "center", width: 90, position: 'relative' },
  podiumBar: { position: 'absolute', bottom: 0, width: 80, backgroundColor: '#E5E7EB', borderRadius: 8 },
  podiumBarThird: { height: 40, backgroundColor: '#CD7C2F', zIndex: 0, opacity: 0.8 },
  podiumBarSecond: { height: 65, backgroundColor: '#9CA3AF', zIndex: 0, opacity: 0.8 },
  podiumBarFirst: { height: 90, backgroundColor: '#F59E0B', zIndex: 1, opacity: 0.9 },
  thirdPlacePodium: { marginLeft: 8, paddingBottom: 40 },
  secondPlacePodium: { marginRight: 8, paddingBottom: 65 },
  firstPlacePodium: { zIndex: 2, marginHorizontal: 4, paddingBottom: 90 },
  medal: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: -10, zIndex: 3, borderWidth: 2, borderColor: "#fff" },
  goldMedal: { backgroundColor: "#F59E0B" },
  silverMedal: { backgroundColor: "#9CA3AF" },
  bronzeMedal: { backgroundColor: "#CD7C2F" },
  medalText: { fontSize: 10, fontWeight: "bold", color: "#fff" },
  podiumAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: "#fff", marginBottom: 8 },
  podiumName: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 2, zIndex: 4 },
  podiumScore: { fontSize: 10, color: "#6B7280", zIndex: 4 },
  levelBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#4F46E5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginBottom: 4, zIndex: 4 },
  levelText: { color: "#fff", fontSize: 10, fontWeight: "bold", marginLeft: 2 },
  characterSection: { paddingHorizontal: 24, marginBottom: 24 },
  characterContainer: { flexDirection: "row", alignItems: "center" },
  characterCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#4ECDC4", alignItems: "center", justifyContent: "center", marginRight: 16, borderWidth: 4, borderColor: "#E0F2FE" },
  speechBubble: { flex: 1, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  speechText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  speechArrow: { position: "absolute", bottom: 0, left: -8, width: 0, height: 0, borderTopWidth: 8, borderTopColor: "transparent", borderBottomWidth: 8, borderBottomColor: "#FFFFFF", borderRightWidth: 8, borderRightColor: "transparent", transform: [{ rotate: "-90deg" }] },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  progressCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  progressHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  progressLabel: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginLeft: 8 },
  progressBarContainer: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, marginBottom: 8, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#F59E0B", borderRadius: 4 },
  progressValue: { fontSize: 14, color: "#6B7280", textAlign: "right" },
  roadmapHeaderCard: { marginBottom: 8, paddingHorizontal: 12 },
  roadmapTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 4 },
  roadmapSubtitle: { fontSize: 14, color: "#6B7280" },
  emptyStateContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed" },
  emptyIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginRight: 16 },
  emptyStateTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyStateSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
});

export default HomeScreen;