import { useState, useEffect, useRef } from "react"
import {
    Animated,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import ScreenLayout from "../../components/layout/ScreenLayout"
import { useUserStore } from "../../stores/UserStore"
import { useGetStudyHistory } from "../../hooks/useUserActivity"
import type { StudySessionResponse, StatsResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"

type Tab = "sessions" | "tests" | "stats"
type Period = "week" | "month" | "year"

interface AiSuggestionData {
    title?: string;
    summary?: string;
    action_items?: string[];
    course_recommendation?: string | null;
}

const ProgressScreen = () => {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const user = useUserStore((state) => state.user)
    const userId = user?.userId

    const [currentTab, setCurrentTab] = useState<Tab>("stats")
    const [timeFilter, setTimeFilter] = useState<Period>("week")
    const fadeAnim = useRef(new Animated.Value(1)).current

    // 1. ADD: Ref cho ScrollView của biểu đồ để tự động scroll
    const timeChartScrollRef = useRef<ScrollView>(null)
    const accuracyChartScrollRef = useRef<ScrollView>(null)

    const {
        data: studyHistory,
        isLoading,
        refetch,
    } = useGetStudyHistory(userId, timeFilter)

    const studySessions: StudySessionResponse[] = studyHistory?.sessions || []

    const stats: StatsResponse = studyHistory?.stats || {
        totalSessions: 0,
        totalTimeSeconds: 0,
        totalCoins: 0,
        totalExperience: 0,
        lessonsCompleted: 0,
        averageAccuracy: 0,
        averageScore: 0,
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

    // 2. ADD: Effect để tự động scroll tới cuối biểu đồ khi đổi Filter hoặc có Data mới
    useEffect(() => {
        if (!isLoading && stats) {
            // Dùng timeout nhỏ để đảm bảo Layout đã render xong trước khi scroll
            setTimeout(() => {
                timeChartScrollRef.current?.scrollToEnd({ animated: true });
                accuracyChartScrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [isLoading, timeFilter, stats]);

    const formatStudyTime = (seconds: number) => {
        if (seconds < 60 && seconds > 0) {
            return `${seconds}s`
        }
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

    const renderTimeChart = () => {
        const data = stats.timeChartData || []

        if (data.length === 0) {
            return (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>{t("history.stats.studyTime")}</Text>
                    <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
                        No data available for this period
                    </Text>
                </View>
            )
        }

        // 3. FIX: Logic tính Max Scale
        // Mốc chuẩn: 30 phút. 
        // Nếu học 2 phút -> Cột cao 2/30 (thấp). 
        // Nếu học 60 phút -> Cột cao 60/60 (max).
        const TARGET_MINUTES = 30;
        const maxDataVal = Math.max(...data.map(d => d.value), 0);
        // Lấy số lớn hơn giữa Max Data và Mốc chuẩn (30p)
        const maxVal = Math.max(maxDataVal, TARGET_MINUTES);

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{t("history.stats.studyTime")} (mins)</Text>
                <ScrollView
                    ref={timeChartScrollRef} // Gắn ref để auto scroll
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartBody}
                >
                    {data.map((item, index) => {
                        const barHeightPercent = (item.value / maxVal) * 100;
                        return (
                            <View key={`${item.fullDate}-${index}`} style={styles.chartColumn}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, {
                                        height: `${barHeightPercent}%`,
                                        backgroundColor: item.value > 0 ? '#4F46E5' : '#E5E7EB'
                                    }]} />
                                </View>
                                <Text style={styles.axisLabel}>{item.label}</Text>
                            </View>
                        )
                    })}
                </ScrollView>
            </View>
        )
    }

    const renderAccuracyChart = () => {
        const data = stats.accuracyChartData || []

        if (data.length === 0) {
            return (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>{t("history.stats.accuracyProgress")}</Text>
                    <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
                        No data available for this period
                    </Text>
                </View>
            )
        }

        const ACCURACY_COLOR = '#10B981'
        // 4. FIX: Accuracy luôn luôn max là 100
        const maxVal = 100

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartHeaderRow}>
                    <Text style={styles.chartTitle}>{t("history.stats.accuracyProgress")}</Text>
                    <View style={styles.legend}>
                        <View style={[styles.dot, { backgroundColor: ACCURACY_COLOR }]} />
                        <Text style={styles.legendText}>Avg Score %</Text>
                    </View>
                </View>
                <ScrollView
                    ref={accuracyChartScrollRef} // Gắn ref để auto scroll
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartBody}
                >
                    {data.map((item, index) => {
                        // Value accuracy từ 0-100, chia cho 100 rồi nhân 100%
                        const barHeightPercent = (item.value / maxVal) * 100;
                        return (
                            <View key={`${item.fullDate}-${index}`} style={styles.chartColumn}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, {
                                        height: `${barHeightPercent}%`,
                                        backgroundColor: item.value > 0 ? ACCURACY_COLOR : '#E5E7EB'
                                    }]} />
                                </View>
                                <Text style={styles.axisLabel}>{item.label}</Text>
                            </View>
                        )
                    })}
                </ScrollView>
                <View style={styles.chartFooter}>
                    <Text style={styles.footerText}>
                        {t("history.stats.weakestSkill")}: <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>{stats.weakestSkill}</Text>
                    </Text>
                </View>
            </View>
        )
    }

    // ... (Giữ nguyên phần renderAiSuggestion, renderStatsTab, renderSessionCard, return) ...
    // Code dưới đây giữ nguyên như cũ của bạn

    const safeParseSuggestion = (raw: string): AiSuggestionData | string => {
        try {
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            if (typeof parsed === 'object') return parsed;
            return raw;
        } catch (e) {
            return raw;
        }
    }

    const renderAiSuggestion = () => {
        if (!stats.improvementSuggestion) return null;

        const content = safeParseSuggestion(stats.improvementSuggestion);
        const isStructured = typeof content === 'object';

        return (
            <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                    <View style={styles.aiIconContainer}>
                        <Icon name="auto-awesome" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.aiTitle}>
                        {isStructured ? (content as AiSuggestionData).title : t("history.stats.aiCoach")}
                    </Text>
                </View>

                {isStructured ? (
                    <View style={styles.aiContentContainer}>
                        <Text style={styles.aiSummary}>{(content as AiSuggestionData).summary}</Text>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Action Plan:</Text>
                        {(content as AiSuggestionData).action_items?.map((item, idx) => (
                            <View key={idx} style={styles.actionItem}>
                                <Icon name="check-circle-outline" size={16} color="#A5B4FC" style={{ marginTop: 2 }} />
                                <Text style={styles.actionText}>{item}</Text>
                            </View>
                        ))}

                        {(content as AiSuggestionData).course_recommendation && (
                            <View style={styles.recommendationBox}>
                                <Icon name="school" size={16} color="#4F46E5" />
                                <Text style={styles.recommendationText}>
                                    Recommended: <Text style={{ fontWeight: '700' }}>{(content as AiSuggestionData).course_recommendation}</Text>
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text style={styles.aiText}>{content as string}</Text>
                )}
            </View>
        )
    }

    const renderStatsTab = () => {
        if (isLoading) {
            return (
                <View style={styles.statsContainer}>
                    <View style={[styles.aiCard, { backgroundColor: '#E5E7EB' }]}>
                        <View style={{ height: 100 }} />
                    </View>

                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
                                <View style={{ height: 80 }} />
                            </View>
                        ))}
                    </View>

                    <View style={[styles.chartContainer, { backgroundColor: '#F3F4F6', height: 200 }]} />
                    <View style={[styles.chartContainer, { backgroundColor: '#F3F4F6', height: 200 }]} />
                </View>
            );
        }
        return (
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
        );
    };

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

    return (
        <ScreenLayout swipeToTab="Chat">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t("history.title")}</Text>
                </View>

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
    header: { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
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

    aiCard: { backgroundColor: "#4338ca", borderRadius: 16, padding: 20, elevation: 4, shadowColor: "#4338ca", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    aiHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    aiIconContainer: { backgroundColor: "rgba(255,255,255,0.2)", padding: 6, borderRadius: 20 },
    aiTitle: { color: "#FFF", fontWeight: "800", fontSize: 16, flex: 1 },
    aiContentContainer: { gap: 8 },
    aiSummary: { color: "#E0E7FF", fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 8 },
    sectionHeader: { color: "#A5B4FC", fontSize: 12, fontWeight: "700", textTransform: 'uppercase', marginBottom: 4 },
    actionItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
    actionText: { color: "#FFF", fontSize: 14, lineHeight: 20, flex: 1 },
    recommendationBox: { marginTop: 8, backgroundColor: "#EEF2FF", borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    recommendationText: { color: "#4338ca", fontSize: 13, flex: 1 },
    aiText: { color: "#E0E7FF", fontSize: 14, lineHeight: 20 },

    // Charts
    chartContainer: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, elevation: 2 },
    chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    chartTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 16 },
    chartBody: { flexDirection: 'row', alignItems: 'flex-end', height: 160, paddingHorizontal: 8, gap: 20 },
    chartColumn: { alignItems: 'center', width: 32 },
    barContainer: { height: 130, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 16, borderRadius: 6 },
    axisLabel: { marginTop: 8, fontSize: 10, color: "#9CA3AF" },

    legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: '#6B7280' },
    chartFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#F3F4F6' },
    footerText: { fontSize: 13, color: '#4B5563' },

    sessionCard: { flexDirection: "row", backgroundColor: "#FFF", padding: 12, borderRadius: 12, marginBottom: 12 },
    sessionHeader: { flexDirection: "row", alignItems: "center", flex: 1 },
    typeIcon: { padding: 10, borderRadius: 20, marginRight: 12 },
    sessionInfo: { flex: 1, justifyContent: "center" },
    sessionTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    sessionDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    sessionScore: { fontSize: 14, fontWeight: "700", color: "#10B981", alignSelf: "center" },
    emptyText: { textAlign: "center", marginTop: 40, color: "#9CA3AF" }
})

export default ProgressScreen