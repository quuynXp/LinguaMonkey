import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Đảm bảo đã cài @expo/vector-icons

const SessionReviewScreen = ({ route, navigation }: any) => {
    const { sessionId, partnerName } = route.params || { sessionId: 'test', partnerName: 'Giáo viên A' };
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const submitReview = () => {
        // Gọi API: CreateReviewRequest
        // POST /api/v1/reviews
        console.log(`Review session ${sessionId}: ${rating} sao - ${comment}`);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Đánh giá buổi học</Text>
            <Text style={styles.subHeader}>Bạn cảm thấy thế nào về {partnerName}?</Text>

            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={40}
                            color="#FFD700"
                        />
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.ratingText}>{rating === 5 ? 'Tuyệt vời!' : rating > 3 ? 'Khá tốt' : 'Cần cải thiện'}</Text>

            <TextInput
                style={styles.input}
                placeholder="Hãy chia sẻ thêm trải nghiệm của bạn..."
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={submitReview}>
                <Text style={styles.btnText}>Gửi đánh giá</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F7FA' },
    header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333' },
    subHeader: { fontSize: 16, textAlign: 'center', color: '#666', marginVertical: 10 },
    starContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
    ratingText: { textAlign: 'center', fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#4A90E2' },
    input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E0E0E0' },
    submitBtn: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 25, marginTop: 30, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default SessionReviewScreen;