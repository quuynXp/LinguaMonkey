import { useState, useEffect, useRef, useMemo } from "react"
import {
    Animated,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { formatDuration } from "../../utils/timeHelper"

import ScreenLayout from "../../components/layout/ScreenLayout"
import { useUserStore } from "../../stores/UserStore"
import { useGetStudyHistory } from "../../hooks/useUserActivity"
import type { StudySessionResponse, StatsResponse } from "../../types/dto"
import { ActivityType } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

type Tab = "sessions" | "tests" | "stats"
type Period = "week" | "month" | "year"

const ProgressScreen = () => {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const screenWidth = Dimensions.get('window').width

    const user = useUserStore((state) => state.user)
    const userId = user?.userId

    const [currentTab, setCurrentTab] = useState<Tab>("stats")
    const [timeFilter, setTimeFilter] = useState<Period>("month")
    const fadeAnim = useRef(new Animated.Value(1)).current

    const {
        data: studyHistory,
        isLoading,
        error,
        refetch,
    } = useGetStudyHistory(
        userId,
        timeFilter
    )

    // Fallback constants used when data is null (handled by Hook, but extra safe here)
    const studySessions: StudySessionResponse[] = studyHistory?.sessions || []
    const stats: StatsResponse = studyHistory?.stats || {
        totalSessions: 0,
        totalTime: 0,
        totalExperience: 0,
        averageScore: 0
    }

    // --- CHART LOGIC (Aggregation for Visualization) ---
    // Aggregates sessions into last 7 days for the Bar Chart
    const chartData = useMemo(() => {
        const days = 7
        const data = new Array(days).fill(0).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (days - 1 - i))
            return {
                date: d,
                label: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
                value: 0
            }
        })

        // Map sessions to days
        studySessions.forEach(session => {
            const sessionDate = new Date(session.date)
            // Normalize to start of day
            sessionDate.setHours(0, 0, 0, 0)

            const foundDay = data.find(d => {
                const chartDate = new Date(d.date)
                chartDate.setHours(0, 0, 0, 0)
                return chartDate.getTime() === sessionDate.getTime()
            })

            if (foundDay && session.duration) {
                // Convert seconds to minutes for the chart
                foundDay.value += Math.round(session.duration / 60)
            }
        })

        const maxValue = Math.max(...data.map(d => d.value), 10) // Min height 10 mins scale
        return { data, maxValue }
    }, [studySessions])


    useEffect(() => {
        fadeAnim.setValue(0)
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
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
        <TouchableOpacity key={session.id} style={styles.sessionCard} activeOpacity={0.8}>
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

    const renderStatsBlock = ({ label, value, icon, color, bgColor }: {
        label: string,
        value: string | number,
        icon: string,
        color: string,
        bgColor: string
    }) => (
        <View style={[styles.statCard, { backgroundColor: bgColor }]}>
            <View style={styles.statHeader}>
                <View style={[styles.statIconBubble]}>
                    <Icon name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.statValue, { color: color }]}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                </Text>
            </View>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    )

    const renderCustomChart = () => {
        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>{t("history.stats.studyTimeChart", "Thời gian học (phút)")}</Text>
                    <View style={styles.chartLegend}>
                        <View style={[styles.legendDot, { backgroundColor: "#4F46E5" }]} />
                        <Text style={styles.legendText}>Last 7 Days</Text>
                    </View>
                </View>

                <View style={styles.chartBody}>
                    {chartData.data.map((item, index) => {
                        // Calculate height relative to max, max bar height is 120px
                        const height = (item.value / chartData.maxValue) * 120
                        return (
                            <View key={index} style={styles.chartColumn}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, { height: Math.max(height, 4), backgroundColor: height === 0 ? '#E5E7EB' : '#4F46E5' }]} />
                                    {item.value > 0 && (
                                        <Text style={styles.barValue}>{item.value}</Text>
                                    )}
                                </View>
                                <Text style={styles.axisLabel}>{item.label}</Text>
                            </View>
                        )
                    })}
                </View>
            </View>
        )
    }

    const renderStatsTab = () => {
        // We ALWAYS render this, using default zero-values if actual data is missing
        return (
            <View style={styles.statsContainer}>
                <Text style={styles.sectionHeader}>{t("history.stats.summary")}</Text>
                <View style={styles.statsGrid}>
                    {renderStatsBlock({
                        label: t("history.stats.sessions"),
                        value: stats.totalSessions,
                        icon: "assignment",
                        color: "#4F46E5",
                        bgColor: "#EEF2FF"
                    })}
                    {renderStatsBlock({
                        label: t("history.stats.studyTime"),
                        value: formatDuration(stats.totalTime),
                        icon: "schedule",
                        color: "#10B981",
                        bgColor: "#ECFDF5"
                    })}
                    {renderStatsBlock({
                        label: t("history.stats.experience"),
                        value: stats.totalExperience.toLocaleString(),
                        icon: "stars",
                        color: "#F59E0B",
                        bgColor: "#FFFBEB"
                    })}
                    {renderStatsBlock({
                        label: t("history.stats.avgScore"),
                        value: `${Math.round(stats.averageScore)}%`,
                        icon: "trending-up",
                        color: "#EF4444",
                        bgColor: "#FEF2F2"
                    })}
                </View>

                {renderCustomChart()}
            </View>
        )
    }

    const renderContent = () => {
        if (!userId) {
            return (
                <View style={styles.centerContent}>
                    <Icon name="account-circle" size={48} color="#F59E0B" />
                    <Text style={styles.errorText}>
                        {t("common.userNotIdentified", "Không tìm thấy thông tin người dùng.")}
                    </Text>
                </View>
            )
        }

        if (isLoading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>{t("common.loadingData")}</Text>
                </View>
            )
        }

        // Removed the "No Stats" block. Now passes through to render empty/zero data.

        return (
            <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
                {currentTab === "sessions" && (
                    <View style={styles.sessionsList}>
                        {studySessions.length > 0 ? (
                            studySessions.map(renderSessionCard)
                        ) : (
                            <View style={styles.emptySessionContainer}>
                                <Icon name="history" size={48} color="#E5E7EB" />
                                <Text style={styles.emptySessionText}>{t("history.noSessions", "Chưa có lịch sử học tập")}</Text>
                            </View>
                        )}
                    </View>
                )}
                {currentTab === "tests" && (
                    <View style={styles.emptySessionContainer}>
                        <Icon name="assignment" size={48} color="#E5E7EB" />
                        <Text style={styles.emptySessionText}>{t("history.tests.empty", "Chưa có bài kiểm tra nào")}</Text>
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
                        <Text style={styles.exportText}>{t("history.export")}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabContainer}>
                    {[
                        { key: "stats", label: t("history.tabs.stats"), icon: "analytics" },
                        { key: "sessions", label: t("history.tabs.sessions"), icon: "history" },
                        { key: "tests", label: t("history.tabs.tests"), icon: "assignment" },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, currentTab === tab.key && styles.activeTab]}
                            onPress={() => setCurrentTab(tab.key as Tab)}
                            disabled={isLoading}
                        >
                            <Icon name={tab.icon} size={18} color={currentTab === tab.key ? "#FFFFFF" : "#6B7280"} />
                            <Text style={[styles.tabText, currentTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.filterContainer}>
                    {(["week", "month", "year"] as Period[]).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterButton, timeFilter === filter && styles.activeFilter]}
                            onPress={() => setTimeFilter(filter)}
                            disabled={isLoading}
                        >
                            <Text style={[styles.filterText, timeFilter === filter && styles.activeFilterText]}>
                                {t(`history.filters.${filter}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading && !!userId} onRefresh={refetch} tintColor="#4F46E5" />
                    }
                >
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
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 10,
        color: "#6B7280",
        fontSize: 14
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
    exportText: {
        fontSize: 10,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 2
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
    scrollContentContainer: {
        padding: 20,
        paddingBottom: 40
    },
    scrollContent: {
        flexGrow: 1
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
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginLeft: 52,
    },
    statsContainer: {
        gap: 24,
        flex: 1
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    statCard: {
        width: "48%",
        padding: 16,
        borderRadius: 12,
        justifyContent: "space-between",
        minHeight: 110,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    statHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    statIconBubble: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: "#FFFFFF"
    },
    statValue: {
        fontSize: 24,
        fontWeight: "800",
        marginTop: 4,
        color: "#1F2937"
    },
    statLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "700",
        color: "#64748B",
        marginBottom: 12,
        textTransform: "uppercase",
    },
    emptySessionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40
    },
    emptySessionText: {
        marginTop: 12,
        color: "#9CA3AF",
        fontSize: 14
    },
    // Custom Chart Styles
    chartContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    chartLegend: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#6B7280',
    },
    chartBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        paddingBottom: 10,
    },
    chartColumn: {
        alignItems: 'center',
        flex: 1,
    },
    barContainer: {
        height: 120,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
    },
    bar: {
        width: 12,
        borderRadius: 6,
        backgroundColor: '#4F46E5',
    },
    barValue: {
        position: 'absolute',
        top: -20,
        fontSize: 10,
        color: '#4F46E5',
        fontWeight: '600',
    },
    axisLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    }
})

export default ProgressScreen