import React, { useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Image,
    StatusBar,
    ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCourses } from "../../hooks/useCourses";
import { useUserStore } from "../../stores/UserStore";
import ScreenLayout from "../../components/layout/ScreenLayout";
import type { CourseResponse, CourseVersionEnrollmentResponse } from "../../types/dto";
import { createScaledSheet } from "../../utils/scaledStyles";
import { getCourseImage } from "../../utils/courseUtils";

const CreatorDashboardScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const user = useUserStore((state) => state.user);

    // Hooks
    const { useCreatorCourses, useCreateCourse, useEnrollments } = useCourses();

    // 1. Fetch Creator Courses
    const {
        data: coursesData,
        isLoading: isCreatorLoading,
        refetch: refetchCreator,
    } = useCreatorCourses(user?.userId, 0, 50);

    // 2. Fetch Enrolled Courses (My Learning) - Added as requested
    const {
        data: enrolledData,
        isLoading: isEnrolledLoading,
        refetch: refetchEnrolled,
    } = useEnrollments({
        userId: user?.userId,
        page: 0,
        size: 20,
    });

    const { mutate: createCourse, isPending: isCreating } = useCreateCourse();

    // Memoized Data
    const creatorCourses = useMemo(() => {
        return (coursesData?.data as CourseResponse[]) || [];
    }, [coursesData]);

    const enrolledCourses = useMemo(() => {
        return (enrolledData?.data as CourseVersionEnrollmentResponse[]) || [];
    }, [enrolledData]);

    const isLoading = isCreatorLoading || isEnrolledLoading;

    const handleRefresh = useCallback(() => {
        refetchCreator();
        refetchEnrolled();
    }, [refetchCreator, refetchEnrolled]);

    useFocusEffect(
        useCallback(() => {
            // Optional: Refresh on focus
        }, [])
    );

    const handleCreateNewCourse = () => {
        Alert.prompt(
            t("course.createTitle"),
            t("course.createPrompt"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.create"),
                    onPress: (title) => {
                        if (title && user?.userId) {
                            createCourse(
                                {
                                    title,
                                    price: 0,
                                    creatorId: user.userId,
                                },
                                {
                                    onSuccess: (newCourse) => {
                                        navigation.navigate("CourseManagerScreen", {
                                            courseId: newCourse.courseId,
                                        });
                                    },
                                    onError: () => {
                                        Alert.alert(t("error"), t("course.createFailed"));
                                    },
                                }
                            );
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    // --- Render Item: Creator Course (Vertical) ---
    const renderCreatorItem = ({ item }: { item: CourseResponse }) => {
        const publicVersion = item.latestPublicVersion;
        const isApproved = item.approvalStatus === "APPROVED";

        return (
            <TouchableOpacity
                style={styles.courseCard}
                onPress={() =>
                    navigation.navigate("CourseManagerScreen", { courseId: item.courseId })
                }
            >
                <Image
                    source={getCourseImage(publicVersion?.thumbnailUrl)}
                    style={styles.courseThumb}
                />
                <View style={styles.courseContent}>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: isApproved ? "#DCFCE7" : "#FEF3C7" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: isApproved ? "#166534" : "#D97706" },
                                ]}
                            >
                                {item.approvalStatus}
                            </Text>
                        </View>
                        <Text style={styles.priceText}>
                            {item.latestPublicVersion?.price === 0
                                ? "Free"
                                : `$${item.latestPublicVersion?.price || 0}`}
                        </Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <Text style={styles.statsText}>{item.averageRating?.toFixed(1) || "New"}</Text>
                        <Icon name="people" size={14} color="#6B7280" style={{ marginLeft: 8 }} />
                        <Text style={styles.statsText}>
                            {item.reviewCount || 0} {t("common.students", "Students")}
                        </Text>
                    </View>
                </View>
                <Icon name="edit" size={24} color="#4F46E5" />
            </TouchableOpacity>
        );
    };

    // --- Header Component: Contains Title + Horizontal Enrolled List ---
    const ListHeader = () => (
        <View style={styles.headerContainer}>
            {/* Enrolled Courses Section */}
            {enrolledCourses.length > 0 && (
                <View style={styles.enrolledSection}>
                    <Text style={styles.sectionTitle}>{t("learn.enrolledCourses", "My Learning")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                        {enrolledCourses.map((enrollment) => {
                            const courseVersion = enrollment.courseVersion;
                            // Fix: ensure we have a valid course version object
                            if (!courseVersion) return null;
                            // Fix: use courseVersion.courseId to navigate
                            const courseId = courseVersion.courseId || courseVersion.courseId;

                            return (
                                <TouchableOpacity
                                    key={enrollment.enrollmentId}
                                    style={styles.horizontalCard}
                                    onPress={() =>
                                        navigation.navigate("CourseDetailsScreen", {
                                            courseId: courseId,
                                            isPurchased: true,
                                        })
                                    }
                                >
                                    <Image
                                        source={getCourseImage(courseVersion.thumbnailUrl)}
                                        style={styles.horizontalThumbnail}
                                    />
                                    <View style={styles.horizontalContent}>
                                        <Text style={styles.horizontalTitle} numberOfLines={1}>
                                            {courseVersion.title}
                                        </Text>
                                        <View style={styles.progressRow}>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        { width: `${enrollment.progress || 0}%` },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.progressText}>{enrollment.progress || 0}%</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Creator Section Header */}
            <View style={styles.creatorHeaderRow}>
                <View>
                    <Text style={styles.headerTitle}>{t("creator.dashboard")}</Text>
                    <Text style={styles.headerSubtitle}>{t("creator.manageCoursesSubtitle")}</Text>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreateNewCourse}
                    disabled={isCreating}
                >
                    <Icon name="add" size={20} color="#FFF" />
                    <Text style={styles.createBtnText}>{t("common.create")}</Text>
                </TouchableOpacity>
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
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={handleRefresh}
                        tintColor="#4F46E5"
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Icon name="school" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyText}>{t("course.noCourses")}</Text>
                        </View>
                    ) : null
                }
            />
        </ScreenLayout>
    );
};

const styles = createScaledSheet({
    listContent: {
        paddingBottom: 40,
    },
    headerContainer: {
        backgroundColor: "#F8FAFC",
    },
    // Enrolled Section Styles
    enrolledSection: {
        marginBottom: 24,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    horizontalList: {
        paddingHorizontal: 16,
    },
    horizontalCard: {
        width: 220,
        backgroundColor: "#FFFFFF",
        marginRight: 16,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 4, // for shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    horizontalThumbnail: {
        width: "100%",
        height: 100,
        backgroundColor: "#E5E7EB",
    },
    horizontalContent: {
        padding: 10,
    },
    horizontalTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        marginRight: 8,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#4F46E5",
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        color: "#6B7280",
    },

    // Creator Header Styles
    creatorHeaderRow: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1F2937",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
    },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4F46E5",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    createBtnText: {
        color: "#FFF",
        fontWeight: "600",
        fontSize: 14,
    },

    // Vertical Course Card Styles
    courseCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        marginHorizontal: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    courseThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
    },
    courseContent: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "700",
    },
    priceText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4F46E5",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statsText: {
        fontSize: 12,
        color: "#6B7280",
        marginLeft: 4,
        fontWeight: "500",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 60,
    },
    emptyText: {
        color: "#9CA3AF",
        marginTop: 16,
        fontSize: 16,
    },
});

export default CreatorDashboardScreen;