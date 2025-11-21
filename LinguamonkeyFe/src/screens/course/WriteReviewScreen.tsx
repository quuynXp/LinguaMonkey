import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useCourses } from '../../hooks/useCourses';
import { useUserStore } from '../../stores/UserStore';
import Icon from 'react-native-vector-icons/FontAwesome'; // Giả sử dùng react-native-vector-icons

const WriteReviewScreen = ({ route, navigation }: any) => {
    const { courseId, lessonId } = route.params; // Có thể review course hoặc lesson
    const { user } = useUserStore();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const { createCourseReview, isCreatingReview } = useCourses().useCreateCourseReview();
    const { createLessonReview } = useCourses().useCreateLessonReview();

    const handleSubmit = () => {
        const payload = {
            userId: user!.userId,
            rating,
            comment,
            ...(courseId ? { courseId } : { lessonId }) // Tự động chọn loại review
        };

        const mutation = courseId ? createCourseReview : createLessonReview;

        mutation(payload, {
            onSuccess: () => {
                Alert.alert('Cảm ơn', 'Đánh giá của bạn đã được gửi!');
                navigation.goBack();
            },
            onError: (err) => Alert.alert('Lỗi', err.message)
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Đánh giá của bạn</Text>

            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Icon name={star <= rating ? "star" : "star-o"} size={40} color="#FFD700" style={{ marginHorizontal: 5 }} />
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Nhận xét (tùy chọn)</Text>
            <TextInput
                style={styles.input}
                multiline
                numberOfLines={5}
                placeholder="Hãy chia sẻ cảm nhận của bạn..."
                value={comment}
                onChangeText={setComment}
            />

            <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={isCreatingReview}>
                <Text style={styles.btnText}>Gửi đánh giá</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
    label: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, height: 120, textAlignVertical: 'top', fontSize: 16 },
    btn: { backgroundColor: '#2ECC71', padding: 16, borderRadius: 8, marginTop: 20, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default WriteReviewScreen;