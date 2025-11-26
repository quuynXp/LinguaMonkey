import { useCallback, useMemo } from "react"
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"

const CreatorDashboardScreen = ({ navigation }: any) => {
    const { t } = useTranslation()
    const user = useUserStore((state) => state.user)

    const {
        useCreatorCourses,
        useCreateDraftVersion,
        usePublishVersion,
    } = useCourses()

    const {
        data: coursesData,
        isLoading: coursesLoading,
        refetch: refetchCourses,
    } = useCreatorCourses(user?.userId, 0, 20)

    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateDraftVersion()
    const { mutate: publishVersion, isPending: isPublishing } = usePublishVersion()

    const courses: CourseResponse[] = useMemo(() => {
        return (coursesData?.data as CourseResponse[]) || []
    }, [coursesData])

    const isLoading = coursesLoading || isCreatingDraft || isPublishing

    const handleCreateDraft = useCallback(
        (courseId: string) => {
            createDraft(courseId, {
                onSuccess: () => {
                    Alert.alert(t("success"), t("course.draftCreatedSuccessfully"))
                    refetchCourses()
                },
                onError: (error: any) => {
                    const errorMessage =
                        error?.response?.data?.message ||
                        error?.message ||
                        t("course.failedCreateDraft")
                    Alert.alert(t("error"), errorMessage)
                },
            })
        },
        [createDraft, refetchCourses, t]
    )

    const handlePublish = useCallback(
        (versionId: string) => {
            Alert.prompt(
                t("course.publishTitle"),
                t("course.publishPrompt"),
                (reason) => {
                    if (reason?.trim()) {
                        publishVersion(
                            {
                                versionId,
                                req: { reasonForChange: reason },
                            },
                            {
                                onSuccess: () => {
                                    Alert.alert(t("success"), t("course.publishSubmitted"))
                                    refetchCourses()
                                },
                                onError: (error: any) => {
                                    const errorMessage =
                                        error?.response?.data?.message ||
                                        error?.message ||
                                        t("course.failedPublish")
                                    Alert.alert(t("error"), errorMessage)
                                },
                            }
                        )
                    }
                }
            )
        },
        [publishVersion, refetchCourses, t]
    )

    const handleEditCourse = useCallback(
        (courseId: string) => {
            navigation.navigate("CourseManagerScreen", { courseId })
        },
        [navigation]
    )

    const renderCourseItem = (info: any) => {
        const item = info.item as CourseResponse
        const publicVersion = item.latestPublicVersion
        const hasPublicVersion = !!publicVersion

        return (
            <View style={styles.courseCard}>
                <View style={styles.courseHeader}>
                    <View style={styles.courseInfo}>
                        <Text style={styles.courseTitle} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <View style={styles.courseMeta}>
                            <Text style={styles.courseId}>{t("course.id")}: {item.courseId.substring(0, 8)}</Text>
                            <View
                                style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor:
                                            item.approvalStatus === "APPROVED"
                                                ? "#10B981"
                                                : item.approvalStatus === "REJECTED"
                                                    ? "#F44336"
                                                    : "#F59E0B",
                                    },
                                ]}
                            >
                                <Text style={styles.statusBadgeText}>{item.approvalStatus}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.price}>
                        {item.price === 0 ? t("courses.free") : `$${item.price}`}
                    </Text>
                </View>

                <View style={styles.versionInfo}>
                    {hasPublicVersion ? (
                        <Text style={styles.versionText}>
                            {t("course.publicVersion")}: v{publicVersion.versionNumber}
                        </Text>
                    ) : (
                        <Text style={styles.noVersionText}>{t("course.noPublicVersion")}</Text>
                    )}
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.draftButton]}
                        onPress={() => handleCreateDraft(item.courseId)}
                        disabled={isLoading}
                    >
                        <Icon name="add-circle-outline" size={16} color="#4F46E5" />
                        <Text style={styles.draftButtonText}>{t("course.createDraft")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditCourse(item.courseId)}
                        disabled={isLoading}
                    >
                        <Icon name="edit" size={16} color="#FFFFFF" />
                        <Text style={styles.editButtonText}>{t("course.editContent")}</Text>
                    </TouchableOpacity>

                    {hasPublicVersion && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.publishButton]}
                            onPress={() => handlePublish(publicVersion.versionId)}
                            disabled={isLoading}
                        >
                            <Icon name="cloud-upload" size={16} color="#FFFFFF" />
                            <Text style={styles.publishButtonText}>{t("course.publish")}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        )
    }

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="school" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t("course.noCourses")}</Text>
            <Text style={styles.emptySubtext}>{t("course.createFirstCourse")}</Text>
        </View>
    )

    return (
        <ScreenLayout>
            <FlatList<CourseResponse>
                data={courses}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.courseId}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.title}>{t("course.manageCoursesTitle")}</Text>
                        <Text style={styles.subtitle}>{t("course.manageCoursesSubtitle")}</Text>
                    </View>
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isLoading}
                refreshControl={
                    <RefreshControl
                        refreshing={coursesLoading}
                        onRefresh={refetchCourses}
                        colors={["#4F46E5"]}
                        tintColor="#4F46E5"
                    />
                }
            />
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    listContainer: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: "#F8FAFC",
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#6B7280",
    },
    courseCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#4F46E5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    courseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    courseInfo: {
        flex: 1,
        marginRight: 12,
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
        height: 44,
    },
    courseMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    courseId: {
        fontSize: 12,
        color: "#6B7280",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    price: {
        fontSize: 16,
        fontWeight: "700",
        color: "#4F46E5",
    },
    versionInfo: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        marginBottom: 12,
    },
    versionText: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "500",
    },
    noVersionText: {
        fontSize: 13,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    actionsContainer: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: "center",
        flex: 1,
        minWidth: 100,
    },
    draftButton: {
        backgroundColor: "#F0F9FF",
        borderWidth: 1,
        borderColor: "#4F46E5",
    },
    draftButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4F46E5",
        marginLeft: 4,
    },
    editButton: {
        backgroundColor: "#4F46E5",
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 4,
    },
    publishButton: {
        backgroundColor: "#10B981",
    },
    publishButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#9CA3AF",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#D1D5DB",
        textAlign: "center",
    },
})

export default CreatorDashboardScreen;
