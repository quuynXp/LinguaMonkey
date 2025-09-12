"use client"

import { useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Alert, TextInput } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useUserStore } from "../../stores/UserStore"
import { useAppStore } from "../../stores/appStore"
import { formatDateTime } from "../../utils/timeHelper"

interface User3DCharacter {
  id: string
  name: string
  type: string
  emoji: string
  level: number
  experience: number
  maxExperience: number
  totalExperience: number
}

interface CoupleInfo {
  isInCouple: boolean
  partnerName?: string
  partnerCharacter?: User3DCharacter
  coupleLevel?: number
  coupleExperience?: number
  relationshipStartDate?: Date
}

interface UserProfile {
  id: string
  name: string
  email: string
  character: User3DCharacter
  couple: CoupleInfo
  stats: {
    totalLessons: number
    totalTime: number
    currentStreak: number
    maxStreak: number
    totalPoints: number
  }
  achievements: Achievement[]
  preferences: {
    notifications: boolean
    soundEffects: boolean
    darkMode: boolean
  }
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  color: string
  unlockedAt: Date
}

const EnhancedUserManagementScreen = ({ navigation }) => {
  const [showCoupleModal, setShowCoupleModal] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [partnerName, setPartnerName] = useState("")

  const fadeAnim = useRef(new Animated.Value(0)).current
  const characterScaleAnim = useRef(new Animated.Value(1)).current

  const { user } = useAppStore()
  const { data: userProfile, isLoading, error } = useUserStore.getState().user?.userId

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    startCharacterAnimation()
  }, [])

  const startCharacterAnimation = () => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(characterScaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(characterScaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
  }

  const getCharacterSize = (level: number) => {
    const baseSize = 80
    const sizeMultiplier = Math.min(level / 10, 3) // Max 3x size at level 30+
    return baseSize + sizeMultiplier * 20
  }

  const handleSendCoupleRequest = () => {
    if (!partnerName.trim()) {
      Alert.alert("Error", "Please enter a partner name")
      return
    }

    // Mock sending couple request
    Alert.alert(
      "Couple Request Sent! 💕",
      `A pairing request has been sent to ${partnerName}. You'll be notified when they accept!`,
      [{ text: "OK", onPress: () => setShowCoupleModal(false) }],
    )
    setPartnerName("")
  }

  const handleBreakCouple = () => {
    Alert.alert("Break Couple Bond", "Are you sure you want to end your couple learning journey?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Break Bond",
        style: "destructive",
        onPress: () => {
          // setUserProfile((prev) =>
          //   prev
          //     ? {
          //         ...prev,
          //         couple: { isInCouple: false },
          //       }
          //     : null,
          // )
          Alert.alert("Couple Bond Ended", "You're now learning solo again.")
        },
      },
    ])
  }

  const renderCharacterDisplay = () => {
    if (!userProfile) return null

    const characterSize = getCharacterSize(userProfile.character.level)
    const experiencePercentage = (userProfile.character.experience / userProfile.character.maxExperience) * 100

    return (
      <View style={styles.characterSection}>
        <TouchableOpacity style={styles.characterContainer} onPress={() => setShowCharacterModal(true)}>
          <Animated.View
            style={[
              styles.character3D,
              {
                width: characterSize,
                height: characterSize,
                transform: [{ scale: characterScaleAnim }],
              },
            ]}
          >
            <Text style={[styles.characterEmoji, { fontSize: characterSize * 0.6 }]}>
              {userProfile.character.emoji}
            </Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{userProfile.character.level}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{userProfile.character.name}</Text>
          <Text style={styles.characterType}>{userProfile.character.type}</Text>

          <View style={styles.experienceContainer}>
            <View style={styles.experienceBar}>
              <View style={[styles.experienceFill, { width: `${experiencePercentage}%` }]} />
            </View>
            <Text style={styles.experienceText}>
              {userProfile.character.experience}/{userProfile.character.maxExperience} XP
            </Text>
          </View>

          <Text style={styles.totalExperience}>Total: {userProfile.character.totalExperience.toLocaleString()} XP</Text>
        </View>
      </View>
    )
  }

  const renderCoupleSection = () => {
    if (!userProfile) return null

    if (!userProfile.couple.isInCouple) {
      return (
        <View style={styles.coupleSection}>
          <View style={styles.coupleSectionHeader}>
            <Icon name="favorite" size={24} color="#EC4899" />
            <Text style={styles.coupleSectionTitle}>Couple Learning</Text>
          </View>
          <Text style={styles.coupleDescription}>
            Learn together with your partner! Send a pairing request to start your couple learning journey.
          </Text>
          <TouchableOpacity style={styles.coupleButton} onPress={() => setShowCoupleModal(true)}>
            <Icon name="person-add" size={20} color="#FFFFFF" />
            <Text style={styles.coupleButtonText}>Find Learning Partner</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.coupleSection}>
        <View style={styles.coupleSectionHeader}>
          <Icon name="favorite" size={24} color="#EC4899" />
          <Text style={styles.coupleSectionTitle}>Learning Together</Text>
          <TouchableOpacity onPress={handleBreakCouple}>
            <Icon name="more-vert" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.coupleInfo}>
          <View style={styles.coupleCharacters}>
            <View style={styles.coupleCharacter}>
              <View style={styles.smallCharacter3D}>
                <Text style={styles.smallCharacterEmoji}>{userProfile.character.emoji}</Text>
              </View>
              <Text style={styles.coupleCharacterName}>You</Text>
              <Text style={styles.coupleCharacterLevel}>Lv.{userProfile.character.level}</Text>
            </View>

            <View style={styles.coupleHeart}>
              <Icon name="favorite" size={24} color="#EC4899" />
            </View>

            <View style={styles.coupleCharacter}>
              <View style={styles.smallCharacter3D}>
                <Text style={styles.smallCharacterEmoji}>{userProfile.couple.partnerCharacter?.emoji}</Text>
              </View>
              <Text style={styles.coupleCharacterName}>{userProfile.couple.partnerName}</Text>
              <Text style={styles.coupleCharacterLevel}>Lv.{userProfile.couple.partnerCharacter?.level}</Text>
            </View>
          </View>

          <View style={styles.coupleStats}>
            <View style={styles.coupleStat}>
              <Text style={styles.coupleStatValue}>Lv.{userProfile.couple.coupleLevel}</Text>
              <Text style={styles.coupleStatLabel}>Couple Level</Text>
            </View>
            <View style={styles.coupleStat}>
              <Text style={styles.coupleStatValue}>
                {Math.floor((Date.now() - userProfile.couple.relationshipStartDate!.getTime()) / (1000 * 60 * 60 * 24))}
              </Text>
              <Text style={styles.coupleStatLabel}>Days Together</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderStatsSection = () => {
    if (!userProfile) return null

    return (
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Learning Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="menu-book" size={24} color="#4F46E5" />
            <Text style={styles.statValue}>{userProfile.stats.totalLessons}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="schedule" size={24} color="#10B981" />
            <Text style={styles.statValue}>{formatDateTime(userProfile.stats.totalTime)}</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="local-fire-department" size={24} color="#EF4444" />
            <Text style={styles.statValue}>{userProfile.stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="stars" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{userProfile.stats.totalPoints.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderAchievementsSection = () => {
    if (!userProfile) return null

    return (
      <View style={styles.achievementsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Achievements")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.achievementsList}>
            {userProfile.achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, { backgroundColor: `${achievement.color}20` }]}>
                  <Icon name={achievement.icon} size={24} color={achievement.color} />
                </View>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  const renderCoupleModal = () => (
    <Modal visible={showCoupleModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.coupleModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Find Learning Partner</Text>
            <TouchableOpacity onPress={() => setShowCoupleModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Enter your partner's name to send a couple learning request. You'll learn together and unlock special couple
            achievements!
          </Text>

          <View style={styles.modalInput}>
            <Icon name="person" size={20} color="#6B7280" />
            <TextInput
              style={styles.partnerNameInput}
              placeholder="Enter partner's name"
              value={partnerName}
              onChangeText={setPartnerName}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCoupleModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSendButton} onPress={handleSendCoupleRequest}>
              <Icon name="favorite" size={16} color="#FFFFFF" />
              <Text style={styles.modalSendText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderCharacterModal = () => (
    <Modal visible={showCharacterModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.characterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Character Details</Text>
            <TouchableOpacity onPress={() => setShowCharacterModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {userProfile && (
            <View style={styles.characterDetails}>
              <View style={styles.characterModalDisplay}>
                <Text style={styles.characterModalEmoji}>{userProfile.character.emoji}</Text>
                <View style={styles.characterModalBadge}>
                  <Text style={styles.characterModalLevel}>{userProfile.character.level}</Text>
                </View>
              </View>

              <Text style={styles.characterModalName}>{userProfile.character.name}</Text>
              <Text style={styles.characterModalType}>{userProfile.character.type}</Text>

              <View style={styles.characterModalStats}>
                <View style={styles.characterModalStat}>
                  <Text style={styles.characterModalStatValue}>{userProfile.character.level}</Text>
                  <Text style={styles.characterModalStatLabel}>Level</Text>
                </View>
                <View style={styles.characterModalStat}>
                  <Text style={styles.characterModalStatValue}>
                    {userProfile.character.totalExperience.toLocaleString()}
                  </Text>
                  <Text style={styles.characterModalStatLabel}>Total XP</Text>
                </View>
              </View>

              <View style={styles.characterModalProgress}>
                <Text style={styles.progressLabel}>Progress to Next Level</Text>
                <View style={styles.characterModalProgressBar}>
                  <View
                    style={[
                      styles.characterModalProgressFill,
                      { width: `${(userProfile.character.experience / userProfile.character.maxExperience) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {userProfile.character.experience}/{userProfile.character.maxExperience} XP
                </Text>
              </View>

              <TouchableOpacity style={styles.characterModalButton}>
                <Icon name="palette" size={16} color="#FFFFFF" />
                <Text style={styles.characterModalButtonText}>Customize Character</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="person" size={48} color="#6B7280" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="error" size={48} color="#6B7280" />
        <Text style={styles.loadingText}>Error loading profile.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Icon name="settings" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {/* User Info */}
          <View style={styles.userInfoSection}>
            <Text style={styles.userName}>{userProfile.name}</Text>
            <Text style={styles.userEmail}>{userProfile.email}</Text>
          </View>

          {/* Character Display */}
          {renderCharacterDisplay()}

          {/* Couple Section */}
          {renderCoupleSection()}

          {/* Stats Section */}
          {renderStatsSection()}

          {/* Achievements Section */}
          {renderAchievementsSection()}

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsList}>
              <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("StudyHistory")}>
                <Icon name="history" size={24} color="#4F46E5" />
                <Text style={styles.quickActionText}>Study History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("Leaderboard")}>
                <Icon name="leaderboard" size={24} color="#10B981" />
                <Text style={styles.quickActionText}>Leaderboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("GroupStudy")}>
                <Icon name="groups" size={24} color="#F59E0B" />
                <Text style={styles.quickActionText}>Group Study</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("EditProfile")}>
                <Icon name="edit" size={24} color="#EF4444" />
                <Text style={styles.quickActionText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {renderCoupleModal()}
      {renderCharacterModal()}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
  userInfoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  characterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  characterContainer: {
    marginBottom: 16,
  },
  character3D: {
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 3,
    borderColor: "#4F46E5",
  },
  characterEmoji: {
    textAlign: "center",
  },
  levelBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  levelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  characterInfo: {
    alignItems: "center",
  },
  characterName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  characterType: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    textTransform: "capitalize",
  },
  experienceContainer: {
    alignItems: "center",
    width: "100%",
  },
  experienceBar: {
    width: 200,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  experienceFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  experienceText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  totalExperience: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  coupleSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coupleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  coupleSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginLeft: 8,
  },
  coupleDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  coupleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4899",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  coupleButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  coupleInfo: {
    alignItems: "center",
  },
  coupleCharacters: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  coupleCharacter: {
    alignItems: "center",
    flex: 1,
  },
  smallCharacter3D: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  smallCharacterEmoji: {
    fontSize: 32,
  },
  coupleCharacterName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  coupleCharacterLevel: {
    fontSize: 10,
    color: "#6B7280",
  },
  coupleHeart: {
    marginHorizontal: 16,
  },
  heartAnimation: {
    width: 40,
    height: 40,
  },
  coupleStats: {
    flexDirection: "row",
    gap: 24,
  },
  coupleStat: {
    alignItems: "center",
  },
  coupleStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EC4899",
    marginBottom: 2,
  },
  coupleStatLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  achievementsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  achievementsList: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  achievementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  coupleModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 350,
    width: "100%",
  },
  characterModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 350,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  coupleModalAnimation: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  partnerNameInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalSendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4899",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  modalSendText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  characterDetails: {
    alignItems: "center",
  },
  characterModalDisplay: {
    position: "relative",
    marginBottom: 16,
  },
  characterModalEmoji: {
    fontSize: 80,
  },
  characterModalBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  characterModalLevel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  characterModalName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  characterModalType: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textTransform: "capitalize",
  },
  characterModalStats: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 20,
  },
  characterModalStat: {
    alignItems: "center",
  },
  characterModalStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  characterModalStatLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  characterModalProgress: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  characterModalProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  characterModalProgressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
  },
  characterModalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  characterModalButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default EnhancedUserManagementScreen
