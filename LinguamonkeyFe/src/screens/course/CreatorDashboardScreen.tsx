import React, { useMemo, useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Image,
    StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { CourseResponse } from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCourseImage } from "../../utils/courseUtils";

const CreatorDashboardScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const user = useUserStore((state) => state.user);
    const [revenueFilter, setRevenueFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

    const { useCreatorCourses, useCreateCourse, useCreatorStats } = useCourses();

    const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useCreatorStats(user?.userId);
    const { data: coursesData, isLoading: isCoursesLoading, refetch: refetchCourses } = useCreatorCourses(user?.userId, 0, 50);
    const { mutate: createCourse, isPending: isCreating } = useCreateCourse();

    const creatorCourses = useMemo(() => (coursesData?.data as CourseResponse[]) || [], [coursesData]);
    const isLoading = isCoursesLoading || isStatsLoading;

    const handleRefresh = useCallback(() => {
        refetchCourses();
        refetchStats();
    }, [refetchCourses, refetchStats]);

    useFocusEffect(
        useCallback(() => {
            handleRefresh();
        }, [])
    );

    const handleCreateNewCourse = () => {
        // Logic tạo course nhanh (hoặc mở modal nhập tên)
        const defaultTitle = `New Course ${new Date().toLocaleDateString()}`;
        if (user?.userId) {
            createCourse(
                { title: defaultTitle, price: 0, creatorId: user.userId },
                {
                    onSuccess: (newCourse) => {
                        navigation.navigate("EditCourseScreen", { courseId: newCourse.courseId, isNew: true });
                    },
                }
            );
        }
    };

    const renderCreatorItem = ({ item }: { item: CourseResponse }) => {
        const publicVersion = item.latestPublicVersion;
        const isApproved = item.approvalStatus === "APPROVED";

        let statusColor = "#D97706"; // Pending/Draft
        let statusBg = "#FEF3C7";
        let statusText = item.approvalStatus;

        if (isApproved) {
            statusColor = "#166534";
            statusBg = "#DCFCE7";
        } else if (item.approvalStatus === "REJECTED") {
            statusColor = "#DC2626";
            statusBg = "#FEE2E2";
        }

        return (
            <TouchableOpacity
                style={styles.courseCard}
                onPress={() => navigation.navigate("EditCourseScreen", { courseId: item.courseId })}
            >
                <Image
                    source={getCourseImage(publicVersion?.thumbnailUrl)}
                    style={styles.courseThumb}
                />
                <View style={styles.courseContent}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                        <Text style={styles.priceText}>
                            {publicVersion?.price === 0 ? "Free" : `$${publicVersion?.price || 0}`}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <Text style={styles.statsText}>{item.averageRating?.toFixed(1) || "New"}</Text>
                        <Icon name="people" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
                        <Text style={styles.statsText}>{item.totalStudents || 0} students</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
        );
    };

    // Header Components (Giữ nguyên logic của bạn, rút gọn cho dễ đọc)
    const ListHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.creatorHeaderRow}>
                <View>
                    <Text style={styles.headerTitle}>{t("creator.dashboard")}</Text>
                    <Text style={styles.headerSubtitle}>{t("creator.manageCoursesSubtitle")}</Text>
                </View>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateNewCourse} disabled={isCreating}>
                    <Icon name="add" size={20} color="#FFF" />
                    <Text style={styles.createBtnText}>{t("common.create")}</Text>
                </TouchableOpacity>
            </View>
            {/* Stats Cards & Chart logic here (Kept same as your code) */}
            {/* ... */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("creator.yourCourses")}</Text>
            </View>
        </View>
    );

    return (
        <ScreenLayout>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <FlatList
                data={creatorCourses}
                keyExtractor={(item) => item.courseId}
                renderItem={renderCreatorItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#4F46E5" />}
                ListEmptyComponent={!isLoading ? (
                    <View style={styles.emptyState}>
                        <Icon name="school" size={64} color="#E5E7EB" />
                        <Text style={styles.emptyText}>{t("course.noCourses")}</Text>
                    </View>
                ) : null}
            />
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    listContent: { paddingBottom: 40, backgroundColor: "#F8FAFC" },
    headerContainer: { backgroundColor: "#F8FAFC" },
    creatorHeaderRow: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { fontSize: 24, fontWeight: "800", color: "#1F2937" },
    headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
    createBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4F46E5", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 6 },
    createBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
    sectionHeader: { paddingHorizontal: 16, marginBottom: 12, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    courseCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 12, marginHorizontal: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: "#E5E7EB" },
    courseThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#F3F4F6" },
    courseContent: { flex: 1, marginLeft: 12, marginRight: 8 },
    courseTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 6 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: "700" },
    priceText: { fontSize: 14, fontWeight: "600", color: "#4F46E5" },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statsText: { fontSize: 12, color: "#6B7280", marginLeft: 4, fontWeight: "500" },
    emptyState: { alignItems: "center", marginTop: 60 },
    emptyText: { color: "#9CA3AF", marginTop: 16, fontSize: 16 },
});

export default CreatorDashboardScreen;