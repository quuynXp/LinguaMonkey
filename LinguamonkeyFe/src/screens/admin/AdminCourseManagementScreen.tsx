"use client"

import { useState } from "react"
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from 'react-native-vector-icons/MaterialIcons';
const AdminCourseManagementScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)

  const filters = [
    { id: "all", label: "All Courses", count: 24 },
    { id: "published", label: "Published", count: 18 },
    { id: "draft", label: "Draft", count: 4 },
    { id: "archived", label: "Archived", count: 2 },
  ]

  const [courses] = useState([
    {
      id: 1,
      title: "Business English Mastery",
      instructor: "Dr. Sarah Wilson",
      status: "published",
      students: 12500,
      revenue: 124750,
      rating: 4.8,
      lessons: 20,
      createdDate: "2024-01-15",
      lastUpdated: "2024-02-20",
      category: "Business",
      price: 99.99,
    },
    {
      id: 2,
      title: "Conversational Spanish",
      instructor: "Prof. Carlos Martinez",
      status: "published",
      students: 8900,
      revenue: 71190,
      rating: 4.9,
      lessons: 15,
      createdDate: "2024-01-10",
      lastUpdated: "2024-02-18",
      category: "Conversation",
      price: 79.99,
    },
    {
      id: 3,
      title: "Advanced Grammar Techniques",
      instructor: "Dr. Emily Chen",
      status: "draft",
      students: 0,
      revenue: 0,
      rating: 0,
      lessons: 8,
      createdDate: "2024-02-01",
      lastUpdated: "2024-02-25",
      category: "Grammar",
      price: 89.99,
    },
    {
      id: 4,
      title: "French Pronunciation Guide",
      instructor: "Marie Dubois",
      status: "published",
      students: 4200,
      revenue: 29400,
      rating: 4.6,
      lessons: 12,
      createdDate: "2024-01-20",
      lastUpdated: "2024-02-15",
      category: "Pronunciation",
      price: 69.99,
    },
  ])

  const getStatusColor = (status) => {
    switch (status) {
      case "published":
        return "#10B981"
      case "draft":
        return "#F59E0B"
      case "archived":
        return "#6B7280"
      default:
        return "#6B7280"
    }
  }

  const getStatusMaterialIcons = (status) => {
    switch (status) {
      case "published":
        return "check-circle"
      case "draft":
        return "edit"
      case "archived":
        return "archive"
      default:
        return "help"
    }
  }

  const handleCourseAction = (course, action) => {
    switch (action) {
      case "edit":
        navigation.navigate("CourseEditor", { course })
        break
      case "view":
        navigation.navigate("CourseDetails", { course, isAdmin: true })
        break
      case "delete":
        Alert.alert(
          "Delete Course",
          `Are you sure you want to delete "${course.title}"? This action cannot be undone.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => console.log("Delete course") },
          ],
        )
        break
      case "publish":
        Alert.alert("Course Published", `"${course.title}" has been published successfully.`)
        break
      case "archive":
        Alert.alert("Course Archived", `"${course.title}" has been archived.`)
        break
    }
  }

  const renderCourseCard = (course) => (
    <View key={course.id} style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseInstructor}>by {course.instructor}</Text>
          <View style={styles.courseMeta}>
            <View style={styles.statusBadge}>
              <Icon name={getStatusIcon(course.status)} size={14} color={getStatusColor(course.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(course.status) }]}>
                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.categoryText}>{course.category}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={() => setSelectedCourse(course)}>
          <Icon name="more-vert" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.courseStats}>
        <View style={styles.statItem}>
          <Icon name="people" size={16} color="#6B7280" />
          <Text style={styles.statText}>{course.students.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="attach-money" size={16} color="#6B7280" />
          <Text style={styles.statText}>${course.revenue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="star" size={16} color="#F59E0B" />
          <Text style={styles.statText}>{course.rating || "N/A"}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="play-lesson" size={16} color="#6B7280" />
          <Text style={styles.statText}>{course.lessons}</Text>
          <Text style={styles.statLabel}>Lessons</Text>
        </View>
      </View>

      <View style={styles.courseDates}>
        <Text style={styles.dateText}>Created: {new Date(course.createdDate).toLocaleDateString()}</Text>
        <Text style={styles.dateText}>Updated: {new Date(course.lastUpdated).toLocaleDateString()}</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Management</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Icon name="add" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Search and Stats */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statTitle}>Total Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>25.6K</Text>
            <Text style={styles.statTitle}>Total Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>$225K</Text>
            <Text style={styles.statTitle}>Total Revenue</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterChip, selectedFilter === filter.id && styles.selectedFilterChip]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text style={[styles.filterText, selectedFilter === filter.id && styles.selectedFilterText]}>
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Courses List */}
      <ScrollView style={styles.coursesList} showsVerticalScrollIndicator={false}>
        {courses.map(renderCourseCard)}
      </ScrollView>

      {/* Course Actions Modal */}
      <Modal visible={!!selectedCourse} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.actionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCourse?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedCourse(null)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  handleCourseAction(selectedCourse, "view")
                  setSelectedCourse(null)
                }}
              >
                <Icon name="visibility" size={20} color="#4F46E5" />
                <Text style={styles.actionText}>View Course</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  handleCourseAction(selectedCourse, "edit")
                  setSelectedCourse(null)
                }}
              >
                <Icon name="edit" size={20} color="#10B981" />
                <Text style={styles.actionText}>Edit Course</Text>
              </TouchableOpacity>

              {selectedCourse?.status === "draft" && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    handleCourseAction(selectedCourse, "publish")
                    setSelectedCourse(null)
                  }}
                >
                  <Icon name="publish" size={20} color="#F59E0B" />
                  <Text style={styles.actionText}>Publish Course</Text>
                </TouchableOpacity>
              )}

              {selectedCourse?.status === "published" && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    handleCourseAction(selectedCourse, "archive")
                    setSelectedCourse(null)
                  }}
                >
                  <Icon name="archive" size={20} color="#6B7280" />
                  <Text style={styles.actionText}>Archive Course</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionItem, styles.dangerAction]}
                onPress={() => {
                  handleCourseAction(selectedCourse, "delete")
                  setSelectedCourse(null)
                }}
              >
                <Icon name="delete" size={20} color="#EF4444" />
                <Text style={[styles.actionText, styles.dangerText]}>Delete Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Course Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Course</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.createOptions}>
              <TouchableOpacity
                style={styles.createOption}
                onPress={() => {
                  setShowCreateModal(false)
                  navigation.navigate("CourseEditor", { isNew: true })
                }}
              >
                <Icon name="create" size={32} color="#4F46E5" />
                <Text style={styles.createOptionTitle}>Create from Scratch</Text>
                <Text style={styles.createOptionDescription}>Start with a blank course template</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createOption}
                onPress={() => {
                  setShowCreateModal(false)
                  navigation.navigate("CourseTemplates")
                }}
              >
                <Icon name="content-copy" size={32} color="#10B981" />
                <Text style={styles.createOptionTitle}>Use Template</Text>
                <Text style={styles.createOptionDescription}>Choose from pre-made course templates</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  filtersContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterChip: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedFilterChip: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedFilterText: {
    color: "#FFFFFF",
  },
  coursesList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryText: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moreButton: {
    padding: 4,
  },
  courseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  courseDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  createModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  actionsList: {
    padding: 24,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  actionText: {
    fontSize: 16,
    color: "#1F2937",
  },
  dangerAction: {
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
    marginTop: 8,
    paddingTop: 24,
  },
  dangerText: {
    color: "#EF4444",
  },
  createOptions: {
    padding: 24,
    gap: 16,
  },
  createOption: {
    backgroundColor: "#F9FAFB",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  createOptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 8,
  },
  createOptionDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
})

export default AdminCourseManagementScreen
