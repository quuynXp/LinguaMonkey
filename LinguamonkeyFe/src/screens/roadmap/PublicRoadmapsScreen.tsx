import React, { useState, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal, Alert } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTranslation } from 'react-i18next'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useUserStore } from '../../stores/UserStore'
import { Roadmap } from '../../types/entity'
import ScreenLayout from '../../components/layout/ScreenLayout'
// import { RoadmapResponse } from '../../types/dto' // Import DTO type


const PublicRoadmapsScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { usePublicRoadmaps, useAddSuggestion } = useRoadmap()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')


  const { data: rawPublicRoadmaps, isLoading } = usePublicRoadmaps()

  const addSuggestionMutation = useAddSuggestion()

  const publicRoadmaps: Roadmap[] = useMemo(() => {
    return (rawPublicRoadmaps as unknown as Roadmap[]) || [];
  }, [rawPublicRoadmaps]);

  const filteredRoadmaps = useMemo(() =>
    publicRoadmaps.filter((roadmap: Roadmap) =>
      roadmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roadmap.description?.toLowerCase().includes(searchQuery.toLowerCase() || "")
    )
    , [publicRoadmaps, searchQuery])

  const handleAddSuggestion = useCallback(async () => {
    if (!suggestionText.trim() || !selectedRoadmap) {
      Alert.alert(t('common.error'), t('roadmap.suggestionEmpty'));
      return;
    }

    try {
      await addSuggestionMutation.mutateAsync({
        roadmapId: selectedRoadmap.roadmapId,
        itemId: selectedRoadmap.items?.[0]?.itemId || selectedRoadmap.roadmapId,
        suggestedOrderIndex: 0,
        reason: suggestionText,
      })
      setSuggestionText('')
      setShowSuggestionModal(false)
      Alert.alert(t('common.success'), t('roadmap.suggestionAdded'));
    } catch (error: any) {
      console.error('Error adding suggestion:', error)
      Alert.alert(t('common.error'), error.message || t('errors.unknown'));
    }
  }, [suggestionText, selectedRoadmap, addSuggestionMutation, t])

  const renderRoadmapCard = useCallback(({ item: roadmap }) => {
    const r = roadmap as Roadmap;

    const displayCreator = t('common.community');
    const displayRating = 'N/A';
    const displayTotalItems = r.totalItems || 0;
    const displayLanguage = r.languageCode || 'N/A';

    return (
      <TouchableOpacity
        style={styles.roadmapCard}
        onPress={() => navigation.navigate('RoadmapDetailScreen', { roadmapId: r.roadmapId })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardCreator}>by {displayCreator}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#9CA3AF" />
            <Text style={styles.rating}>{displayRating}</Text>
          </View>
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {r.description}
        </Text>

        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <Icon name="list" size={14} color="#6B7280" />
            <Text style={styles.statText}>{displayTotalItems} {t('roadmap.items')}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="flag" size={14} color="#6B7280" />
            <Text style={styles.statText}>{displayLanguage.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('RoadmapDetailScreen', { roadmapId: r.roadmapId })}
          >
            <Text style={styles.viewButtonText}>{t('common.view')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestButton}
            onPress={() => {
              setSelectedRoadmap(r)
              setShowSuggestionModal(true)
            }}
          >
            <Icon name="add" size={18} color="#4ECDC4" />
            <Text style={styles.suggestButtonText}>{t('roadmap.suggest')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }, [navigation, t])

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('roadmap.publicRoadmaps')}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder={t('common.search')}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageFilter}>
            {['en', 'vi', 'ja', 'ko', 'es'].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageChip,
                  // Language filter không hoạt động, giữ UI hiển thị mặc định
                  lang === (user?.nativeLanguageCode || 'en') && styles.languageChipActive
                ]}
                // setLanguage(lang) đã bị xóa
                onPress={() => Alert.alert(t('common.info'), t('roadmap.filterNotSupported'))}
              >
                <Text style={[
                  styles.languageChipText,
                  lang === (user?.nativeLanguageCode || 'en') && styles.languageChipTextActive
                ]}>
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Roadmaps List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={filteredRoadmaps}
            renderItem={renderRoadmapCard}
            keyExtractor={(item) => item.roadmapId}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('roadmap.noRoadmaps')}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Suggestion Modal */}
      <Modal
        visible={showSuggestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuggestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('roadmap.addSuggestion')}</Text>
              <TouchableOpacity onPress={() => setShowSuggestionModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedRoadmap?.title}
            </Text>

            <TextInput
              placeholder={t('roadmap.suggestionPlaceholder')}
              style={styles.suggestionInput}
              value={suggestionText}
              onChangeText={setSuggestionText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSuggestionModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, addSuggestionMutation.isPending && styles.disabledLoadMoreButton]}
                onPress={handleAddSuggestion}
                disabled={addSuggestionMutation.isPending}
              >
                {addSuggestionMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  languageFilter: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  languageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  languageChipActive: {
    backgroundColor: '#4ECDC4',
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  languageChipTextActive: {
    color: '#fff',
  },
  roadmapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardCreator: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestButton: {
    flex: 1,
    backgroundColor: '#E0F7F4',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ECDC4',
    marginLeft: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  loadMoreButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 0,
  },
  disabledLoadMoreButton: {
    backgroundColor: '#9CA3AF',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  suggestionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    maxHeight: 120,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#4ECDC4',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

export default PublicRoadmapsScreen