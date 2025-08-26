"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRoadmap } from "../../hooks/useRoadmap"
import { useUsers } from "../../hooks/useUsers"
import type { RoadmapItem, RoadmapMilestone } from "../../types/api"

const { width } = Dimensions.get("window")

const RoadmapScreen = ({ navigation, route }: any) => {
  const { languageCode } = route.params || {}
  const { t } = useTranslation()
  
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'completed'>('all')
  const [showMilestones, setShowMilestones] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // API hooks
  const { useUserRoadmap } = useRoadmap()
  const { useCurrentUser } = useUsers()

  const { data: roadmap, isLoading, error, mutate: mutateRoadmap } = useUserRoadmap(languageCode)
  const { data: currentUser } = useCurrentUser()

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await mutateRoadmap()
    setRefreshing(false)
  }

  const getFilteredItems = () => {
    if (!roadmap?.items) return []
    
    switch (selectedFilter) {
      case 'available':
        return roadmap.items.filter(item => item.status === 'available' || item.status === 'in_progress')
      case 'completed':
        return roadmap.items.filter(item => item.status === 'completed')
      default:
        return roadmap.items
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981'
      case 'in_progress':
        return '#3B82F6'
      case 'available':
        return '#F59E0B'
      case 'locked':
        return '#9CA3AF'
      default:
        return '#6B7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle'
      case 'in_progress':
        return 'play-circle-filled'
      case 'available':
        return 'radio-button-unchecked'
      case 'locked':
        return 'lock'
      default:
        return 'help'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'school'
      case 'course':
        return 'book'
      case 'series':
        return 'playlist-play'
      case 'milestone':
        return 'flag'
      case 'assessment':
        return 'quiz'
      default:
        return 'circle'
    }
  }

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}${t('common.minutes')}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours}${t('common.hours')}`
    }
    return `${hours}${t('common.hours')} ${remainingMinutes}${t('common.minutes')}`
  }

  const handleItemPress = (item: RoadmapItem) => {
    if (item.status === 'locked') {
      Alert.alert(
        t('roadmap.lockedItem'),
        t('roadmap.lockedItemMessage'),
        [{ text: t('common.ok') }]
      )
      return
    }

    navigation.navigate('RoadmapItemDetail', { 
      itemId: item.id,
      roadmapId: roadmap?.roadmap_id 
    })
  }

  const renderProgressBar = () => {
    if (!roadmap) return null

    const progressPercentage = roadmap.total_items > 0 
      ? (roadmap.completed_items / roadmap.total_items) * 100 
      : 0

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>{t('roadmap.overallProgress')}</Text>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${progressPercentage}%`],
                }),
              },
            ]}
          />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.progressStat}>
            {roadmap.completed_items} / {roadmap.total_items} {t('roadmap.itemsCompleted')}
          </Text>
          <Text style={styles.progressStat}>
            {t('roadmap.estimatedTime')}: {roadmap.estimated_completion_time} {t('common.days')}
          </Text>
        </View>
      </View>
    )
  }

  const renderRoadmapItem = (item: RoadmapItem, index: number) => {
    const isEven = index % 2 === 0
    
    return (
      <Animated.View
        key={item.id}
        style={[
          styles.roadmapItemContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Connection Line */}
        {index > 0 && (
          <View style={[styles.connectionLine, isEven ? styles.connectionLineLeft : styles.connectionLineRight]} />
        )}
        
        {/* Item Card */}
        <TouchableOpacity
          style={[
            styles.roadmapItem,
            isEven ? styles.roadmapItemLeft : styles.roadmapItemRight,
            { borderLeftColor: getStatusColor(item.status) },
          ]}
          onPress={() => handleItemPress(item)}
          disabled={item.status === 'locked'}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemTypeContainer}>
              <Icon name={getTypeIcon(item.type)} size={20} color={getStatusColor(item.status)} />
              <Text style={[styles.itemType, { color: getStatusColor(item.status) }]}>
                {t(`roadmap.types.${item.type}`)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Icon name={getStatusIcon(item.status)} size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.itemDetails}>
            <View style={styles.itemDetailRow}>
              <Icon name="schedule" size={16} color="#6B7280" />
              <Text style={styles.itemDetailText}>
                {formatEstimatedTime(item.estimatedTime)}
              </Text>
            </View>
            <View style={styles.itemDetailRow}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.itemDetailText}>
                {item.exp_reward} XP
              </Text>
            </View>
          </View>

          {item.status === 'in_progress' && (
            <View style={styles.progressIndicator}>
              <View style={styles.progressIndicatorBar}>
                <View 
                  style={[
                    styles.progressIndicatorFill, 
                    { width: `${item.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressIndicatorText}>{item.progress}%</Text>
            </View>
          )}

          {item.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              {item.skills.slice(0, 3).map((skill, skillIndex) => (
                <View key={skillIndex} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {item.skills.length > 3 && (
                <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Level Indicator */}
        <View style={[styles.levelIndicator, isEven ? styles.levelIndicatorRight : styles.levelIndicatorLeft]}>
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
      </Animated.View>
    )
  }

  const renderMilestone = (milestone: RoadmapMilestone) => (
    <View key={milestone.milestone_id} style={styles.milestoneContainer}>
      <View style={[styles.milestoneIcon, { backgroundColor: getStatusColor(milestone.status) }]}>
        <Icon name="flag" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.milestoneContent}>
        <Text style={styles.milestoneTitle}>{milestone.title}</Text>
        <Text style={styles.milestoneDescription}>{milestone.description}</Text>
        <Text style={styles.milestoneLevel}>
          {t('roadmap.level')} {milestone.level}
        </Text>
        {milestone.status === 'completed' && milestone.completed_at && (
          <Text style={styles.milestoneCompletedDate}>
            {t('roadmap.completedOn')} {new Date(milestone.completed_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  )

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('roadmap.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{t('errors.loadRoadmapFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('roadmap.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <LottieView
            source={require("../../assets/animations/loading.json")}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>{t('roadmap.loadingRoadmap')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const filteredItems = getFilteredItems()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('roadmap.title')}</Text>
        <TouchableOpacity onPress={() => setShowMilestones(true)}>
          <Icon name="flag" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Overview */}
        {renderProgressBar()}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'available', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {t(`roadmap.filters.${filter}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Roadmap Items */}
        <View style={styles.roadmapContainer}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => renderRoadmapItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="map" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t('roadmap.noItemsFound')}</Text>
              <Text style={styles.emptySubtext}>{t('roadmap.tryDifferentFilter')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Milestones Modal */}
      <Modal
        visible={showMilestones}
        animationType="slide"
        onRequestClose={() => setShowMilestones(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMilestones(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('roadmap.milestones')}</Text>
            <View style={styles.headerRight} />
          </View>
          <ScrollView style={styles.modalContent}>
            {roadmap?.milestones?.map(renderMilestone)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
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
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingAnimation: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
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
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  progressContainer: {
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
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStat: {
    fontSize: 14,
    color: "#6B7280",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#3B82F6",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  roadmapContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  roadmapItemContainer: {
    position: "relative",
    marginBottom: 40,
  },
  connectionLine: {
    position: "absolute",
    top: -20,
    width: 2,
    height: 20,
    backgroundColor: "#D1D5DB",
  },
  connectionLineLeft: {
    left: 40,
  },
  connectionLineRight: {
    right: 40,
  },
  roadmapItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roadmapItemLeft: {
    marginRight: 60,
  },
  roadmapItemRight: {
    marginLeft: 60,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemType: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemDetailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  progressIndicatorBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
  },
  progressIndicatorFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  progressIndicatorText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 10,
    color: "#3B82F6",
    fontWeight: "500",
  },
  moreSkills: {
    fontSize: 10,
    color: "#9CA3AF",
    alignSelf: "center",
  },
  levelIndicator: {
    position: "absolute",
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  levelIndicatorLeft: {
    left: -16,
  },
  levelIndicatorRight: {
    right: -16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#D1D5DB",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  milestoneContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  milestoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  milestoneLevel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  milestoneCompletedDate: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
})

export default RoadmapScreen
