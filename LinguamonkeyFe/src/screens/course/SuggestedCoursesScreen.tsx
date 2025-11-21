import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useCourses } from '../../hooks/useCourses';
import { useUserStore } from '../../stores/UserStore';
import { formatCurrency } from '../../utils/currency';

const SuggestedCoursesScreen = ({ navigation }: any) => {
    const { user } = useUserStore();
    // Gọi API getRecommendedCourses
    const { data: courses, isLoading } = useCourses().useRecommendedCourses(user?.userId, 10);

    const renderCourse = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CourseDetails', { courseId: item.courseId })}
        >
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            <View style={styles.info}>
                <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.creator}>Được tạo bởi: {item.creatorName || 'Unknown'}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{item.price === 0 ? 'Miễn phí' : formatCurrency(item.price)}</Text>
                    <Text style={styles.level}>{item.difficultyLevel}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Gợi ý cho bạn</Text>
            <FlatList
                data={courses || []}
                renderItem={renderCourse}
                keyExtractor={(item) => item.courseId}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text>Không tìm thấy gợi ý phù hợp.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { fontSize: 22, fontWeight: 'bold', padding: 16, paddingBottom: 0 },
    card: { flexDirection: 'row', marginBottom: 16, borderRadius: 12, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    thumbnail: { width: 100, height: 100, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
    info: { flex: 1, padding: 12, justifyContent: 'space-between' },
    courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    creator: { fontSize: 12, color: '#888' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontWeight: 'bold', color: '#2E86C1' },
    level: { fontSize: 12, color: '#666', backgroundColor: '#f0f0f0', padding: 4, borderRadius: 4 }
});

export default SuggestedCoursesScreen;