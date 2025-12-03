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
    const user = useUserStore((state) => state.user)
    const userId = user?.userId

    const [currentTab, setCurrentTab] = useState<Tab>("stats")
    const [timeFilter, setTimeFilter] = useState<Period>("week")
    const fadeAnim = useRef(new Animated.Value(1)).current

    const {
        data: studyHistory,
        isLoading,
        refetch,
    } = useGetStudyHistory(userId, timeFilter)

    const studySessions: StudySessionResponse[] = studyHistory?.sessions || []
    
    // Default safe stats
    // FIX 1: Added totalExperience and averageScore to match StatsResponse interface
    const stats: StatsResponse = studyHistory?.stats || {
        totalSessions: 0,
        totalTimeSeconds: 0,
        totalCoins: 0,
        totalExperience: 0, // Added
        lessonsCompleted: 0,
        averageAccuracy: 0,
        averageScore: 0,    // Added
        timeGrowthPercent: 0,
        accuracyGrowthPercent: 0,
        coinsGrowthPercent: 0,
        weakestSkill: "NONE",
        improvementSuggestion: "",
        timeChartData: [],
        accuracyChartData: []
    }

    useEffect(() => {
        fadeAnim.setValue(0)
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [currentTab, timeFilter])

    const formatStudyTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        if (hours >= 1) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    const renderGrowthBadge = (percent: number) => {
        const isPositive = percent >= 0;
        return (
            <View style={[styles.growthBadge, { backgroundColor: isPositive ? "#DCFCE7" : "#FEE2E2" }]}>
                <Icon name={isPositive ? "trending-up" : "trending-down"} size={14} color={isPositive ? "#16A34A" : "#DC2626"} />
                <Text style={[styles.growthText, { color: isPositive ? "#16A34A" : "#DC2626" }]}>
                    {Math.abs(percent).toFixed(1)}%
                </Text>
            </View>
        )
    }

    const renderStatCard = (title: string, value: string | number, icon: string, color: string, growth?: number, subLabel?: string) => (
        <View style={styles.statCard}>
            <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                    <Icon name={icon} size={20} color={color} />
                </View>
                {growth !== undefined && renderGrowthBadge(growth)}
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{title}</Text>
            {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
        </View>
    )

    // Manual Bar Chart for Time
    const renderTimeChart = () => {
        const data = stats.timeChartData || []
        const maxVal = Math.max(...data.map(d => d.value), 1) // Avoid div by 0

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{t("history.stats.studyTime")}</Text>
                <View style={styles.chartBody}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.chartColumn}>
                            <View style={styles.barContainer}>
                                <View style={[styles.bar, { 
                                    height: `${(item.value / maxVal) * 100}%`,
                                    backgroundColor: item.value > 0 ? '#4F46E5' : '#E5E7EB'
                                }]} />
                            </View>
                            <Text style={styles.axisLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        )
    }

    // Manual Lollipop/Line-ish Chart for Accuracy
    const renderAccuracyChart = () => {
        const data = stats.accuracyChartData || []
        
        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartHeaderRow}>
                    <Text style={styles.chartTitle}>{t("history.stats.accuracyProgress")}</Text>
                    <View style={styles.legend}>
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.legendText}>Avg Score %</Text>
                    </View>
                </View>
                <View style={styles.chartBody}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.chartColumn}>
                            <View style={styles.lineChartContainer}>
                                {/* Line stick */}
                                <View style={[styles.lineStick, { 
                                    height: `${item.value}%`, 
                                    backgroundColor: item.value > 0 ? '#10B981' : 'transparent' 
                                }]} />
                                {/* Dot */}
                                {item.value > 0 && (
                                    <View style={[styles.lineDot, { bottom: `${item.value}%` }]}>
                                        <Text style={styles.dotValue}>{Math.round(item.value)}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.axisLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.chartFooter}>
                    <Text style={styles.footerText}>
                        {t("history.stats.weakestSkill")}: <Text style={{fontWeight: 'bold', color: '#EF4444'}}>{stats.weakestSkill}</Text>
                    </Text>
                </View>
            </View>
        )
    }

    const renderAiSuggestion = () => {
        if (!stats.improvementSuggestion) return null;
        return (
            <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                    <Icon name="auto-awesome" size={20} color="#FFFFFF" />
                    <Text style={styles.aiTitle}>{t("history.stats.aiCoach")}</Text>
                </View>
                <Text style={styles.aiText}>{stats.improvementSuggestion}</Text>
            </View>
        )
    }

    const renderStatsTab = () => (
        <View style={styles.statsContainer}>
            {renderAiSuggestion()}

            <View style={styles.statsGrid}>
                {renderStatCard(
                    t("history.stats.studyTime"), 
                    formatStudyTime(stats.totalTimeSeconds), 
                    "schedule", 
                    "#4F46E5", 
                    stats.timeGrowthPercent
                )}
                {renderStatCard(
                    t("history.stats.accuracy"), 
                    `${Math.round(stats.averageAccuracy)}%`, 
                    "check-circle", 
                    "#10B981", 
                    stats.accuracyGrowthPercent
                )}
                {renderStatCard(
                    t("history.stats.coins"), 
                    stats.totalCoins.toLocaleString(), 
                    "monetization-on", 
                    "#F59E0B", 
                    stats.coinsGrowthPercent
                )}
                {renderStatCard(
                    t("history.stats.lessons"), 
                    stats.lessonsCompleted, 
                    "menu-book", 
                    "#EC4899",
                    undefined,
                    "Completed"
                )}
            </View>

            {renderTimeChart()}
            {renderAccuracyChart()}
        </View>
    )

    const getTypeIcon = (type: string) => "book" 
    const getTypeColor = (type: string) => "#6B7280"

    const renderSessionCard = (session: StudySessionResponse) => (
       <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
                <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(session.type)}20` }]}>
                    <Icon name={getTypeIcon(session.type)} size={20} color={getTypeColor(session.type)} />
                </View>
                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDate}>
                        {new Date(session.date).toLocaleDateString()} • {formatStudyTime(session.duration)}
                    </Text>
                </View>
                <Text style={styles.sessionScore}>{session.score ? `${session.score} pts` : ''}</Text>
            </View>
       </View>
    )

    // Main Render
    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t("history.title")}</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    {[{ key: "stats", icon: "analytics" }, { key: "sessions", icon: "history" }].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, currentTab === tab.key && styles.activeTab]}
                            onPress={() => setCurrentTab(tab.key as Tab)}
                        >
                            <Icon name={tab.icon} size={18} color={currentTab === tab.key ? "#FFF" : "#6B7280"} />
                            <Text style={[styles.tabText, currentTab === tab.key && styles.activeTabText]}>
                                {t(`history.tabs.${tab.key}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Filter */}
                <View style={styles.filterContainer}>
                    {["week", "month", "year"].map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterButton, timeFilter === filter && styles.activeFilter]}
                            onPress={() => setTimeFilter(filter as Period)}
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
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#4F46E5" />}
                >
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
                    ) : (
                        <Animated.View style={{ opacity: fadeAnim }}>
                            {currentTab === "stats" ? renderStatsTab() : (
                                <View style={{ gap: 12 }}>
                                    {studySessions.map(renderSessionCard)}
                                    {studySessions.length === 0 && (
                                        <Text style={styles.emptyText}>{t("history.noSessions")}</Text>
                                    )}
                                </View>
                            )}
                        </Animated.View>
                    )}
                </ScrollView>
            </View>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: { padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
    tabContainer: { flexDirection: "row", padding: 16, backgroundColor: "#FFF", gap: 12 },
    tab: { flex: 1, flexDirection: "row", padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6" },
    activeTab: { backgroundColor: "#4F46E5" },
    tabText: { fontWeight: "600", color: "#6B7280" },
    activeTabText: { color: "#FFF" },
    filterContainer: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    filterButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#E5E7EB" },
    activeFilter: { backgroundColor: "#EEF2FF" },
    filterText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
    activeFilterText: { color: "#4F46E5" },
    content: { flex: 1 },
    scrollContentContainer: { padding: 16, paddingBottom: 40 },
    statsContainer: { gap: 20 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
    statCard: { width: "48%", backgroundColor: "#FFF", padding: 16, borderRadius: 12, elevation: 2, shadowOpacity: 0.05 },
    statTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    statIcon: { padding: 8, borderRadius: 8 },
    growthBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
    growthText: { fontSize: 10, fontWeight: "700" },
    statValue: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
    statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
    statSubLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
    
    // AI Card
    aiCard: { backgroundColor: "#4F46E5", borderRadius: 12, padding: 16, elevation: 4 }, 
    aiHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    aiTitle: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    aiText: { color: "#E0E7FF", fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

    // Charts
    chartContainer: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, elevation: 2 },
    chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    chartTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 16 },
    chartBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160 },
    chartColumn: { flex: 1, alignItems: 'center' },
    barContainer: { height: 130, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 12, borderRadius: 6 },
    axisLabel: { marginTop: 8, fontSize: 10, color: "#9CA3AF" },
    
    // Line Chart Custom
    lineChartContainer: { height: 130, width: '100%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
    lineStick: { width: 2, borderRadius: 1, opacity: 0.5 },
    lineDot: { position: 'absolute', width: 24, height: 16, borderRadius: 8, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: -8 },
    dotValue: { color: '#FFF', fontSize: 8, fontWeight: '700' },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: '#6B7280' },
    chartFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6' },
    footerText: { fontSize: 13, color: '#4B5563' },

    // Session
    sessionCard: { flexDirection: "row", backgroundColor: "#FFF", padding: 12, borderRadius: 12, marginBottom: 12 },
    // FIX 2: Added sessionHeader
    sessionHeader: { flexDirection: "row", alignItems: "center", flex: 1 },
    typeIcon: { padding: 10, borderRadius: 20, marginRight: 12 },
    sessionInfo: { flex: 1, justifyContent: "center" },
    sessionTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    sessionDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    sessionScore: { fontSize: 14, fontWeight: "700", color: "#10B981", alignSelf: "center" },
    emptyText: { textAlign: "center", marginTop: 40, color: "#9CA3AF" }
})

export default ProgressScreen