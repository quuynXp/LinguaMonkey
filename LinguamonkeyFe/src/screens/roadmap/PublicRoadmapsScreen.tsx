import React, { useState, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useTranslation } from 'react-i18next'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useUserStore } from '../../stores/UserStore'

const PublicRoadmapsScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { usePublicRoadmaps, useSuggestions, useAddSuggestion } = useRoadmap()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoadmap, setSelectedRoadmap] = useState(null)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [language, setLanguage] = useState('en')
  const [page, setPage] = useState(0)

  const { data: publicRoadmaps, isLoading } = usePublicRoadmaps(language, page)
  const { data: suggestions } = useSuggestions(selectedRoadmap?.roadmapId)
  const addSuggestionMutation = useAddSuggestion()

  const filteredRoadmaps = publicRoadmaps?.filter(roadmap =>
    roadmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roadmap.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleAddSuggestion = async () => {
    if (suggestionText.trim() && selectedRoadmap) {
      try {
        await addSuggestionMutation.mutateAsync({
          roadmapId: selectedRoadmap.roadmapId,
          itemId: selectedRoadmap.id,
          suggestedOrderIndex: 0,
          reason: suggestionText,
        })
        setSuggestionText('')
        setShowSuggestionModal(false)
      } catch (error) {
        console.error('Error adding suggestion:', error)
      }
    }
  }

  const renderRoadmapCard = ({ item: roadmap }) => (
    <TouchableOpacity
      style={styles.roadmapCard}
      onPress={() => setSelectedRoadmap(roadmap)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{roadmap.title}</Text>
          <Text style={styles.cardCreator}>by {roadmap.creator}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#F59E0B" />
          <Text style={styles.rating}>{roadmap.averageRating.toFixed(1)}</Text>
        </View>
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {roadmap.description}
      </Text>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Icon name="list" size={14} color="#6B7280" />
          <Text style={styles.statText}>{roadmap.totalItems} items</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="lightbulb" size={14} color="#6B7280" />
          <Text style={styles.statText}>{roadmap.suggestionCount} suggestions</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="flag" size={14} color="#6B7280" />
          <Text style={styles.statText}>{roadmap.language}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('RoadmapDetail', { roadmapId: roadmap.roadmapId })}
        >
          <Text style={styles.viewButtonText}>{t('common.view')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestButton}
          onPress={() => {
            setSelectedRoadmap(roadmap)
            setShowSuggestionModal(true)
          }}
        >
          <Icon name="add" size={18} color="#4ECDC4" />
          <Text style={styles.suggestButtonText}>{t('roadmap.suggest')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('roadmap.publicRoadmaps')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  language === lang && styles.languageChipActive
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[
                  styles.languageChipText,
                  language === lang && styles.languageChipTextActive
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
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('roadmap.noRoadmaps')}</Text>
              </View>
            }
          />
        )}

        {/* Load More */}
        {publicRoadmaps && publicRoadmaps.length > 0 && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setPage(page + 1)}
          >
            <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Suggestion Modal */}
      <Modal
        visible={showSuggestionModal}
        transparent
        animationType="slide"
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
                style={[styles.modalButton, styles.submitButton]}
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
    </SafeAreaView>
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
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
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