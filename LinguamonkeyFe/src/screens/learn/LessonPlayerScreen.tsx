import React from "react"
import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { createScaledSheet } from "../../utils/scaledStyles" // (Đảm bảo đường dẫn đúng)
import type { Lesson, Course } from "../../hooks/useCourses" // (Đảm bảo đường dẫn đúng)

const LessonPlayerScreen = ({ navigation, route }) => {
  const { lesson, course } = route.params as { lesson: Lesson; course: Course }
  const { t } = useTranslation()

  // TODO: Fetch lesson details (nếu cần video URL, v.v.)
  // const { data: lessonDetails, isLoading } = useLesson(lesson.lessonId)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        {/* (Nút 'Next Lesson') */}
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Giả lập trình phát video/nội dung */}
        <View style={styles.playerArea}>
          <Icon name="play-circle-outline" size={80} color="#9CA3AF" />
          <Text style={styles.playerText}>{t('lessons.contentGoesHere')}</Text>
        </View>
        
        <Text style={styles.courseTitle}>{t('lessons.fromCourse')} {course.title}</Text>
        
        <Text style={styles.description}>{lesson.description || t('lessons.noDescription')}</Text>

        <TouchableOpacity 
          style={styles.buttonPrimary} 
          onPress={() => navigation.navigate("WriteReview", { lessonId: lesson.lessonId })}
        >
          <Text style={styles.buttonText}>{t('reviews.leaveLessonReview')}</Text>
        </TouchableOpacity>
        
        {/* TODO: Hiển thị Lesson Reviews (dùng useLessonReviews) */}
        
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", flex: 1, textAlign: 'center', marginHorizontal: 16 },
  content: { flex: 1, padding: 24 },
  playerArea: {
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  playerText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },
  courseTitle: { fontSize: 14, fontWeight: '500', color: "#6B7280", marginBottom: 16 },
  description: { fontSize: 16, color: "#374151", lineHeight: 24, marginBottom: 32 },
  buttonPrimary: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
})

export default LessonPlayerScreen