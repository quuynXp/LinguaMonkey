import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useRoadmap } from "../../hooks/useRoadmap";
import ScreenLayout from "../../components/layout/ScreenLayout";
import RoadmapTimeline from "../../components/roadmap/RoadmapTimeline";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";

const SCREEN_WIDTH = Dimensions.get("window").width;

const RoadmapScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'my_roadmap' | 'explore'>('my_roadmap');

  // Animation for tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current;

  // --- Hooks ---
  const {
    useUserRoadmaps,
    usePublicRoadmaps,
    useSuggestions,
    useCompleteRoadmapItem,
    useAddSuggestion
  } = useRoadmap();

  // Data for "My Roadmap"
  const {
    data: userRoadmaps,
    isLoading: userLoading,
    refetch: refetchUser
  } = useUserRoadmaps("en"); // Default language

  const myRoadmap = userRoadmaps?.[0]; // Assuming single active roadmap for now

  // Data for "Explore"
  const {
    data: publicRoadmaps,
    isLoading: publicLoading,
    refetch: refetchPublic
  } = usePublicRoadmaps();

  // Suggestions for the active roadmap
  const { data: suggestions } = useSuggestions(myRoadmap?.roadmapId || null);

  // Mutations
  const completeItemMut = useCompleteRoadmapItem();
  const addSuggestionMut = useAddSuggestion();

  // --- Handlers ---
  const handleTabChange = (tab: 'my_roadmap' | 'explore') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'my_roadmap' ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const handleRefresh = async () => {
    if (activeTab === 'my_roadmap') refetchUser();
    else refetchPublic();
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      await completeItemMut.mutateAsync({ itemId });
    } catch (error) {
      console.error("Failed to complete item", error);
    }
  };

  const handleAddSuggestion = async (itemId: string, text: string) => {
    if (!myRoadmap) return;
    try {
      await addSuggestionMut.mutateAsync({
        roadmapId: myRoadmap.roadmapId,
        itemId,
        suggestedOrderIndex: 0,
        reason: text,
      });
    } catch (error) {
      console.error("Failed to add suggestion", error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('roadmap.title')}</Text>
      <TouchableOpacity onPress={() => navigation.navigate("ChatStack")}>
        <Icon name="chat" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabChange('my_roadmap')}
      >
        <Text style={[styles.tabText, activeTab === 'my_roadmap' && styles.tabTextActive]}>
          {t('roadmap.myRoadmap')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabChange('explore')}
      >
        <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
          {t('roadmap.explore')}
        </Text>
      </TouchableOpacity>

      {/* Animated Indicator */}
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            transform: [{
              translateX: tabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCREEN_WIDTH / 2]
              })
            }]
          }
        ]}
      />
    </View>
  );

  const renderMyRoadmap = () => {
    if (userLoading) return <ActivityIndicator style={styles.loader} color="#3B82F6" />;

    if (!myRoadmap) {
      return (
        <View style={styles.emptyState}>
          <Icon name="map" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>{t('roadmap.noActiveRoadmap')}</Text>
          <Text style={styles.emptyDesc}>{t('roadmap.startJourneyDescription')}</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleTabChange('explore')}
          >
            <Text style={styles.ctaButtonText}>{t('roadmap.browsePublic')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('CreateRoadmapScreen')}
          >
            <Text style={[styles.ctaButtonText, styles.secondaryButtonText]}>{t('roadmap.createCustom')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Calculate Progress
    const progress = myRoadmap.totalItems > 0
      ? Math.round((myRoadmap.completedItems / myRoadmap.totalItems) * 100)
      : 0;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={userLoading} onRefresh={handleRefresh} />}
      >
        {/* Progress Header Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.roadmapTitle}>{myRoadmap.title}</Text>
            <Text style={styles.roadmapStats}>
              {myRoadmap.completedItems}/{myRoadmap.totalItems} {t('roadmap.stepsCompleted')}
            </Text>
          </View>
          <View style={styles.circularProgress}>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        </View>

        {/* The Timeline */}
        <RoadmapTimeline
          items={myRoadmap.items}
          suggestions={suggestions || []}
          isOwner={true}
          onCompleteItem={handleCompleteItem}
          onAddSuggestion={handleAddSuggestion}
        />
      </ScrollView>
    );
  };

  const renderExplore = () => {
    if (publicLoading) return <ActivityIndicator style={styles.loader} color="#3B82F6" />;

    return (
      <ScrollView
        contentContainerStyle={styles.exploreList}
        refreshControl={<RefreshControl refreshing={publicLoading} onRefresh={handleRefresh} />}
      >
        {publicRoadmaps?.map((roadmap) => (
          <TouchableOpacity
            key={roadmap.id}
            style={styles.exploreCard}
            onPress={() => navigation.navigate('RoadmapSuggestionsScreen', { roadmapId: roadmap.id, isOwner: false })}
          >
            <View style={styles.exploreHeader}>
              <Text style={styles.exploreTitle}>{roadmap.title}</Text>
              <View style={styles.ratingBadge}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>4.8</Text>
              </View>
            </View>
            <Text style={styles.exploreDesc} numberOfLines={2}>{roadmap.description}</Text>
            <View style={styles.exploreFooter}>
              <View style={styles.exploreMeta}>
                <Icon name="list" size={14} color="#6B7280" />
                <Text style={styles.exploreMetaText}>{roadmap.items?.length || 0} Items</Text>
              </View>
              <Text style={styles.exploreLink}>{t('common.viewDetails')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      <View style={styles.content}>
        {activeTab === 'my_roadmap' ? renderMyRoadmap() : renderExplore()}
      </View>
    </ScreenLayout>
  );
};

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 3,
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  content: { flex: 1 },
  loader: { marginTop: 40 },

  // My Roadmap Styles
  progressCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressInfo: { flex: 1 },
  roadmapTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  roadmapStats: { fontSize: 14, color: '#6B7280' },
  circularProgress: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginVertical: 12 },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  secondaryButton: { backgroundColor: '#EFF6FF' },
  secondaryButtonText: { color: '#3B82F6' },

  // Explore Styles
  exploreList: { padding: 20 },
  exploreCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exploreTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#B45309', marginLeft: 2 },
  exploreDesc: { fontSize: 13, color: '#6B7280', marginVertical: 8, lineHeight: 18 },
  exploreFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  exploreMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exploreMetaText: { fontSize: 12, color: '#6B7280' },
  exploreLink: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
});

export default RoadmapScreen;