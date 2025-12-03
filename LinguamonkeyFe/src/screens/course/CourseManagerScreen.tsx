import React, { useState, useEffect, useMemo } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    FlatList,
    Switch,
    Dimensions,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { DifficultyLevel } from "../../types/enums"
import type { CourseVersionReviewResponse } from "../../types/dto"

// Added DASHBOARD type
type TabType = "DASHBOARD" | "INFO" | "CURRICULUM" | "REVIEWS"

const SCREEN_WIDTH = Dimensions.get("window").width;

const CourseManagerScreen = () => {
    const { t } = useTranslation()
    const route = useRoute<any>()
    const navigation = useNavigation<any>()
    const { courseId } = route.params
    const user = useUserStore((state) => state.user)

    // Set Dashboard as default tab
    const [activeTab, setActiveTab] = useState<TabType>("DASHBOARD")
    const [revenueFilter, setRevenueFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

    // --- Hooks ---
    const {
        useCourse,
        useUpdateCourseDetails,
        useUpdateCourseVersion,
        useCreateDraftVersion,
        usePublishVersion,
        useReviews,
        useCourseStats, // Added
    } = useCourses()

    const { data: course, isLoading: courseLoading, refetch } = useCourse(courseId)
    const { data: reviewsData, isLoading: reviewsLoading } = useReviews({ courseId })

    // Fetch Course Specific Stats
    const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useCourseStats(courseId)

    const { mutate: updateDetails, isPending: isUpdatingDetails } = useUpdateCourseDetails()
    const { mutate: updateVersion, isPending: isUpdatingVersion } = useUpdateCourseVersion()
    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateDraftVersion()
    const { mutate: publish, isPending: isPublishing } = usePublishVersion()

    // --- State for Forms ---
    const [formState, setFormState] = useState({
        title: "",
        price: "0",
        description: "",
        thumbnailUrl: "",
        difficulty: DifficultyLevel.A1,
    })

    useEffect(() => {
        if (course) {
            const version = course.latestPublicVersion
            setFormState({
                title: course.title,
                price: course.latestPublicVersion.price.toString(),
                description: version?.description || "",
                thumbnailUrl: version?.thumbnailUrl || "",
                difficulty: course.latestPublicVersion.difficultyLevel || DifficultyLevel.A1,
            })
        }
    }, [course])

    const currentVersion = course?.latestPublicVersion
    const isDraft = currentVersion?.status === "DRAFT"
    const isLoading = courseLoading || isUpdatingDetails || isUpdatingVersion || isCreatingDraft || isPublishing

    // --- Logic for Reordering ---
    const handleMoveLesson = (fromIndex: number, direction: 'up' | 'down') => {
        if (!currentVersion?.lessons) return
        const lessons = [...currentVersion.lessons]
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1

        if (toIndex < 0 || toIndex >= lessons.length) return

        // Swap
        const temp = lessons[fromIndex]
        lessons[fromIndex] = lessons[toIndex]
        lessons[toIndex] = temp

        // Extract Ids
        const newLessonIds = lessons.map(l => l.lessonId)

        if (isDraft) {
            updateVersion(
                {
                    versionId: currentVersion.versionId,
                    req: {
                        lessonIds: newLessonIds,
                        description: formState.description,
                        thumbnailUrl: formState.thumbnailUrl,
                    }
                },
                { onSuccess: () => refetch() }
            )
        } else {
            Alert.alert(t("info"), t("course.editInDraftMode"))
        }
    }

    // --- Actions ---

    const handleSaveInfo = () => {
        if (!course) return
        updateDetails(
            {
                id: courseId,
                req: { title: formState.title },
            },
            {
                onSuccess: () => {
                    if (isDraft && currentVersion) {
                        const currentLessonIds = currentVersion.lessons?.map((l) => l.lessonId) || []
                        updateVersion(
                            {
                                versionId: currentVersion.versionId,
                                req: {
                                    description: formState.description,
                                    thumbnailUrl: formState.thumbnailUrl,
                                    lessonIds: currentLessonIds,
                                },
                            },
                            { onSuccess: () => Alert.alert(t("success"), t("course.saved")) }
                        )
                    } else if (!isDraft) {
                        Alert.alert(
                            t("course.liveVersion"),
                            t("course.createDraftPrompt"),
                            [
                                { text: t("common.cancel") },
                                { text: t("common.ok"), onPress: () => createDraft(courseId) },
                            ]
                        )
                    }
                },
            }
        )
    }

    const handlePublish = () => {
        if (!currentVersion || !isDraft) return
        Alert.prompt(t("course.publish"), t("course.publishReason"), (reason) => {
            if (reason) {
                publish(
                    { versionId: currentVersion.versionId, req: { reasonForChange: reason } },
                    {
                        onSuccess: () => {
                            Alert.alert(t("success"), t("course.published"))
                            refetch()
                        },
                    }
                )
            }
        })
    }

    const handlePreview = () => {
        navigation.navigate("CourseDetailsScreen", { courseId })
    }

    // --- Renderers ---

    // 


    const renderDashboardTab = () => {
        if (statsLoading) return <ActivityIndicator style={{ marginTop: 20 }} />

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
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Stats Grid */}
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

                {/* Revenue Summary */}
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

                {/* Revenue Chart */}
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
            </ScrollView>
        )
    }

    const renderInfoTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("course.title")}</Text>
                <TextInput
                    style={styles.input}
                    value={formState.title}
                    onChangeText={(t) => setFormState({ ...formState, title: t })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("course.price")}</Text>
                <TextInput
                    style={styles.input}
                    value={formState.price}
                    onChangeText={(t) => setFormState({ ...formState, price: t })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("course.difficulty")}</Text>
                <TextInput
                    style={styles.input}
                    value={formState.difficulty}
                    onChangeText={(t) => setFormState({ ...formState, difficulty: t as DifficultyLevel })}
                />
            </View>


            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("course.description")}</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formState.description}
                    onChangeText={(t) => setFormState({ ...formState, description: t })}
                    multiline
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("course.thumbnailUrl")}</Text>
                <TextInput
                    style={styles.input}
                    value={formState.thumbnailUrl}
                    onChangeText={(t) => setFormState({ ...formState, thumbnailUrl: t })}
                />
                {formState.thumbnailUrl ? (
                    <Image source={{ uri: formState.thumbnailUrl }} style={styles.previewImage} />
                ) : null}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInfo} disabled={isUpdatingDetails || isUpdatingVersion}>
                {(isUpdatingDetails || isUpdatingVersion) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t("common.saveChanges")}</Text>}
            </TouchableOpacity>
        </ScrollView>
    )

    const renderCurriculumTab = () => {
        const lessons = currentVersion?.lessons || []

        return (
            <View style={styles.tabContent}>
                <View style={styles.curriculumHeader}>
                    <Text style={styles.sectionTitle}>
                        {lessons.length} {t("course.lessons")}
                    </Text>
                    {isDraft ? (
                        <TouchableOpacity
                            style={styles.addLessonBtn}
                            onPress={() =>
                                navigation.navigate("LessonEditorScreen", {
                                    courseId,
                                    versionId: currentVersion?.versionId,
                                })
                            }
                        >
                            <Icon name="add" size={20} color="#FFF" />
                            <Text style={styles.addLessonText}>{t("course.addLesson")}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.draftBtn} onPress={() => createDraft(courseId)} disabled={isCreatingDraft}>
                            {isCreatingDraft ? <ActivityIndicator color="#FFF" /> : <Text style={styles.draftBtnText}>{t("course.enableEditing")}</Text>}
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={lessons}
                    keyExtractor={(item) => item.lessonId}
                    renderItem={({ item, index }) => (
                        <View style={styles.lessonItem}>
                            <View style={styles.lessonIndexBox}>
                                <Text style={styles.lessonIndex}>{index + 1}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.lessonInfo}
                                onPress={() => {
                                    if (isDraft) {
                                        navigation.navigate("LessonEditorScreen", {
                                            courseId,
                                            versionId: currentVersion?.versionId,
                                            lessonId: item.lessonId,
                                        })
                                    }
                                }}
                            >
                                <Text style={styles.lessonTitle}>{item.title}</Text>
                                <View style={styles.lessonMeta}>
                                    {item.isFree && <View style={styles.freeBadge}><Text style={styles.freeText}>FREE</Text></View>}
                                </View>
                            </TouchableOpacity>

                            {isDraft && (
                                <View style={styles.orderActions}>
                                    <TouchableOpacity onPress={() => handleMoveLesson(index, 'up')} disabled={index === 0 || isUpdatingVersion}>
                                        <Icon name="keyboard-arrow-up" size={24} color={index === 0 || isUpdatingVersion ? "#E5E7EB" : "#6B7280"} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleMoveLesson(index, 'down')} disabled={index === lessons.length - 1 || isUpdatingVersion}>
                                        <Icon name="keyboard-arrow-down" size={24} color={index === lessons.length - 1 || isUpdatingVersion ? "#E5E7EB" : "#6B7280"} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>{t("course.noLessonsSetup")}</Text>}
                />
            </View>
        )
    }

    const renderReviewsTab = () => {
        const reviews = (reviewsData?.data as CourseVersionReviewResponse[]) || []
        return (
            <View style={styles.tabContent}>
                {reviewsLoading ? (
                    <ActivityIndicator />
                ) : (
                    <FlatList
                        data={reviews}
                        keyExtractor={(item) => item.reviewId}
                        ListEmptyComponent={<Text style={styles.emptyText}>{t("course.noReviews")}</Text>}
                        renderItem={({ item }) => (
                            <View style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewerName}>User {item.userId.substring(0, 5)}</Text>
                                    <View style={styles.ratingRow}>
                                        <Icon name="star" size={14} color="#F59E0B" />
                                        <Text style={styles.ratingText}>{item.rating}</Text>
                                    </View>
                                </View>
                                <Text style={styles.reviewComment}>{item.comment}</Text>
                                <View style={styles.reviewActions}>
                                    <TouchableOpacity style={styles.actionLink} onPress={() => Alert.alert("Liked")}>
                                        <Icon name="thumb-up" size={16} color="#4F46E5" />
                                        <Text style={styles.actionText}>{t("common.like")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionLink} onPress={() => Alert.alert(t("info"), "Reply feature coming soon")}>
                                        <Icon name="reply" size={16} color="#4F46E5" />
                                        <Text style={styles.actionText}>{t("common.reply")}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        )
    }

    if (courseLoading) return <ScreenLayout><ActivityIndicator style={{ marginTop: 50 }} size="large" /></ScreenLayout>

    return (
        <ScreenLayout>
            {/* Header */}
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
                    <TouchableOpacity onPress={handlePreview} style={styles.iconBtn}>
                        <Icon name="visibility" size={28} color="#4F46E5" />
                    </TouchableOpacity>
                    {isDraft && (
                        <TouchableOpacity onPress={handlePublish} style={styles.iconBtn} disabled={isPublishing}>
                            <Icon name="publish" size={28} color={isPublishing ? "#D1D5DB" : "#059669"} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {(["DASHBOARD", "INFO", "CURRICULUM", "REVIEWS"] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {t(`course.tab${tab.toLowerCase()}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                {activeTab === "DASHBOARD" && renderDashboardTab()}
                {activeTab === "INFO" && renderInfoTab()}
                {activeTab === "CURRICULUM" && renderCurriculumTab()}
                {activeTab === "REVIEWS" && renderReviewsTab()}
            </View>
        </ScreenLayout>
    )
}

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
    headerActions: { flexDirection: "row", gap: 12 },
    iconBtn: { padding: 4 },

    tabBar: { flexDirection: "row", backgroundColor: "#FFF", paddingHorizontal: 16 },
    tabItem: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabItemActive: { borderBottomColor: "#4F46E5" },
    tabText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
    tabTextActive: { color: "#4F46E5" },

    contentContainer: { flex: 1, backgroundColor: "#F8FAFC" },
    tabContent: { padding: 20, flex: 1 },

    // Stats Grid
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

    // Revenue Card
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

    // Chart Styles
    chartContainer: {
        marginBottom: 24, backgroundColor: "#FFF", borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    chartHeader: { marginBottom: 16 },
    chartTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
    barChartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 140, paddingBottom: 20 },
    barContainer: { alignItems: "center", flex: 1 },
    barWrapper: { height: 100, width: 20, justifyContent: "flex-end", backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
    barFill: { backgroundColor: "#4F46E5", borderRadius: 4, width: "100%" },
    barLabel: { fontSize: 10, color: "#6B7280", marginTop: 6 },

    // Info Form
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
    input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 15, color: "#1F2937" },
    textArea: { height: 100, textAlignVertical: "top" },
    previewImage: { width: "100%", height: 150, marginTop: 8, borderRadius: 8, backgroundColor: "#E5E7EB" },
    saveBtn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
    saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

    // Curriculum
    curriculumHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
    addLessonBtn: { flexDirection: "row", backgroundColor: "#4F46E5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: "center", gap: 4 },
    addLessonText: { color: "#FFF", fontWeight: "600", fontSize: 13 },
    draftBtn: { backgroundColor: "#F59E0B", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    draftBtnText: { color: "#FFF", fontWeight: "600", fontSize: 13 },
    lessonItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
    lessonIndexBox: { width: 32, height: 32, backgroundColor: "#F3F4F6", borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
    lessonIndex: { fontWeight: "700", color: "#6B7280" },
    lessonInfo: { flex: 1 },
    lessonTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
    lessonMeta: { flexDirection: "row", marginTop: 4, alignItems: 'center', gap: 6 },
    freeBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    freeText: { fontSize: 10, color: "#166534", fontWeight: "700" },
    lessonType: { fontSize: 11, color: "#6B7280", textTransform: 'uppercase' },
    orderActions: { flexDirection: 'column', marginLeft: 8 },
    emptyText: { color: "#9CA3AF", fontStyle: "italic", textAlign: 'center', marginTop: 20 },

    // Reviews
    reviewCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    reviewerName: { fontWeight: "600", color: "#1F2937" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    ratingText: { fontSize: 12, fontWeight: "700", color: "#F59E0B" },
    reviewComment: { color: "#4B5563", fontSize: 14, lineHeight: 20 },
    reviewActions: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 20 },
    actionLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionText: { color: "#4F46E5", fontSize: 13, fontWeight: "600" },
})

export default CourseManagerScreen