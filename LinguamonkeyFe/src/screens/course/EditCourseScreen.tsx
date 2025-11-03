import React, { useState, useEffect } from "react"
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses" // (Đảm bảo đường dẫn đúng)
import { useUserStore } from "../../stores/UserStore" // (Đảm bảo đường dẫn đúng)
import { createScaledSheet } from "../../utils/scaledStyles" // (Đảm bảo đường dẫn đúng)
import type { Course } from "../../hooks/useCourses"

// (Đây là màn hình quan trọng nhất cho P2P)
const EditCourseScreen = ({ navigation, route }) => {
  const { courseId: initialCourseId } = route.params
  const { t } = useTranslation()
  const { user } = useUserStore()
  
  const [isCreateMode, setIsCreateMode] = useState(!initialCourseId)
  const [course, setCourse] = useState<Course | null>(null)
  
  // States cho Mode TẠO MỚI (Create)
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("0")
  
  // States cho Mode SỬA (Edit Version)
  const [description, setDescription] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [lessonIds, setLessonIds] = useState<string[]>([]) // Tạm thời dùng string
  const [reason, setReason] = useState("")
  const [showPublishModal, setShowPublishModal] = useState(false)

  const {
    useCourse,
    useCreateCourse,
    useUpdateCourseDetails,
    useUpdateCourseVersion,
    usePublishCourseVersion,
    useCreateNewDraftVersion,
    useDeleteCourse,
  } = useCourses()

  // Queries
  const { data: fetchedCourse, isLoading: courseLoading, refetch } = useCourse(initialCourseId)

  // Mutations
  const { createCourse, isCreating } = useCreateCourse()
  const { updateCourseDetails, isUpdating: isUpdatingDetails } = useUpdateCourseDetails()
  const { updateCourseVersion, isUpdatingVersion } = useUpdateCourseVersion()
  const { createNewDraftVersion, isCreatingDraft } = useCreateNewDraftVersion()
  const { publishCourseVersion, isPublishing } = usePublishCourseVersion()
  const { deleteCourse, isDeleting } = useDeleteCourse()
  
  const isLoading = courseLoading || isCreating || isUpdatingDetails || isUpdatingVersion || isCreatingDraft || isPublishing || isDeleting

  useEffect(() => {
    if (fetchedCourse) {
      setCourse(fetchedCourse)
      setIsCreateMode(false)
      // Điền thông tin chung
      setTitle(fetchedCourse.title)
      setPrice(fetchedCourse.price?.toString() || "0")
      
      // Điền thông tin version (luôn là version mới nhất, dù là DRAFT, PENDING hay PUBLIC)
      const version = fetchedCourse.latestPublicVersion
      if (version) {
        setDescription(version.description || "")
        setThumbnailUrl(version.thumbnailUrl || "")
        setLessonIds(version.lessons?.map(l => l.lessonId) || [])
      }
    }
  }, [fetchedCourse])

  const handleCreateCourse = async () => {
    if (!title || !user?.userId) return Alert.alert(t('common.error'), t('errors.fillAllFields'))
    try {
      const newCourse = await createCourse({
        title,
        price: parseFloat(price) || 0,
        creatorId: user.userId,
      })
      Alert.alert(t('common.success'), t('courses.createSuccess'))
      navigation.replace("EditCourse", { courseId: newCourse.courseId })
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message)
    }
  }

  const handleCreateNewVersion = async () => {
    if (!course) return
    try {
      await createNewDraftVersion(course.courseId)
      Alert.alert(t('common.success'), t('courses.newDraftSuccess'))
      refetch() // Tải lại data, màn hình sẽ tự chuyển sang UI DRAFT
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message)
    }
  }

  const handleSaveDraft = async () => {
    // Chỉ có thể lưu draft nếu version là DRAFT
    const versionId = course?.latestPublicVersion?.versionId
    if (!course || !versionId || course.latestPublicVersion?.status !== 'DRAFT') {
      return Alert.alert(t('common.error'), t('errors.noDraftToSave'))
    }
    
    try {
      // 1. Cập nhật nội dung (description, lessons...)
      await updateCourseVersion({
        versionId,
        versionData: { description, thumbnailUrl, lessonIds }
      })
      
      // 2. Cập nhật thông tin chung (Title, Price)
      await updateCourseDetails({
        courseId: course.courseId,
        courseData: { title, price: parseFloat(price) || 0 }
      })
      
      Alert.alert(t('common.success'), t('courses.draftSaved'))
      refetch()
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message)
    }
  }

  const handlePublish = async () => {
    const versionId = course?.latestPublicVersion?.versionId
    if (!versionId || !reason) return Alert.alert(t('common.error'), t('errors.reasonRequired'))
    
    try {
      await publishCourseVersion({
        versionId,
        publishData: { reasonForChange: reason }
      })
      Alert.alert(t('common.success'), t('courses.publishRequestSuccess'))
      setShowPublishModal(false)
      setReason("")
      refetch()
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message)
    }
  }
  
  const handleDelete = () => {
    if(!course) return
    Alert.alert(
      t('common.confirm'),
      t('courses.confirmDelete', { title: course.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async () => {
            try {
              await deleteCourse(course.courseId)
              Alert.alert(t('common.success'), t('courses.deleteSuccess'))
              navigation.goBack()
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message)
            }
          } 
        }
      ]
    )
  }

  // === RENDER ===
  
  if (isLoading && !course && !isCreateMode) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>
  }
  
  const currentVersion = course?.latestPublicVersion
  const isPublic = currentVersion?.status === 'PUBLIC'
  const isPending = currentVersion?.status === 'PENDING_APPROVAL'
  const isDraft = currentVersion?.status === 'DRAFT'
  const canEditDetails = isDraft || isCreateMode

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isCreateMode ? t('courses.createCourse') : t('courses.editCourse')}</Text>
        {(!isCreateMode && !isDeleting) && (
            <TouchableOpacity onPress={handleDelete}>
                <Icon name="delete" size={24} color="#EF4444" />
            </TouchableOpacity>
        )}
      </View>
      
      {isLoading && <ActivityIndicator style={styles.globalLoader} size="small" color="#4F46E5" />}

      <ScrollView style={styles.content}>
        <Text style={styles.label}>{t('courses.title')}</Text>
        <TextInput
          style={[styles.input, !canEditDetails && styles.inputDisabled]}
          value={title}
          onChangeText={setTitle}
          placeholder={t('courses.titlePlaceholder')}
          editable={canEditDetails}
        />

        <Text style={styles.label}>{t('courses.price')}</Text>
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
            <Text style={styles.buttonText}>{t('common.create')}</Text>
          </TouchableOpacity>
        )}
        
        {/* === UI KHI LÀ PUBLIC HOẶC PENDING === */}
        {(isPublic || isPending) && (
          <View style={styles.publicOverlay}>
            <Icon name={isPublic ? "check-circle" : "hourglass-top"} size={48} color={isPublic ? "#10B981" : "#F59E0B"} />
            <Text style={styles.publicTitle}>
              {isPublic ? t('courses.isPublic') : t('courses.isPending')}
            </Text>
            <Text style={styles.publicText}>
              {isPublic ? t('courses.publicEditInfo') : t('courses.pendingInfo')}
            </Text>
            {isPublic && (
              <TouchableOpacity 
                style={[styles.buttonSecondary, isCreatingDraft && styles.buttonDisabled]} 
                onPress={handleCreateNewVersion}
                disabled={isCreatingDraft}
              >
                <Text style={styles.buttonSecondaryText}>{t('courses.createNewVersion')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* === UI KHI LÀ DRAFT === */}
        {isDraft && (
          <View>
            <Text style={styles.label}>{t('courses.description')}</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('courses.descriptionPlaceholder')}
              multiline
            />
            
            <Text style={styles.label}>{t('courses.thumbnailUrl')}</Text>
            <TextInput
              style={styles.input}
              value={thumbnailUrl}
              onChangeText={setThumbnailUrl}
              placeholder="https://image.url/..."
            />
            
            <Text style={styles.label}>{t('courses.lessons')} ({lessonIds.length})</Text>
            <TouchableOpacity style={styles.lessonManager} onPress={() => {/* TODO: Mở màn hình quản lý lesson */}}>
                <Icon name="list" size={24} color="#4F46E5" />
                <Text style={styles.lessonText}>{t('courses.manageLessons')}</Text>
            </TouchableOpacity>
            
            <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.buttonSecondary, isUpdatingVersion && styles.buttonDisabled]} 
                  onPress={handleSaveDraft}
                  disabled={isUpdatingVersion}
                >
                    <Text style={styles.buttonSecondaryText}>{t('common.saveDraft')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.buttonPrimary, isPublishing && styles.buttonDisabled]} 
                  onPress={() => setShowPublishModal(true)}
                  disabled={isPublishing}
                >
                    <Text style={styles.buttonText}>{t('common.publish')}</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
      
      {/* Publish Modal */}
      <Modal visible={showPublishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('courses.reasonForChange')}</Text>
            <Text style={styles.modalText}>{t('courses.reasonInfo')}</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={reason}
              onChangeText={setReason}
              placeholder={t('courses.reasonPlaceholder')}
              multiline
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowPublishModal(false)}>
                <Text style={styles.buttonSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonPrimary, isPublishing && styles.buttonDisabled]} onPress={handlePublish} disabled={isPublishing}>
                <Text style={styles.buttonText}>{t('common.publish')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  globalLoader: { position: 'absolute', top: 100, left: 0, right: 0, zIndex: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { flex: 1, padding: 24 },
  label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937" },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  lessonManager: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", padding: 24, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12 },
  lessonText: { fontSize: 16, fontWeight: '600', color: "#4F46E5" },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  buttonPrimary: { flex: 1, backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#9CA3AF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  buttonSecondary: { flex: 1, backgroundColor: "#FFFFFF", paddingVertical: 14, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  buttonSecondaryText: { fontSize: 16, fontWeight: "600", color: "#4F46E5" },
  publicOverlay: { marginTop: 24, padding: 24, backgroundColor: "#F9FAFB", borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: "#E5E7EB" },
  publicTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginTop: 16 },
  publicText: { fontSize: 14, color: "#6B7280", textAlign: 'center', marginVertical: 12, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, margin: 24, width: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 8 },
  modalText: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
})

export default EditCourseScreen