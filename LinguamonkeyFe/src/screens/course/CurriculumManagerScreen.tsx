import { useMemo } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseVersionResponse, LessonSummaryResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"

// Use LessonSummaryResponse since that's what comes inside CourseVersionResponse
type LessonDisplayItem = LessonSummaryResponse

const CurriculumManagerScreen = () => {
    const { t } = useTranslation()
    const route = useRoute<any>()
    const navigation = useNavigation<any>()
    const { courseId, versionId } = route.params as {
        courseId: string
        versionId?: string
    }

    const { useCourse, useGetVersion } = useCourses()

    const { data: course, isLoading: courseLoading } = useCourse(courseId)
    const { data: versionData, isLoading: versionLoading } = useGetVersion(
        versionId || ""
    )

    const isLoading = courseLoading || versionLoading

    const displayVersion: CourseVersionResponse | undefined = useMemo(() => {
        if (versionData) return versionData
        if (!versionId && course?.latestPublicVersion)
            return course.latestPublicVersion
        return undefined
    }, [course, versionData, versionId])

    const lessonsList: LessonDisplayItem[] = useMemo(() => {
        return displayVersion?.lessons || []
    }, [displayVersion])

    const handleAddLesson = () => {
        if (!courseId || !displayVersion?.versionId) {
            Alert.alert(t("error"), t("course.versionNotFound"))
            return
        }
        navigation.navigate("AddLessonScreen", {
            courseId,
            versionId: displayVersion.versionId,
        })
    }

    const handleEditLesson = (lessonId: string) => {
        navigation.navigate("EditLessonScreen", {
            courseId,
            versionId: displayVersion?.versionId,
            lessonId,
        })
    }

    const renderLessonItem = ({ item }: { item: LessonDisplayItem }) => (
        <TouchableOpacity
            style={styles.lessonItem}
            onPress={() => handleEditLesson(item.lessonId)}
            disabled={isLoading}
        >
            <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.lessonSubtitle}>
                    #{item.orderIndex} {item.isFree ? `• ${t("course.free")}` : ""}
                </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#6B7280" />
        </TouchableOpacity>
    )

    if (isLoading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>{t("common.loading")}</Text>
                </View>
            </ScreenLayout>
        )
    }

    if (!course || !displayVersion) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#F44336" />
                    <Text style={styles.errorText}>
                        {t("course.notFound")} / {t("course.versionNotFound")}
                    </Text>
                </View>
            </ScreenLayout>
        )
    }

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                    {course.title}
                </Text>
                <View style={styles.versionStatus}>
                    <Text style={styles.versionNumber}>
                        {t("course.versionLabel")}: v{displayVersion.versionNumber}
                    </Text>
                    <View
                        style={[
                            styles.versionBadge,
                            {
                                backgroundColor:
                                    displayVersion.status === "PUBLIC"
                                        ? "#10B981"
                                        : displayVersion.status === "DRAFT"
                                            ? "#3B82F6"
                                            : "#F59E0B",
                            },
                        ]}
                    >
                        <Text style={styles.versionBadgeText}>
                            {displayVersion.status}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionSection}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={handleAddLesson}
                    disabled={isLoading}
                >
                    <Icon name="add" size={20} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                        {t("course.addLesson")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert(t("common.info"), t("course.addModuleTodo"))}
                    disabled={isLoading}
                >
                    <Icon name="folder-open" size={20} color="#4F46E5" />
                    <Text style={styles.actionButtonText}>{t("course.addModule")}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.lessonListHeader}>
                <Text style={styles.sectionHeader}>
                    {t("course.lessons")} ({lessonsList.length})
                </Text>
            </View>

            {lessonsList.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Icon name="inbox" size={40} color="#9CA3AF" />
                    <Text style={styles.emptyText}>{t("course.noLessons")}</Text>
                </View>
            ) : (
                <FlatList
                    data={lessonsList}
                    keyExtractor={(item) => item.lessonId}
                    renderItem={renderLessonItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#6B7280",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: "#6B7280",
    },
    header: {
        padding: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    versionStatus: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    versionNumber: {
        fontSize: 14,
        fontWeight: "500",
        color: "#4F46E5",
    },
    versionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    versionBadgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    actionSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "#F8FAFC",
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#4F46E5",
        marginHorizontal: 5,
    },
    primaryButton: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    actionButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: "600",
        color: "#4F46E5",
    },
    primaryButtonText: {
        color: "#FFFFFF",
    },
    lessonListHeader: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
        backgroundColor: "#F8FAFC",
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    lessonItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#3B82F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    lessonInfo: {
        flex: 1,
        marginRight: 10,
    },
    lessonTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
    },
    lessonSubtitle: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },
    emptyCard: {
        backgroundColor: "#F9FAFB",
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginTop: 10,
    },
    emptyText: {
        fontSize: 14,
        color: "#9CA3AF",
        marginTop: 8,
    },
})

export default CurriculumManagerScreen