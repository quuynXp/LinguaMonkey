import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  FlatList,
  Modal
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useRoadmap } from "../../hooks/useRoadmap";
import ScreenLayout from "../../components/layout/ScreenLayout";
import RoadmapTimeline from "../../components/roadmap/RoadmapTimeline";
import { createScaledSheet } from "../../utils/scaledStyles";
import { useUserStore } from "../../stores/UserStore";
import { getAvatarSource } from "../../utils/avatarUtils";
import { RoadmapUserResponse } from "../../types/dto";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const RoadmapScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user, languages } = useUserStore();
  const currentLanguage = languages && languages.length > 0 ? languages[0] : "en";

  const [activeTab, setActiveTab] = useState<'my_roadmap' | 'explore'>('my_roadmap');
  const [exploreType, setExploreType] = useState<'official' | 'community'>('official');
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  const {
    useUserRoadmaps,
    useCommunityRoadmaps,
    useOfficialRoadmaps,
    useSuggestions,
    useCompleteRoadmapItem,
    useAddSuggestion
  } = useRoadmap();

  const { data: userRoadmaps, isLoading: userLoading, refetch: refetchUser } = useUserRoadmaps();

  const {
    data: officialRoadmaps,
    isLoading: officialLoading,
    refetch: refetchOfficial
  } = useOfficialRoadmaps(currentLanguage);

  const {
    data: communityRoadmaps,
    isLoading: communityLoading,
    refetch: refetchCommunity
  } = useCommunityRoadmaps(currentLanguage);

  // --- LOGIC SORTING & FILTERING ---
  const allRoadmaps = userRoadmaps || [];

  const getProgress = (r: RoadmapUserResponse) => (r.totalItems > 0 ? r.completedItems / r.totalItems : 0);

  // Active: < 100%, sorted by progress DESC
  const activeRoadmaps = allRoadmaps
    .filter(r => getProgress(r) < 1)
    .sort((a, b) => getProgress(b) - getProgress(a));

  // Completed: 100%
  const completedRoadmaps = allRoadmaps
    .filter(r => getProgress(r) >= 1)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Find roadmap from ALL lists (so if it becomes 100% completed, we still find it and don't kick user out)
  const currentRoadmap = allRoadmaps.find(r => r.roadmapId === selectedRoadmapId);

  const { data: suggestions, refetch: refetchSuggestions } = useSuggestions(selectedRoadmapId);

  const completeItemMut = useCompleteRoadmapItem();
  const addSuggestionMut = useAddSuggestion();

  useEffect(() => {
    if (activeTab === 'explore') {
      setSelectedRoadmapId(null);
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'my_roadmap' | 'explore') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'my_roadmap' ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const handleRefresh = async () => {
    if (activeTab === 'my_roadmap') {
      await refetchUser();
      if (selectedRoadmapId) refetchSuggestions();
    } else {
      refetchOfficial();
      refetchCommunity();
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      await completeItemMut.mutateAsync({ itemId });
      refetchUser();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddSuggestion = async (itemId: string, text: string) => {
    if (!selectedRoadmapId) return;
    try {
      await addSuggestionMut.mutateAsync({
        roadmapId: selectedRoadmapId,
        itemId,
        suggestedOrderIndex: 0,
        reason: text,
      });
      refetchSuggestions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleBack = () => {
    if (selectedRoadmapId) {
      setSelectedRoadmapId(null);
    } else {
      navigation.goBack();
    }
  };

  const handleSelectRoadmap = (id: string) => {
    setShowCompletedModal(false);
    setSelectedRoadmapId(id);
  };

  const handleNavigateToManage = () => {
    // Navigate to the edit screen without a specific ID to trigger the list view
    navigation.navigate("EditRoadmapScreen", { userId: user?.userId });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack}>
        <Icon name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {selectedRoadmapId ? t('roadmap.detail') : t('roadmap.title')}
      </Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const renderMainTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity style={styles.tabItem} onPress={() => handleTabChange('my_roadmap')}>
        <Text style={[styles.tabText, activeTab === 'my_roadmap' && styles.tabTextActive]}>
          {t('roadmap.myRoadmap')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => handleTabChange('explore')}>
        <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
          {t('roadmap.explore')}
        </Text>
      </TouchableOpacity>
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

  const renderRoadmapItem = ({ item }: { item: RoadmapUserResponse }) => {
    const progress = item.totalItems > 0
      ? Math.round((item.completedItems / item.totalItems) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.roadmapCard}
        onPress={() => handleSelectRoadmap(item.roadmapId)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: progress === 100 ? '#D1FAE5' : '#EFF6FF' }]}>
            <Text style={[styles.statusText, { color: progress === 100 ? '#059669' : '#1D4ED8' }]}>
              {progress === 100 ? 'Completed' : 'In Progress'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.progressText}>{progress}% Complete</Text>
          <View style={styles.continueBtn}>
            <Text style={styles.continueText}>
              {progress === 100 ? 'Review' : 'Continue'}
            </Text>
            <Icon name="arrow-forward" size={16} color="#3B82F6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyRoadmapList = () => {
    if (userLoading) return <ActivityIndicator style={styles.loader} color="#3B82F6" />;

    if (activeRoadmaps.length === 0 && completedRoadmaps.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="map" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>{t('roadmap.noActiveRoadmap')}</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleTabChange('explore')}
          >
            <Text style={styles.ctaButtonText}>{t('roadmap.browsePublic')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Button to open Completed Popup */}
        {completedRoadmaps.length > 0 && (
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowCompletedModal(true)}
          >
            <Icon name="history" size={20} color="#4B5563" />
            <Text style={styles.historyButtonText}>
              {t('roadmap.viewCompleted')} ({completedRoadmaps.length})
            </Text>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Active List */}
        <FlatList
          data={activeRoadmaps}
          keyExtractor={(item) => item.roadmapId}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={userLoading} onRefresh={handleRefresh} />}
          renderItem={renderRoadmapItem}
          ListEmptyComponent={
            <View style={styles.emptyActiveState}>
              <Text style={styles.emptyText}>You have no active roadmaps. Good job!</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderMyRoadmapDetail = () => {
    if (!currentRoadmap) return null;

    const progress = currentRoadmap.totalItems > 0
      ? Math.round((currentRoadmap.completedItems / currentRoadmap.totalItems) * 100)
      : 0;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={userLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.roadmapTitle}>{currentRoadmap.title}</Text>
            <Text style={styles.roadmapStats}>
              {currentRoadmap.completedItems}/{currentRoadmap.totalItems} {t('roadmap.stepsCompleted')}
            </Text>
          </View>
          <View style={[styles.circularProgress, progress === 100 && { borderColor: '#10B981' }]}>
            <Text style={[styles.progressPercent, progress === 100 && { color: '#10B981' }]}>
              {progress}%
            </Text>
          </View>
        </View>

        <RoadmapTimeline
          items={currentRoadmap.items}
          suggestions={suggestions || []}
          isOwner={true}
          onCompleteItem={handleCompleteItem}
          onAddSuggestion={handleAddSuggestion}
        />

        {/* Bottom padding for scroll */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCompletedModal = () => (
    <Modal
      visible={showCompletedModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCompletedModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('roadmap.completedRoadmaps')}</Text>
            <TouchableOpacity onPress={() => setShowCompletedModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={completedRoadmaps}
            keyExtractor={(item) => item.roadmapId}
            contentContainerStyle={{ padding: 16 }}
            renderItem={renderRoadmapItem}
          />
        </View>
      </View>
    </Modal>
  );

  const renderExplore = () => {
    const data = exploreType === 'official' ? officialRoadmaps : communityRoadmaps;
    const isLoading = exploreType === 'official' ? officialLoading : communityLoading;

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subTabContainer}>
          <TouchableOpacity
            style={[styles.subTab, exploreType === 'official' && styles.subTabActive]}
            onPress={() => setExploreType('official')}
          >
            <Text style={[styles.subTabText, exploreType === 'official' && styles.subTabTextActive]}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, exploreType === 'community' && styles.subTabActive]}
            onPress={() => setExploreType('community')}
          >
            <Text style={[styles.subTabText, exploreType === 'community' && styles.subTabTextActive]}>Community</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color="#3B82F6" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.exploreList}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          >
            {data?.map((roadmap) => (
              <TouchableOpacity
                key={roadmap.roadmapId}
                style={styles.exploreCard}
                onPress={() => navigation.navigate('RoadmapSuggestionsScreen', { roadmapId: roadmap.roadmapId, isOwner: false })}
              >
                <View style={styles.exploreHeader}>
                  <Text style={styles.exploreTitle}>{roadmap.title}</Text>
                  <View style={styles.ratingBadge}>
                    <Icon name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{roadmap.averageRating || 'N/A'}</Text>
                  </View>
                </View>

                <Text style={styles.exploreDesc} numberOfLines={2}>{roadmap.description}</Text>

                <View style={styles.exploreFooter}>
                  <View style={styles.creatorInfo}>
                    {exploreType === 'community' && (
                      <Image
                        source={getAvatarSource(roadmap.creatorAvatar)}
                        style={styles.creatorAvatar}
                      />
                    )}
                    <Text style={styles.exploreMetaText}>
                      {exploreType === 'official' ? 'Official' : roadmap.creator}
                    </Text>
                  </View>
                  <View style={styles.exploreMeta}>
                    <Icon name="list" size={14} color="#6B7280" />
                    <Text style={styles.exploreMetaText}>{roadmap.totalItems} Items</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {(!data || data.length === 0) && <Text style={styles.emptyText}>No roadmaps found.</Text>}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <ScreenLayout style={styles.container}>
      {renderHeader()}
      {!selectedRoadmapId && renderMainTabs()}

      <View style={styles.content}>
        {activeTab === 'explore'
          ? renderExplore()
          : selectedRoadmapId
            ? renderMyRoadmapDetail()
            : renderMyRoadmapList()
        }
      </View>

      {/* Floating Action Button for Creating/Editing Roadmaps */}
      {activeTab === 'my_roadmap' && !selectedRoadmapId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNavigateToManage}
        >
          <Icon name="edit" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      {renderCompletedModal()}
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
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', position: 'relative' },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, width: '50%', height: 3, backgroundColor: '#3B82F6', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

  // History Button
  historyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, marginHorizontal: 20, marginTop: 16, borderRadius: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, justifyContent: 'space-between' },
  historyButtonText: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginLeft: 12 },

  // List View Styles
  listContainer: { padding: 20 },
  roadmapCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  progressBarContainer: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  continueText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },

  // Detail View Styles (Timeline)
  progressCard: { margin: 20, padding: 20, backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  progressInfo: { flex: 1 },
  roadmapTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  roadmapStats: { fontSize: 14, color: '#6B7280' },
  circularProgress: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  progressPercent: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },

  // Explore & Subtabs
  subTabContainer: { flexDirection: 'row', padding: 12, gap: 12 },
  subTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E2E8F0' },
  subTabActive: { backgroundColor: '#3B82F6' },
  subTabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  subTabTextActive: { color: '#FFFFFF' },
  content: { flex: 1 },
  loader: { marginTop: 40 },
  exploreList: { padding: 20 },
  exploreCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exploreTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#B45309', marginLeft: 2 },
  exploreDesc: { fontSize: 13, color: '#6B7280', marginVertical: 8, lineHeight: 18 },
  exploreFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatorAvatar: { width: 20, height: 20, borderRadius: 10 },
  exploreMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exploreMetaText: { fontSize: 12, color: '#6B7280' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyActiveState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  ctaButton: { backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 12 },
  ctaButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: SCREEN_HEIGHT * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F1F5F9', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default RoadmapScreen;