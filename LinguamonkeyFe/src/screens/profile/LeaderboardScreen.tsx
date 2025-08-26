"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

interface User {
  id: string
  name: string
  avatar: string
  level: number
  points: number
  streak: number
  badges: Badge[]
  character: Character3D
  isCouple?: boolean
  partnerName?: string
  rank: number
}

interface Badge {
  id: string
  name: string
  icon: string
  color: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
}

interface Character3D {
  id: string
  name: string
  type: string
  level: number
  experience: number
  maxExperience: number
  modelUrl: string
}

const LeaderboardScreen = ({ navigation }) => {
  const [currentTab, setCurrentTab] = useState<"global" | "friends" | "couples">("global")
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly" | "all">("weekly")
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    loadLeaderboardData()
  }, [currentTab, timeFilter])

  const loadLeaderboardData = () => {
    // Mock data - in real app, fetch from API
    const mockUsers: User[] = [
      {
        id: "1",
        name: "Sarah Chen",
        avatar: "👩‍🦰",
        level: 47,
        points: 15420,
        streak: 28,
        badges: [
          {
            id: "1",
            name: "Streak Master",
            icon: "local-fire-department",
            color: "#EF4444",
            description: "30-day streak",
            rarity: "epic",
          },
          {
            id: "2",
            name: "Quiz Champion",
            icon: "quiz",
            color: "#10B981",
            description: "100 quizzes completed",
            rarity: "rare",
          },
        ],
        character: {
          id: "char1",
          name: "Luna",
          type: "wizard",
          level: 47,
          experience: 8500,
          maxExperience: 10000,
          modelUrl: "wizard_female.glb",
        },
        rank: 1,
      },
      {
        id: "2",
        name: "Alex & Emma",
        avatar: "💑",
        level: 42,
        points: 13890,
        streak: 21,
        badges: [
          {
            id: "3",
            name: "Power Couple",
            icon: "favorite",
            color: "#EC4899",
            description: "Couple learning",
            rarity: "legendary",
          },
        ],
        character: {
          id: "char2",
          name: "Phoenix",
          type: "warrior",
          level: 42,
          experience: 6200,
          maxExperience: 8500,
          modelUrl: "warrior_couple.glb",
        },
        isCouple: true,
        partnerName: "Emma",
        rank: 2,
      },
      // Add more mock users...
    ]

    const mockCurrentUser: User = {
      id: "current",
      name: "You",
      avatar: "🧑‍💻",
      level: 23,
      points: 7650,
      streak: 12,
      badges: [
        { id: "4", name: "Beginner", icon: "star", color: "#F59E0B", description: "First steps", rarity: "common" },
      ],
      character: {
        id: "charCurrent",
        name: "Sage",
        type: "mage",
        level: 23,
        experience: 3200,
        maxExperience: 4000,
        modelUrl: "mage_current.glb",
      },
      rank: 47,
    }

    setUsers(mockUsers)
    setCurrentUser(mockCurrentUser)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#9CA3AF"
      case "rare":
        return "#3B82F6"
      case "epic":
        return "#8B5CF6"
      case "legendary":
        return "#F59E0B"
      default:
        return "#6B7280"
    }
  }

  const getCharacterSize = (level: number) => {
    const baseSize = 40
    const sizeMultiplier = Math.min(level / 10, 3) // Max 3x size at level 30+
    return baseSize + sizeMultiplier * 10
  }

  const renderUserCard = (user: User, index: number) => {
    const isTopThree = index < 3
    const characterSize = getCharacterSize(user.level)

    return (
      <TouchableOpacity key={user.id} style={[styles.userCard, isTopThree && styles.topUserCard]}>
        <View style={styles.rankSection}>
          {isTopThree ? (
            <View
              style={[
                styles.medalContainer,
                { backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32" },
              ]}
            >
              <Icon name="emoji-events" size={24} color="#FFFFFF" />
              <Text style={styles.medalRank}>{index + 1}</Text>
            </View>
          ) : (
            <Text style={styles.rank}>#{index + 1}</Text>
          )}
        </View>

        <View style={styles.characterSection}>
          <View style={[styles.character3D, { width: characterSize, height: characterSize }]}>
            <Text style={[styles.characterEmoji, { fontSize: characterSize * 0.6 }]}>{user.avatar}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{user.level}</Text>
            </View>
          </View>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameSection}>
            <Text style={styles.userName}>{user.name}</Text>
            {user.isCouple && <Icon name="favorite" size={16} color="#EC4899" />}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="stars" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{user.points.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="local-fire-department" size={14} color="#EF4444" />
              <Text style={styles.statText}>{user.streak}</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            {user.badges.slice(0, 3).map((badge) => (
              <View key={badge.id} style={[styles.badgeIcon, { backgroundColor: `${badge.color}20` }]}>
                <Icon name={badge.icon} size={12} color={badge.color} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{user.character.name}</Text>
          <View style={styles.experienceBar}>
            <View
              style={[
                styles.experienceFill,
                { width: `${(user.character.experience / user.character.maxExperience) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.experienceText}>
            {user.character.experience}/{user.character.maxExperience} XP
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderCurrentUserCard = () => {
    if (!currentUser) return null

    return (
      <View style={styles.currentUserCard}>
        <Text style={styles.currentUserTitle}>Your Ranking</Text>
        <View style={styles.currentUserContent}>
          <View style={styles.currentUserRank}>
            <Text style={styles.currentUserRankNumber}>#{currentUser.rank}</Text>
            <Text style={styles.currentUserRankLabel}>out of 1,247</Text>
          </View>

          <View style={styles.currentUserCharacter}>
            <View style={[styles.character3D, { width: 60, height: 60 }]}>
              <Text style={[styles.characterEmoji, { fontSize: 36 }]}>{currentUser.avatar}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{currentUser.level}</Text>
              </View>
            </View>
          </View>

          <View style={styles.currentUserStats}>
            <View style={styles.currentUserStat}>
              <Icon name="stars" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{currentUser.points.toLocaleString()}</Text>
            </View>
            <View style={styles.currentUserStat}>
              <Icon name="local-fire-department" size={14} color="#EF4444" />
              <Text style={styles.statText}>{currentUser.streak}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Badges")}>
          <Icon name="military-tech" size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: "global", label: "Global", icon: "public" },
          { key: "friends", label: "Friends", icon: "people" },
          { key: "couples", label: "Couples", icon: "favorite" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, currentTab === tab.key && styles.activeTab]}
            onPress={() => setCurrentTab(tab.key as any)}
          >
            <Icon name={tab.icon} size={20} color={currentTab === tab.key ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.tabText, currentTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Filter */}
      <View style={styles.timeFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeFilters}>
            {[
              { key: "daily", label: "Today" },
              { key: "weekly", label: "This Week" },
              { key: "monthly", label: "This Month" },
              { key: "all", label: "All Time" },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[styles.timeFilter, timeFilter === filter.key && styles.activeTimeFilter]}
                onPress={() => setTimeFilter(filter.key as any)}
              >
                <Text style={[styles.timeFilterText, timeFilter === filter.key && styles.activeTimeFilterText]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.scrollContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Current User Card */}
          {renderCurrentUserCard()}

          {/* Top Users Animation */}
          <View style={styles.topUsersSection}>
            <Icon name="trophy" size={80} color="#F59E0B" style={styles.trophyAnimation} />
            <Text style={styles.topUsersTitle}>Top Learners</Text>
          </View>

          {/* Leaderboard List */}
          <View style={styles.leaderboardList}>{users.map((user, index) => renderUserCard(user, index))}</View>

          {/* Load More Button */}
          <TouchableOpacity style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load More</Text>
            <Icon name="expand-more" size={20} color="#6B7280" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "#4F46E5",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  timeFilterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  timeFilters: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  timeFilter: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  activeTimeFilter: {
    backgroundColor: "#EEF2FF",
  },
  timeFilterText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTimeFilterText: {
    color: "#4F46E5",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  currentUserCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#4F46E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentUserTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 16,
    textAlign: "center",
  },
  currentUserContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentUserRank: {
    alignItems: "center",
  },
  currentUserRankNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  currentUserRankLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  currentUserCharacter: {
    alignItems: "center",
  },
  currentUserStats: {
    alignItems: "center",
    gap: 8,
  },
  currentUserStat: {
    alignItems: "center",
  },
  currentUserStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  currentUserStatLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  topUsersSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  trophyAnimation: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  topUsersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  leaderboardList: {
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topUserCard: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  rankSection: {
    width: 50,
    alignItems: "center",
  },
  medalContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  medalRank: {
    position: "absolute",
    bottom: -2,
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  rank: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6B7280",
  },
  characterSection: {
    marginRight: 16,
  },
  character3D: {
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  characterEmoji: {
    textAlign: "center",
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  levelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 4,
  },
  badgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  characterInfo: {
    alignItems: "center",
    minWidth: 80,
  },
  characterName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 4,
  },
  experienceBar: {
    width: 60,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 2,
  },
  experienceFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  experienceText: {
    fontSize: 8,
    color: "#6B7280",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    gap: 4,
  },
  loadMoreText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
})

export default LeaderboardScreen
