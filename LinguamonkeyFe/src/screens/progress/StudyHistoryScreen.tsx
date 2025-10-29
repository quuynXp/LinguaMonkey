"use client"

import { useEffect, useRef, useState } from "react"
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useStudyHistory } from "../../hooks/useStudyHistory"
import { formatDuration } from "../../utils/timeHelper"
import { createScaledSheet } from "../../utils/scaledStyles"

interface StudySession {
  id: string
  type: "toeic" | "ielts" | "daily" | "lesson" | "quiz"
  title: string
  date: Date
  duration: number
  score?: number
  maxScore?: number
  experience: number
  skills: string[]
  completed: boolean
}

interface TestResult {
  id: string
  testType: "toeic" | "ielts"
  date: Date
  overallScore: number
  sections: {
    listening?: number
    reading?: number
    writing?: number
    speaking?: number
  }
  targetScore: number
  improvement: number
}

const StudyHistoryScreen = ({ navigation }) => {
  const [currentTab, setCurrentTab] = useState<"sessions" | "tests" | "stats">("sessions")
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("month")
  const fadeAnim = useRef(new Animated.Value(0)).current

  const { data: studyHistory, isLoading, error } = useStudyHistory(timeFilter)
  const studySessions = studyHistory?.sessions || []
  const testResults = studyHistory?.tests || []

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [timeFilter])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "toeic":
        return "assignment"
      case "ielts":
        return "school"
      case "daily":
        return "today"
      case "lesson":
        return "menu-book"
      case "quiz":
        return "quiz"
      default:
        return "book"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "toeic":
        return "#3B82F6"
      case "ielts":
        return "#10B981"
      case "daily":
        return "#F59E0B"
      case "lesson":
        return "#8B5CF6"
      case "quiz":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const renderSessionCard = (session: StudySession) => (
    <TouchableOpacity key={session.id} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(session.type)}20` }]}>
          <Icon name={getTypeIcon(session.type)} size={20} color={getTypeColor(session.type)} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.sessionDate}>
            {session.date.toLocaleDateString()} • {formatDuration(session.duration)}
          </Text>
        </View>
        <View style={styles.sessionStats}>
          {session.score && (
            <Text style={styles.sessionScore}>
              {session.score}/{session.maxScore}
            </Text>
          )}
          <View style={styles.experienceTag}>
            <Icon name="stars" size={12} color="#F59E0B" />
            <Text style={styles.experienceText}>+{session.experience} XP</Text>
          </View>
        </View>
      </View>

      <View style={styles.skillsRow}>
        {session.skills.map((skill, index) => (
          <View key={index} style={styles.skillTag}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
      </View>

      {session.score && session.maxScore && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(session.score / session.maxScore) * 100}%`,
                backgroundColor: getTypeColor(session.type),
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  )

  const renderTestCard = (test: TestResult) => (
    <TouchableOpacity key={test.id} style={styles.testCard}>
      <View style={styles.testHeader}>
        <View style={[styles.testTypeIcon, { backgroundColor: `${getTypeColor(test.testType)}20` }]}>
          <Text style={[styles.testTypeText, { color: getTypeColor(test.testType) }]}>
            {test.testType.toUpperCase()}
          </Text>
        </View>
        <View style={styles.testInfo}>
          <Text style={styles.testDate}>{test.date.toLocaleDateString()}</Text>
          <View style={styles.improvementTag}>
            <Icon
              name={test.improvement > 0 ? "trending-up" : "trending-flat"}
              size={14}
              color={test.improvement > 0 ? "#10B981" : "#6B7280"}
            />
            <Text style={[styles.improvementText, { color: test.improvement > 0 ? "#10B981" : "#6B7280" }]}>
              {test.improvement > 0 ? `+${test.improvement}` : test.improvement}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.overallScore}>
          <Text style={styles.scoreValue}>{test.overallScore}</Text>
          <Text style={styles.scoreLabel}>Overall</Text>
        </View>
        <View style={styles.targetProgress}>
          <Text style={styles.targetLabel}>Target: {test.targetScore}</Text>
          <View style={styles.targetBar}>
            <View style={[styles.targetFill, { width: `${(test.overallScore / test.targetScore) * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.sectionsGrid}>
        {Object.entries(test.sections).map(([section, score]) => (
          <View key={section} style={styles.sectionScore}>
            <Text style={styles.sectionName}>{section}</Text>
            <Text style={styles.sectionValue}>{score}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )

  const renderStatsTab = () => {
    const totalSessions = studyHistory?.sessions.length || 0
    const totalTime = studyHistory?.sessions.reduce((sum, session) => sum + session.duration, 0) || 0
    const totalExperience = studyHistory?.sessions.reduce((sum, session) => sum + session.experience, 0) || 0
    const averageScore =
      studyHistory?.sessions
        .filter((s) => s.score && s.maxScore)
        .reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) /
        studyHistory?.sessions.filter((s) => s.score).length || 0

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="assignment" size={32} color="#4F46E5" />
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="schedule" size={32} color="#10B981" />
            <Text style={styles.statValue}>{formatDuration(totalTime)}</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="stars" size={32} color="#F59E0B" />
            <Text style={styles.statValue}>{totalExperience}</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="trending-up" size={32} color="#EF4444" />
            <Text style={styles.statValue}>{Math.round(averageScore)}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Weekly Progress</Text>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          <View style={styles.achievementsList}>
            <View style={styles.achievementItem}>
              <Icon name="local-fire-department" size={24} color="#EF4444" />
              <Text style={styles.achievementText}>7-day study streak!</Text>
            </View>
            <View style={styles.achievementItem}>
              <Icon name="emoji-events" size={24} color="#F59E0B" />
              <Text style={styles.achievementText}>TOEIC score improved by 50 points</Text>
            </View>
            <View style={styles.achievementItem}>
              <Icon name="star" size={24} color="#8B5CF6" />
              <Text style={styles.achievementText}>Completed 10 lessons this week</Text>
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
        <Text style={styles.headerTitle}>Study History</Text>
        <TouchableOpacity>
          <Icon name="file-download" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: "sessions", label: "Sessions", icon: "history" },
          { key: "tests", label: "Tests", icon: "assignment" },
          { key: "stats", label: "Statistics", icon: "analytics" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, currentTab === tab.key && styles.activeTab]}
            onPress={() => setCurrentTab(tab.key as any)}
          >
            <Icon name={tab.icon} size={18} color={currentTab === tab.key ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.tabText, currentTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Filter */}
      {currentTab !== "stats" && (
        <View style={styles.filterContainer}>
          {[
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "year", label: "This Year" },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, timeFilter === filter.key && styles.activeFilter]}
              onPress={() => setTimeFilter(filter.key as any)}
            >
              <Text style={[styles.filterText, timeFilter === filter.key && styles.activeFilterText]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
          {currentTab === "sessions" && <View style={styles.sessionsList}>{studySessions.map(renderSessionCard)}</View>}

          {currentTab === "tests" && <View style={styles.testsList}>{testResults.map(renderTestCard)}</View>}

          {currentTab === "stats" && renderStatsTab()}
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
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
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  activeFilter: {
    backgroundColor: "#EEF2FF",
  },
  filterText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#4F46E5",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  sessionStats: {
    alignItems: "flex-end",
  },
  sessionScore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  experienceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  experienceText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "600",
  },
  skillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  testsList: {
    gap: 16,
  },
  testCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  testTypeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testTypeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  testInfo: {
    alignItems: "flex-end",
  },
  testDate: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  improvementTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  improvementText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  overallScore: {
    alignItems: "center",
    marginRight: 24,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  targetProgress: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  targetBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  targetFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  sectionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionScore: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  sectionName: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statsContainer: {
    gap: 24,
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
  chartSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  chartAnimation: {
    width: "100%",
    height: 200,
  },
  achievementsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achievementText: {
    fontSize: 14,
    color: "#374151",
  },
})

export default StudyHistoryScreen
