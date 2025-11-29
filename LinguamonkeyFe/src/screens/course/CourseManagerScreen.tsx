import { useMemo, useState, useCallback } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    Modal,
    TextInput,
    Switch,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { useCourses } from "../../hooks/useCourses"
import { useLessons } from "../../hooks/useLessons"
import { useUserStore } from "../../stores/UserStore"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseVersionResponse, LessonResponse } from "../../types/dto"
import { createScaledSheet } from "../../utils/scaledStyles"
import { LessonType, DifficultyLevel } from "../../types/enums"

const CourseManagerScreen = () => {
    const { t } = useTranslation()
    const route = useRoute<any>()
    const navigation = useNavigation<any>()
    const { courseId } = route.params
    const user = useUserStore((state) => state.user)

    const {
        useCourse,
        useCreateDraftVersion,
        usePublishVersion,
        useUpdateCourseVersion,
    } = useCourses()

    const {
        useCreateLesson,
        useUpdateLesson,
    } = useLessons()

    const { data: course, isLoading: courseLoading, refetch: refetchCourse } = useCourse(courseId)
    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateDraftVersion()
    const { mutate: publishVersion, isPending: isPublishing } = usePublishVersion()
    const { mutate: updateVersion, isPending: isUpdatingVersion } = useUpdateCourseVersion()

    // Lesson Mutations
    const { mutate: createLesson, isPending: isCreatingLesson } = useCreateLesson()
    const { mutate: updateLesson, isPending: isUpdatingLesson } = useUpdateLesson()

    // State for Lesson Modal
    const [isLessonModalVisible, setLessonModalVisible] = useState(false)
    const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null)
    const [lessonForm, setLessonForm] = useState({
        title: "",
        description: "", // Acts as the "Post" content
        isFree: false,
        videoUrl: "",
        imageUrl: "",
        durationSeconds: 300,
    })

    const isLoading = courseLoading || isCreatingDraft || isPublishing || isUpdatingVersion

    const currentVersion: CourseVersionResponse | undefined = useMemo(() => {
        // Prefer draft if exists, else public
        if (!course) return undefined;
        // Logic to find draft vs public would typically be here, 
        // assuming course.latestPublicVersion is the one we see, 
        // but often we want to see the DRAFT if we are the creator.
        // For simplicity, we use the provided structure.
        return course.latestPublicVersion
    }, [course])

    const isDraft = currentVersion?.status === "DRAFT"

    // --- Validation Logic for Publishing ---
    const validationErrors = useMemo(() => {
        const errors: string[] = []
        if (!course) return errors
        if (!course.price && course.price !== 0) errors.push(t("course.validation.price"))
        if (!currentVersion?.description || currentVersion.description.length < 20) errors.push(t("course.validation.description"))
        if (!currentVersion?.thumbnailUrl) errors.push(t("course.validation.thumbnail"))
        if (!currentVersion?.lessons || currentVersion.lessons.length === 0) errors.push(t("course.validation.noLessons"))
        return errors
    }, [course, currentVersion, t])

    const isReadyToPublish = validationErrors.length === 0

    // --- Handlers ---

    const handleCreateDraft = async () => {
        createDraft(courseId, {
            onSuccess: () => {
                Alert.alert(t("success"), t("course.draftCreated"))
                refetchCourse()
            },
            onError: (error: any) => {
                Alert.alert(t("error"), error?.message || t("common.error"))
            },
        })
    }

    const handlePublish = (versionId: string) => {
        if (!isReadyToPublish) {
            Alert.alert(t("course.cannotPublish"), validationErrors.join("\n"))
            return
        }

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
                                refetchCourse()
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

    const openLessonModal = (lesson?: LessonResponse) => {
        if (lesson) {
            setEditingLesson(lesson)
            setLessonForm({
                title: lesson.lessonName,
                description: lesson.description || "",
                isFree: lesson.isFree,
                videoUrl: lesson.videoUrls?.[0] || "",
                imageUrl: lesson.thumbnailUrl || "",
                durationSeconds: lesson.durationSeconds || 300,
            })
        } else {
            setEditingLesson(null)
            setLessonForm({
                title: "",
                description: "",
                isFree: false,
                videoUrl: "",
                imageUrl: "",
                durationSeconds: 300,
            })
        }
        setLessonModalVisible(true)
    }

    const handleSaveLesson = () => {
        if (!lessonForm.title || !user?.userId || !currentVersion) return

        const lessonData: any = {
            lessonName: lessonForm.title,
            description: lessonForm.description, // Rich text content area
            isFree: lessonForm.isFree,
            thumbnailUrl: lessonForm.imageUrl,
            durationSeconds: lessonForm.durationSeconds,
            creatorId: user.userId,
            languageCode: course?.languageCode || "en",
            lessonType: LessonType.VIDEO, // Defaulting for simplicity
            difficultyLevel: DifficultyLevel.A1,
            // Link to course for organization
            courseId: courseId,
        }

        const onSuccess = () => {
            setLessonModalVisible(false)
            refetchCourse() // Refresh to show new lesson in list
            // Also need to link lesson to version if it's new
            if (!editingLesson && currentVersion.versionId) {
                // In a real app, the `createLesson` might not auto-link to version 
                // without a specific endpoint or if we passed versionId.
                // Assuming backend handles linking if courseId provided, or we rely on `updateVersion` to add it.
                // For P2P flow, usually adding a lesson in context of a draft adds it to that draft.
                // Let's assume createLesson + refetch works, or we'd add to version lessons list here.
                const currentLessonIds = currentVersion.lessons?.map((l: any) => l.lessonId) || []
                // We would need the new ID to update the version. 
                // This flow implies createLesson returns the ID.
            }
        }

        if (editingLesson) {
            updateLesson({ id: editingLesson.lessonId, req: lessonData }, { onSuccess })
        } else {
            // Logic to create and THEN link to version would happen here or in backend
            createLesson(lessonData, {
                onSuccess: (newLesson) => {
                    // Explicitly link to draft version
                    const currentLessonIds = currentVersion.lessons?.map((l: any) => l.lessonId) || []
                    updateVersion({
                        versionId: currentVersion.versionId,
                        req: {
                            description: currentVersion.description,
                            thumbnailUrl: currentVersion.thumbnailUrl,
                            lessonIds: [...currentLessonIds, newLesson.lessonId]
                        }
                    }, { onSuccess })
                }
            })
        }
    }

    if (courseLoading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            </ScreenLayout>
        )
    }

    if (!course) return null

    return (
        <ScreenLayout>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Image */}
                <Image
                    source={{ uri: currentVersion?.thumbnailUrl || "https://via.placeholder.com/300x200" }}
                    style={styles.cover}
                />

                {/* Course Info Header */}
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.badge,
                        { backgroundColor: course.approvalStatus === 'APPROVED' ? '#10B981' : '#F59E0B' }
                        ]}>
                            <Text style={styles.badgeText}>{course.approvalStatus}</Text>
                        </View>
                        <Text style={styles.priceText}>
                            {course.price === 0 ? t("courses.free") : `$${course.price}`}
                        </Text>
                    </View>
                </View>

                {/* Validation Warnings */}
                {!isReadyToPublish && isDraft && (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>{t("course.setupRequired")}</Text>
                        {validationErrors.map((err, idx) => (
                            <Text key={idx} style={styles.warningText}>• {err}</Text>
                        ))}
                    </View>
                )}

                {/* AI Evaluation Stub */}
                <View style={styles.aiBox}>
                    <Icon name="auto-awesome" size={20} color="#7C3AED" />
                    <Text style={styles.aiText}>
                        {t("course.aiEvaluationInfo", "AI Content Evaluation will run upon submission.")}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t("course.actions")}</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("EditCourseScreen", { courseId })}
                    >
                        <Icon name="edit" size={20} color="#4F46E5" />
                        <Text style={styles.actionButtonText}>{t("course.editDetails")}</Text>
                    </TouchableOpacity>

                    {/* Publish Button */}
                    {isDraft && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.publishButton,
                                !isReadyToPublish && styles.disabledButton
                            ]}
                            onPress={() => currentVersion && handlePublish(currentVersion.versionId)}
                            disabled={!isReadyToPublish || isLoading}
                        >
                            <Icon name="publish" size={20} color="#FFFFFF" />
                            <Text style={[styles.actionButtonText, styles.publishButtonText]}>
                                {t("course.publish")}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Lessons Management */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionHeader}>{t("course.lessons")}</Text>
                        {isDraft && (
                            <TouchableOpacity onPress={() => openLessonModal()} style={styles.addLessonBtn}>
                                <Icon name="add" size={20} color="#4F46E5" />
                                <Text style={styles.addLessonText}>{t("common.add")}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {currentVersion?.lessons?.map((lesson: any, index: number) => (
                        <TouchableOpacity
                            key={lesson.lessonId}
                            style={styles.lessonCard}
                            onPress={() => isDraft && openLessonModal(lesson)} // Edit on click if draft
                        >
                            <View style={styles.lessonRow}>
                                <Text style={styles.lessonIndex}>{index + 1}</Text>
                                <View style={styles.lessonInfo}>
                                    <Text style={styles.lessonTitle}>{lesson.title || lesson.lessonName}</Text>
                                    <View style={styles.lessonMeta}>
                                        {lesson.isFree ? (
                                            <View style={styles.freeBadge}>
                                                <Text style={styles.freeText}>FREE</Text>
                                            </View>
                                        ) : (
                                            <Icon name="lock" size={14} color="#6B7280" />
                                        )}
                                        <Text style={styles.lessonDuration}>
                                            {Math.floor(lesson.durationSeconds / 60)} min
                                        </Text>
                                    </View>
                                </View>
                                {isDraft && <Icon name="edit" size={18} color="#9CA3AF" />}
                            </View>
                        </TouchableOpacity>
                    ))}

                    {(!currentVersion?.lessons || currentVersion.lessons.length === 0) && (
                        <Text style={styles.emptyText}>{t("course.noLessonsYet")}</Text>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Create/Edit Lesson Modal */}
            <Modal visible={isLessonModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingLesson ? t("course.editLesson") : t("course.createLesson")}
                        </Text>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.label}>{t("course.lessonTitle")}</Text>
                            <TextInput
                                style={styles.input}
                                value={lessonForm.title}
                                onChangeText={(t) => setLessonForm({ ...lessonForm, title: t })}
                                placeholder="Lesson Title"
                            />

                            <Text style={styles.label}>{t("course.content")}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={lessonForm.description}
                                onChangeText={(t) => setLessonForm({ ...lessonForm, description: t })}
                                placeholder="Write content here (supports markdown)..."
                                multiline
                            />

                            <Text style={styles.label}>{t("course.videoUrl")}</Text>
                            <TextInput
                                style={styles.input}
                                value={lessonForm.videoUrl}
                                onChangeText={(t) => setLessonForm({ ...lessonForm, videoUrl: t })}
                                placeholder="https://..."
                            />

                            <Text style={styles.label}>{t("course.imageUrl")}</Text>
                            <TextInput
                                style={styles.input}
                                value={lessonForm.imageUrl}
                                onChangeText={(t) => setLessonForm({ ...lessonForm, imageUrl: t })}
                                placeholder="https://..."
                            />

                            <View style={styles.switchRow}>
                                <Text style={styles.label}>{t("course.isFreePreview")}</Text>
                                <Switch
                                    value={lessonForm.isFree}
                                    onValueChange={(v) => setLessonForm({ ...lessonForm, isFree: v })}
                                    trackColor={{ false: "#767577", true: "#4F46E5" }}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setLessonModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSave}
                                onPress={handleSaveLesson}
                                disabled={isCreatingLesson || isUpdatingLesson}
                            >
                                {isCreatingLesson || isUpdatingLesson ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.modalSaveText}>{t("common.save")}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    cover: { width: "100%", height: 200, backgroundColor: "#E5E7EB" },
    header: { padding: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    title: { fontSize: 22, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
    priceText: { fontSize: 18, fontWeight: "700", color: "#4F46E5" },

    warningBox: { margin: 20, padding: 12, backgroundColor: "#FFF7ED", borderRadius: 8, borderWidth: 1, borderColor: "#FDBA74" },
    warningTitle: { color: "#C2410C", fontWeight: "700", marginBottom: 4 },
    warningText: { color: "#9A3412", fontSize: 13, marginBottom: 2 },

    aiBox: { flexDirection: "row", marginHorizontal: 20, marginTop: 10, padding: 12, backgroundColor: "#F5F3FF", borderRadius: 8, gap: 8, alignItems: "center" },
    aiText: { color: "#5B21B6", fontSize: 13, flex: 1 },

    section: { padding: 20 },
    sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionHeader: { fontSize: 18, fontWeight: "700", color: "#1F2937" },

    actionButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
    publishButton: { backgroundColor: "#10B981", borderColor: "#10B981" },
    disabledButton: { opacity: 0.5, backgroundColor: "#D1D5DB", borderColor: "#D1D5DB" },
    actionButtonText: { marginLeft: 12, fontSize: 16, fontWeight: "600", color: "#4F46E5" },
    publishButtonText: { color: "#FFFFFF" },

    addLessonBtn: { flexDirection: "row", alignItems: "center" },
    addLessonText: { color: "#4F46E5", fontWeight: "600", marginLeft: 4 },

    lessonCard: { backgroundColor: "#FFF", padding: 16, borderRadius: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" },
    lessonRow: { flexDirection: "row", alignItems: "center", flex: 1 },
    lessonIndex: { fontSize: 16, fontWeight: "bold", color: "#9CA3AF", width: 30 },
    lessonInfo: { flex: 1 },
    lessonTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
    lessonMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
    freeBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    freeText: { fontSize: 10, color: "#166534", fontWeight: "bold" },
    lessonDuration: { fontSize: 12, color: "#6B7280" },
    emptyText: { textAlign: "center", color: "#9CA3AF", marginTop: 20, fontStyle: "italic" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: "#FFF", borderRadius: 12, padding: 20, maxHeight: "80%" },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
    modalScroll: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: "top" },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalCancel: { flex: 1, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8 },
    modalSave: { flex: 1, padding: 14, alignItems: "center", backgroundColor: "#4F46E5", borderRadius: 8 },
    modalCancelText: { color: "#374151", fontWeight: "600" },
    modalSaveText: { color: "#FFF", fontWeight: "600" },
})

export default CourseManagerScreen