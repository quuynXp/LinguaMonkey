// import React, { useMemo, useCallback, useState } from "react";
// import {
//     View,
//     Text,
//     FlatList,
//     TouchableOpacity,
//     Alert,
//     RefreshControl,
//     Image,
//     StatusBar,
//     ScrollView,
//     Dimensions,
// } from "react-native";
// import Icon from "react-native-vector-icons/MaterialIcons";
// import { useTranslation } from "react-i18next";
// import { useNavigation, useFocusEffect } from "@react-navigation/native";
// import { useCourses } from "../../hooks/useCourses";
// import { useUserStore } from "../../stores/UserStore";
// import ScreenLayout from "../../components/layout/ScreenLayout";
// import type { CourseResponse } from "../../types/dto";
// import { createScaledSheet } from "../../utils/scaledStyles";
// import { getCourseImage } from "../../utils/courseUtils";

// const SCREEN_WIDTH = Dimensions.get("window").width;

// const CreatorDashboardScreen = () => {
//     const { t } = useTranslation();
//     const navigation = useNavigation<any>();
//     const user = useUserStore((state) => state.user);

//     // Filter State for Revenue (Day, Week, Month, Year)
//     const [revenueFilter, setRevenueFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

//     // Hooks
//     const { useCreatorCourses, useCreateCourse, useCreatorStats } = useCourses();

//     // 1. Fetch Creator Stats
//     const {
//         data: statsData,
//         isLoading: isStatsLoading,
//         refetch: refetchStats
//     } = useCreatorStats(user?.userId);

//     // 2. Fetch Creator Courses
//     const {
//         data: coursesData,
//         isLoading: isCoursesLoading,
//         refetch: refetchCourses,
//     } = useCreatorCourses(user?.userId, 0, 50);

//     const { mutate: createCourse, isPending: isCreating } = useCreateCourse();

//     const creatorCourses = useMemo(() => {
//         return (coursesData?.data as CourseResponse[]) || [];
//     }, [coursesData]);

//     const isLoading = isCoursesLoading || isStatsLoading;

//     const handleRefresh = useCallback(() => {
//         refetchCourses();
//         refetchStats();
//     }, [refetchCourses, refetchStats]);

//     useFocusEffect(
//         useCallback(() => {
//             // Optional: Auto refresh on focus
//         }, [])
//     );

//     const handleCreateNewCourse = () => {
//         Alert.prompt(
//             t("course.createTitle"),
//             t("course.createPrompt"),
//             [
//                 { text: t("common.cancel"), style: "cancel" },
//                 {
//                     text: t("common.create"),
//                     onPress: (title) => {
//                         if (title && user?.userId) {
//                             createCourse(
//                                 {
//                                     title,
//                                     price: 0,
//                                     creatorId: user.userId,
//                                 },
//                                 {
//                                     onSuccess: (newCourse) => {
//                                         navigation.navigate("EditCourseScreen", {
//                                             courseId: newCourse.courseId,
//                                         });
//                                     },
//                                     onError: () => {
//                                         Alert.alert(t("error"), t("course.createFailed"));
//                                     },
//                                 }
//                             );
//                         }
//                     },
//                 },
//             ],
//             "plain-text"
//         );
//     };

//     // --- Components ---

//     const StatCard = ({ icon, color, label, value, subLabel }: any) => (
//         <View style={styles.statCard}>
//             <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
//                 <Icon name={icon} size={24} color={color} />
//             </View>
//             <Text style={styles.statValue}>{value}</Text>
//             <Text style={styles.statLabel}>{label}</Text>
//             {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
//         </View>
//     );

//     const RevenueChart = () => {
//         if (!statsData?.revenueChart || statsData.revenueChart.length === 0) return null;

//         const chartData = statsData.revenueChart;
//         const maxValue = Math.max(...chartData.map(d => d.value), 1); // Avoid div by zero

//         return (
//             <View style={styles.chartContainer}>
//                 <View style={styles.chartHeader}>
//                     <Text style={styles.chartTitle}>{t("creator.revenueTrend", "Revenue (Last 7 Days)")}</Text>
//                 </View>
//                 <View style={styles.barChartRow}>
//                     {chartData.map((item, index) => {
//                         // Calculate height relative to max value (max height 100px)
//                         const barHeight = (item.value / maxValue) * 100;
//                         return (
//                             <View key={index} style={styles.barContainer}>
//                                 <View style={styles.barWrapper}>
//                                     <View style={[styles.barFill, { height: barHeight || 4 }]} />
//                                 </View>
//                                 <Text style={styles.barLabel}>{item.label}</Text>
//                             </View>
//                         )
//                     })}
//                 </View>
//             </View>
//         );
//     };

//     const RevenueSummary = () => {
//         let displayRevenue = 0;
//         let label = "";

//         switch (revenueFilter) {
//             case 'day':
//                 displayRevenue = statsData?.revenueToday || 0;
//                 label = t("common.today");
//                 break;
//             case 'week':
//                 displayRevenue = statsData?.revenueWeek || 0;
//                 label = t("common.thisWeek");
//                 break;
//             case 'month':
//                 displayRevenue = statsData?.revenueMonth || 0;
//                 label = t("common.thisMonth");
//                 break;
//             case 'year':
//                 displayRevenue = statsData?.revenueYear || 0;
//                 label = t("common.thisYear");
//                 break;
//         }

//         return (
//             <View style={styles.revenueCard}>
//                 <Text style={styles.revenueTitle}>{t("creator.totalRevenue")}</Text>
//                 <Text style={styles.revenueAmount}>${displayRevenue.toFixed(2)}</Text>

//                 <View style={styles.filterRow}>
//                     {(['day', 'week', 'month', 'year'] as const).map((f) => (
//                         <TouchableOpacity
//                             key={f}
//                             style={[styles.filterChip, revenueFilter === f && styles.filterChipActive]}
//                             onPress={() => setRevenueFilter(f)}
//                         >
//                             <Text style={[styles.filterText, revenueFilter === f && styles.filterTextActive]}>
//                                 {t(`common.${f}`)}
//                             </Text>
//                         </TouchableOpacity>
//                     ))}
//                 </View>
//             </View>
//         );
//     }

//     const renderCreatorItem = ({ item }: { item: CourseResponse }) => {
//         const publicVersion = item.latestPublicVersion;
//         const isApproved = item.approvalStatus === "APPROVED";

//         return (
//             <TouchableOpacity
//                 style={styles.courseCard}
//                 onPress={() =>
//                     navigation.navigate("EditCourseScreen", { courseId: item.courseId })
//                 }
//             >
//                 <Image
//                     source={getCourseImage(publicVersion?.thumbnailUrl)}
//                     style={styles.courseThumb}
//                 />
//                 <View style={styles.courseContent}>
//                     <Text style={styles.courseTitle} numberOfLines={2}>
//                         {item.title}
//                     </Text>
//                     <View style={styles.metaRow}>
//                         <View
//                             style={[
//                                 styles.statusBadge,
//                                 { backgroundColor: isApproved ? "#DCFCE7" : "#FEF3C7" },
//                             ]}
//                         >
//                             <Text
//                                 style={[
//                                     styles.statusText,
//                                     { color: isApproved ? "#166534" : "#D97706" },
//                                 ]}
//                             >
//                                 {item.approvalStatus}
//                             </Text>
//                         </View>
//                         <Text style={styles.priceText}>
//                             {item.latestPublicVersion?.price === 0
//                                 ? "Free"
//                                 : `$${item.latestPublicVersion?.price || 0}`}
//                         </Text>
//                     </View>
//                     <View style={styles.statsRow}>
//                         <Icon name="star" size={14} color="#F59E0B" />
//                         <Text style={styles.statsText}>{item.averageRating?.toFixed(1) || "New"}</Text>
//                         <Icon name="people" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
//                         <Text style={styles.statsText}>
//                             {item.reviewCount || 0} {t("common.reviews")}
//                         </Text>
//                     </View>
//                 </View>
//                 <Icon name="edit" size={24} color="#4F46E5" />
//             </TouchableOpacity>
//         );
//     };

//     const ListHeader = () => (
//         <View style={styles.headerContainer}>
//             <View style={styles.creatorHeaderRow}>
//                 <View>
//                     <Text style={styles.headerTitle}>{t("creator.dashboard")}</Text>
//                     <Text style={styles.headerSubtitle}>{t("creator.manageCoursesSubtitle")}</Text>
//                 </View>
//                 <TouchableOpacity
//                     style={styles.createBtn}
//                     onPress={handleCreateNewCourse}
//                     disabled={isCreating}
//                 >
//                     <Icon name="add" size={20} color="#FFF" />
//                     <Text style={styles.createBtnText}>{t("common.create")}</Text>
//                 </TouchableOpacity>
//             </View>

//             {/* Top Stats Row */}
//             <View style={styles.statsGrid}>
//                 <StatCard
//                     icon="people"
//                     color="#4F46E5"
//                     value={statsData?.totalStudents || 0}
//                     label={t("creator.totalStudents")}
//                 />
//                 <StatCard
//                     icon="star"
//                     color="#F59E0B"
//                     value={statsData?.averageRating?.toFixed(1) || "0.0"}
//                     label={t("creator.avgRating")}
//                     subLabel={`${statsData?.totalReviews || 0} reviews`}
//                 />
//             </View>

//             {/* Revenue Summary Section */}
//             <RevenueSummary />

//             {/* Simple Bar Chart */}
//             <RevenueChart />

//             <View style={styles.sectionHeader}>
//                 <Text style={styles.sectionTitle}>{t("creator.yourCourses")}</Text>
//             </View>
//         </View>
//     );

//     return (
//         <ScreenLayout>
//             <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

//             <FlatList
//                 data={creatorCourses}
//                 keyExtractor={(item) => item.courseId}
//                 renderItem={renderCreatorItem}
//                 ListHeaderComponent={ListHeader}
//                 contentContainerStyle={styles.listContent}
//                 refreshControl={
//                     <RefreshControl
//                         refreshing={isLoading}
//                         onRefresh={handleRefresh}
//                         tintColor="#4F46E5"
//                     />
//                 }
//                 ListEmptyComponent={
//                     !isLoading ? (
//                         <View style={styles.emptyState}>
//                             <Icon name="school" size={64} color="#E5E7EB" />
//                             <Text style={styles.emptyText}>{t("course.noCourses")}</Text>
//                         </View>
//                     ) : null
//                 }
//             />
//         </ScreenLayout>
//     );
// };

// const styles = createScaledSheet({
//     listContent: {
//         paddingBottom: 40,
//         backgroundColor: "#F8FAFC",
//     },
//     headerContainer: {
//         backgroundColor: "#F8FAFC",
//     },
//     creatorHeaderRow: {
//         padding: 16,
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "center",
//     },
//     headerTitle: {
//         fontSize: 24,
//         fontWeight: "800",
//         color: "#1F2937",
//     },
//     headerSubtitle: {
//         fontSize: 14,
//         color: "#6B7280",
//         marginTop: 4,
//     },
//     createBtn: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#4F46E5",
//         paddingVertical: 10,
//         paddingHorizontal: 16,
//         borderRadius: 8,
//         gap: 6,
//     },
//     createBtnText: {
//         color: "#FFF",
//         fontWeight: "600",
//         fontSize: 14,
//     },

//     // Stats Grid
//     statsGrid: {
//         flexDirection: "row",
//         paddingHorizontal: 16,
//         gap: 12,
//         marginBottom: 16,
//     },
//     statCard: {
//         flex: 1,
//         backgroundColor: "#FFF",
//         borderRadius: 12,
//         padding: 16,
//         alignItems: "center",
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.05,
//         shadowRadius: 2,
//         elevation: 1,
//         borderWidth: 1,
//         borderColor: "#E5E7EB",
//     },
//     statIconContainer: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         justifyContent: "center",
//         alignItems: "center",
//         marginBottom: 8,
//     },
//     statValue: {
//         fontSize: 20,
//         fontWeight: "700",
//         color: "#1F2937",
//     },
//     statLabel: {
//         fontSize: 12,
//         color: "#6B7280",
//         marginTop: 2,
//     },
//     statSubLabel: {
//         fontSize: 10,
//         color: "#9CA3AF",
//     },

//     // Revenue Card
//     revenueCard: {
//         marginHorizontal: 16,
//         backgroundColor: "#FFF",
//         borderRadius: 16,
//         padding: 16,
//         marginBottom: 16,
//         borderWidth: 1,
//         borderColor: "#E5E7EB",
//     },
//     revenueTitle: {
//         fontSize: 14,
//         color: "#6B7280",
//         marginBottom: 4,
//     },
//     revenueAmount: {
//         fontSize: 32,
//         fontWeight: "800",
//         color: "#10B981",
//         marginBottom: 16,
//     },
//     filterRow: {
//         flexDirection: "row",
//         backgroundColor: "#F3F4F6",
//         borderRadius: 8,
//         padding: 4,
//     },
//     filterChip: {
//         flex: 1,
//         paddingVertical: 6,
//         alignItems: "center",
//         borderRadius: 6,
//     },
//     filterChipActive: {
//         backgroundColor: "#FFF",
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.1,
//         shadowRadius: 1,
//         elevation: 1,
//     },
//     filterText: {
//         fontSize: 12,
//         fontWeight: "500",
//         color: "#6B7280",
//     },
//     filterTextActive: {
//         color: "#1F2937",
//         fontWeight: "600",
//     },

//     // Chart Styles
//     chartContainer: {
//         marginHorizontal: 16,
//         marginBottom: 24,
//         backgroundColor: "#FFF",
//         borderRadius: 16,
//         padding: 16,
//         borderWidth: 1,
//         borderColor: "#E5E7EB",
//     },
//     chartHeader: {
//         marginBottom: 16,
//     },
//     chartTitle: {
//         fontSize: 16,
//         fontWeight: "700",
//         color: "#1F2937",
//     },
//     barChartRow: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "flex-end",
//         height: 140,
//         paddingBottom: 20, // space for labels
//     },
//     barContainer: {
//         alignItems: "center",
//         flex: 1,
//     },
//     barWrapper: {
//         height: 100,
//         width: 20,
//         justifyContent: "flex-end",
//         backgroundColor: "#F3F4F6",
//         borderRadius: 4,
//         overflow: "hidden",
//     },
//     barFill: {
//         backgroundColor: "#4F46E5",
//         borderRadius: 4,
//         width: "100%",
//     },
//     barLabel: {
//         fontSize: 10,
//         color: "#6B7280",
//         marginTop: 6,
//     },

//     // List Header
//     sectionHeader: {
//         paddingHorizontal: 16,
//         marginBottom: 12,
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: "700",
//         color: "#1F2937",
//     },

//     // Course Card
//     courseCard: {
//         flexDirection: "row",
//         backgroundColor: "#FFFFFF",
//         borderRadius: 12,
//         padding: 12,
//         marginBottom: 12,
//         marginHorizontal: 16,
//         alignItems: "center",
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//         elevation: 2,
//         borderWidth: 1,
//         borderColor: "#E5E7EB",
//     },
//     courseThumb: {
//         width: 80,
//         height: 80,
//         borderRadius: 8,
//         backgroundColor: "#F3F4F6",
//     },
//     courseContent: {
//         flex: 1,
//         marginLeft: 12,
//         marginRight: 8,
//     },
//     courseTitle: {
//         fontSize: 16,
//         fontWeight: "700",
//         color: "#1F2937",
//         marginBottom: 6,
//     },
//     metaRow: {
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 8,
//         marginBottom: 6,
//     },
//     statusBadge: {
//         paddingHorizontal: 8,
//         paddingVertical: 2,
//         borderRadius: 4,
//     },
//     statusText: {
//         fontSize: 10,
//         fontWeight: "700",
//     },
//     priceText: {
//         fontSize: 14,
//         fontWeight: "600",
//         color: "#4F46E5",
//     },
//     statsRow: {
//         flexDirection: "row",
//         alignItems: "center",
//     },
//     statsText: {
//         fontSize: 12,
//         color: "#6B7280",
//         marginLeft: 4,
//         fontWeight: "500",
//     },
//     emptyState: {
//         alignItems: "center",
//         marginTop: 60,
//     },
//     emptyText: {
//         color: "#9CA3AF",
//         marginTop: 16,
//         fontSize: 16,
//     },
// });

// export default CreatorDashboardScreen;
import React, { useMemo, useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Image,
    StatusBar,
    Dimensions,
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

    // Hooks
    const { useCreatorCourses, useCreateCourse, useCreatorStats } = useCourses();

    // Data Fetching
    const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useCreatorStats(user?.userId);
    const { data: coursesData, isLoading: isCoursesLoading, refetch: refetchCourses } = useCreatorCourses(user?.userId, 0, 50);
    const { mutate: createCourse, isPending: isCreating } = useCreateCourse();

    const creatorCourses = useMemo(() => (coursesData?.data as CourseResponse[]) || [], [coursesData]);
    const isLoading = isCoursesLoading || isStatsLoading;

    const handleRefresh = useCallback(() => {
        refetchCourses();
        refetchStats();
    }, [refetchCourses, refetchStats]);

    // Auto refresh when going back to this screen
    useFocusEffect(
        useCallback(() => {
            handleRefresh();
        }, [])
    );

    const handleCreateNewCourse = () => {
        // Logic tạo course nhanh (hoặc mở modal nhập tên)
        // Ở đây giả lập tạo nhanh với tên mặc định, sau đó vào màn hình edit để sửa
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