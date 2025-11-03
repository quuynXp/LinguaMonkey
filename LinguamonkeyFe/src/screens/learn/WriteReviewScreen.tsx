import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses" // (Đảm bảo đường dẫn đúng)
import { useUserStore } from "../../stores/UserStore" // (Đảm bảo đường dẫn đúng)
import { createScaledSheet } from "../../utils/scaledStyles" // (Đảm bảo đường dẫn đúng)

const WriteReviewScreen = ({ navigation, route }) => {
  const { courseId, lessonId } = route.params
  const { t } = useTranslation()
  const { user } = useUserStore()
  
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")

  const { useCreateCourseReview, useCreateLessonReview } = useCourses()
  const { createCourseReview, isCreatingReview: isCreatingCourseReview } = useCreateCourseReview()
  const { createLessonReview, isCreatingReview: isCreatingLessonReview } = useCreateLessonReview()

  const isCourseReview = !!courseId
  const isLoading = isCreatingCourseReview || isCreatingLessonReview

  const handleSubmit = async () => {
    if (rating === 0) {
      return Alert.alert(t('common.error'), t('reviews.ratingRequired'))
    }
    if (!user?.userId) {
      return Alert.alert(t('common.error'), t('errors.notLoggedIn'))
    }

    try {
      const payload = {
        userId: user.userId,
        courseId: isCourseReview ? courseId : undefined,
        lessonId: !isCourseReview ? lessonId : undefined,
        rating,
        comment,
      }
      
      if (isCourseReview) {
        await createCourseReview(payload)
      } else {
        await createLessonReview(payload)
      }
      
      Alert.alert(t('common.success'), t('reviews.reviewSuccess'))
      navigation.goBack()

    } catch (e: any) {
      // BE sẽ trả về lỗi (ví dụ: chưa học đủ 70%)
      Alert.alert(t('common.error'), e.response?.data?.message || e.message || t('errors.generic'))
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("reviews.writeReview")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>{t("reviews.yourRating")}</Text>
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

        <Text style={styles.label}>{t("reviews.yourComment")}</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder={t("reviews.commentPlaceholder")}
          multiline
          textAlignVertical="top" // for Android
        />
        
        <TouchableOpacity 
          style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t("common.submit")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = createScaledSheet({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { flex: 1, padding: 24 },
  label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12, marginTop: 24 },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937", height: 150 },
  buttonPrimary: { backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 32 },
  buttonDisabled: { backgroundColor: "#9CA3AF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
})

export default WriteReviewScreen