import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useCourses } from "../../hooks/useCourses"
import { useUserStore } from "../../stores/UserStore"
import { createScaledSheet } from "../../utils/scaledStyles"
import { CourseReviewRequest } from "../../types/dto"
import ScreenLayout from "../../components/layout/ScreenLayout"

const WriteReviewCourseScreen = ({ navigation, route }: any) => {
    const { courseId } = route.params as { courseId?: string }
    const { t } = useTranslation()
    const { user } = useUserStore()

    const { useCreateReview: useCreateCourseReviewHook } = useCourses()
    const { mutateAsync: createCourseReview, isPending: isCreatingCourseReview } = useCreateCourseReviewHook()

    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState("")

    const handleSubmit = async () => {
        if (rating === 0) {
            return Alert.alert(t('common.error'), t('reviews.ratingRequired') ?? 'Rating is required.')
        }
        if (!user?.userId) {
            return Alert.alert(t('common.error'), t('errors.notLoggedIn') ?? 'You must be logged in.')
        }
        if (!courseId) {
            return Alert.alert(t('common.error'), t('errors.missingCourseId') ?? 'Missing Course ID.')
        }

        try {
            const payload: CourseReviewRequest = {
                userId: user.userId,
                courseId: courseId,
                rating: rating,
                comment: comment,
            }
            await createCourseReview(payload)

            Alert.alert(t('common.success'), t('reviews.reviewSuccess') ?? 'Review submitted successfully!')
            navigation.goBack()

        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.'
            Alert.alert(t('common.error'), errorMessage)
        }
    }

    return (
        <ScreenLayout>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("reviews.writeReview") ?? "Write a Review"}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.reviewingFor}>
                    {t("reviews.reviewingForCourse") ?? "Reviewing Course"}
                </Text>

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
                    style={[styles.buttonPrimary, isCreatingCourseReview && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isCreatingCourseReview}
                >
                    {isCreatingCourseReview ? (
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
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
    content: { flexGrow: 1, padding: 24, backgroundColor: "#F8FAFC" },
    reviewingFor: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center', fontWeight: '500' },
    label: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12, marginTop: 24 },
    starsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
    input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 16, color: "#1F2937", height: 150 },
    buttonPrimary: { backgroundColor: "#4F46E5", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 32 },
    buttonDisabled: { backgroundColor: "#9CA3AF" },
    buttonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
})

export default WriteReviewCourseScreen