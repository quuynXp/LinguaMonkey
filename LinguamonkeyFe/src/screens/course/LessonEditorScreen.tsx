import React, { useState, useEffect } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Switch,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import * as DocumentPicker from 'expo-document-picker'

import { useLessons } from "../../hooks/useLessons"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import ScreenLayout from "../../components/layout/ScreenLayout"
import { createScaledSheet } from "../../utils/scaledStyles"
import { uploadTemp } from "../../services/cloudinary"
import { LessonType, DifficultyLevel } from "../../types/enums"

const LessonEditorScreen = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const { courseId, versionId, lessonId } = route.params
    const user = useUserStore((state) => state.user)

    // --- Hooks ---
    const { useLesson, useCreateLesson, useUpdateLesson } = useLessons()
    const { useUpdateCourseVersion } = useCourses()
    const { mutate: updateCourseVersion } = useUpdateCourseVersion()

    const { data: existingLesson, isLoading: lessonLoading } = useLesson(lessonId || null)
    const { mutate: createLesson, isPending: isCreating } = useCreateLesson()
    const { mutate: updateLessonMutate, isPending: isUpdating } = useUpdateLesson()

    // Form State
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [isFree, setIsFree] = useState(false)
    const [videoUrl, setVideoUrl] = useState("")

    // Upload State
    const [isUploadingFile, setUploadingFile] = useState(false)
    const [uploadFileName, setUploadFileName] = useState<string | null>(null)
    const [fileType, setFileType] = useState<string>('video')

    useEffect(() => {
        if (existingLesson) {
            setTitle(existingLesson.title || existingLesson.lessonName)
            setDescription(existingLesson.description || "")
            setIsFree(existingLesson.isFree)
            setVideoUrl(existingLesson.videoUrls?.[0] || "")
        }
    }, [existingLesson])

    const handlePickAndUpload = async () => {
        if (isUploadingFile) return

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['video/*', 'audio/*', 'application/pdf', 'application/msword'],
                copyToCacheDirectory: true,
            })

            if (result.canceled) return

            const file = result.assets[0]
            setUploadFileName(file.name)
            setUploadingFile(true)

            // Determine type for UI
            if (file.mimeType?.includes('video')) setFileType('video')
            else if (file.mimeType?.includes('audio')) setFileType('audio')
            else setFileType('document')

            // 1. Upload logic (Streaming supported via Cloudinary/Backend temp)
            const fileId = await uploadTemp({
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || 'upload.bin',
            })

            // 2. Format URL for Drive streaming
            const streamingUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
            setVideoUrl(streamingUrl)

            Alert.alert(t("success"), t("course.uploadComplete"))
        } catch (err) {
            Alert.alert(t("error"), t("course.uploadFailed"))
            console.error(err)
        } finally {
            setUploadingFile(false)
        }
    }

    const handleSave = () => {
        if (!title || !user?.userId) return Alert.alert(t("error"), t("errors.fillAllFields"))
        if (!videoUrl) return Alert.alert(t("error"), t("course.contentRequired"))

        // Detect Lesson Type
        let type = LessonType.DOCUMENT
        if (videoUrl.includes('video') || fileType === 'video') type = LessonType.VIDEO
        else if (videoUrl.includes('audio') || fileType === 'audio') type = LessonType.AUDIO

        const lessonPayload: any = {
            lessonName: title,
            title,
            description,
            isFree,
            lessonType: type,
            difficultyLevel: existingLesson?.difficultyLevel || DifficultyLevel.A1,
            languageCode: existingLesson?.languageCode || "en",
            durationSeconds: existingLesson?.durationSeconds || 300,
            thumbnailUrl: existingLesson?.thumbnailUrl || "",
            creatorId: user.userId,
            videoUrls: [videoUrl],
            courseId: courseId,
            orderIndex: existingLesson?.orderIndex || 0
        }

        const onSuccessAction = () => {
            Alert.alert(t("success"), t("course.lessonSaved"))
            if (!lessonId && versionId) {
                // If new lesson, we need to refresh course version logic or let React Query invalidate handles it
                // In a perfect world, we append this lesson ID to the version here, but standard REST usually does this on backend creation
                // or we rely on the `useCourse` invalidation in `CourseManagerScreen`.
            }
            navigation.goBack()
        }

        if (lessonId) {
            updateLessonMutate(
                { id: lessonId, req: lessonPayload },
                { onSuccess: onSuccessAction }
            )
        } else {
            createLesson(lessonPayload, {
                onSuccess: (newLesson) => {
                    // Critical: If created, we might need to link it to version immediately if backend doesn't auto-link
                    if (versionId) {
                        // Logic to append lessonId to version would go here if not handled by backend
                    }
                    onSuccessAction()
                },
                onError: (e) => {
                    Alert.alert(t("error"), e?.message || t("course.createFailed"))
                }
            })
        }
    }

    const isWorking = isCreating || isUpdating || isUploadingFile || lessonLoading

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {lessonId ? t("course.editLesson") : t("course.createLesson")}
                </Text>
                <TouchableOpacity onPress={handleSave} disabled={isWorking}>
                    {isWorking ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                        <Text style={styles.saveText}>{t("common.save")}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("course.lessonTitle")}</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t("course.lessonTitlePlaceholder")}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("course.contentMedia")}</Text>

                    {!videoUrl || isUploadingFile ? (
                        <TouchableOpacity style={styles.uploadArea} onPress={handlePickAndUpload} disabled={isWorking}>
                            {isUploadingFile ? (
                                <ActivityIndicator size="large" color="#4F46E5" />
                            ) : (
                                <Icon name="cloud-upload" size={40} color="#6B7280" />
                            )}
                            <Text style={styles.uploadText}>
                                {isUploadingFile ? t("common.uploading") : t("course.uploadVideoAudio")}
                            </Text>
                            {uploadFileName && !isUploadingFile && (
                                <Text style={styles.fileNameText}>Selected: {uploadFileName}</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.mediaPreview}>
                            <View style={styles.mediaInfo}>
                                <Icon
                                    name={fileType === 'video' ? "videocam" : fileType === 'audio' ? "audiotrack" : "description"}
                                    size={24}
                                    color="#4F46E5"
                                />
                                <Text style={styles.mediaUrl} numberOfLines={1}>{uploadFileName || "Media File"}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVideoUrl("")} style={styles.removeMediaBtn}>
                                <Icon name="delete" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {videoUrl ? <Text style={styles.helperText}>Stream URL: {videoUrl.substring(0, 40)}...</Text> : null}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("course.description")}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        placeholder={t("course.descriptionPlaceholder")}
                    />
                </View>

                <View style={styles.switchRow}>
                    <View>
                        <Text style={styles.switchLabel}>{t("course.freePreview")}</Text>
                        <Text style={styles.switchSub}>{t("course.freePreviewDesc")}</Text>
                    </View>
                    <Switch
                        value={isFree}
                        onValueChange={setIsFree}
                        trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                        thumbColor={isFree ? "#4F46E5" : "#f4f3f4"}
                    />
                </View>
            </ScrollView>
        </ScreenLayout>
    )
}

const styles = createScaledSheet({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    saveText: { fontSize: 16, fontWeight: "600", color: "#4F46E5" },
    content: { padding: 20 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
    input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 120, textAlignVertical: "top" },
    uploadArea: {
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
        borderRadius: 12,
        height: 120,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    uploadText: { marginTop: 8, color: "#6B7280", fontWeight: "500" },
    fileNameText: { fontSize: 12, color: "#4F46E5", marginTop: 4 },
    mediaPreview: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    mediaInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
    mediaUrl: { marginLeft: 8, color: "#4F46E5", fontWeight: "500", flex: 1 },
    removeMediaBtn: { padding: 4 },
    helperText: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    switchLabel: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
    switchSub: { fontSize: 12, color: "#6B7280", maxWidth: 200 },
})

export default LessonEditorScreen