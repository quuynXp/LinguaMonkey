import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Animated, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { useRoadmap } from "../../hooks/useRoadmap";
import { RoadmapItem } from "../../types/entity";
import { createScaledSheet } from "../../utils/scaledStyles";

const RoadmapItemDetailScreen = ({ navigation, route }) => {
  const { itemId, roadmapId } = route.params;
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<"overview" | "guidance" | "resources">("overview");
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { useRoadmapItemDetail, useStartRoadmapItem, useCompleteRoadmapItem } = useRoadmap();

  // item có kiểu RoadmapItem (từ entity.ts). Nó KHÔNG có status, progress, prerequisites.
  const { data: item, isLoading, error, refetch } = useRoadmapItemDetail(itemId);
  const startMut = useStartRoadmapItem();
  const completeMut = useCompleteRoadmapItem();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getInferredStatus = (data: RoadmapItem | undefined): string => {
    return data ? "available" : "locked";
  };
  const inferredStatus = getInferredStatus(item);

  const handleStartItem = async () => {
    if (!item) return;
    Alert.alert(
      t("roadmap.startItem"),
      t("roadmap.startItemConfirmation", { title: item.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.start"),
          onPress: async () => {
            try {
              await startMut.mutateAsync(item.itemId);
              Alert.alert(t("common.success"), t("roadmap.itemStarted"));
              if (item.type === "lesson" && item.contentId) {
                navigation.navigate("LessonScreen", { lessonId: item.contentId });
              } else if (item.type === "course" && item.contentId) {
                navigation.navigate("CourseDetailsScreen", { courseId: item.contentId });
              }
            } catch (err: any) {
              Alert.alert(t("common.error"), err.message || t("errors.unknown"));
            }
          },
        },
      ]
    );
  };

  const handleCompleteItem = async () => {
    if (!item) return;
    Alert.alert(
      t("roadmap.completeItem"),
      t("roadmap.completeItemConfirmation", { title: item.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.complete"),
          onPress: async () => {
            try {
              await completeMut.mutateAsync({ itemId: item.itemId });
              Alert.alert(t("common.success"), t("roadmap.itemCompleted"));
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(t("common.error"), err.message || t("errors.unknown"));
            }
          },
        },
      ]
    );
  };

  // Cần sửa đổi các hàm này để nhận trạng thái hợp lệ hoặc trạng thái mặc định
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#10B981";
      case "in_progress": return "#3B82F6";
      case "available": return "#F59E0B";
      case "locked": return "#9CA3AF";
      default: return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "check-circle";
      case "in_progress": return "play-circle-filled";
      case "available": return "radio-button-unchecked";
      case "locked": return "lock";
      default: return "help";
    }
  };

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case "lesson": return "school";
      case "course": return "book";
      case "series": return "playlist-play";
      case "milestone": return "flag";
      case "assessment": return "quiz";
      default: return "circle";
    }
  };

  const formatEstimatedTime = (minutes: number | undefined) => {
    if (minutes === undefined) return `0${t("common.minutes")}`;
    if (minutes < 60) return `${minutes}${t("common.minutes")}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}${t("common.hours")}`;
    return `${hours}${t("common.hours")} ${remainingMinutes}${t("common.minutes")}`;
  };

  const renderGuidanceStage = (guidance: any) => (
    <View key={guidance.stage} style={styles.guidanceStage}>
      <View style={styles.guidanceHeader}>
        <View style={styles.guidanceStageNumber}>
          <Text style={styles.guidanceStageNumberText}>{guidance.order}</Text>
        </View>
        <View style={styles.guidanceStageInfo}>
          <Text style={styles.guidanceStageTitle}>{guidance.title}</Text>
          <Text style={styles.guidanceStageTime}>
            {formatEstimatedTime(guidance.estimatedTime)}
          </Text>
        </View>
      </View>
      <Text style={styles.guidanceDescription}>{guidance.description}</Text>
      {guidance.tips?.length > 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>{t("roadmap.tips")}:</Text>
          {guidance.tips.map((tip: string, index: number) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="lightbulb" size={16} color="#F59E0B" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderResource = (resource: any, index: number) => (
    <TouchableOpacity key={index} style={styles.resourceItem}>
      <View style={styles.resourceIcon}>
        <Icon
          name={
            resource.type === "video" ? "play-circle-filled" :
              resource.type === "article" ? "article" :
                resource.type === "exercise" ? "fitness-center" : "quiz"
          }
          size={24}
          color="#3B82F6"
        />
      </View>
      <View style={styles.resourceContent}>
        <Text style={styles.resourceTitle}>{resource.title}</Text>
        <Text style={styles.resourceDescription}>{resource.description}</Text>
        {resource.duration && (
          <Text style={styles.resourceDuration}>
            {formatEstimatedTime(resource.duration)}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderRelatedItem = (related: any) => (
    <TouchableOpacity
      style={styles.relatedItem}
      onPress={() => navigation.push("RoadmapItemDetail", { itemId: related.id, roadmapId })}
    >
      {/* Vì related.status không có, ta dùng mặc định 'available' */}
      <View style={[styles.relatedItemIcon, { backgroundColor: getStatusColor(related.status || "available") }]}>
        <Icon name={getTypeIcon(related.type)} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.relatedItemContent}>
        <Text style={styles.relatedItemTitle} numberOfLines={1}>{related.title}</Text>
        <Text style={styles.relatedItemType}>{t(`roadmap.types.${related.type}`)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (error || !item) {
    return (
      <ScreenLayout backgroundColor="#F8FAFC">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("roadmap.itemDetail")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("RoadmapScreen")}>
            <Icon name="map" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            {error ? t("errors.loadItemFailed") : t("roadmap.itemNotFound")}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  if (isLoading) {
    return (
      <ScreenLayout backgroundColor="#F8FAFC">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("roadmap.itemDetail")}</Text>
          <View style={styles.headerRight} />
        </View>
      </ScreenLayout>
    );
  }

  const guidance: any[] = [];
  const resources: any[] = [];
  const nextItems: any[] = [];
  const relatedItems: any[] = [];

  return (
    <ScreenLayout backgroundColor="#F8FAFC">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("roadmap.itemDetail")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("RoadmapScreen")}>
          <Icon name="map" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={[styles.itemHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.itemHeaderTop}>
            <View style={styles.itemTypeContainer}>
              {/* Dùng inferredStatus để tránh lỗi item.status */}
              <Icon name={getTypeIcon(item.type)} size={24} color={getStatusColor(inferredStatus)} />
              <Text style={[styles.itemType, { color: getStatusColor(inferredStatus) }]}>
                {t(`roadmap.types.${item.type}`)}
              </Text>
            </View>
            {/* Dùng inferredStatus để tránh lỗi item.status */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inferredStatus) }]}>
              <Icon name={getStatusIcon(inferredStatus)} size={16} color="#FFFFFF" />
              <Text style={styles.statusText}>{t(`roadmap.status.${inferredStatus}`)}</Text>
            </View>
          </View>

          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>

          <View style={styles.itemMetrics}>
            <View style={styles.metricItem}>
              <Icon name="schedule" size={20} color="#6B7280" />
              <Text style={styles.metricText}>{formatEstimatedTime(item.estimatedTime)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="star" size={20} color="#F59E0B" />
              {/* Sửa lỗi exp_reward thành expReward */}
              <Text style={styles.metricText}>{item.expReward} XP</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="trending-up" size={20} color="#10B981" />
              <Text style={styles.metricText}>{t(`roadmap.difficulty.${item.difficulty}`)}</Text>
            </View>
          </View>

          {/* item.status và item.progress KHÔNG có, nên ta xóa khối progress Container */}

          {item.skills?.length && item.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              <Text style={styles.skillsTitle}>{t("roadmap.skillsYouWillLearn")}:</Text>
              <View style={styles.skillsGrid}>
                {item.skills.map((skill: string, index: number) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Dùng inferredStatus thay cho item.status */}
        {inferredStatus !== "locked" && (
          <View style={styles.actionButtons}>
            {inferredStatus === "available" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton, startMut.isPending && styles.disabledButton]}
                onPress={handleStartItem}
                disabled={startMut.isPending}
              >
                <Icon name="play-arrow" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {startMut.isPending ? t("common.starting") : t("roadmap.startItem")}
                </Text>
              </TouchableOpacity>
            )}
            {/* item.status không có, nên ta ẩn nút Complete */}
            {/*             {inferredStatus === "in_progress" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton, completeMut.isPending && styles.disabledButton]}
                onPress={handleCompleteItem}
                disabled={completeMut.isPending}
              >
                <Icon name="check" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {completeMut.isPending ? t("common.completing") : t("roadmap.markComplete")}
                </Text>
              </TouchableOpacity>
            )} 
            */}
          </View>
        )}

        <View style={styles.tabContainer}>
          {(["overview", "guidance", "resources"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {t(`roadmap.tabs.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {selectedTab === "overview" && (
            <View>
              {/* item.prerequisites KHÔNG có, xóa khối prerequisite container */}
              {/*               {item.prerequisites?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t("roadmap.prerequisites")}</Text>
                  {item.prerequisites.map((prereq: string, index: number) => (
                    <View key={index} style={styles.prerequisiteItem}>
                      <Icon name="check-circle" size={16} color="#10B981" />
                      <Text style={styles.prerequisiteText}>{prereq}</Text>
                    </View>
                  ))}
                </View>
              )}
            */}

              {(nextItems.length > 0 || relatedItems.length > 0) && (
                <>
                  {nextItems.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t("roadmap.nextItems")}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {nextItems.map(renderRelatedItem)}
                      </ScrollView>
                    </View>
                  )}
                  {relatedItems.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t("roadmap.relatedItems")}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {relatedItems.map(renderRelatedItem)}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {selectedTab === "guidance" && (
            <View>
              {guidance.length > 0 ? (
                guidance.map(renderGuidanceStage)
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="help" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{t("roadmap.noGuidanceAvailable")}</Text>
                </View>
              )}
            </View>
          )}

          {selectedTab === "resources" && (
            <View>
              {resources.length > 0 ? (
                resources.map(renderResource)
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="library-books" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{t("roadmap.noResourcesAvailable")}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerRight: { width: 24 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
  itemHeader: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemTypeContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemType: { fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600", textTransform: "capitalize" },
  itemTitle: { fontSize: 24, fontWeight: "bold", color: "#1F2937", marginBottom: 12 },
  itemDescription: { fontSize: 16, color: "#6B7280", lineHeight: 24, marginBottom: 20 },
  itemMetrics: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  progressContainer: { marginBottom: 20 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressLabel: { fontSize: 14, color: "#6B7280" },
  progressPercentage: { fontSize: 14, fontWeight: "600", color: "#3B82F6" },
  progressBar: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 4 },
  skillsContainer: { marginTop: 16 },
  skillsTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  skillText: { fontSize: 12, color: "#3B82F6", fontWeight: "500" },
  actionButtons: { paddingHorizontal: 20, marginBottom: 20 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButton: { backgroundColor: "#10B981" },
  completeButton: { backgroundColor: "#3B82F6" },
  disabledButton: { backgroundColor: "#D1D5DB" },
  actionButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#3B82F6" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },
  tabContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 16 },
  prerequisiteItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  prerequisiteText: { fontSize: 14, color: "#6B7280" },
  guidanceStage: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  guidanceHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  guidanceStageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  guidanceStageNumberText: { fontSize: 14, fontWeight: "bold", color: "#FFFFFF" },
  guidanceStageInfo: { flex: 1 },
  guidanceStageTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  guidanceStageTime: { fontSize: 12, color: "#6B7280" },
  guidanceDescription: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 16 },
  tipsContainer: { backgroundColor: "#FFFBEB", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#FED7AA" },
  tipsTitle: { fontSize: 14, fontWeight: "600", color: "#92400E", marginBottom: 8 },
  tipItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  tipText: { fontSize: 12, color: "#92400E", flex: 1, lineHeight: 16 },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  resourceContent: { flex: 1 },
  resourceTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  resourceDescription: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  resourceDuration: { fontSize: 12, color: "#9CA3AF" },
  relatedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: 200,
  },
  relatedItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  relatedItemContent: { flex: 1 },
  relatedItemTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  relatedItemType: { fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 16, color: "#9CA3AF", marginTop: 12, textAlign: "center" },
});

export default RoadmapItemDetailScreen;