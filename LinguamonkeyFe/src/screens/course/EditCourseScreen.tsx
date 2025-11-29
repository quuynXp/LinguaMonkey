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
  FlatList,
} from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse, CourseDiscountResponse } from "../../types/dto"
import { DifficultyLevel } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

const EditCourseScreen = ({ navigation, route }: any) => {
  const { courseId: initialCourseId } = route.params
  const { t } = useTranslation()
  const user = useUserStore((state) => state.user)

  const [isCreateMode, setIsCreateMode] = useState(!initialCourseId)
  const [course, setCourse] = useState<CourseResponse | null>(null)

  // Course Details
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("0")

  // Version Details
  const [description, setDescription] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [lessonIds, setLessonIds] = useState<string[]>([])

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [reason, setReason] = useState("")
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  // Discount Form
  const [discountForm, setDiscountForm] = useState({
    code: "",
    percentage: "0",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const {
    useCourse,
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    useCreateDraftVersion,
    useDeleteCourse,
    useDiscounts,
    useCreateDiscount,
    useDeleteDiscount
  } = useCourses()

  const { data: fetchedCourse, isLoading: courseLoading, refetch } = useCourse(initialCourseId)
  const { data: discountsData } = useDiscounts({ courseId: initialCourseId, page: 0, size: 50 })

  const { mutate: createCourse, isPending: isCreating } = useCreateCourse()
  const { mutate: updateCourseDetails, isPending: isUpdatingDetails } = useUpdateCourseDetails()
  const { mutate: updateCourseVersion, isPending: isUpdatingVersion } = useUpdateCourseVersion()
  const { mutate: createDraftVersion, isPending: isCreatingDraft } = useCreateDraftVersion()
  const { mutate: deleteCourse, isPending: isDeleting } = useDeleteCourse()
  const { mutate: createDiscount, isPending: isCreatingDiscount } = useCreateDiscount()
  const { mutate: deleteDiscount } = useDeleteDiscount()

  const isLoading = useMemo(
    () => courseLoading || isCreating || isUpdatingDetails || isUpdatingVersion || isCreatingDraft || isDeleting,
    [courseLoading, isCreating, isUpdatingDetails, isUpdatingVersion, isCreatingDraft, isDeleting]
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
          Alert.alert(t("common.error"), error?.message || "Failed to create")
        },
      }
    )
  }, [title, price, user?.userId, createCourse, navigation, t])

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
            }
          )
        },
        onError: (error: any) => {
          Alert.alert(t("common.error"), error?.message)
        }
      }
    )
  }, [course, description, thumbnailUrl, lessonIds, title, price, updateCourseVersion, updateCourseDetails, refetch, t])

  const handleAddDiscount = () => {
    if (!course) return;
    createDiscount({
      courseId: course.courseId,
      code: discountForm.code,
      discountPercentage: parseFloat(discountForm.percentage),
      startDate: new Date().toISOString(), // Simplified date
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
      isActive: true
    }, {
      onSuccess: () => {
        setShowDiscountModal(false)
        setDiscountForm({ code: "", percentage: "0", startDate: "", endDate: "" })
        Alert.alert(t("success"), "Discount Created")
      },
      onError: () => Alert.alert(t("error"), "Failed to create discount")
    })
  }

  const handleDeleteDiscount = (id: string) => {
    deleteDiscount(id)
  }

  const currentVersion = course?.latestPublicVersion
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
        {!isCreateMode && (
          <TouchableOpacity onPress={() => { /* Handle Delete */ }}>
            <Icon name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Info */}
        <Text style={styles.label}>{t("courses.title")}</Text>
        <TextInput
          style={[styles.input, !canEditDetails && styles.inputDisabled]}
          value={title}
          onChangeText={setTitle}
          placeholder={t("courses.titlePlaceholder")}
          editable={canEditDetails}
        />

        <Text style={styles.label}>{t("courses.price")} ($)</Text>
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

        {/* Draft Editing */}
        {isDraft && (
          <View>
            <Text style={styles.label}>{t("courses.description")}</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t("courses.descriptionPlaceholder")}
              multiline
            />

            <Text style={styles.label}>{t("courses.backgroundUrl")}</Text>
            <TextInput
              style={styles.input}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              placeholder="https://image.url/..."
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.buttonPrimary, isUpdatingVersion && styles.buttonDisabled]}
                onPress={handleSaveDraft}
                disabled={isUpdatingVersion}
              >
                <Text style={styles.buttonText}>{t("common.saveDraft")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Discount Management */}
        {!isCreateMode && (
          <View style={styles.discountSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t("courses.discounts")}</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(true)}>
                <Icon name="add-circle" size={24} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {discountsData?.data.map((d: CourseDiscountResponse) => (
              <View key={d.discountId} style={styles.discountCard}>
                <View>
                  <Text style={styles.discountCode}>{d.code}</Text>
                  <Text style={styles.discountPercent}>{d.discountPercentage}% OFF</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteDiscount(d.discountId)}>
                  <Icon name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Create Discount Modal */}
      <Modal visible={showDiscountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("courses.createDiscount")}</Text>

            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.input}
              value={discountForm.code}
              onChangeText={t => setDiscountForm({ ...discountForm, code: t })}
              placeholder="SUMMER2025"
            />

            <Text style={styles.label}>Percentage %</Text>
            <TextInput
              style={styles.input}
              value={discountForm.percentage}
              onChangeText={t => setDiscountForm({ ...discountForm, percentage: t })}
              keyboardType="numeric"
              placeholder="20"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowDiscountModal(false)}>
                <Text style={styles.buttonSecondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={handleAddDiscount}
                disabled={isCreatingDiscount}
              >
                <Text style={styles.buttonText}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  content: { flex: 1, padding: 24, backgroundColor: "#F8FAFC" },
  label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937" },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  buttonPrimary: { flex: 1, backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#9CA3AF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  buttonSecondary: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 14, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  buttonSecondaryText: { fontSize: 16, fontWeight: "600", color: "#4F46E5" },

  // Discount
  discountSection: { marginTop: 30, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  discountCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  discountCode: { fontWeight: 'bold', fontSize: 16, color: '#4F46E5' },
  discountPercent: { color: '#6B7280' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
})

export default EditCourseScreen