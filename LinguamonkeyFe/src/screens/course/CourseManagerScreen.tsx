import { useMemo } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseVersionResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"

const CourseManagerScreen = () => {
    const { t } = useTranslation()
    const route = useRoute<any>()
    const navigation = useNavigation<any>()
    const { courseId } = route.params

    const {
        useCourse,
        useCreateDraftVersion,
        usePublishVersion,
    } = useCourses()

    const { data: course, isLoading: courseLoading } = useCourse(courseId)

    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateDraftVersion()
    const { mutate: publishVersion, isPending: isPublishing } = usePublishVersion()

    const handleCreateDraft = async () => {
        createDraft(courseId, {
            onSuccess: () => {
                Alert.alert(t("success"), t("course.draftCreated"))
            },
            onError: (error: any) => {
                Alert.alert(t("error"), error?.message || t("common.error"))
            },
        })
    }

    const handlePublish = (versionId: string) => {
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
                            },
                            onError: (error: any) => {
                                Alert.alert(t("error"), error?.message || t("common.error"))
                            },
                        }
                    )
                }
            }
        )
    }

    const isLoading = courseLoading || isCreatingDraft || isPublishing

    const currentVersion: CourseVersionResponse | undefined = useMemo(() => {
        return course?.latestPublicVersion
    }, [course])

    if (courseLoading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>{t("common.loading")}</Text>
                </View>
            </ScreenLayout>
        )
    }

    if (!course) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#F44336" />
                    <Text style={styles.errorText}>{t("course.notFound")}</Text>
                </View>
            </ScreenLayout>
        )
    }

    return (
        <ScreenLayout>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Image
                    source={{
                        uri: currentVersion?.thumbnailUrl || "https://via.placeholder.com/300x200",
                    }}
                    style={styles.cover}
                />

                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={2}>
                        {course.title}
                    </Text>
                    <View style={styles.statusRow}>
                        <Text
                            style={[
                                styles.status,
                                {
                                    color:
                                        course.approvalStatus === "APPROVED"
                                            ? "#10B981"
                                            : course.approvalStatus === "REJECTED"
                                                ? "#F44336"
                                                : "#F59E0B",
                                },
                            ]}
                        >
                            {course.approvalStatus}
                        </Text>
                        <Text style={styles.priceText}>
                            ${course.price === 0 ? t("courses.free") : course.price}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t("course.currentVersionLabel")}</Text>
                    {currentVersion ? (
                        <View style={styles.versionCard}>
                            <View style={styles.versionRow}>
                                <Text style={styles.versionNumber}>
                                    v{currentVersion.versionNumber}
                                </Text>
                                <View
                                    style={[
                                        styles.versionBadge,
                                        {
                                            backgroundColor:
                                                currentVersion.status === "PUBLIC"
                                                    ? "#10B981"
                                                    : currentVersion.status === "DRAFT"
                                                        ? "#3B82F6"
                                                        : "#F59E0B",
                                        },
                                    ]}
                                >
                                    <Text style={styles.versionBadgeText}>
                                        {currentVersion.status}
                                    </Text>
                                </View>
                            </View>
                            {currentVersion.publishedAt && (
                                <Text style={styles.publishDate}>
                                    {t("course.publishedAt")}:{" "}
                                    {new Date(currentVersion.publishedAt).toLocaleDateString()}
                                </Text>
                            )}
                            <Text style={styles.lessonCount}>
                                {currentVersion.lessons?.length || 0} {t("course.lessons")}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>{t("course.noPublicVersion")}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t("course.actions")}</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                            navigation.navigate("EditCourseDetailsScreen", { courseId })
                        }
                        disabled={isLoading}
                    >
                        <Icon name="edit" size={20} color="#4F46E5" />
                        <Text style={styles.actionButtonText}>
                            {t("course.editDetails")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={handleCreateDraft}
                        disabled={isLoading}
                    >
                        <Icon name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                            {t("course.createDraft")} (v
                            {(currentVersion?.versionNumber || 0) + 1})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                            navigation.navigate("CurriculumManagerScreen", {
                                courseId,
                                versionId: currentVersion?.versionId,
                            })
                        }
                        disabled={isLoading}
                    >
                        <Icon name="list" size={20} color="#4F46E5" />
                        <Text style={styles.actionButtonText}>{t("course.manageLessons")}</Text>
                    </TouchableOpacity>

                    {currentVersion && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.publishButton]}
                            onPress={() =>
                                currentVersion.versionId &&
                                handlePublish(currentVersion.versionId)
                            }
                            disabled={isLoading}
                        >
                            <Icon name="publish" size={20} color="#FFFFFF" />
                            <Text
                                style={[styles.actionButtonText, styles.publishButtonText]}
                            >
                                {t("course.publish")}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
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
    cover: {
        width: "100%",
        height: 200,
        backgroundColor: "#E5E7EB",
    },
    header: {
        padding: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    status: {
        fontSize: 14,
        fontWeight: "600",
    },
    priceText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    section: {
        padding: 20,
        marginTop: 12,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    versionCard: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#4F46E5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    versionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    versionNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    versionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    versionBadgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    publishDate: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
    },
    lessonCount: {
        fontSize: 13,
        color: "#6B7280",
    },
    emptyCard: {
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    primaryButton: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    publishButton: {
        backgroundColor: "#10B981",
        borderColor: "#10B981",
    },
    actionButtonText: {
        marginLeft: 12,
        fontSize: 15,
        fontWeight: "600",
        color: "#4F46E5",
    },
    primaryButtonText: {
        color: "#FFFFFF",
    },
    publishButtonText: {
        color: "#FFFFFF",
    },
})

export default CourseManagerScreen
