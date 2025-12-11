import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import { createScaledSheet } from "../../utils/scaledStyles";
import type { CourseVersionReviewResponse } from "../../types/dto";

const CourseManagerScreen = () => {
    const { t } = useTranslation();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();

    // Defensive: Fallback to empty object to prevent crash if params is undefined
    const { courseId } = route.params || {};
    const user = useUserStore((state) => state.user);

    const [revenueFilter, setRevenueFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

    // Validate courseId immediately
    useEffect(() => {
        if (!courseId) {
            console.error("CourseManagerScreen Error: courseId is missing in route.params", route.params);
            Alert.alert(
                "Error",
                "Course ID is missing. Please go back and try again.",
                [{ text: "Go Back", onPress: () => navigation.goBack() }]
            );
        }
    }, [courseId, navigation, route.params]);

    const {
        useCourse,
        useReviews,
        useCourseStats,
    } = useCourses();

    // Only run hooks if courseId exists to avoid unnecessary API calls
    const { data: course, isLoading: courseLoading } = useCourse(courseId);
    const { data: reviewsData, isLoading: reviewsLoading } = useReviews({ courseId });
    const { data: statsData, isLoading: statsLoading } = useCourseStats(courseId);

    const currentVersion = course?.latestPublicVersion;
    const isDraft = currentVersion?.status === "DRAFT";

    const handleNavigateToEdit = () => {
        if (!courseId) return;
        navigation.navigate("EditCourseScreen", { courseId });
    };

    const handlePreview = () => {
        if (!courseId) return;
        navigation.navigate("CourseDetailsScreen", { courseId });
    };

    const renderDashboardSection = () => {
        if (statsLoading) return <ActivityIndicator style={styles.loadingSection} size="large" />;

        let displayRevenue = 0;
        switch (revenueFilter) {
            case 'day': displayRevenue = statsData?.revenueToday || 0; break;
            case 'week': displayRevenue = statsData?.revenueWeek || 0; break;
            case 'month': displayRevenue = statsData?.revenueMonth || 0; break;
            case 'year': displayRevenue = statsData?.revenueYear || 0; break;
        }

        const chartData = statsData?.revenueChart || [];
        const maxValue = Math.max(...chartData.map(d => d.value), 1);

        return (
            <View style={styles.section}>
                <Text style={styles.mainSectionTitle}>{t("creator.dashboard")}</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: `#4F46E520` }]}>
                            <Icon name="people" size={24} color="#4F46E5" />
                        </View>
                        <Text style={styles.statValue}>{statsData?.totalStudents || 0}</Text>
                        <Text style={styles.statLabel}>{t("creator.totalStudents")}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: `#F59E0B20` }]}>
                            <Icon name="star" size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.statValue}>{statsData?.averageRating?.toFixed(1) || "0.0"}</Text>
                        <Text style={styles.statLabel}>{t("creator.avgRating")}</Text>
                        <Text style={styles.statSubLabel}>{statsData?.totalReviews || 0} reviews</Text>
                    </View>
                </View>

                <View style={styles.revenueCard}>
                    <Text style={styles.revenueTitle}>{t("creator.totalRevenue")}</Text>
                    <Text style={styles.revenueAmount}>${displayRevenue.toFixed(2)}</Text>
                    <View style={styles.filterRow}>
                        {(['day', 'week', 'month', 'year'] as const).map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterChip, revenueFilter === f && styles.filterChipActive]}
                                onPress={() => setRevenueFilter(f)}
                            >
                                <Text style={[styles.filterText, revenueFilter === f && styles.filterTextActive]}>
                                    {t(`common.${f}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {chartData.length > 0 && (
                    <View style={styles.chartContainer}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>{t("creator.revenueTrend", "Revenue (Last 7 Days)")}</Text>
                        </View>
                        <View style={styles.barChartRow}>
                            {chartData.map((item, index) => {
                                const barHeight = (item.value / maxValue) * 100;
                                return (
                                    <View key={index} style={styles.barContainer}>
                                        <View style={styles.barWrapper}>
                                            <View style={[styles.barFill, { height: barHeight || 4 }]} />
                                        </View>
                                        <Text style={styles.barLabel}>{item.label}</Text>
                                    </View>
                                )
                            })}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderReviewsSection = () => {
        const reviews = (reviewsData?.data as CourseVersionReviewResponse[]) || [];

        return (
            <View style={styles.section}>
                <Text style={styles.mainSectionTitle}>{t("course.tabreviews")}</Text>
                {reviewsLoading ? (
                    <ActivityIndicator style={styles.loadingSection} />
                ) : (
                    <View>
                        <FlatList
                            data={reviews}
                            keyExtractor={(item) => item.reviewId}
                            scrollEnabled={false}
                            ListEmptyComponent={<Text style={styles.emptyText}>{t("course.noReviews")}</Text>}
                            renderItem={({ item }) => (
                                <View style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.reviewerName}>{item.userFullname.substring(0, 5)}</Text>
                                        <View style={styles.ratingRow}>
                                            <Icon name="star" size={14} color="#F59E0B" />
                                            <Text style={styles.ratingText}>{item.rating}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewComment}>{item.comment}</Text>
                                </View>
                            )}
                        />
                    </View>
                )}
            </View>
        );
    };

    if (courseLoading) return <ScreenLayout><ActivityIndicator style={{ marginTop: 50 }} size="large" /></ScreenLayout>;

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {course?.title || "Manage Course"}
                    </Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.badge, isDraft ? styles.badgeDraft : styles.badgePublic]}>
                            <Text style={[styles.badgeText, isDraft ? styles.textDraft : styles.textPublic]}>
                                {isDraft ? "DRAFT" : "PUBLIC"}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleNavigateToEdit} style={styles.editingBtn}>
                        <Icon name="edit" size={20} color="#FFF" />
                        <Text style={styles.editingBtnText}>{t("common.editing")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePreview} style={styles.iconBtn}>
                        <Icon name="visibility" size={28} color="#4F46E5" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentPadding}>
                {renderDashboardSection()}
                {renderReviewsSection()}
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitleContainer: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    statusRow: { flexDirection: "row", marginTop: 4 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeDraft: { backgroundColor: "#DBEAFE" },
    badgePublic: { backgroundColor: "#DCFCE7" },
    badgeText: { fontSize: 10, fontWeight: "700" },
    textDraft: { color: "#1E40AF" },
    textPublic: { color: "#166534" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconBtn: { padding: 4 },
    editingBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4F46E5",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4,
    },
    editingBtnText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 14,
    },
    contentContainer: { flex: 1, backgroundColor: "#F8FAFC" },
    contentPadding: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    mainSectionTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937", marginBottom: 16 },
    loadingSection: { marginTop: 20, padding: 20 },
    statsGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
    statCard: {
        flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 16, alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
        shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: "#E5E7EB",
    },
    statIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    statValue: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
    statLabel: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    statSubLabel: { fontSize: 10, color: "#9CA3AF" },
    revenueCard: {
        backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    revenueTitle: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
    revenueAmount: { fontSize: 32, fontWeight: "800", color: "#10B981", marginBottom: 16 },
    filterRow: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 4 },
    filterChip: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
    filterChipActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
    filterText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
    filterTextActive: { color: "#1F2937", fontWeight: "600" },
    chartContainer: {
        marginBottom: 8, backgroundColor: "#FFF", borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    chartHeader: { marginBottom: 16 },
    chartTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
    barChartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 140, paddingBottom: 20 },
    barContainer: { alignItems: "center", flex: 1 },
    barWrapper: { height: 100, width: 20, justifyContent: "flex-end", backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
    barFill: { backgroundColor: "#4F46E5", borderRadius: 4, width: "100%" },
    barLabel: { fontSize: 10, color: "#6B7280", marginTop: 6 },
    emptyText: { color: "#9CA3AF", fontStyle: "italic", textAlign: 'center', marginTop: 20 },
    reviewCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    reviewerName: { fontWeight: "600", color: "#1F2937" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    ratingText: { fontSize: 12, fontWeight: "700", color: "#F59E0B" },
    reviewComment: { color: "#4B5563", fontSize: 14, lineHeight: 20 },
});

export default CourseManagerScreen;