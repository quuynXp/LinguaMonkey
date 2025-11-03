import React from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses" // (Đảm bảo đường dẫn đúng)
import { useUserStore } from "../../stores/UserStore" // (Đảm bảo đường dẫn đúng)
import { createScaledSheet } from "../../utils/scaledStyles" // (Đảm bảo đường dẫn đúng)
import type { Course } from "../../hooks/useCourses"

const CreatorDashboardScreen = ({ navigation }) => {
  const { t } = useTranslation()
  const { user } = useUserStore()
  const { useTeacherCourses } = useCourses()

  const { 
    data: coursesData, 
    isLoading, 
    refetch,
    isRefetching,
  } = useTeacherCourses(user?.userId, 0, 50) // Tăng size

  const allCourses = coursesData?.data || []

  // Phân loại khóa học
  const publicCourses = allCourses.filter(c => c.latestPublicVersion?.status === 'PUBLIC')
  const draftCourses = allCourses.filter(c => c.latestPublicVersion?.status === 'DRAFT')
  const pendingCourses = allCourses.filter(c => c.latestPublicVersion?.status === 'PENDING_APPROVAL')

  const handleEditCourse = (course: Course) => {
    navigation.navigate("EditCourse", { courseId: course.courseId })
  }

  const renderCourseItem = ({ item }: { item: Course }) => {
    const version = item.latestPublicVersion
    let statusText = "New (No Version)"
    let statusColor = "#6B7280"
    
    if (version) {
        if (version.status === 'PUBLIC') {
            statusText = `v${version.versionNumber} - Public`
            statusColor = "#10B981"
        } else if (version.status === 'PENDING_APPROVAL') {
            statusText = `v${version.versionNumber} - Pending`
            statusColor = "#F59E0B"
        } else if (version.status === 'DRAFT') {
            statusText = `v${version.versionNumber} - Draft`
            statusColor = "#3B82F6"
        }
    }
    
    return (
      <TouchableOpacity style={styles.courseCard} onPress={() => handleEditCourse(item)}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color="#6B7280" />
      </TouchableOpacity>
    )
  }

  const renderSection = (title: string, data: Course[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
      {data.length > 0 ? (
         <FlatList
            data={data}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.courseId}
            scrollEnabled={false}
         />
      ) : (
        <Text style={styles.emptyText}>{t('courses.noCoursesInSection')}</Text>
      )}
    </View>
  )

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("courses.myCourses")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("EditCourse", { courseId: null })}>
          <Icon name="add" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {renderSection(t('courses.status.public'), publicCourses)}
        {renderSection(t('courses.status.pending'), pendingCourses)}
        {renderSection(t('courses.status.drafts'), draftCourses)}
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { flex: 1, padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 16 },
  courseCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  courseInfo: { flex: 1, marginRight: 16 },
  courseTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  emptyText: { fontSize: 14, color: "#6B7280", fontStyle: 'italic' },
})

export default CreatorDashboardScreen