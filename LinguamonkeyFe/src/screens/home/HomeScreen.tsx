import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Modal, TextInput, RefreshControl, Platform, KeyboardAvoidingView, SafeAreaView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore } from "../../stores/UserStore";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useDailyChallenges, useAssignChallenge, useCompleteChallenge } from "../../hooks/useDailyChallenge";
import { useLeaderboards } from "../../hooks/useLeaderboards";
import { queryClient } from "../../services/queryClient";
import { gotoTab } from "../../utils/navigationRef";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { getGreetingKey } from "../../utils/motivationHelper";
import type { UserDailyChallengeResponse } from "../../types/dto";
import { Picker } from "@react-native-picker/picker";
import { ProficiencyLevel, GoalType } from "../../types/enums";
import { createScaledSheet } from "../../utils/scaledStyles";
import HomeCarousel from "../../components/home/HomeCarousel";

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
];

const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const { useTopThree } = useLeaderboards();
  const { data: rawTopThreeData, isLoading: topThreeLoading } = useTopThree(null);
  const rawTopThreeUsers = rawTopThreeData || [];

  let topThreeUsers: any[] = [];
  if (rawTopThreeUsers.length >= 3) {
    topThreeUsers = [rawTopThreeUsers[1], rawTopThreeUsers[0], rawTopThreeUsers[2]];
  } else {
    topThreeUsers = rawTopThreeUsers.slice(0, 3);
  }

  const { useUserRoadmaps, useDefaultRoadmaps, useAssignDefaultRoadmap, useGenerateRoadmap } = useRoadmap();
  const {
    name = "",
    streak = 0,
    languages = [],
    user,
  } = useUserStore();

  const { data: dailyChallengesData, isLoading: dailyLoading, refetch: refetchDaily } = useDailyChallenges(user?.userId);
  const dailyChallenges = dailyChallengesData || [];

  const currentChallenge = dailyChallenges.find((c: UserDailyChallengeResponse) => !c.isCompleted);

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

  const [formState, setFormState] = useState({
    languageCode: mainLanguage,
    targetProficiency: ProficiencyLevel.B2,
    targetDate: new Date(),
    showDatePicker: false,
    focusAreas: [] as GoalType[],
    studyTime: '30',
    prompt: ''
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
      queryClient.invalidateQueries({ queryKey: ["leaderboards", "top3"] }),
      refetchDaily()
    ]);
    setRefreshing(false);
  }, [refetchDaily]);

  const handleLeaderboardPress = () => gotoTab("EnhancedLeaderboardScreen");
  const handleRoadmapPress = () => gotoTab('RoadmapStack', 'RoadmapScreen');
  const handlePublicRoadmapsPress = () => gotoTab('RoadmapStack', "PublicRoadmapsScreen");
  const greetingKey = getGreetingKey();

  const handleAssignDefaultRoadmap = async (roadmapId: string) => {
    try {
      await assignDefaultRoadmapMutation.mutate({ roadmapId });
    } catch (error) {
      console.error("Failed to assign roadmap", error);
    }
  };

  const toggleFocusArea = (area: GoalType) => {
    setFormState(prev => {
      const exists = prev.focusAreas.includes(area);
      return {
        ...prev,
        focusAreas: exists
          ? prev.focusAreas.filter(a => a !== area)
          : [...prev.focusAreas, area]
      };
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || formState.targetDate;
    setFormState(prev => ({
      ...prev,
      showDatePicker: Platform.OS === 'ios',
      targetDate: currentDate
    }));
  };

  const handleGenerateRoadmap = async () => {
    if (!user?.userId) return;

    if (!formState.studyTime || isNaN(Number(formState.studyTime))) {
      alert(t("Please enter a valid study time"));
      return;
    }

    if (formState.focusAreas.length === 0) {
      alert(t("Please select at least one focus area"));
      return;
    }

    try {
      await generateRoadmapMutation.mutate({
        userId: user.userId,
        languageCode: formState.languageCode,
        targetProficiency: formState.targetProficiency,
        targetDate: formState.targetDate.toISOString().split('T')[0],
        focusAreas: formState.focusAreas.map(area => area.toString()),
        studyTimePerDay: parseInt(formState.studyTime, 10),
        isCustom: true,
        additionalPrompt: formState.prompt,
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

  const calculateChallengeProgress = (item: UserDailyChallengeResponse): number => {
    return Math.min(1, Math.max(0, (item.progress || 0) / 100));
  };

  const goToChatAISCreen = () => {
    gotoTab("ChatStack", 'ChatAIScreen');
  };

  const proficiencyLevels = Object.values(ProficiencyLevel);
  const goalTypes = Object.values(GoalType);

  return (
    <ScreenLayout backgroundColor="#F8FAFC">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{t(greetingKey)} 👋</Text>
              <Text style={styles.userName}>{name || t("home.student")}</Text>
            </View>
            <TouchableOpacity style={styles.streakContainer} onPress={() => gotoTab('DailyWelcomeScreen')}>
              <Icon name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={styles.streakText}>{streak}</Text>
            </TouchableOpacity>
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
                      <Text style={styles.podiumName} numberOfLines={1}>{u.fullname || u.username || "User"}</Text>
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

          {/* New Carousel Feature */}
          <HomeCarousel navigation={navigation} />

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

          {currentChallenge && !currentChallenge.isCompleted ? (
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.challenge.title")}</Text>
            {dailyLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeList}>
                {dailyChallenges?.map((item: UserDailyChallengeResponse) => {
                  const progressPercentage = calculateChallengeProgress(item) * 100;
                  const showProgressBar = item.progress > 0 && !item.isCompleted;

                  return (
                    <TouchableOpacity
                      key={item.challengeId}
                      style={[styles.challengeCard, item.isCompleted && styles.challengeCompleted]}
                      onPress={() => !item.isCompleted && handleCompleteChallenge(item.challengeId)}
                      disabled={item.isCompleted}
                      activeOpacity={item.isCompleted ? 1 : 0.7}
                    >
                      <View style={[styles.challengeIcon, { backgroundColor: item.isCompleted ? 'rgba(255,255,255,0.2)' : '#FFF7ED' }]}>
                        <Icon
                          name={item.isCompleted ? "check-circle" : "sports-esports"}
                          size={24}
                          color={item.isCompleted ? "#fff" : "#F59E0B"}
                        />
                      </View>
                      <Text style={[styles.challengeTitleText, item.isCompleted && { color: '#fff' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.challengeDescriptionText, item.isCompleted && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={2}>
                        {item.description || t("home.challenge.defaultDescShort")}
                      </Text>
                      {showProgressBar && (
                        <View style={{ marginVertical: 8, width: '100%' }}>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: '#F59E0B' }]} />
                          </View>
                          <Text style={[styles.progressValue, { fontSize: 10, textAlign: 'right', color: item.isCompleted ? '#fff' : '#6B7280', fontWeight: 'bold' }]}>
                            {item.progress}%
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: showProgressBar ? 0 : 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.xpBadge, item.isCompleted && { backgroundColor: 'rgba(255,255,255,0.3)', color: '#fff' }]}>
                            +{item.expReward} XP
                          </Text>
                          {item.rewardCoins > 0 && (
                            <View style={[styles.coinBadge, item.isCompleted && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                              <Icon name="monetization-on" size={12} color={item.isCompleted ? "#fff" : "#059669"} />
                              <Text style={[styles.coinText, item.isCompleted && { color: '#fff' }]}>
                                {item.rewardCoins}
                              </Text>
                            </View>
                          )}
                        </View>
                        {!item.isCompleted && (
                          <Icon name="chevron-right" size={24} color={item.isCompleted ? "#fff" : "#6B7280"} />
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

      <Modal visible={showGenerateDialog} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("home.roadmap.dialogTitle")}</Text>
                <TouchableOpacity onPress={() => setShowGenerateDialog(false)}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollContent}>
                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Target Language")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.chip,
                          formState.languageCode === lang.code && styles.chipSelected
                        ]}
                        onPress={() => setFormState(prev => ({ ...prev, languageCode: lang.code }))}
                      >
                        <Text style={[
                          styles.chipText,
                          formState.languageCode === lang.code && styles.chipTextSelected
                        ]}>
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Target Proficiency")}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formState.targetProficiency}
                      onValueChange={(itemValue) =>
                        setFormState(prev => ({ ...prev, targetProficiency: itemValue as ProficiencyLevel }))
                      }
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {proficiencyLevels.map((level) => (
                        <Picker.Item key={level} label={t(`proficiency.${level}`)} value={level} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Target Completion Date")}</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setFormState(prev => ({ ...prev, showDatePicker: true }))}
                  >
                    <Text style={styles.dateText}>
                      {formState.targetDate.toLocaleDateString()}
                    </Text>
                    <Icon name="calendar-today" size={20} color="#666" />
                  </TouchableOpacity>
                  {formState.showDatePicker && (
                    <DateTimePicker
                      value={formState.targetDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={handleDateChange}
                    />
                  )}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Focus Areas")}</Text>
                  <View style={styles.grid}>
                    {goalTypes.map((area) => (
                      <TouchableOpacity
                        key={area}
                        style={[
                          styles.gridChip,
                          formState.focusAreas.includes(area) && styles.chipSelected
                        ]}
                        onPress={() => toggleFocusArea(area)}
                      >
                        <Text style={[
                          styles.chipText,
                          formState.focusAreas.includes(area) && styles.chipTextSelected
                        ]}>
                          {area.replace(/_/g, ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Study Time (minutes/day)")}</Text>
                  <TextInput
                    style={styles.input}
                    value={formState.studyTime}
                    onChangeText={(val) => setFormState(prev => ({ ...prev, studyTime: val }))}
                    keyboardType="numeric"
                    placeholder="e.g. 30"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>{t("Additional Requirements")}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formState.prompt}
                    onChangeText={(val) => setFormState(prev => ({ ...prev, prompt: val }))}
                    multiline
                    placeholder={t("Any specific goals or interests?")}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowGenerateDialog(false)}>
                    <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleGenerateRoadmap}
                    disabled={generateRoadmapMutation.isPending}
                  >
                    {generateRoadmapMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>{t("common.create")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  formScrollContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
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
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#6B7280",
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
  pickerContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  picker: {
    height: 40,
    width: '100%',
    color: "#1F2937",
  },
  pickerItem: {
    height: 40,
  }
});

export default HomeScreen;