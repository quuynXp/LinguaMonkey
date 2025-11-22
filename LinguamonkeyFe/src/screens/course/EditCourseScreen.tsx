import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import { createScaledSheet } from "../../utils/scaledStyles"
import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse } from "../../types/dto"
import { DifficultyLevel } from "../../types/enums"

const EditCourseScreen = ({ navigation, route }: any) => {
  const { courseId: initialCourseId } = route.params
  const { t } = useTranslation()
  const user = useUserStore((state) => state.user)

  const [isCreateMode, setIsCreateMode] = useState(!initialCourseId)
  const [course, setCourse] = useState<CourseResponse | null>(null)
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("0")
  const [description, setDescription] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [lessonIds, setLessonIds] = useState<string[]>([])
  const [reason, setReason] = useState("")
  const [showPublishModal, setShowPublishModal] = useState(false)

  const {
    useCourse,
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    usePublishVersion,
    useCreateDraftVersion,
    useDeleteCourse,
  } = useCourses()

  const { data: fetchedCourse, isLoading: courseLoading, refetch } = useCourse(initialCourseId)
  const { mutate: createCourse, isPending: isCreating } = useCreateCourse()
  const { mutate: updateCourseDetails, isPending: isUpdatingDetails } = useUpdateCourseDetails()
  const { mutate: updateCourseVersion, isPending: isUpdatingVersion } = useUpdateCourseVersion()
  const { mutate: publishVersion, isPending: isPublishing } = usePublishVersion()
  const { mutate: createDraftVersion, isPending: isCreatingDraft } = useCreateDraftVersion()
  const { mutate: deleteCourse, isPending: isDeleting } = useDeleteCourse()

  const isLoading = useMemo(
    () =>
      courseLoading ||
      isCreating ||
      isUpdatingDetails ||
      isUpdatingVersion ||
      isCreatingDraft ||
      isPublishing ||
      isDeleting,
    [
      courseLoading,
      isCreating,
      isUpdatingDetails,
      isUpdatingVersion,
      isCreatingDraft,
      isPublishing,
      isDeleting,
    ]
  )

  useEffect(() => {
    if (fetchedCourse) {
      setCourse(fetchedCourse)
      setIsCreateMode(false)
      setTitle(fetchedCourse.title)
      setPrice(fetchedCourse.price?.toString() || "0")

      const version = fetchedCourse.latestPublicVersion
      if (version) {
        setDescription(version.description || "")
        setThumbnailUrl(version.thumbnailUrl || "")
        setLessonIds(version.lessons?.map((l: any) => l.lessonId) || [])
      }
    }
  }, [fetchedCourse])

  const handleCreateCourse = useCallback(() => {
    if (!title || !user?.userId) {
      return Alert.alert(t("common.error"), t("errors.fillAllFields"))
    }

    createCourse(
      {
        title,
        price: parseFloat(price) || 0,
        creatorId: user.userId,
      },
      {
        onSuccess: (newCourse: any) => {
          Alert.alert(t("common.success"), t("courses.createSuccess"))
          navigation.replace("EditCourseScreen", { courseId: newCourse.courseId })
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.message || error?.message || t("common.error")
          Alert.alert(t("common.error"), errorMessage)
        },
      }
    )
  }, [title, price, user?.userId, createCourse, navigation, t])

  const handleCreateNewVersion = useCallback(() => {
    if (!course) return

    createDraftVersion(course.courseId, {
      onSuccess: () => {
        Alert.alert(t("common.success"), t("courses.newDraftSuccess"))
        refetch()
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.message || error?.message || t("common.error")
        Alert.alert(t("common.error"), errorMessage)
      },
    })
  }, [course, createDraftVersion, refetch, t])

  const handleSaveDraft = useCallback(() => {
    const versionId = course?.latestPublicVersion?.versionId
    if (!course || !versionId || course.latestPublicVersion?.status !== "DRAFT") {
      return Alert.alert(t("common.error"), t("errors.noDraftToSave"))
    }

    updateCourseVersion(
      {
        versionId,
        req: { description, thumbnailUrl, lessonIds },
      },
      {
        onSuccess: () => {
          updateCourseDetails(
            {
              id: course.courseId,
              req: { title, price: parseFloat(price) || 0, languageCode: "en", difficultyLevel: DifficultyLevel.A1 },
            },
            {
              onSuccess: () => {
                Alert.alert(t("common.success"), t("courses.draftSaved"))
                refetch()
              },
              onError: (error: any) => {
                const errorMessage =
                  error?.response?.data?.message || error?.message || t("common.error")
                Alert.alert(t("common.error"), errorMessage)
              },
            }
          )
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.message || error?.message || t("common.error")
          Alert.alert(t("common.error"), errorMessage)
        },
      }
    )
  }, [
    course,
    description,
    thumbnailUrl,
    lessonIds,
    title,
    price,
    updateCourseVersion,
    updateCourseDetails,
    refetch,
    t,
  ])

  const handlePublish = useCallback(() => {
    const versionId = course?.latestPublicVersion?.versionId
    if (!versionId || !reason) {
      return Alert.alert(t("common.error"), t("errors.reasonRequired"))
    }

    publishVersion(
      {
        versionId,
        req: { reasonForChange: reason },
      },
      {
        onSuccess: () => {
          Alert.alert(t("common.success"), t("courses.publishRequestSuccess"))
          setShowPublishModal(false)
          setReason("")
          refetch()
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.message || error?.message || t("common.error")
          Alert.alert(t("common.error"), errorMessage)
        },
      }
    )
  }, [course, reason, publishVersion, refetch, t])

  const handleDelete = useCallback(() => {
    if (!course) return

    Alert.alert(
      t("common.confirm"),
      t("courses.confirmDelete", { title: course.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteCourse(course.courseId, {
              onSuccess: () => {
                Alert.alert(t("common.success"), t("courses.deleteSuccess"))
                navigation.goBack()
              },
              onError: (error: any) => {
                const errorMessage =
                  error?.response?.data?.message || error?.message || t("common.error")
                Alert.alert(t("common.error"), errorMessage)
              },
            })
          },
        },
      ]
    )
  }, [course, deleteCourse, navigation, t])

  const currentVersion = course?.latestPublicVersion
  const isPublic = currentVersion?.status === "PUBLIC"
  const isPending = currentVersion?.status === "PENDING_APPROVAL"
  const isDraft = currentVersion?.status === "DRAFT"
  const canEditDetails = isDraft || isCreateMode

  if (isLoading && !course && !isCreateMode) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCreateMode ? t("courses.createCourse") : t("courses.editCourse")}
        </Text>
        {!isCreateMode && !isDeleting && (
          <TouchableOpacity onPress={handleDelete}>
            <Icon name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <ActivityIndicator
          style={styles.globalLoader}
          size="small"
          color="#4F46E5"
        />
      )}

      <ScrollView style={styles.content}>
        <Text style={styles.label}>{t("courses.title")}</Text>
        <TextInput
          style={[styles.input, !canEditDetails && styles.inputDisabled]}
          value={title}
          onChangeText={setTitle}
          placeholder={t("courses.titlePlaceholder")}
          editable={canEditDetails}
        />

        <Text style={styles.label}>{t("courses.price")}</Text>
        <TextInput
          style={[styles.input, !canEditDetails && styles.inputDisabled]}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="numeric"
          editable={canEditDetails}
        />

        {isCreateMode && (
          <TouchableOpacity
            style={[styles.buttonPrimary, isCreating && styles.buttonDisabled]}
            onPress={handleCreateCourse}
            disabled={isCreating}
          >
            <Text style={styles.buttonText}>{t("common.create")}</Text>
          </TouchableOpacity>
        )}

        {(isPublic || isPending) && (
          <View style={styles.publicOverlay}>
            <Icon
              name={isPublic ? "check-circle" : "hourglass-top"}
              size={48}
              color={isPublic ? "#10B981" : "#F59E0B"}
            />
            <Text style={styles.publicTitle}>
              {isPublic ? t("courses.isPublic") : t("courses.isPending")}
            </Text>
            <Text style={styles.publicText}>
              {isPublic ? t("courses.publicEditInfo") : t("courses.pendingInfo")}
            </Text>
            {isPublic && (
              <TouchableOpacity
                style={[
                  styles.buttonSecondary,
                  isCreatingDraft && styles.buttonDisabled,
                ]}
                onPress={handleCreateNewVersion}
                disabled={isCreatingDraft}
              >
                <Text style={styles.buttonSecondaryText}>
                  {t("courses.createNewVersion")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDraft && (
          <View>
            <Text style={styles.label}>{t("courses.description")}</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t("courses.descriptionPlaceholder")}
              multiline
            />

            <Text style={styles.label}>{t("courses.thumbnailUrl")}</Text>
            <TextInput
              style={styles.input}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              placeholder="https://image.url/..."
            />

            <Text style={styles.label}>
              {t("courses.lessons")} ({lessonIds.length})
            </Text>
            <TouchableOpacity
              style={styles.lessonManager}
              onPress={() => {
                // TODO: Open lesson management screen
              }}
            >
              <Icon name="list" size={24} color="#4F46E5" />
              <Text style={styles.lessonText}>{t("courses.manageLessons")}</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.buttonSecondary,
                  isUpdatingVersion && styles.buttonDisabled,
                ]}
                onPress={handleSaveDraft}
                disabled={isUpdatingVersion}
              >
                <Text style={styles.buttonSecondaryText}>
                  {t("common.saveDraft")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isPublishing && styles.buttonDisabled]}
                onPress={() => setShowPublishModal(true)}
                disabled={isPublishing}
              >
                <Text style={styles.buttonText}>{t("common.publish")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showPublishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("courses.reasonForChange")}
            </Text>
            <Text style={styles.modalText}>
              {t("courses.reasonInfo")}
            </Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={reason}
              onChangeText={setReason}
              placeholder={t("courses.reasonPlaceholder")}
              multiline
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setShowPublishModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isPublishing && styles.buttonDisabled]}
                onPress={handlePublish}
                disabled={isPublishing}
              >
                <Text style={styles.buttonText}>{t("common.publish")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  globalLoader: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  lessonManager: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  lessonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  publicOverlay: {
    marginTop: 24,
    padding: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  publicTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
  },
  publicText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 24,
    width: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
})

export default EditCourseScreen