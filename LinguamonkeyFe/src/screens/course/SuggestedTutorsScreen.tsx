import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';

// Giả lập dữ liệu, thực tế sẽ gọi API MatchmakingController
const MOCK_TUTORS = [
  { id: '1', name: 'Nguyễn Văn A', lang: 'Tiếng Anh', rating: 4.8, price: 50000, avatar: 'https://via.placeholder.com/50' },
  { id: '2', name: 'Trần Thị B', lang: 'Tiếng Trung', rating: 4.9, price: 60000, avatar: 'https://via.placeholder.com/50' },
];

const SuggestedTutorsScreen = ({ navigation }: any) => {
  const [tutors, setTutors] = useState(MOCK_TUTORS);

  const handleBook = (tutorId: string) => {
    // Điều hướng sang màn hình chi tiết giáo viên hoặc gọi video
    // navigation.navigate('TeacherProfile', { id: tutorId });
    console.log('Booking tutor', tutorId);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.lang} • ⭐ {item.rating}</Text>
        <Text style={styles.price}>{item.price}đ / 30p</Text>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(item.id)}>
        <Text style={styles.bookText}>Đặt lịch</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gợi ý cho bạn</Text>
      <FlatList
        data={tutors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold' },
  detail: { color: '#666', marginTop: 4 },
  price: { color: '#28a745', fontWeight: 'bold', marginTop: 4 },
  bookBtn: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  bookText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});

export default SuggestedTutorsScreen;