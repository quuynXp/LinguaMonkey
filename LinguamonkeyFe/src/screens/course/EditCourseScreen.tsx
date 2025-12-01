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

import ScreenLayout from "../../components/layout/ScreenLayout"
import type { CourseResponse, CourseVersionDiscountResponse, CourseVersionResponse } from "../../types/dto"
import { DifficultyLevel, VersionStatus } from "../../types/enums"
import { createScaledSheet } from "../../utils/scaledStyles"

const EditCourseScreen = ({ navigation, route }: any) => {
  const { courseId: initialCourseId } = route.params
  const { t } = useTranslation()
  const user = useUserStore((state) => state.user)

  const [isCreateMode, setIsCreateMode] = useState(!initialCourseId)
  const [course, setCourse] = useState<CourseResponse | null>(null)
  const [workingVersion, setWorkingVersion] = useState<CourseVersionResponse | null>(null)

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("0")
  const [description, setDescription] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [lessonIds, setLessonIds] = useState<string[]>([])
  const [languageCode, setLanguageCode] = useState("en")
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.A1)

  const [showPublishModal, setShowPublishModal] = useState(false)
  const [reason, setReason] = useState("")
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  const [discountForm, setDiscountForm] = useState({
    code: "",
    percentage: "0",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const {
    useCourse,
    useCourseVersions,
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    useCreateDraftVersion,
    usePublishVersion,
    useDiscounts,
    useCreateDiscount,
    useDeleteDiscount
  } = useCourses()

  const { data: fetchedCourse, isLoading: courseLoading, refetch } = useCourse(initialCourseId)
  const { data: versions, isLoading: versionsLoading, refetch: refetchVersions } = useCourseVersions(initialCourseId)

  useEffect(() => {
    if (versions && versions.length > 0) {
      const draft = versions.find(v => v.status === VersionStatus.DRAFT);
      const pending = versions.find(v => v.status === VersionStatus.PENDING_APPROVAL);
      const publicVer = versions.find(v => v.status === VersionStatus.PUBLIC);

      const target = draft || pending || publicVer || versions[0];
      setWorkingVersion(target);
    }
  }, [versions]);

  const { data: discountsData } = useDiscounts({
    versionId: workingVersion?.versionId,
    page: 0,
    size: 50
  })

  const { mutate: createCourse, isPending: isCreating } = useCreateCourse()
  const { mutate: updateCourseDetails, isPending: isUpdatingDetails } = useUpdateCourseDetails()
  const { mutate: updateCourseVersion, isPending: isUpdatingVersion } = useUpdateCourseVersion()
  const { mutate: createDraftVersion, isPending: isCreatingDraft } = useCreateDraftVersion()
  const { mutate: publishVersion, isPending: isPublishing } = usePublishVersion()
  const { mutate: createDiscount, isPending: isCreatingDiscount } = useCreateDiscount()
  const { mutate: deleteDiscount } = useDeleteDiscount()

  const isLoading = useMemo(
    () => courseLoading || versionsLoading || isCreating || isUpdatingDetails || isUpdatingVersion || isCreatingDraft || isPublishing,
    [courseLoading, versionsLoading, isCreating, isUpdatingDetails, isUpdatingVersion, isCreatingDraft, isPublishing]
  )

  useEffect(() => {
    if (fetchedCourse) {
      setCourse(fetchedCourse)
      setIsCreateMode(false)
      setTitle(fetchedCourse.title)
    }
  }, [fetchedCourse])

  useEffect(() => {
    if (workingVersion) {
      setDescription(workingVersion.description || "")
      setThumbnailUrl(workingVersion.thumbnailUrl || "")
      setPrice(workingVersion.price?.toString() || "0")
      setLanguageCode(workingVersion.languageCode || "en")
      setDifficultyLevel(workingVersion.difficultyLevel || DifficultyLevel.A1)
    }
  }, [workingVersion])

  const handleCreateCourse = useCallback(() => {
    if (!title || !user?.userId) {
      return Alert.alert(t("common.error"), t("errors.fillAllFields"))
    }

    createCourse(
      {
        title,
        // Price and other version details will be handled on initial draft creation/update by backend logic
        price: parseFloat(price) || 0,
        creatorId: user.userId,
      },
      {
        onSuccess: (newCourse: any) => {
          Alert.alert(t("common.success"), t("courses.createSuccess"))
          navigation.replace("EditCourseScreen", { courseId: newCourse.courseId })
        },
        onError: (error: any) => Alert.alert(t("common.error"), error?.message)
      }
    )
  }, [title, price, user?.userId, createCourse, navigation, t])

  const handleSaveDraft = useCallback(() => {
    if (!workingVersion || workingVersion.status !== VersionStatus.DRAFT) {
      return Alert.alert(t("common.error"), "No draft version to save.")
    }

    // 1. Update Course Title (Course Entity)
    const updateCourseTitle = updateCourseDetails(
      {
        id: course!.courseId,
        req: { title }
      }
    );

    // 2. Update Version Details (Version Entity)
    const updateVersionContent = updateCourseVersion(
      {
        versionId: workingVersion.versionId,
        req: {
          description,
          thumbnailUrl,
          lessonIds,
          price: parseFloat(price) || 0,
          languageCode,
          difficultyLevel,
          categoryCode: "GENERAL"
        },
      }
    );

    Promise.all([updateCourseTitle, updateVersionContent])
      .then(() => {
        Alert.alert(t("common.success"), t("courses.draftSaved"))
        refetch()
        refetchVersions()
      })
      .catch((error: any) => Alert.alert(t("common.error"), error?.message));

  }, [workingVersion, description, thumbnailUrl, lessonIds, title, price, languageCode, difficultyLevel, course, updateCourseVersion, updateCourseDetails, refetch, refetchVersions, t])

  const handleCreateNewDraft = () => {
    if (!course) return;
    createDraftVersion(course.courseId, {
      onSuccess: (data) => {
        Alert.alert(t("success"), "New Draft Created");
        refetchVersions();
        // Optionally set the new draft as working version immediately
        setWorkingVersion(data);
      },
      onError: () => Alert.alert(t("error"), "Failed to create draft")
    })
  }

  const handlePublish = () => {
    if (!workingVersion) return;
    publishVersion({
      versionId: workingVersion.versionId,
      req: { reasonForChange: reason || "Standard Update" }
    }, {
      onSuccess: (data) => {
        setShowPublishModal(false);
        Alert.alert(t("success"), "Version Published/Submitted for Approval");
        refetchVersions();
      },
      onError: (err: any) => {
        Alert.alert(t("error"), err?.message || "Validation failed");
      }
    })
  }

  const handleAddDiscount = () => {
    if (!workingVersion) return;
    // Discount is linked to Version ID
    createDiscount({
      versionId: workingVersion.versionId,
      code: discountForm.code,
      discountPercentage: parseFloat(discountForm.percentage),
      startDate: new Date().toISOString(),
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

  const isDraft = workingVersion?.status === VersionStatus.DRAFT
  const isPublic = workingVersion?.status === VersionStatus.PUBLIC
  const canEdit = isDraft || isCreateMode;

  const integrityValid = workingVersion?.isIntegrityValid;
  const contentValid = workingVersion?.isContentValid;

  const isValidationPending = isDraft && (integrityValid === null || contentValid === null || integrityValid === undefined || contentValid === undefined);
  const isValidationFailed = isDraft && (integrityValid === false || contentValid === false);
  const isReadyToPublish = isDraft && integrityValid === true && contentValid === true;

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
          <TouchableOpacity onPress={() => { }}>
            <Icon name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {workingVersion && (
          <View style={[styles.statusBanner, { backgroundColor: isDraft ? '#FEF3C7' : '#D1FAE5' }]}>
            <Text style={styles.statusText}>
              Version {workingVersion.versionNumber} - {workingVersion.status}
            </Text>
            {isPublic && (
              <TouchableOpacity onPress={handleCreateNewDraft} style={styles.newDraftBtn}>
                <Text style={styles.newDraftText}>+ New Draft</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDraft && (
          <View style={styles.validationCard}>
            <Text style={styles.sectionTitle}>Validation Status</Text>

            <View style={styles.validationRow}>
              <Icon
                name={integrityValid === true ? "check-circle" : integrityValid === false ? "error" : "hourglass-empty"}
                size={20}
                color={integrityValid === true ? "green" : integrityValid === false ? "red" : "orange"}
              />
              <Text style={styles.validationLabel}>Structure Integrity: </Text>
              <Text style={styles.validationValue}>
                {integrityValid === true ? "Passed" : integrityValid === false ? "Failed" : "Pending Scheduler"}
              </Text>
            </View>

            <View style={styles.validationRow}>
              <Icon
                name={contentValid === true ? "check-circle" : contentValid === false ? "error" : "hourglass-empty"}
                size={20}
                color={contentValid === true ? "green" : contentValid === false ? "red" : "orange"}
              />
              <Text style={styles.validationLabel}>Content Quality: </Text>
              <Text style={styles.validationValue}>
                {contentValid === true ? "Passed" : contentValid === false ? "Failed" : "Pending Scheduler"}
              </Text>
            </View>

            {workingVersion?.validationWarnings && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Issues Found:</Text>
                <Text style={styles.warningText}>{workingVersion.validationWarnings}</Text>
              </View>
            )}

            {workingVersion?.systemRating != null && (
              <Text style={styles.aiRating}>AI Previous Rating: {workingVersion.systemRating} ★</Text>
            )}
          </View>
        )}

        {/* Course Title (Editable on Course Entity/Draft Version) */}
        <Text style={styles.label}>{t("courses.title")}</Text>
        <TextInput
          style={[styles.input, !canEdit && styles.inputDisabled]}
          value={title}
          onChangeText={setTitle}
          placeholder={t("courses.titlePlaceholder")}
          editable={canEdit}
        />

        {/* Price (Now controlled by Version) */}
        <Text style={styles.label}>{t("courses.price")} ($)</Text>
        <TextInput
          style={[styles.input, !canEdit && styles.inputDisabled]}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="numeric"
          editable={canEdit}
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
                style={[styles.buttonSecondary, isUpdatingVersion && styles.buttonDisabled]}
                onPress={handleSaveDraft}
                disabled={isUpdatingVersion}
              >
                <Text style={styles.buttonSecondaryText}>{t("common.saveDraft")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonPrimary, (!isReadyToPublish) && styles.buttonDisabled]}
                onPress={() => setShowPublishModal(true)}
                disabled={!isReadyToPublish}
              >
                <Text style={styles.buttonText}>
                  {isValidationPending ? "Validating..." : isValidationFailed ? "Fix Issues" : "Publish Version"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isCreateMode && isDraft && (
          <View style={styles.discountSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t("courses.discounts")}</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(true)}>
                <Icon name="add-circle" size={24} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {/* Discounts should be fetched/displayed based on workingVersion.versionId */}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal visible={showPublishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Publish Version {workingVersion?.versionNumber}</Text>
            <Text style={styles.label}>Reason for change (Required)</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Added new lessons"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowPublishModal(false)}>
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handlePublish} disabled={!reason}>
                <Text style={styles.buttonText}>Confirm Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              // Placeholder for isCreatingDiscount
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

  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16 },
  statusText: { fontWeight: 'bold', color: '#374151' },
  newDraftBtn: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  newDraftText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },

  validationCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  validationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  validationLabel: { fontWeight: '600', color: '#374151' },
  validationValue: { color: '#4B5563' },
  warningBox: { backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, marginTop: 8 },
  warningTitle: { color: '#B91C1C', fontWeight: 'bold', marginBottom: 4 },
  warningText: { color: '#B91C1C', fontSize: 12 },
  aiRating: { marginTop: 8, fontStyle: 'italic', color: '#4F46E5' },

  label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937" },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  buttonPrimary: { flex: 1, backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#9CA3AF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  buttonSecondary: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 14, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  buttonSecondaryText: { fontSize: 16, fontWeight: "600", color: "#4F46E5" },

  discountSection: { marginTop: 30, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  discountCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  discountCode: { fontWeight: 'bold', fontSize: 16, color: '#4F46E5' },
  discountPercent: { color: '#6B7280' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
})

export default EditCourseScreen