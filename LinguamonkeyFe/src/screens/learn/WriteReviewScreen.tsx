import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses"
import { useLessons } from "../../hooks/useLessons" // Giả định hook Lessons tồn tại
import { useUserStore } from "../../stores/UserStore"
import { createScaledSheet } from "../../utils/scaledStyles"
import { CourseReviewRequest } from "../../types/dto" // DTO Course Review
import ScreenLayout from "../../components/layout/ScreenLayout"

// --- DTO Tạm thời cho Lesson Review (Giả định Lesson API có DTO tương tự) ---
interface LessonReviewRequest {
  userId: string;
  lessonId: string;
  rating: number;
  comment: string;
  verified?: boolean; // Thường có trong Lesson Review
}

const WriteReviewScreen = ({ navigation, route }) => {
  const { courseId, lessonId } = route.params as { courseId?: string, lessonId?: string }
  const { t } = useTranslation()
  const { user } = useUserStore()

  // COURSE HOOKS
  const { useCreateReview: useCreateCourseReviewHook } = useCourses()
  const { mutateAsync: createCourseReview, isPending: isCreatingCourseReview } = useCreateCourseReviewHook();

  // LESSON HOOKS (Giả định hook này tồn tại trong useLessons)
  // TẠM THỜI: Sửa lỗi logic gọi hook bằng cách gọi useCreateReview từ Lesson hooks (nếu nó tồn tại)
  const useCreateLessonReviewHook = useLessons().useCreateReview;
  const { mutateAsync: createLessonReview, isPending: isCreatingLessonReview } = useCreateLessonReviewHook
    ? useCreateLessonReviewHook()
    : { mutateAsync: (req: any) => Promise.reject(new Error("Lesson Review API not ready.")), isPending: false };

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")

  const isCourseReview = !!courseId
  const isLoading = isCreatingCourseReview || isCreatingLessonReview

  const handleSubmit = async () => {
    if (rating === 0) {
      return Alert.alert(t('common.error'), t('reviews.ratingRequired') ?? 'Rating is required.')
    }
    if (!user?.userId) {
      return Alert.alert(t('common.error'), t('errors.notLoggedIn') ?? 'You must be logged in.')
    }

    try {
      if (isCourseReview && courseId) {
        // Course Review: Sử dụng CourseReviewRequest DTO
        const payload: CourseReviewRequest = {
          userId: user.userId,
          courseId: courseId,
          rating: rating,
          comment: comment,
          // Giả định Verified là false cho user review
          // verified: false, // Trường này không có trong CourseReviewRequest DTO
        };
        await createCourseReview(payload);
      }

      else if (!isCourseReview && lessonId) {
        // Lesson Review: Sử dụng LessonReviewRequest DTO (Giả định cấu trúc)
        const payload: LessonReviewRequest = {
          userId: user.userId,
          lessonId: lessonId,
          rating: rating,
          comment: comment,
          verified: false, // Giả định verified field
        };
        await createLessonReview(payload as any); // Ép kiểu vì hook name mismatch
      } else {
        return Alert.alert(t('common.error'), t('errors.missingId') ?? 'Missing Course ID or Lesson ID.')
      }

      Alert.alert(t('common.success'), t('reviews.reviewSuccess') ?? 'Review submitted successfully!')
      navigation.goBack()

    } catch (e: any) {
      const errorMessage = e.response?.data?.message || e.message || t('errors.generic') ?? 'An unknown error occurred.';
      Alert.alert(t('common.error'), errorMessage)
    }
  }

  return (
    <ScreenLayout style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("reviews.writeReview") ?? "Write a Review"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.reviewingFor}>{
          isCourseReview
            ? t("reviews.reviewingForCourse") ?? "Reviewing Course"
            : t("reviews.reviewingForLesson") ?? "Reviewing Lesson"
        }</Text>

        <Text style={styles.label}>{t("reviews.yourRating") ?? "Your Rating"}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Icon
                name={star <= rating ? "star" : "star-border"}
                size={40}
                color={star <= rating ? "#F59E0B" : "#9CA3AF"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t("reviews.yourComment") ?? "Your Comment"}</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder={t("reviews.commentPlaceholder") ?? "Share your thoughts here..."}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t("common.submit") ?? "Submit"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { flex: 1, padding: 24 },
  reviewingFor: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center', fontWeight: '500' },
  label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12, marginTop: 24 },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937", height: 150 },
  buttonPrimary: { backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 32 },
  buttonDisabled: { backgroundColor: "#9CA3AF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
})

export default WriteReviewScreen