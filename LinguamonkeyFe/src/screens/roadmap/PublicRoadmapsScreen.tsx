import React, { useState, useMemo } from 'react'
import { View, FlatList, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTranslation } from 'react-i18next'
import { useRoadmap } from '../../hooks/useRoadmap'
import ScreenLayout from '../../components/layout/ScreenLayout'
import { createScaledSheet } from '../../utils/scaledStyles'
import { RoadmapPublicResponse } from '../../types/dto'

const PublicRoadmapsScreen = ({ navigation }: any) => {
  const { t } = useTranslation()
  // Updated hook usage to include Community and Official roadmaps
  const { useCommunityRoadmaps, useOfficialRoadmaps, useAssignRoadmap } = useRoadmap()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'official' | 'community'>('all')

  // Fetch both data sources
  const { data: communityRoadmaps, isLoading: isCommLoading } = useCommunityRoadmaps("en", 0, 50)
  const { data: officialRoadmaps, isLoading: isOffLoading } = useOfficialRoadmaps("en", 0, 50)

  const assignMutation = useAssignRoadmap()
  const isLoading = isCommLoading || isOffLoading;

  // Combine and Filter Data
  const filteredRoadmaps = useMemo(() => {
    let combined: RoadmapPublicResponse[] = [];

    if (filterType === 'all' || filterType === 'official') {
      combined = [...combined, ...(officialRoadmaps || [])];
    }
    if (filterType === 'all' || filterType === 'community') {
      combined = [...combined, ...(communityRoadmaps || [])];
    }

    if (!searchQuery.trim()) return combined;

    return combined.filter((roadmap: RoadmapPublicResponse) =>
      roadmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (roadmap.description && roadmap.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [communityRoadmaps, officialRoadmaps, searchQuery, filterType])

  const handleEnroll = async (roadmapId: string, title: string) => {
    try {
      await assignMutation.mutateAsync({ roadmapId });
      Alert.alert(
        t('common.success'),
        t('roadmap.enrolledSuccess', { title }),
        [{ text: 'OK', onPress: () => navigation.navigate('RoadmapScreen') }]
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || "Failed to enroll");
    }
  }

  const renderRating = (rating: number) => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingText}>{rating ? rating.toFixed(1) : 'New'}</Text>
        <Icon name="star" size={16} color="#F59E0B" />
      </View>
    )
  }

  const renderCard = ({ item }: { item: RoadmapPublicResponse }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('RoadmapItemDetailScreen', { roadmapId: item.roadmapId });
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.creatorInfo}>
          {item.creatorAvatar ? (
            <Image source={{ uri: item.creatorAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{(item.creator || 'S').charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.creatorName}>
              {item.type === 'OFFICIAL' ? 'Official Template' : `by ${item.creator}`}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon name="list" size={14} color="#6B7280" />
          <Text style={styles.statText}>{item.totalItems} Items</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="comment" size={14} color="#6B7280" />
          <Text style={styles.statText}>{item.suggestionCount} Reviews</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="bar-chart" size={14} color="#6B7280" />
          <Text style={styles.statText}>{item.difficulty || 'General'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate('RoadmapSuggestionsScreen', { roadmapId: item.roadmapId, isOwner: false })}
        >
          <Text style={styles.reviewBtnText}>{t('roadmap.readReviews')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.enrollBtn, assignMutation.isPending && styles.disabledBtn]}
          onPress={() => handleEnroll(item.roadmapId, item.title)}
          disabled={assignMutation.isPending}
        >
          <Text style={styles.enrollBtnText}>
            {assignMutation.isPending ? t('common.loading') : t('roadmap.startLearning')}
          </Text>
          <Icon name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('roadmap.exploreRoadmaps')}</Text>
        <Icon name="search" size={24} color="#1F2937" />
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('roadmap.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, filterType === 'all' && styles.activeTab]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.tabText, filterType === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filterType === 'official' && styles.activeTab]}
          onPress={() => setFilterType('official')}
        >
          <Text style={[styles.tabText, filterType === 'official' && styles.activeTabText]}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filterType === 'community' && styles.activeTab]}
          onPress={() => setFilterType('community')}
        >
          <Text style={[styles.tabText, filterType === 'community' && styles.activeTabText]}>Community</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <FlatList
          data={filteredRoadmaps}
          renderItem={renderCard}
          keyExtractor={(item) => item.roadmapId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('common.noData')}</Text>
            </View>
          }
        />
      )}
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8 },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E5E7EB' },
  activeTab: { backgroundColor: '#3B82F6' },
  tabText: { color: '#4B5563', fontWeight: '500', fontSize: 13 },
  activeTabText: { color: '#FFF', fontWeight: '600' },

  listContent: { padding: 16 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#0284C7', fontWeight: 'bold', fontSize: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  creatorName: { fontSize: 12, color: '#6B7280' },

  ratingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  ratingText: { fontWeight: 'bold', color: '#92400E', fontSize: 12 },

  description: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#6B7280' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  reviewBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  enrollBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, gap: 6 },
  disabledBtn: { backgroundColor: '#93C5FD' },
  enrollBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  emptyText: { color: '#9CA3AF' }
})

export default PublicRoadmapsScreen