import { useState, useEffect, useRef } from "react"
import { Animated, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { formatDuration } from "../../utils/timeHelper"

import ScreenLayout from "../../components/layout/ScreenLayout"
import { useUserStore } from "../../stores/UserStore"
import { useAllActivities } from "../../hooks/useUserActivity"
import type { StudySessionResponse, StatsResponse } from "../../types/dto"
import { ActivityType } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

const StudyHistoryScreen = () => {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const userId = useUserStore((state) => state.user?.userId)
    const [currentTab, setCurrentTab] = useState<"sessions" | "tests" | "stats">("sessions")
    const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("month")
    const fadeAnim = useRef(new Animated.Value(0)).current

    const { useGetStudyHistory } = useUserLearningActivities()
    const { data: studyHistory, isLoading, error } = useGetStudyHistory(
        userId || "",
        timeFilter
    )

    const studySessions: StudySessionResponse[] = studyHistory?.sessions || []
    const stats: StatsResponse | null = studyHistory?.stats || null

    useEffect(() => {
        fadeAnim.setValue(0)
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start()
    }, [currentTab, timeFilter])

    const getActivityTypeTranslation = (type: string) => {
        const key = `history.types.${type}`
        const translated = t(key)
        return translated === key ? t("history.types.DEFAULT") : translated
    }

    const getTypeIcon = (type: string) => {
        if (type.includes(ActivityType.COURSE_ENROLL)) return "school"
        if (type.includes(ActivityType.LESSON_COMPLETION)) return "menu-book"
        if (type.includes(ActivityType.QUIZ_COMPLETE)) return "quiz"
        if (type.includes(ActivityType.DAILY_CHALLENGE_COMPLETED)) return "today"
        if (type.includes("EVENT")) return "emoji-events"
        if (type.includes(ActivityType.FLASHCARD)) return "style"
        return "book"
    }

    const getTypeColor = (type: string) => {
        if (type.includes(ActivityType.COURSE_ENROLL)) return "#10B981"
        if (type.includes(ActivityType.LESSON_COMPLETION)) return "#8B5CF6"
        if (type.includes(ActivityType.QUIZ_COMPLETE)) return "#EF4444"
        if (type.includes(ActivityType.DAILY_CHALLENGE_COMPLETED)) return "#F59E0B"
        if (type.includes("EVENT")) return "#3B82F6"
        if (type.includes(ActivityType.FLASHCARD)) return "#6366F1"
        return "#6B7280"
    }

    const renderSessionCard = (session: StudySessionResponse) => (
        <TouchableOpacity key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
                <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(session.type)}20` }]}>
                    <Icon name={getTypeIcon(session.type)} size={20} color={getTypeColor(session.type)} />
                </View>
                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDate}>
                        {new Date(session.date).toLocaleDateString()} • {formatDuration(session.duration)}
                    </Text>
                    <Text style={styles.sessionType}>{getActivityTypeTranslation(session.type)}</Text>
                </View>
                <View style={styles.sessionStats}>
                    {session.score != null && session.maxScore != null && (
                        <Text style={styles.sessionScore}>
                            {t("history.session.score", { score: session.score, maxScore: session.maxScore })}
                        </Text>
                    )}
                    <View style={styles.experienceTag}>
                        <Icon name="stars" size={12} color="#F59E0B" />
                        <Text style={styles.experienceText}>
                            {t("history.session.exp", { experience: session.experience })}
                        </Text>
                    </View>
                </View>
            </View>

            {session.skills && session.skills.length > 0 && (
                <View style={styles.skillsRow}>
                    {session.skills.map((skill, index) => (
                        <View key={index} style={styles.skillTag}>
                            <Text style={styles.skillText}>{skill}</Text>
                        </View>
                    ))}
                </View>
            )}

            {session.score != null && session.maxScore != null && session.maxScore > 0 && (
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

    const renderStatsTab = () => {
        if (!stats) return null

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Icon name="assignment" size={32} color="#4F46E5" />
                        <Text style={styles.statValue}>{stats.totalSessions}</Text>
                        <Text style={styles.statLabel}>{t("history.stats.sessions")}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="schedule" size={32} color="#10B981" />
                        <Text style={styles.statValue}>{formatDuration(stats.totalTime)}</Text>
                        <Text style={styles.statLabel}>{t("history.stats.studyTime")}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="stars" size={32} color="#F59E0B" />
                        <Text style={styles.statValue}>{stats.totalExperience}</Text>
                        <Text style={styles.statLabel}>{t("history.stats.experience")}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="trending-up" size={32} color="#EF4444" />
                        <Text style={styles.statValue}>{Math.round(stats.averageScore)}%</Text>
                        <Text style={styles.statLabel}>{t("history.stats.avgScore")}</Text>
                    </View>
                </View>

                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>{t("history.stats.progressChart")}</Text>
                    <Text style={styles.skillText}>({t("common.chartComponent")})</Text>
                </View>
            </View>
        )
    }

    const renderContent = () => {
        if (!userId) {
            return (
                <View style={styles.centerScreen}>
                    <Icon name="lock-outline" size={48} color="#6B7280" />
                    <Text style={styles.errorText}>{t("common.authRequired")}</Text>
                </View>
            )
        }

        if (isLoading) {
            return (
                <View style={styles.centerScreen}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>{t("common.loading")}</Text>
                </View>
            )
        }

        if (error) {
            return (
                <View style={styles.centerScreen}>
                    <Icon name="error-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{t("common.error")}</Text>
                </View>
            )
        }

        return (
            <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
                {currentTab === "sessions" && (
                    <View style={styles.sessionsList}>
                        {studySessions.length > 0 ? (
                            studySessions.map(renderSessionCard)
                        ) : (
                            <View style={styles.centerScreen}>
                                <Icon name="sentiment-dissatisfied" size={48} color="#6B7280" />
                                <Text style={styles.loadingText}>{t("history.noSessions")}</Text>
                            </View>
                        )}
                    </View>
                )}
                {currentTab === "tests" && (
                    <View style={styles.centerScreen}>
                        <Icon name="build-circle" size={48} color="#6B7280" />
                        <Text style={styles.loadingText}>{t("history.tests.notImplemented")}</Text>
                    </View>
                )}
                {currentTab === "stats" && renderStatsTab()}
            </Animated.View>
        )
    }

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t("history.title")}</Text>
                    <TouchableOpacity>
                        <Icon name="file-download" size={24} color="#6B7280" />
                        <Text style={{ fontSize: 10, color: "#6B7280" }}>{t("history.export")}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabContainer}>
                    {[
                        { key: "sessions", label: t("history.tabs.sessions"), icon: "history" },
                        { key: "tests", label: t("history.tabs.tests"), icon: "assignment" },
                        { key: "stats", label: t("history.tabs.stats"), icon: "analytics" },
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

                {currentTab !== "stats" && (
                    <View style={styles.filterContainer}>
                        {[
                            { key: "week", label: t("history.filters.week") },
                            { key: "month", label: t("history.filters.month") },
                            { key: "year", label: t("history.filters.year") },
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
                    {renderContent()}
                </ScrollView>
            </View>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    centerScreen: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    loadingText: {
        marginTop: 10,
        color: "#6B7280",
    },
    errorText: {
        marginTop: 10,
        color: "#EF4444",
        fontSize: 16,
        textAlign: "center",
        paddingHorizontal: 20,
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
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
    progressFill: {
        height: "100%",
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
    sessionType: {
        fontSize: 12,
        color: "#4F46E5",
        fontWeight: "500",
        marginTop: 2,
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
        color: "#D97706",
        fontWeight: "600",
    },
    skillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 12,
        marginLeft: 52,
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
        marginLeft: 52,
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
    },
})

export default StudyHistoryScreen

function useUserLearningActivities(): { useGetStudyHistory: any } {
    throw new Error("Function not implemented.")
}
